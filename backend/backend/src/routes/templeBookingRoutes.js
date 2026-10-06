const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requireArea } = require('../middleware/permissions');
const rateLimit = require('../middleware/rateLimit');
const { TempleBookingItem, TempleBooking, TempleBookingSlotCount } = require('../models/TempleBooking');
const { DEFAULT_BOOKING_ITEMS } = require('../data/templeBookingItems');

/**
 * Public bookings from the Events page (no login), and their admin side.
 *   Public:  GET  /api/temple-bookings/items
 *            GET  /api/temple-bookings/availability?item=&date=
 *            POST /api/temple-bookings
 *            GET  /api/temple-bookings/lookup?ref=&phone=
 *   Admin (role admin/superadmin + "bookings" access area):
 *            /api/temple-bookings/admin/...
 * Payment is "pay at the temple": admin marks a booking paid.
 */

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many booking attempts. Please try again in a few minutes.',
});
const readLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
const lookupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

const STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];
const PAYMENTS = ['unpaid', 'paid'];
const HOLDING = ['pending', 'confirmed', 'completed'];
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RX = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLOT_RX = /^([01]\d|2[0-3]):[0-5]\d$/;
const KEY_RX = /^[a-z0-9-]{2,60}$/;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Today's date in Nepal (UTC+05:45), as YYYY-MM-DD.
const todayNepal = () => new Date(Date.now() + 345 * 60 * 1000).toISOString().slice(0, 10);
const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const validDate = (ymd) => {
  if (!DATE_RX.test(ymd)) return false;
  const d = new Date(`${ymd}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === ymd;
};

let seeded = false;
const ensureSeed = async () => {
  if (seeded) return;
  const count = await TempleBookingItem.estimatedDocumentCount();
  if (count === 0) {
    try {
      await TempleBookingItem.insertMany(DEFAULT_BOOKING_ITEMS, { ordered: false });
    } catch (e) {
      if (e.code !== 11000) throw e; // another request seeded at the same time
    }
  }
  seeded = true;
};

const slotKey = (itemId, date, slot) => `${itemId}|${date}|${slot || '-'}`;

// Atomically take `qty` places; false when that would pass capacity.
const reserve = async (item, date, slot, qty) => {
  if (!item.capacity) return true;
  if (qty > item.capacity) return false;
  try {
    await TempleBookingSlotCount.findOneAndUpdate(
      { key: slotKey(item._id, date, slot), used: { $lte: item.capacity - qty } },
      { $inc: { used: qty } },
      { upsert: true, new: true }
    );
    return true;
  } catch (e) {
    if (e.code === 11000) return false; // counter exists and is full
    throw e;
  }
};
const release = async (itemId, date, slot, qty) => {
  await TempleBookingSlotCount.updateOne({ key: slotKey(itemId, date, slot) }, { $inc: { used: -qty } });
};

const makeReference = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  // crypto, not Math.random: the reference is half of the credential used to look a booking up.
  for (let i = 0; i < 5; i += 1) s += alphabet[crypto.randomInt(alphabet.length)];
  return `SRM-${todayNepal().slice(2).replace(/-/g, '')}-${s}`;
};

const publicItem = (i) => ({
  _id: i._id, key: i.key, category: i.category, categoryLabel: i.categoryLabel, name: i.name,
  detail: i.detail, price: i.price, perPerson: i.perPerson, maxQuantity: i.maxQuantity,
  slots: i.slots, capacity: i.capacity, order: i.order,
});

const publicBooking = (b) => ({
  reference: b.reference, itemName: b.itemName, categoryLabel: b.categoryLabel, date: b.date, slot: b.slot,
  quantity: b.quantity, unitPrice: b.unitPrice, total: b.total, name: b.name, status: b.status,
  paymentStatus: b.paymentStatus, cancelReason: b.cancelReason, createdAt: b.createdAt,
});

// ============================================================ PUBLIC

router.get('/items', readLimiter, async (req, res) => {
  try {
    await ensureSeed();
    const items = await TempleBookingItem.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ success: true, data: items.map(publicItem), today: todayNepal() });
  } catch (error) {
    console.error('Temple booking items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/availability', readLimiter, async (req, res) => {
  try {
    const itemId = str(req.query.item, 40);
    const date = str(req.query.date, 10);
    if (!/^[a-f0-9]{24}$/i.test(itemId) || !validDate(date)) {
      return res.status(400).json({ message: 'Invalid item or date' });
    }
    const item = await TempleBookingItem.findOne({ _id: itemId, active: true }).lean();
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const slots = item.slots.length ? item.slots : [''];
    if (!item.capacity) {
      return res.json({ success: true, data: slots.map((slot) => ({ slot, remaining: null })) });
    }
    const counters = await TempleBookingSlotCount.find({ key: { $in: slots.map((s) => slotKey(item._id, date, s)) } }).lean();
    const used = Object.fromEntries(counters.map((c) => [c.key, c.used]));
    res.json({
      success: true,
      data: slots.map((slot) => ({ slot, remaining: Math.max(0, item.capacity - (used[slotKey(item._id, date, slot)] || 0)) })),
    });
  } catch (error) {
    console.error('Temple booking availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', createLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    if (body.hp_field) {
      return res.status(201).json({ success: true, data: { reference: 'SRM-000000-00000' } });
    }
    const itemId = str(body.item, 40);
    const date = str(body.date, 10);
    const slot = str(body.slot, 5);
    const name = str(body.name, 100);
    const phone = str(body.phone, 20);
    const email = str(body.email, 120);
    const notes = str(body.notes, 1000);
    const quantity = Number.parseInt(body.quantity, 10) || 1;

    if (!/^[a-f0-9]{24}$/i.test(itemId)) return res.status(400).json({ message: 'Please choose what to book.', field: 'item' });
    if (name.length < 2) return res.status(400).json({ message: 'Please enter your name.', field: 'name' });
    if (!PHONE_RX.test(phone) || phone.replace(/\D/g, '').length < 7) {
      return res.status(400).json({ message: 'Please enter a valid phone number.', field: 'phone' });
    }
    if (email && !EMAIL_RX.test(email)) return res.status(400).json({ message: 'Please enter a valid email.', field: 'email' });

    const today = todayNepal();
    if (!validDate(date) || date < today || date > addDays(today, 365)) {
      return res.status(400).json({ message: 'Please choose a date from today up to one year ahead.', field: 'date' });
    }

    const item = await TempleBookingItem.findOne({ _id: itemId, active: true });
    if (!item) return res.status(404).json({ message: 'This item is not available for booking.', field: 'item' });

    if (item.slots.length) {
      if (!item.slots.includes(slot)) return res.status(400).json({ message: 'Please choose a time.', field: 'slot' });
    } else if (slot) {
      return res.status(400).json({ message: 'This item has no time slots.', field: 'slot' });
    }
    const maxQ = item.perPerson ? item.maxQuantity : 1;
    if (quantity < 1 || quantity > maxQ) {
      return res.status(400).json({ message: `Quantity must be between 1 and ${maxQ}.`, field: 'quantity' });
    }

    const ok = await reserve(item, date, slot, quantity);
    if (!ok) {
      return res.status(409).json({ message: 'That date or time is fully booked. Please choose another.', code: 'FULL', field: 'date' });
    }

    const unitPrice = item.price;
    const total = item.perPerson ? unitPrice * quantity : unitPrice;
    let booking;
    try {
      for (let attempt = 0; attempt < 5 && !booking; attempt += 1) {
        try {
          booking = await TempleBooking.create({
            reference: makeReference(),
            item: item._id,
            itemName: item.name,
            category: item.category,
            categoryLabel: item.categoryLabel,
            date, slot, quantity, unitPrice, total, name, phone, email, notes,
            holdsCapacity: Boolean(item.capacity),
            history: [{ by: 'visitor', action: 'created', note: '' }],
          });
        } catch (e) {
          if (e.code !== 11000) throw e;
        }
      }
      if (!booking) throw new Error('Could not allocate a reference');
    } catch (e) {
      if (item.capacity) await release(item._id, date, slot, quantity);
      throw e;
    }

    res.status(201).json({ success: true, data: publicBooking(booking) });
  } catch (error) {
    console.error('Create temple booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/lookup', lookupLimiter, async (req, res) => {
  try {
    const ref = str(req.query.ref, 30).toUpperCase();
    const digits = str(req.query.phone, 20).replace(/\D/g, '');
    if (!/^SRM-\d{6}-[A-Z0-9]{5}$/.test(ref) || digits.length < 7) {
      return res.status(400).json({ message: 'Enter the reference and phone number.' });
    }
    const b = await TempleBooking.findOne({ reference: ref }).lean();
    if (!b || b.phone.replace(/\D/g, '') !== digits) {
      return res.status(404).json({ message: 'No booking found for that reference and phone.' });
    }
    res.json({ success: true, data: publicBooking(b) });
  } catch (error) {
    console.error('Temple booking lookup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================ ADMIN

const adminOnly = [protect, admin, requireArea('bookings')];
const actor = (req) => req.user?.name || req.user?.email || 'admin';

const buildFilter = (q) => {
  const f = {};
  const from = str(q.from, 10);
  const to = str(q.to, 10);
  if (validDate(from) || validDate(to)) {
    f.date = {};
    if (validDate(from)) f.date.$gte = from;
    if (validDate(to)) f.date.$lte = to;
  }
  if (KEY_RX.test(str(q.category, 60))) f.category = str(q.category, 60);
  if (STATUSES.includes(q.status)) f.status = q.status;
  if (PAYMENTS.includes(q.payment)) f.paymentStatus = q.payment;
  const search = str(q.q, 60);
  if (search) {
    const rx = new RegExp(escapeRx(search), 'i');
    f.$or = [{ name: rx }, { phone: rx }, { reference: rx }, { email: rx }];
  }
  return f;
};

router.get('/admin/bookings', adminOnly, async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const sort = req.query.sort === 'date' ? { date: 1, slot: 1 } : { createdAt: -1 };
    const [data, total, summary] = await Promise.all([
      TempleBooking.find(filter).sort(sort).limit(500).lean(),
      TempleBooking.countDocuments(filter),
      TempleBooking.aggregate([
        { $match: filter },
        { $group: { _id: { status: '$status', pay: '$paymentStatus' }, n: { $sum: 1 }, amount: { $sum: '$total' } } },
      ]),
    ]);
    res.json({ success: true, data, total, summary });
  } catch (error) {
    console.error('Admin temple bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const csvCell = (v) => {
  let s = v === undefined || v === null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // keep spreadsheets from running formulas
  return `"${s.replace(/"/g, '""')}"`;
};

