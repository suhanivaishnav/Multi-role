const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../helpers/logger');

const JWT_SECRET = process.env.JWT_SECRET;

//Hash a plain text password using bcrypt
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

//Compare a plain text password against a stored password or hash
//Supports plain text comparison as a fallback for initial seed data
const comparePassword = async (plainPassword, storedPassword) => {
    if (!storedPassword || !plainPassword) return false;
    return await bcrypt.compare(plainPassword, storedPassword);
};

//Generate a JWT token for an authenticated user/admin/seller
const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

//Middleware to authenticate requests using JWT Bearer token
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        logger.warn('Authentication token required but not provided');
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            logger.warn(`Token verification failed: ${err.message}`);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        try {
            const user = await User.findByPk(decoded.id, {
                include: ['roles']
            });
            if (!user) {
                return res.status(401).json({ message: 'Account no longer exists' });
            }
            if (user.status !== "Active") {
                return res.status(403).json({ message: `Account is ${user.status.toLowerCase()}` });
            }
            req.user = { ...decoded, roles: user.roles ? user.roles.map(r => r.name) : [] };
            next();
        } catch (dbErr) {
            return res.status(500).json({ message: 'Authentication error' });
        }
    });
};

//Middleware to restrict access based on user role(s)
// @param  {...string} roles Allowed roles (e.g. 'user', 'seller', 'admin')
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userRoles = req.user.roles ? req.user.roles.map(r => r.toLowerCase()) : [];
        const allowedRoles = roles.map(r => r.toLowerCase());

        const hasAccess = userRoles.some(role => allowedRoles.includes(role));

        if (hasAccess) {
            return next();
        }

        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    };
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    authenticate,
    authenticateToken: authenticate, // keep alias for backward compatibility
    authorize,
    requireRole: authorize // keep alias for backward compatibility
};
