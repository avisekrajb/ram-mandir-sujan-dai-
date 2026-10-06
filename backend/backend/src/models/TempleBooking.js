const mongoose = require('mongoose');

/**
 * Public (no-login) bookings made from the Events page.
 *
 * The Atlas database is shared with other apps, so every collection name here
 * is explicit and prefixed with "temple". The older login-only Booking model
 * (collection "bookings") is untouched.
 */

const L = { ne: { type: String, default: '' }, en: { type: String, default: '' } };

// ---- Bookable item (a puja, a venue, a shoot...) ---------------------------
const itemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, trim: true }, // e.g. puja, wedding, shooting
    categoryLabel: L,
    name: L,
    detail: L,
    price: { type: Number, required: true, min: 0 }, // NPR
    priceIsPlaceholder: { type: Boolean, default: false },
    perPerson: { type: Boolean, default: false }, // price x quantity when true
    maxQuantity: { type: Number, default: 1, min: 1, max: 500 },
    slots: { type: [String], default: [] }, // e.g. ["07:00", "16:00"]; empty = whole day
    capacity: { type: Number, default: 0, min: 0 }, // bookings (or people) per date+slot; 0 = no limit
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'templebookingitems' }
);

// ---- Booking ---------------------------------------------------------------
const historySchema = new mongoose.Schema(
  { at: { type: Date, default: Date.now }, by: String, action: String, note: String },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'TempleBookingItem', required: true },
    itemName: L,
    category: { type: String, default: '' },
    categoryLabel: L,
    date: { type: String, required: true }, // YYYY-MM-DD
    slot: { type: String, default: '' },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, default: '', trim: true, maxlength: 120 },
    notes: { type: String, default: '', trim: true, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    paymentMethod: { type: String, default: 'temple' },
    paidAt: Date,
    cancelReason: { type: String, default: '', maxlength: 500 },
    adminNote: { type: String, default: '', maxlength: 1000 },
    holdsCapacity: { type: Boolean, default: false },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true, collection: 'templebookings' }
);
bookingSchema.index({ date: 1, item: 1 });
bookingSchema.index({ createdAt: -1 });

// ---- Seat counter per item+date+slot (atomic capacity check) ---------------
const slotCountSchema = new mongoose.Schema(
  { key: { type: String, required: true, unique: true }, used: { type: Number, default: 0 } },
  { collection: 'templebookingslotcounts' }
);

const TempleBookingItem = mongoose.model('TempleBookingItem', itemSchema);
const TempleBooking = mongoose.model('TempleBooking', bookingSchema);
const TempleBookingSlotCount = mongoose.model('TempleBookingSlotCount', slotCountSchema);

module.exports = { TempleBookingItem, TempleBooking, TempleBookingSlotCount };
