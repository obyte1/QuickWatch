const Notification = require('../Models/Notification');
const User = require('../Models/Users');

const sendExpoPush = async (tokens, notification) => {
  const expoTokens = tokens.filter((token) => token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
  if (!expoTokens.length) return { attempted: false, sent: false };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expoTokens.map((to) => ({
      to,
      title: notification.title,
      body: notification.message,
      data: notification.data,
    }))),
  });

  if (!response.ok) throw new Error(`Expo push request failed with HTTP ${response.status}`);
  return { attempted: true, sent: true };
};

const sendFcmPush = async (tokens, notification) => {
  if (!process.env.FCM_SERVER_KEY) return { attempted: false, sent: false };
  const fcmTokens = tokens.filter((token) => !token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken['));
  if (!fcmTokens.length) return { attempted: false, sent: false };

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${process.env.FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registration_ids: fcmTokens,
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: notification.data,
    }),
  });

  if (!response.ok) throw new Error(`FCM push request failed with HTTP ${response.status}`);
  return { attempted: true, sent: true };
};

const deliverPush = async (user, notification) => {
  const preferenceRoot = notification.type.split('.')[0];
  const preferenceKey = preferenceRoot === 'payout' ? 'payment' : preferenceRoot;
  if (user.notificationPreferences?.push === false || user.notificationPreferences?.[preferenceKey] === false) {
    return { status: 'not_attempted' };
  }

  const tokens = (user.pushTokens || [])
    .filter((device) => device.enabled !== false)
    .map((device) => device.token)
    .filter(Boolean);

  if (!tokens.length) return { status: 'no_device' };

  const expoResult = await sendExpoPush(tokens, notification);
  const fcmResult = await sendFcmPush(tokens, notification);
  if (expoResult.sent || fcmResult.sent) return { status: 'sent' };
  return { status: 'not_attempted' };
};

const notifyUser = async ({ userId, type, title, message, data = {} }) => {
  if (!userId) return null;

  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    data,
  });
  const user = await User.findById(userId).select('pushTokens notificationPreferences');
  if (!user) return notification;

  try {
    const delivery = await deliverPush(user, notification);
    notification.pushStatus = delivery.status;
  } catch (error) {
    notification.pushStatus = 'failed';
    notification.pushError = error.message;
  }
  await notification.save();
  return notification;
};

const notifyUsers = async ({ userIds, type, title, message, data = {} }) => {
  return Promise.all([...new Set(userIds.filter(Boolean).map(String))].map((userId) => notifyUser({
    userId,
    type,
    title,
    message,
    data,
  })));
};

module.exports = { notifyUser, notifyUsers };
