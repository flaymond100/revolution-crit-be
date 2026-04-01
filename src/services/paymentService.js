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

async function findOrCreateParticipant(participant) {
  const email = participant.email || null;

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
    full_name: participant.fullName,
    date_of_birth: participant.dateOfBirth || null,
    gender: participant.gender || null,
    team_name: participant.teamName || null,
    nationality: participant.nationality || null,
    email,
    phone: participant.phone || null,
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
  const registrationPayload = {
    subRaceId,
    participant,
  };

  const metadata = {
    sub_race_id: String(subRaceId),
    participant_email: String(participant.email),
    registration_payload: JSON.stringify(registrationPayload),
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: participant.email,
    metadata,
    payment_intent_data: { metadata },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: `Race Registration (${subRaceId})`,
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

      const subRaceId = registrationPayload.subRaceId || session.metadata?.sub_race_id;
      const participant = registrationPayload.participant || {
        email: session.customer_email,
      };

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
