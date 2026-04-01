'use strict';

const stripe = require('../config/stripe');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Create a Stripe Payment Intent and optionally persist a record to Supabase.
 */
async function createPaymentIntent(amount, currency, metadata = {}) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: { enabled: true },
    metadata,
  });

  if (supabaseAdmin) {
    await supabaseAdmin.from('payment_intents').insert({
      stripe_payment_intent_id: paymentIntent.id,
      amount,
      currency,
      status: paymentIntent.status,
      metadata,
    });
  }

  return paymentIntent;
}

/**
 * Handle a verified Stripe webhook event and update Supabase records accordingly.
 */
async function handleWebhookEvent(event) {
  if (!supabaseAdmin) return;

  const { type, data } = event;

  switch (type) {
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled': {
      const pi = data.object;
      await supabaseAdmin
        .from('payment_intents')
        .update({ status: pi.status })
        .eq('stripe_payment_intent_id', pi.id);
      break;
    }
    default:
      break;
  }
}

module.exports = { createPaymentIntent, handleWebhookEvent };
