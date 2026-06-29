const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.warn(
    '[sickbed] Missing STRIPE_SECRET_KEY env var — ' +
    'set this in the Render dashboard. The app will start but payments will fail.'
  );
}

// Placeholder key lets the server boot even without real credentials,
// matching the same pattern used for Supabase — actual calls fail
// gracefully instead of crashing the whole process.
const stripe = new Stripe(STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20'
});

module.exports = stripe;
