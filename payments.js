const express = require('express');
const stripe = require('../lib/stripe');
const supabase = require('../lib/supabase');

const router = express.Router();

// POST /api/payments/create-intent
// Called when the sender clicks Pay. Creates a Stripe PaymentIntent for the
// order total and returns its client_secret so Stripe Elements can confirm
// the card payment directly on the gift page. No order is saved yet —
// that only happens after payment succeeds (see /confirm-order below).
router.post('/create-intent', async (req, res) => {
  try {
    const { total, listingId, recipientName } = req.body || {};

    const amount = Math.round(Number(total) * 100); // Stripe wants cents
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid order total' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'aud',
      automatic_payment_methods: { enabled: true },
      metadata: {
        listingId: listingId || '',
        recipientName: recipientName || ''
      }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('[payments:create-intent]', err.message);
    res.status(500).json({ error: 'Failed to start payment' });
  }
});

// POST /api/payments/confirm-order
// Called by the frontend only after Stripe confirms the card payment
// succeeded. Verifies the PaymentIntent really did succeed server-side
// (never trust the client alone) before writing the order to Supabase.
router.post('/confirm-order', async (req, res) => {
  try {
    const {
      paymentIntentId, listingId, recipientName, recipientSuburb,
      items, sender, note, deliveryFee, total
    } = req.body || {};

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Missing paymentIntentId' });
    }
    if (!recipientName || !recipientSuburb || !items || !items.length || !sender || !total) {
      return res.status(400).json({ error: 'Missing required order fields' });
    }

    // Verify with Stripe directly — don't trust the frontend's word that payment succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(402).json({ error: 'Payment has not succeeded' });
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        listing_id: listingId || null,
        recipient_name: recipientName,
        recipient_suburb: recipientSuburb,
        items,
        sender,
        note: note || '',
        delivery_fee: deliveryFee || 0,
        total,
        status: 'new',
        stripe_payment_intent_id: paymentIntentId
      })
      .select('id, order_code')
      .single();

    if (error) throw error;

    res.status(201).json({ id: data.id, orderCode: data.order_code });
  } catch (err) {
    console.error('[payments:confirm-order]', err.message);
    res.status(500).json({ error: 'Failed to finalise order' });
  }
});

module.exports = router;
