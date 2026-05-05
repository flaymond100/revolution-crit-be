import { Request, Response } from 'express'; // typed
import Stripe from 'stripe'; // typed

// TODO: paymentService.js is not yet migrated — createCheckoutSession / handleWebhookEvent
// are inferred from JS. Tighten return types when paymentService is migrated.
import { createCheckoutSession, handleWebhookEvent } from '../services/paymentService';

import stripe from '../config/stripe'; // typed — Stripe instance (CJS default export)

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface Participant { // typed
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

/**
 * POST /api/payments/create-payment-intent
 * Body: {
 *   amount: number,
 *   currency: string,
 *   subRaceId: string,
 *   participant: { fullName: string, email: string, ... },
 *   successUrl: string,
 *   cancelUrl: string
 * }
 */
interface CreateIntentBody { // typed
  subRaceId?: string;
  sub_race_id?: string;
  participant: Participant;
  successUrl?: string;
  success_url?: string;
  cancelUrl?: string;
  cancel_url?: string;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function createIntent(
  req: Request<Record<string, string>, unknown, CreateIntentBody>, // typed
  res: Response // typed
): Promise<void> { // typed
  try {
    const subRaceId = req.body.subRaceId || req.body.sub_race_id;
    const participant = req.body.participant;
    const successUrl = req.body.successUrl || req.body.success_url;
    const cancelUrl = req.body.cancelUrl || req.body.cancel_url;

    const session = await createCheckoutSession({
      subRaceId,
      participant,
      successUrl,
      cancelUrl,
    });

    res.status(201).json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Error creating checkout session:', (err as Error).message); // typed
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

/**
 * POST /api/payments/webhook
 * Raw body required – verified using the Stripe webhook secret.
 */
async function handleWebhook(
  req: Request, // typed
  res: Response // typed
): Promise<void> { // typed
  const sig = req.headers['stripe-signature']; // string | string[] | undefined — typed
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return; // typed — split from return res.status() because return type is Promise<void>
  }

  let event: Stripe.Event; // typed
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer, // typed — raw Buffer provided by express.raw() middleware
      sig ?? '', // typed — fallback to empty string; constructEvent will throw on invalid sig
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', (err as Error).message); // typed
    res.status(400).json({ error: `Webhook Error: ${(err as Error).message}` }); // typed
    return; // typed — see note above
  }

  try {
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Error handling webhook event:', (err as Error).message); // typed
    res.status(500).json({ error: 'Failed to process webhook event' });
  }
}

export { createIntent, handleWebhook }; // typed — compiles to CJS exports, compatible with require()
