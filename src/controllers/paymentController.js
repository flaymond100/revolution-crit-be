'use strict';

const stripe = require('../config/stripe');
const { createCheckoutSession, handleWebhookEvent } = require('../services/paymentService');

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
async function createIntent(req, res) {
  try {
    const amount = req.body.amount;
    const currency = req.body.currency;
    const subRaceId = req.body.subRaceId || req.body.sub_race_id;
    const participant = req.body.participant;
    const successUrl = req.body.successUrl || req.body.success_url;
    const cancelUrl = req.body.cancelUrl || req.body.cancel_url;

    const session = await createCheckoutSession({
      amount,
      currency,
      subRaceId,
      participant,
      successUrl,
      cancelUrl,
    });

    res.status(201).json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Error creating checkout session:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

/**
 * POST /api/payments/webhook
 * Raw body required – verified using the Stripe webhook secret.
 */
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Error handling webhook event:', err.message);
    res.status(500).json({ error: 'Failed to process webhook event' });
  }
}

module.exports = { createIntent, handleWebhook };
