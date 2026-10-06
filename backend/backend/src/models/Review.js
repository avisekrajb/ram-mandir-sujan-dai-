const mongoose = require('mongoose');

// A visitor review shown on the Contact page. New reviews start as "pending"
// and only appear publicly once an admin approves them.
const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: 'rating must be a whole number' },
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'hidden'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

reviewSchema.index({ status: 1, createdAt: -1 });

// Explicit collection name: this database is shared with other apps, one of which
// already owns a "reviews" collection (product reviews with a unique userId +
// productId index), so the default name would clash and allow only one review.
module.exports = mongoose.model('Review', reviewSchema, 'visitorreviews');
