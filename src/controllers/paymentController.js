'use strict';

const stripe = require('../config/stripe');
const { createPaymentIntent, handleWebhookEvent } = require('../services/paymentService');

/**
 * POST /api/payments/create-payment-intent
 * Body: { amount: number (cents), currency: string, metadata?: object }
 */
async function createIntent(req, res) {
  try {
    const { amount, currency, metadata } = req.body;
    const paymentIntent = await createPaymentIntent(amount, currency, metadata);

    res.status(201).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Error creating payment intent:', err.message);
    res.status(500).json({ error: 'Failed to create payment intent' });
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
