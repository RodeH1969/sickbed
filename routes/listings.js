const express = require('express');
const supabase = require('../lib/supabase');

const router = express.Router();

const ILLNESS_LABELS = {
  man_flu: 'Man flu',
  nasty_cold: 'Nasty cold',
  migraine: 'Migraine',
  toothache: 'Toothache',
  gastro: 'Gastro',
  the_flu: 'The flu',
  covid: 'COVID',
  bung_back: 'Bung back',
  busted_knee: 'Busted knee',
  broken_bone: 'Broken bone',
  pulled_hammy: 'Pulled hammy',
  post_op: 'Post op',
  wisdom_teeth: 'Wisdom teeth',
  vertigo: 'Vertigo',
  kidney_stones: 'Kidney stones',
  shingles: 'Shingles',
  gout: 'Gout'
};

// Short, factual blurb shown on the gift popup so senders understand what
// their mate is actually going through before being asked to send anything.
const ILLNESS_BLURBS = {
  man_flu: "Officially just a cold, but everyone's entitled to a bit of sympathy. Rest, fluids, and being looked after for a day or two go a long way — physically and otherwise.",
  nasty_cold: "Colds usually run 7 to 10 days, starting with a sore throat and stuffy nose before settling into a cough. Rest, fluids, and over-the-counter decongestants or paracetamol can ease the worst of it.",
  migraine: "A migraine attack can last anywhere from 4 hours to 3 days, often with throbbing pain on one side, nausea, and sensitivity to light and sound. A dark, quiet room, hydration, and pain relief at the first sign of symptoms tend to help most.",
  toothache: "Tooth pain rarely resolves on its own — it's usually a sign of decay, infection, or a cracked tooth that needs a dentist. In the meantime, paracetamol or ibuprofen, a cold compress, and avoiding very hot, cold, or sugary food can ease the pain.",
  gastro: "Gastro typically clears in 1 to 3 days, though it can knock you around with vomiting, diarrhoea, and stomach cramps while it lasts. The main job is staying hydrated — small sips of water or an oral rehydration solution, and easing back into bland food once you can keep fluids down.",
  the_flu: "The flu typically lasts 5 to 7 days, hitting you suddenly with a high fever, body aches, a dry cough, and extreme fatigue. To recover quickly, rest in bed, drink plenty of water or broth to stay hydrated, and use paracetamol to lower your temperature and soothe pain.",
  covid: "COVID symptoms commonly last 5 to 10 days — fever, cough, fatigue, and sometimes loss of taste or smell. Rest, fluids, and paracetamol for fever and aches are the mainstay, and isolating until you're clear helps keep it from spreading further.",
  bung_back: "Most acute back strains ease within 1 to 2 weeks. Gentle movement tends to help more than strict bed rest, alongside heat or ice, and anti-inflammatories if needed — though pain running down the leg or numbness is worth getting checked.",
  busted_knee: "Recovery from a knee injury varies a lot depending on what's actually been hurt, anywhere from a few days for a mild sprain to months for ligament damage. RICE — rest, ice, compression, elevation — is the standard first response, with a proper assessment if it's not improving.",
  broken_bone: "Most simple fractures take 6 to 8 weeks to heal in a cast or splint, though it varies by bone and age. Keeping weight off it as instructed, managing pain, and turning up to follow-up appointments all matter for healing properly.",
  pulled_hammy: "A mild hamstring strain can settle in 1 to 2 weeks, while a more significant tear can take 6 to 8 weeks or longer. Rest, ice in the first couple of days, and gentle stretching as it improves are the usual path back.",
  post_op: "Recovery time after surgery depends entirely on the procedure, but the basics are universal: follow the surgeon's instructions, rest properly, manage pain as advised, and don't rush back into normal activity before you're cleared to.",
  wisdom_teeth: "Wisdom tooth extraction usually means a few days of swelling and discomfort, with most people back to normal within a week. Cold compresses, soft food, and sticking to any antibiotics or pain relief prescribed all help it along.",
  vertigo: "Vertigo episodes can last anywhere from seconds to days depending on the cause, often bringing a spinning sensation, nausea, and balance trouble. Moving slowly, sitting or lying down when it hits, and avoiding sudden head movements usually helps most.",
  kidney_stones: "Smaller kidney stones often pass within a few days to a couple of weeks, though larger ones can take considerably longer. Drinking plenty of water and staying on top of pain relief are the main things that help while it works its way through.",
  shingles: "Shingles typically lasts 3 to 5 weeks, starting with burning pain before a blistering rash appears, usually on one side of the body. Antiviral medication works best if started early, alongside pain relief and keeping the rash clean and covered.",
  gout: "A gout flare usually peaks within 24 hours and settles over 3 to 10 days, bringing sudden, severe pain and swelling, often in the big toe. Resting and elevating the joint, icing it, staying well hydrated, and anti-inflammatories all help it along."
};

