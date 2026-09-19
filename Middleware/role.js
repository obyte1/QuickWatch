const { normalizeRoles } = require('../Models/Users');

exports.hasRole = (user, role) => {
    const currentRoles = normalizeRoles([
        ...(Array.isArray(user?.roles) ? user.roles : []),
        ...(user?.role ? [user.role] : []),
    ]);
    return currentRoles.includes(role);
};

//create authorization middleware
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.some((role) => exports.hasRole(req.user, role))) {
            return res.status(403).json({ message: 'Not authorized to access this route' });
        }
        next();
    };
};
