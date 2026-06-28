const express = require('express');
const supabase = require('../lib/supabase');

const router = express.Router();

const ILLNESS_LABELS = {
  flu_cold: 'Flu / cold',
  stomach_bug: 'Stomach bug',
  covid: 'COVID',
  broken_bones: 'Broken bones',
  man_flu: 'Man flu'
};

function daysLeftFrom(createdAt) {
  const created = new Date(createdAt);
  const expires = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
  const msLeft = expires.getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

// GET /api/listings — active, non-expired listings for the public board.
// Shows full name + nickname together so people can confirm it's genuinely
// their mate (e.g. "Roderick Charles Henderson (Digger)"). Street address
// and school are never exposed here — those stay verification/delivery-only.
// Supports ?q= for a name/suburb search.
router.get('/', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const q = (req.query.q || '').trim();

    let query = supabase
      .from('listings')
      .select('id, full_name, nickname, suburb, photo_url, illness, created_at')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });

    if (q) {
      const escaped = q.replace(/[%_]/g, '\\$&');
      query = query.or(`full_name.ilike.%${escaped}%,nickname.ilike.%${escaped}%,suburb.ilike.%${escaped}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const listings = (data || []).map(row => ({
      id: row.id,
      fullName: row.full_name,
      nickname: row.nickname,
      suburb: row.suburb,
      photoUrl: row.photo_url,
      illness: row.illness ? (ILLNESS_LABELS[row.illness] || row.illness) : null,
      daysLeft: daysLeftFrom(row.created_at)
    }));

    res.json(listings);
  } catch (err) {
    console.error('[listings:list]', err.message);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

// POST /api/listings — create a new listing from a captured selfie
router.post('/', async (req, res) => {
  try {
    const { fullName, nickname, school, suburb, address, illness, photoDataUrl } = req.body || {};

    if (!fullName || !nickname || !school || !suburb || !address || !photoDataUrl) {
      return res.status(400).json({
        error: 'fullName, nickname, school, suburb, address and photoDataUrl are all required'
      });
    }

    if (illness && !ILLNESS_LABELS[illness]) {
      return res.status(400).json({ error: 'Invalid illness value' });
    }

    const { data, error } = await supabase
      .from('listings')
      .insert({
        full_name: fullName,
        nickname,
        school,
        suburb,
        address,
        illness: illness || null,
        photo_url: photoDataUrl
      })
      .select('id, full_name, nickname, suburb, photo_url, illness, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      fullName: data.full_name,
      nickname: data.nickname,
      suburb: data.suburb,
      photoUrl: data.photo_url,
      illness: data.illness ? (ILLNESS_LABELS[data.illness] || data.illness) : null,
      daysLeft: daysLeftFrom(data.created_at)
    });
  } catch (err) {
    console.error('[listings:create]', err.message);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

module.exports = router;
