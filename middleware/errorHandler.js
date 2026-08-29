const logger = require("../helpers/logger");

const errorHandler = (err, req, res, next) => {
    logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });

    const status = err.status || 500;
    let message = err.message || "Internal Server Error";

    if (err.isJoi) {
        return res.status(400).json({
            message: "Validation Error",
            errors: err.details.map(detail => detail.message)
        });
    }

    // Standardize database/Sequelize errors without leaking internals
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            message: "Database validation error",
            errors: err.errors.map(e => e.message)
        });
    }

    if (err.name === 'SequelizeDatabaseError') {
        message = "A database error occurred";
    }

    // Mask internal server errors in production
    if (status === 500 && process.env.NODE_ENV === 'production') {
        message = "Internal Server Error";
    }

    res.status(status).json({
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = errorHandler;
