import Stripe from 'stripe'; // typed
import stripe from '../config/stripe';
import { supabase, supabaseService } from '../config/supabase';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface ParticipantInput { // typed
  fullName?: string;
  full_name?: string;
  dateOfBirth?: string;
  date_of_birth?: string;
  gender?: string;
  teamName?: string;
  team_name?: string;
  nationality?: string;
  email?: string;
  phone?: string;
}

interface NormalizedParticipant { // typed
  fullName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  teamName: string | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
}

interface RegistrationInput { // typed
  amount?: number;
  currency?: string;
  subRaceId?: string;
  sub_race_id?: string;
  participant?: ParticipantInput;
  successUrl?: string;
  success_url?: string;
  cancelUrl?: string;
  cancel_url?: string;
}

interface NormalizedRegistration { // typed
  amount: number | undefined;
  currency: string | undefined;
  subRaceId: string | undefined;
  participant: NormalizedParticipant;
  successUrl: string | undefined;
  cancelUrl: string | undefined;
}

interface ParticipantRecord { // typed — shape of selected columns from 'participants' table
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface CreateCheckoutSessionParams { // typed
  subRaceId?: string;
  participant: ParticipantInput;
  successUrl?: string;
  cancelUrl?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function convertFromSmallestUnit(
  amount: number | null, // typed — Stripe amount_total is number | null
  currency: string | null | undefined // typed — Stripe currency is string | null
): number { // typed
  const normalizedCurrency = String(currency || '').toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return (amount ?? 0); // typed — null coerces to 0, matching original JS behaviour (null / 100 = 0)
  }

  return (amount ?? 0) / 100; // typed — see above
}

function normalizeParticipantPayload(participant: ParticipantInput = {}): NormalizedParticipant { // typed
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

function normalizeRegistrationPayload(payload: RegistrationInput = {}): NormalizedRegistration { // typed
  return {
    amount: payload.amount,
    currency: payload.currency,
    subRaceId: payload.subRaceId || payload.sub_race_id,
    participant: normalizeParticipantPayload(payload.participant || {}),
    successUrl: payload.successUrl || payload.success_url,
    cancelUrl: payload.cancelUrl || payload.cancel_url,
  };
}

async function resolveActivePriceCents(subRaceId: string): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('race_sub_race_prices')
    .select('amount_cents, valid_from, valid_until')
    .eq('sub_race_id', subRaceId)
    .lte('valid_from', now)
    .or(`valid_until.is.null,valid_until.gt.${now}`)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`No active price configured for starting class ${subRaceId}`);
  return data.amount_cents as number;
}

async function findOrCreateParticipant(participant: ParticipantInput): Promise<ParticipantRecord> { // typed
  const normalizedParticipant = normalizeParticipantPayload(participant);
  const email = normalizedParticipant.email || null;

  if (email) {
    const { data: existingParticipant, error: selectError } = await supabaseService
      .from('participants')
      .select('id, full_name, email')
      .eq('email', email)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (existingParticipant) {
      return existingParticipant as ParticipantRecord; // typed — cast untyped Supabase response to known shape
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

  const { data: createdParticipant, error: insertError } = await supabaseService
    .from('participants')
    .insert(participantRecord)
    .select('id, full_name, email')
    .single();

  if (insertError) {
    throw insertError;
  }

  return createdParticipant as ParticipantRecord; // typed — cast untyped Supabase response to known shape
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Create a Stripe Checkout Session for public race registration.
 * Amount is authoritative from the DB — never trusted from the client.
 */
async function createCheckoutSession({
  subRaceId,
  participant,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const normalizedInput = normalizeRegistrationPayload({
    subRaceId,
    participant,
    successUrl,
    cancelUrl,
  });

  if (!normalizedInput.subRaceId) {
    throw new Error('subRaceId is required');
  }

  const amountCents = await resolveActivePriceCents(normalizedInput.subRaceId);

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

  const metadata: Stripe.MetadataParam = {
    sub_race_id: normalizedInput.subRaceId,
    participant_email: String(normalizedInput.participant.email || ''),
    registration_payload: JSON.stringify(registrationPayload),
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: normalizedInput.successUrl,
    cancel_url: normalizedInput.cancelUrl,
    customer_email: normalizedInput.participant.email ?? undefined,
    metadata,
    payment_intent_data: { metadata },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: amountCents,
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
async function handleWebhookEvent(event: Stripe.Event): Promise<void> { // typed
  const { type, data } = event;

  switch (type) {
    case 'checkout.session.completed': {
      const session = data.object as Stripe.Checkout.Session; // typed — narrowed from Stripe.Event.Data.Object

      if (session.payment_status !== 'paid') break;

      // JSON.parse returns any, so registrationPayload properties are implicitly any below
      let registrationPayload: Record<string, unknown> = {}; // typed
      try {
        registrationPayload = JSON.parse(session.metadata?.registration_payload || '{}') as Record<string, unknown>; // typed
      } catch (_err) {
        registrationPayload = {};
      }

      const normalizedPayload = normalizeRegistrationPayload({
        subRaceId: registrationPayload.subRaceId as string | undefined, // typed
        sub_race_id: registrationPayload.sub_race_id as string | undefined, // typed
        participant: (registrationPayload.participant as ParticipantInput | undefined) || {
          email: session.customer_email ?? undefined, // typed — customer_email is string | null
        },
      });

      const subRaceId = normalizedPayload.subRaceId || session.metadata?.sub_race_id;
      const participant = normalizedPayload.participant;

      // typed — NormalizedParticipant uses `null` for missing values; ParticipantInput uses `undefined`.
      // normalizeParticipantPayload (called inside findOrCreateParticipant) handles both via `|| null`,
      // so the cast is safe at runtime.
      const participantRecord = await findOrCreateParticipant(participant as ParticipantInput);

      await supabaseService.from('race_entries').upsert(
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

export { createCheckoutSession, handleWebhookEvent }; // typed
