const path = require('path');
const express = require('express');
const cors = require('cors');

const listingsRouter = require('./routes/listings');
const ordersRouter = require('./routes/orders');
const paymentsRouter = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' })); // selfies arrive as base64 data URLs

// API routes
app.use('/api/listings', listingsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);

// Health check (handy for Render)
app.get('/healthz', (req, res) => res.json({ ok: true }));

// Public config the frontend needs at runtime (safe to expose — publishable
// keys are designed to be public; never put the secret key here).
app.get('/api/config', (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
  });
});

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Default route -> landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sickbed-landing.html'));
});

app.listen(PORT, () => {
  console.log(`Sick Bed web service running on port ${PORT}`);
});
