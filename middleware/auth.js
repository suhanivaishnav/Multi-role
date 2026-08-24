const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;

// Create a simple logging middleware
function requestLogger(req, res, next) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.url}`);
    next(); // Don't forget to call next()
}

const validateUserRegistration = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errors.push("A valid email is required");
    }

    if (!password || password.length < 6) {
        errors.push("Password must be at least 6 characters long");
    }

    if (errors.length > 0) {
        return res.status(400).json(errors);
    }

    next();
};

const validateUserUpdate = (req, res, next) => {
    const { email, phone, password } = req.body;
    const errors = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email !== undefined && !emailRegex.test(email)) {
        errors.push("A valid email is required");
    }

    if (password !== undefined && password.length < 6) {
        errors.push("Password must be at least 6 characters long");
    }

    if (phone !== undefined && phone.trim().length < 10) {
        errors.push("Phone must be at least 10 characters long");
    }

    if (errors.length > 0) {
        return res.status(400).json(errors);
    }

    next();
};


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
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        try {
            const user = await User.findByPk(decoded.id);
            if (!user) {
                return res.status(401).json({ message: 'Account no longer exists' });
            }
            if (user.status !== "Active") {
                return res.status(403).json({ message: `Account is ${user.status.toLowerCase()}` });
            }
            req.user = { ...decoded, role: user.role };
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

        const userRole = req.user.role ? req.user.role.toLowerCase() : "";
        const allowedRoles = roles.map(r => r.toLowerCase());

        if (allowedRoles.includes(userRole)) {
            return next();
        }

        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    };
};

module.exports = {
    requestLogger,
    validateUserRegistration,
    validateUserUpdate,
    hashPassword,
    comparePassword,
    generateToken,
    authenticate,
    authenticateToken: authenticate, // keep alias for backward compatibility
    authorize,
    requireRole: authorize // keep alias for backward compatibility
};
