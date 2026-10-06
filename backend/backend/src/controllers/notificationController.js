const Notification = require('../models/Notification');
const { hasArea } = require('../middleware/permissions');

// A notification carries the details of what happened (message text, emails,
// amounts), so an admin only sees the types whose area they can open.
const TYPE_AREA = { user: 'users', booking: 'bookings', donation: 'donations', contact: 'contact', subscribe: 'contact' };
const visibleTypes = (user) =>
  ['user', 'booking', 'donation', 'contact', 'subscribe', 'system'].filter((t) => !TYPE_AREA[t] || hasArea(user, TYPE_AREA[t]));
const scoped = (req, extra = {}) => ({ ...extra, type: { $in: visibleTypes(req.user) } });

// @desc    Helper to create an admin notification
//
// Retention, enforced on write so the collection needs no cron job:
//   MAX_NOTIFICATIONS_TOTAL - how many notifications are kept overall, newest
//     first. Older ones are deleted as soon as a new one arrives.
//   MAX_NOTIFICATIONS_PER_TYPE - the ceiling for one type. Without it a burst of
//     sign-ups or reviews would fill the whole list and push real booking and
//     donation alerts out before an admin had read them, which is why this limit
//     exists alongside the total rather than instead of it. At the defaults a
//     single type can take at most half the list.
const MAX_NOTIFICATIONS_TOTAL = 50;
const MAX_NOTIFICATIONS_PER_TYPE = 25;

/*
 * Delete everything past a limit, newest kept. `filter` narrows it to one type;
 * omitted, the whole collection is trimmed.
 */
const trimNotifications = async (filter, max) => {
  const total = await Notification.countDocuments(filter);
  if (total <= max) return 0;

  const excess = await Notification.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(max)
    .select('_id');
  const ids = excess.map((n) => n._id);
  if (!ids.length) return 0;

  const result = await Notification.deleteMany({ _id: { $in: ids } });
  return result.deletedCount;
};

const createNotification = async (type, title, message, data = {}) => {
  try {
    await Notification.create({ type, title, message, data });

    // Trim quietly: housekeeping must never fail the booking / donation that
    // triggered the notification.
    await trimNotifications({ type }, MAX_NOTIFICATIONS_PER_TYPE);
    await trimNotifications({}, MAX_NOTIFICATIONS_TOTAL);
  } catch (error) {
    console.error('❌ Notification create error:', error.message);
  }
};
exports.createNotification = createNotification;

// @desc    Get all notifications
// @route   GET /api/admin/notifications
// @access  Private/Admin
exports.getNotifications = async (req, res) => {
  try {
    const { type, page = 1 } = req.query;
    // Only the newest MAX_NOTIFICATIONS_TOTAL are kept, so asking for more
    // would just page past the end. The limit is capped rather than trusted.
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || MAX_NOTIFICATIONS_TOTAL, 1),
      MAX_NOTIFICATIONS_TOTAL
    );
    const skip = (page - 1) * limit;

    let query = scoped(req);
    if (typeof type === 'string' && type !== 'all') {
      // Asking for a type outside the visible set simply returns nothing.
      query = scoped(req, {});
      query.type = visibleTypes(req.user).includes(type) ? type : { $in: [] };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(parseInt(skip))
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unread = await Notification.countDocuments(scoped(req, { read: false }));
    const count = (t) => (visibleTypes(req.user).includes(t) ? Notification.countDocuments({ type: t }) : 0);

    res.json({
      success: true,
      data: notifications,
      stats: {
        total,
        unread,
        users: await count('user'),
        bookings: await count('booking'),
        donations: await count('donation'),
        contacts: await count('contact'),
        subscribes: await count('subscribe'),
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark a single notification as read / unread
// @route   PUT /api/admin/notifications/:id/read
// @access  Private/Admin
exports.markNotificationRead = async (req, res) => {
  try {
    const { read } = req.body;
    const notification = await Notification.findOne(scoped(req, { _id: req.params.id }));

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.read = typeof read === 'boolean' ? read : !notification.read;
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/admin/notifications/read-all
// @access  Private/Admin
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      scoped(req, { read: false }),
      { $set: { read: true } }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a single notification
// @route   DELETE /api/admin/notifications/:id
// @access  Private/Admin
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete(scoped(req, { _id: req.params.id }));
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete all notifications (optionally by type)
// @route   DELETE /api/admin/notifications
// @access  Private/Admin
exports.deleteAllNotifications = async (req, res) => {
  try {
    const type = req.body && req.body.type;
    let query = scoped(req);
    if (typeof type === 'string' && type !== 'all') {
      query.type = visibleTypes(req.user).includes(type) ? type : { $in: [] };
    }

    const result = await Notification.deleteMany(query);
    res.json({
      success: true,
      message: `${result.deletedCount} notifications deleted`,
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};