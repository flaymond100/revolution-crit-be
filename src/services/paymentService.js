'use strict';

const stripe = require('../config/stripe');
const { supabase } = require('../config/supabase');

const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

function convertFromSmallestUnit(amount, currency) {
  const normalizedCurrency = String(currency || '').toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return amount;
  }

  return amount / 100;
}

function normalizeParticipantPayload(participant = {}) {
  return {
    fullName: participant.fullName || participant.full_name || null,
    dateOfBirth: participant.dateOfBirth || participant.date_of_birth || null,
    gender: participant.gender || null,
    teamName: participant.teamName || participant.team_name || null,
    nationality: participant.nationality || null,
    email: participant.email || null,
    phone: participant.phone || null,
  };
}

function normalizeRegistrationPayload(payload = {}) {
  return {
    amount: payload.amount,
    currency: payload.currency,
    subRaceId: payload.subRaceId || payload.sub_race_id,
    participant: normalizeParticipantPayload(payload.participant || {}),
    successUrl: payload.successUrl || payload.success_url,
    cancelUrl: payload.cancelUrl || payload.cancel_url,
  };
}

async function findOrCreateParticipant(participant) {
  const normalizedParticipant = normalizeParticipantPayload(participant);
  const email = normalizedParticipant.email || null;

  if (email) {
    const { data: existingParticipant, error: selectError } = await supabase
      .from('participants')
      .select('id, full_name, email')
      .eq('email', email)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (existingParticipant) {
      return existingParticipant;
    }
  }

  const participantRecord = {
    full_name: normalizedParticipant.fullName,
    date_of_birth: normalizedParticipant.dateOfBirth,
    gender: normalizedParticipant.gender,
    team_name: normalizedParticipant.teamName,
    nationality: normalizedParticipant.nationality,
    email,
    phone: normalizedParticipant.phone,
  };

  const { data: createdParticipant, error: insertError } = await supabase
    .from('participants')
    .insert(participantRecord)
    .select('id, full_name, email')
    .single();

  if (insertError) {
    throw insertError;
  }

  return createdParticipant;
}

/**
 * Create a Stripe Checkout Session for public race registration.
 */
async function createCheckoutSession({ amount, currency, subRaceId, participant, successUrl, cancelUrl }) {
  const normalizedInput = normalizeRegistrationPayload({
    amount,
    currency,
    subRaceId,
    participant,
    successUrl,
    cancelUrl,
  });

  const registrationPayload = {
    sub_race_id: normalizedInput.subRaceId,
    participant: {
      full_name: normalizedInput.participant.fullName,
      date_of_birth: normalizedInput.participant.dateOfBirth,
      gender: normalizedInput.participant.gender,
      team_name: normalizedInput.participant.teamName,
      nationality: normalizedInput.participant.nationality,
      email: normalizedInput.participant.email,
      phone: normalizedInput.participant.phone,
    },
  };

  const metadata = {
    sub_race_id: String(normalizedInput.subRaceId),
    participant_email: String(normalizedInput.participant.email || ''),
    registration_payload: JSON.stringify(registrationPayload),
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: normalizedInput.successUrl,
    cancel_url: normalizedInput.cancelUrl,
    customer_email: normalizedInput.participant.email,
    metadata,
    payment_intent_data: { metadata },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: normalizedInput.currency,
          unit_amount: normalizedInput.amount,
          product_data: {
            name: `Race Registration (${normalizedInput.subRaceId})`,
          },
        },
      },
    ],
  });

  return session;
}

/**
 * Handle a verified Stripe webhook event and update Supabase records accordingly.
 */
async function handleWebhookEvent(event) {
  const { type, data } = event;

  switch (type) {
    case 'checkout.session.completed': {
      const session = data.object;

      if (session.payment_status !== 'paid') break;

      let registrationPayload = {};
      try {
        registrationPayload = JSON.parse(session.metadata?.registration_payload || '{}');
      } catch (_err) {
        registrationPayload = {};
      }

      const normalizedPayload = normalizeRegistrationPayload({
        subRaceId: registrationPayload.subRaceId,
        sub_race_id: registrationPayload.sub_race_id,
        participant: registrationPayload.participant || {
          email: session.customer_email,
        },
      });

      const subRaceId = normalizedPayload.subRaceId || session.metadata?.sub_race_id;
      const participant = normalizedPayload.participant;

      const participantRecord = await findOrCreateParticipant(participant);

      await supabase.from('race_entries').upsert(
        {
          sub_race_id: String(subRaceId),
          participant_id: participantRecord.id,
          is_paid: true,
          payment_amount: convertFromSmallestUnit(session.amount_total, session.currency),
          payment_currency: String(session.currency || '').toUpperCase(),
          payment_date: new Date().toISOString(),
          notes: `Stripe checkout session: ${session.id}`,
        },
        { onConflict: 'sub_race_id,participant_id' }
      );
      break;
    }
    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled': {
      break;
    }
    default:
      break;
  }
}

module.exports = { createCheckoutSession, handleWebhookEvent };
