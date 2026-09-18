const User = require('../Models/Users');

exports.requireActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id).select('status emailVerified');
    if (!user) return res.status(401).json({ message: 'Account not found.' });
    if (user.emailVerified === false) {
      return res.status(403).json({ message: 'Please verify your email address before using this action.' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({
        message: `Your account is ${user.status}. An Active account is required for this action.`,
        accountStatus: user.status,
      });
    }
    req.account = user;
    return next();
  } catch (error) {
    console.error('requireActive error:', error);
    return res.status(500).json({ message: 'Unable to verify account status.' });
  }
};