// Single source of truth for the gift products — also used by the wishlist
// picker on the listing page and the scoped gift page.
const PRODUCT_CATALOGUE = {
  lasagne: { name: 'Latina Beef Lasagne', price: 40, img: 'products/lasagne.png' },
  macandcheese: { name: 'Herbert Adams Mac & Cheese with Pulled Beef', price: 40, img: 'products/macandcheese.png' },
  pesto: { name: 'Youfoodz Chicken Pesto Pasta', price: 40, img: 'products/pesto.png' },
  quiche: { name: 'Herbert Adams Bacon & Cheddar Quiche', price: 40, img: 'products/quiche.png' },
  pizza: { name: 'Gourmet Saba Pepperoni Protein Pizza', price: 40, img: 'products/pizza.png' },
  lindor: { name: 'Lindt Lindor Assorted Box', price: 30, img: 'products/lindor.png' },
  cadbury: { name: 'Cadbury Favourites Ultimate Share', price: 30, img: 'products/cadbury.png' },
  hydrate: { name: 'Berocca Hydrate Raspberry Blackcurrant', price: 40, img: 'products/hydrate.png' },
  gatorade: { name: 'Gatorade Blue Bolt Mini 4 Pack', price: 20, img: 'products/gatorade.png' }
};

const MAX_WISHLIST_ITEMS = 6;

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

function illnessBlurbFor(illnessKey) {
  return illnessKey ? (ILLNESS_BLURBS[illnessKey] || null) : null;
}

// GET /api/listings — active, non-expired listings for the public board.
// Shows full name + nickname together so people can confirm it's genuinely
// their mate (e.g. "Roderick Charles Henderson (Digger)"). Street address
// and school are never exposed here — those stay verification/delivery-only.
// Supports ?q= for a name/suburb search, and ?admin=true (used only by the
// admin dashboard) to also include address/school for managing listings.
router.get('/', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const q = (req.query.q || '').trim();
    const isAdmin = req.query.admin === 'true';

    const columns = isAdmin
      ? 'id, full_name, nickname, suburb, address, school, mobile, photo_url, illness, wishlist, created_at'
      : 'id, full_name, nickname, suburb, photo_url, illness, wishlist, created_at';

    let query = supabase
      .from('listings')
      .select(columns)
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
      address: isAdmin ? row.address : undefined,
      school: isAdmin ? row.school : undefined,
      mobile: isAdmin ? row.mobile : undefined,
      photoUrl: row.photo_url,
      illness: row.illness ? (ILLNESS_LABELS[row.illness] || row.illness) : null,
      illnessBlurb: illnessBlurbFor(row.illness),
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
      illnessBlurb: illnessBlurbFor(data.illness),
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
    const { fullName, nickname, school, suburb, address, mobile, illness, wishlist, photoDataUrl } = req.body || {};

    if (!fullName || !nickname || !school || !suburb || !address || !mobile || !photoDataUrl) {
      return res.status(400).json({
        error: 'fullName, nickname, school, suburb, address, mobile and photoDataUrl are all required'
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
        mobile,
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

// DELETE /api/listings/:id — remove a listing (admin only, no auth yet —
// the admin page itself isn't link-discoverable from the public site)
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('[listings:delete]', err.message);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

module.exports = router;
