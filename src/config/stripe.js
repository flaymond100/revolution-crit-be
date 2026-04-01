'use strict';

const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Missing required Stripe environment variable: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-03-25.dahlia',
});

module.exports = stripe;
