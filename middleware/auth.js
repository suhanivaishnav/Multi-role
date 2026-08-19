const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

    // Check if storedPassword is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
        return await bcrypt.compare(plainPassword, storedPassword);
    }

    // Fallback for plain text passwords in seed data
    return plainPassword === storedPassword;
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

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = decoded;
        next();
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
    hashPassword,
    comparePassword,
    generateToken,
    authenticate,
    authenticateToken: authenticate, // keep alias for backward compatibility
    authorize,
    requireRole: authorize // keep alias for backward compatibility
};