router.get('/admin/bookings.csv', adminOnly, async (req, res) => {
  try {
    const rows = await TempleBooking.find(buildFilter(req.query)).sort({ date: 1, slot: 1 }).limit(5000).lean();
    const head = ['Reference', 'Date', 'Time', 'Category', 'Item', 'Quantity', 'Total (NPR)', 'Name', 'Phone', 'Email', 'Status', 'Payment', 'Notes', 'Cancel reason', 'Created'];
    const lines = rows.map((b) => [
      b.reference, b.date, b.slot, b.categoryLabel?.en || b.category, b.itemName?.en || b.itemName?.ne, b.quantity, b.total,
      b.name, b.phone, b.email, b.status, b.paymentStatus, b.notes, b.cancelReason, b.createdAt?.toISOString?.(),
    ].map(csvCell).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="temple-bookings-${todayNepal()}.csv"`);
    res.send(`﻿${[head.map(csvCell).join(','), ...lines].join('\r\n')}`);
  } catch (error) {
    console.error('Admin temple bookings csv error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/admin/bookings/:id', adminOnly, async (req, res) => {
  try {
    const b = await TempleBooking.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    const { status, paymentStatus } = req.body || {};
    const reason = str(req.body?.cancelReason, 500);
    const by = actor(req);

    if (status !== undefined && status !== b.status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
      if (status === 'cancelled' && !reason) return res.status(400).json({ message: 'Please give a reason for cancelling.' });
      const willHold = HOLDING.includes(status);
      const item = await TempleBookingItem.findById(b.item);
      if (willHold && !b.holdsCapacity && item && item.capacity) {
        const ok = await reserve(item, b.date, b.slot, b.quantity);
        if (!ok) return res.status(409).json({ message: 'That date or time is now full; cannot reinstate.' });
        b.holdsCapacity = true;
      }
      if (!willHold && b.holdsCapacity) {
        await release(b.item, b.date, b.slot, b.quantity);
        b.holdsCapacity = false;
      }
      b.history.push({ by, action: `status:${status}`, note: status === 'cancelled' ? reason : '' });
      b.status = status;
      b.cancelReason = status === 'cancelled' ? reason : '';
    }
    if (paymentStatus !== undefined && paymentStatus !== b.paymentStatus) {
      if (!PAYMENTS.includes(paymentStatus)) return res.status(400).json({ message: 'Invalid payment status' });
      b.paymentStatus = paymentStatus;
      b.paidAt = paymentStatus === 'paid' ? new Date() : undefined;
      b.history.push({ by, action: `payment:${paymentStatus}`, note: '' });
    }
    if (typeof req.body?.adminNote === 'string') b.adminNote = str(req.body.adminNote, 1000);
    await b.save();
    res.json({ success: true, data: b });
  } catch (error) {
    console.error('Admin temple booking update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/admin/bookings/:id', adminOnly, async (req, res) => {
  try {
    const b = await TempleBooking.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    if (b.holdsCapacity) await release(b.item, b.date, b.slot, b.quantity);
    await b.deleteOne();
    res.json({ success: true });
  } catch (error) {
    console.error('Admin temple booking delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---- catalogue ----
const cleanItem = (body, partial) => {
  const out = {};
  const err = (m) => ({ error: m });
  const L = (v) => ({ ne: str(v?.ne, 200), en: str(v?.en, 200) });
  if (!partial || body.key !== undefined) {
    const key = str(body.key, 60).toLowerCase();
    if (!KEY_RX.test(key)) return err('Key: 2-60 lowercase letters, digits or dashes.');
    out.key = key;
  }
  if (!partial || body.category !== undefined) {
    const c = str(body.category, 60).toLowerCase();
    if (!KEY_RX.test(c)) return err('Category: 2-60 lowercase letters, digits or dashes.');
    out.category = c;
  }
  if (!partial || body.name !== undefined) {
    out.name = L(body.name);
    if (!out.name.ne && !out.name.en) return err('Name is required.');
  }
  if (body.categoryLabel !== undefined) out.categoryLabel = L(body.categoryLabel);
  if (body.detail !== undefined) out.detail = L(body.detail);
  if (!partial || body.price !== undefined) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0 || p > 10000000) return err('Price must be a number from 0.');
    out.price = Math.round(p);
  }
  if (body.capacity !== undefined) {
    const c = Number.parseInt(body.capacity, 10);
    if (!(c >= 0 && c <= 10000)) return err('Capacity must be 0 (no limit) or more.');
    out.capacity = c;
  }
  if (body.maxQuantity !== undefined) {
    const m = Number.parseInt(body.maxQuantity, 10);
    if (!(m >= 1 && m <= 500)) return err('Max quantity must be 1-500.');
    out.maxQuantity = m;
  }
  if (body.order !== undefined) out.order = Number.parseInt(body.order, 10) || 0;
  ['perPerson', 'active', 'priceIsPlaceholder'].forEach((k) => {
    if (body[k] !== undefined) out[k] = Boolean(body[k]);
  });
  if (body.slots !== undefined) {
    const list = (Array.isArray(body.slots) ? body.slots : String(body.slots).split(','))
      .map((s) => String(s).trim()).filter(Boolean);
    if (list.some((s) => !SLOT_RX.test(s))) return err('Times must look like 07:00, comma separated.');
    out.slots = [...new Set(list)].sort();
  }
  return { data: out };
};

router.get('/admin/items', adminOnly, async (req, res) => {
  try {
    await ensureSeed();
    const items = await TempleBookingItem.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/items', adminOnly, async (req, res) => {
  try {
    const { data, error } = cleanItem(req.body || {}, false);
    if (error) return res.status(400).json({ message: error });
    const item = await TempleBookingItem.create(data);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That key is already used.' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/admin/items/:id', adminOnly, async (req, res) => {
  try {
    const { data, error } = cleanItem(req.body || {}, true);
    if (error) return res.status(400).json({ message: error });
    const item = await TempleBookingItem.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That key is already used.' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/admin/items/:id', adminOnly, async (req, res) => {
  try {
    const used = await TempleBooking.exists({ item: req.params.id });
    if (used) return res.status(409).json({ message: 'This item has bookings. Turn it off instead of deleting.' });
    const item = await TempleBookingItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
