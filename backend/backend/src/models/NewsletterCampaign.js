const mongoose = require('mongoose');

/**
 * One mailing to the subscribers: an event, a blog post, a festival wish or an announcement the
 * admin wrote. The worker (services/newsletterService.js) walks the audience in `_id` order and
 * remembers where it got to (`lastRecipientId`), so a restart or the daily sending limit never
 * means anybody is mailed twice or skipped.
 *
 * Explicit collection name: the Atlas database is shared with other applications.
 */

const KINDS = ['event', 'blog', 'festival', 'custom'];
const TOPICS = ['events', 'festivals', 'news'];
const STATUSES = ['queued', 'sending', 'done', 'cancelled', 'failed', 'expired'];

const campaignSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: KINDS, required: true },
    // Who it is for: only subscribers who ticked this topic.
    topic: { type: String, enum: TOPICS, required: true },
    // One mailing per event / blog / festival day: the same thing is never queued twice.
    dedupeKey: { type: String, default: undefined },
    // Everything the e-mail needs, captured when it was queued (editing the event later changes nothing).
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Short English label for the admin list.
    label: { type: String, default: '', maxlength: 200 },

    status: { type: String, enum: STATUSES, default: 'queued', index: true },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
    },
    lastRecipientId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Only one worker may send a campaign at a time: it holds the lease (renewed before every e-mail) under its own
    // id, and every update it makes is conditional on still being the holder.
    leaseUntil: { type: Date, default: null },
    leaseOwner: { type: String, default: '' },
    // Higher goes first (a festival wish must not queue behind a long announcement), and a mailing that is only
    // worth sending on its day (a festival wish) is dropped, not sent late, once expiresAt has passed.
    priority: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    error: { type: String, default: '', maxlength: 300 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: undefined },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false, collection: 'templenewslettercampaigns' }
);

campaignSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

const NewsletterCampaign = mongoose.model('NewsletterCampaign', campaignSchema);
NewsletterCampaign.KINDS = KINDS;

module.exports = NewsletterCampaign;
