const express = require('express');
const supabase = require('../lib/supabase');

const router = express.Router();

function formatItemList(items) {
  const names = items.map(i => i.name);
  if (names.length === 0) return 'Nothing selected';
  if (names.length === 1) return names[0];
  return names.join(' + ');
}

function formatPlaced(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const isToday = created.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = created.toDateString() === yesterday.toDateString();

  const time = created.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '');

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return created.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) + `, ${time}`;
}

// GET /api/orders — for the admin dashboard
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const orders = (data || []).map(row => ({
      id: row.order_code,
      status: row.status,
      recipientName: row.recipient_name,
      suburb: row.recipient_suburb,
      address: row.delivery_address || null,
      gift: formatItemList(row.items || []),
      note: row.note,
      sender: row.sender,
      total: `$${Number(row.total).toFixed(2)}`,
      placed: formatPlaced(row.created_at)
    }));

    res.json(orders);
  } catch (err) {
    console.error('[orders:list]', err.message);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// Note: orders are created via POST /api/payments/confirm-order, only
// after Stripe confirms the payment succeeded — see routes/payments.js.

// POST /api/orders/:orderCode/action — mark an order as actioned (admin)
router.post('/:orderCode/action', async (req, res) => {
  try {
    const { orderCode } = req.params;

    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'actioned' })
      .eq('order_code', orderCode)
      .select('id')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Order not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('[orders:action]', err.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;
