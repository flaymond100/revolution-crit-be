import Stripe from 'stripe'; // typed

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Missing required Stripe environment variable: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-03-25.dahlia',
});

export default stripe; // typed — named default export, compatible with existing require() callers via esModuleInterop
