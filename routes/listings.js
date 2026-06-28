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

// Single source of truth for the 7 gift products — also used by the wishlist
// picker on the listing page and the scoped gift page.
const PRODUCT_CATALOGUE = {
  lasagne: { name: 'Latina Beef Lasagne', price: 40, img: 'products/lasagne.png' },
  macandcheese: { name: 'Herbert Adams Mac & Cheese with Pulled Beef', price: 40, img: 'products/macandcheese.png' },
  pesto: { name: 'Youfoodz Chicken Pesto Pasta', price: 40, img: 'products/pesto.png' },
  quiche: { name: 'Herbert Adams Bacon & Cheddar Quiche', price: 40, img: 'products/quiche.png' },
  pizza: { name: 'Gourmet Saba Pepperoni Protein Pizza', price: 40, img: 'products/pizza.png' },
  lindor: { name: 'Lindt Lindor Assorted Box', price: 30, img: 'products/lindor.png' },
  cadbury: { name: 'Cadbury Favourites Ultimate Share', price: 30, img: 'products/cadbury.png' }
};

const MAX_WISHLIST_ITEMS = 10;

function daysLeftFrom(createdAt) {
  const created = new Date(createdAt);
  const expires = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
  const msLeft = expires.getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

function expandWishlist(keys) {
  return (keys || [])
    .filter(key => PRODUCT_CATALOGUE[key])
    .map(key => ({ key, ...PRODUCT_CATALOGUE[key] }));
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
      .select('id, full_name, nickname, suburb, photo_url, illness, wishlist, created_at')
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
      wishlist: expandWishlist(row.wishlist),
      daysLeft: daysLeftFrom(row.created_at)
    }));

    res.json(listings);
  } catch (err) {
    console.error('[listings:list]', err.message);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

// GET /api/listings/:id — single listing, used by the gift page to show
// photo, name, illness and their chosen wishlist items.
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id, full_name, nickname, suburb, photo_url, illness, wishlist, created_at')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Listing not found' });

    res.json({
      id: data.id,
      fullName: data.full_name,
      nickname: data.nickname,
      suburb: data.suburb,
      photoUrl: data.photo_url,
      illness: data.illness ? (ILLNESS_LABELS[data.illness] || data.illness) : null,
      wishlist: expandWishlist(data.wishlist),
      daysLeft: daysLeftFrom(data.created_at)
    });
  } catch (err) {
    console.error('[listings:get]', err.message);
    res.status(500).json({ error: 'Failed to load listing' });
  }
});

// POST /api/listings — create a new listing from a captured selfie
router.post('/', async (req, res) => {
  try {
    const { fullName, nickname, school, suburb, address, illness, wishlist, photoDataUrl } = req.body || {};

    if (!fullName || !nickname || !school || !suburb || !address || !photoDataUrl) {
      return res.status(400).json({
        error: 'fullName, nickname, school, suburb, address and photoDataUrl are all required'
      });
    }

    if (illness && !ILLNESS_LABELS[illness]) {
      return res.status(400).json({ error: 'Invalid illness value' });
    }

    const cleanWishlist = Array.isArray(wishlist)
      ? wishlist.filter(key => PRODUCT_CATALOGUE[key]).slice(0, MAX_WISHLIST_ITEMS)
      : [];

    const { data, error } = await supabase
      .from('listings')
      .insert({
        full_name: fullName,
        nickname,
        school,
        suburb,
        address,
        illness: illness || null,
        wishlist: cleanWishlist,
        photo_url: photoDataUrl
      })
      .select('id, full_name, nickname, suburb, photo_url, illness, wishlist, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      fullName: data.full_name,
      nickname: data.nickname,
      suburb: data.suburb,
      photoUrl: data.photo_url,
      illness: data.illness ? (ILLNESS_LABELS[data.illness] || data.illness) : null,
      wishlist: expandWishlist(data.wishlist),
      daysLeft: daysLeftFrom(data.created_at)
    });
  } catch (err) {
    console.error('[listings:create]', err.message);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

module.exports = router;
