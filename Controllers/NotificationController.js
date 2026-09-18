const Notification = require('../Models/Notification');
const User = require('../Models/Users');
const { notifyUser, notifyUsers } = require('../Services/notificationService');

const getUserId = (req) => req.user?.id || req.user?._id;

exports.registerDevice = async (req, res) => {
  try {
    const { token, platform = 'unknown' } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'A device push token is required.' });
    }

    await User.findByIdAndUpdate(getUserId(req), {
      $pull: { pushTokens: { token } },
    });
    await User.findByIdAndUpdate(getUserId(req), {
      $push: { pushTokens: { token, platform, enabled: true, updatedAt: new Date() } },
    });

    return res.status(201).json({ message: 'Device registered for push notifications.' });
  } catch (error) {
    console.error('registerDevice error:', error);
    return res.status(500).json({ message: 'Error registering device.', error: error.message });
  }
};

exports.removeDevice = async (req, res) => {
  try {
    await User.findByIdAndUpdate(getUserId(req), {
      $pull: { pushTokens: { token: req.params.token } },
    });
    return res.status(200).json({ message: 'Device removed from push notifications.' });
  } catch (error) {
    console.error('removeDevice error:', error);
    return res.status(500).json({ message: 'Error removing device.', error: error.message });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findById(getUserId(req)).select('notificationPreferences');
    return res.status(200).json({ preferences: user?.notificationPreferences || {} });
  } catch (error) {
    console.error('getPreferences error:', error);
    return res.status(500).json({ message: 'Error fetching notification preferences.', error: error.message });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const allowedKeys = ['push', 'email', 'booking', 'payment', 'chat', 'marketing'];
    const preferences = {};
    for (const key of allowedKeys) {
      if (typeof req.body[key] !== 'undefined') {
        if (typeof req.body[key] !== 'boolean') {
          return res.status(400).json({ message: `${key} preference must be boolean.` });
        }
        preferences[key] = req.body[key];
      }
    }
    const user = await User.findByIdAndUpdate(
      getUserId(req),
      { $set: Object.fromEntries(Object.entries(preferences).map(([key, value]) => [`notificationPreferences.${key}`, value])) },
      { new: true, runValidators: true }
    ).select('notificationPreferences');
    return res.status(200).json({ message: 'Notification preferences updated.', preferences: user.notificationPreferences });
  } catch (error) {
    console.error('updatePreferences error:', error);
    return res.status(500).json({ message: 'Error updating notification preferences.', error: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const filter = { user: getUserId(req) };
    if (req.query.unreadOnly === 'true') filter.readAt = null;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);
    const unreadCount = await Notification.countDocuments({ user: getUserId(req), readAt: null });

    return res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ message: 'Error fetching notifications.', error: error.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ user: getUserId(req), readAt: null });
    return res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return res.status(500).json({ message: 'Error fetching unread notification count.', error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: getUserId(req) },
      { readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    return res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    console.error('markAsRead error:', error);
    return res.status(500).json({ message: 'Error marking notification as read.', error: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: getUserId(req), readAt: null },
      { readAt: new Date() }
    );
    return res.status(200).json({ message: 'All notifications marked as read.', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    return res.status(500).json({ message: 'Error marking notifications as read.', error: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: getUserId(req) });
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    return res.status(200).json({ message: 'Notification deleted.' });
  } catch (error) {
    console.error('deleteNotification error:', error);
    return res.status(500).json({ message: 'Error deleting notification.', error: error.message });
  }
};

exports.sendToUser = async (req, res) => {
  try {
    const { userId, type = 'admin', title, message, data = {} } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ message: 'userId, title and message are required.' });
    }
    const user = await User.findById(userId).select('_id');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const notification = await notifyUser({ userId, type, title, message, data });
    return res.status(201).json({ message: 'Notification sent.', notification });
  } catch (error) {
    console.error('sendToUser error:', error);
    return res.status(500).json({ message: 'Error sending notification.', error: error.message });
  }
};

exports.broadcast = async (req, res) => {
  try {
    const { role, type = 'broadcast', title, message, data = {} } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'title and message are required.' });

    const filter = role ? { role } : {};
    const users = await User.find(filter).select('_id');
    const notifications = await notifyUsers({
      userIds: users.map((user) => user._id),
      type,
      title,
      message,
      data,
    });
    return res.status(201).json({ message: 'Broadcast sent.', count: notifications.length });
  } catch (error) {
    console.error('broadcast error:', error);
    return res.status(500).json({ message: 'Error broadcasting notification.', error: error.message });
  }
};
