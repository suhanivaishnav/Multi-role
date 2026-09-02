const { User } = require("../models");
const logger = require("../helpers/logger");
const { Op } = require("sequelize");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../helpers/email");
const { comparePassword, generateToken, hashPassword } = require("../middleware/auth");
const { syncGuestCart } = require("./cartController");
const { sanitizeUser } = require("../helpers/utils");

exports.loginUser = async (req, res) => {
    try {
        const { email, password, guestCart } = req.body;
        const user = await User.findOne({ where: { email }, include: ['roles'] });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        if (user.status === "Blocked") {
            return res.status(403).json({ message: "Account is blocked" });
        }
        if (user.status === "Pending") {
            return res.status(403).json({ message: "Account is pending approval" });
        }

        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = generateToken({
            id: user.id,
            roles: user.roles ? user.roles.map(r => r.name) : []
        });

        const userJson = sanitizeUser(user);

        // Sync guest cart into the user's account cart if provided
        let cartSync = null;
        if (guestCart && Array.isArray(guestCart) && guestCart.length > 0) {
            try {
                cartSync = await syncGuestCart(user.id, guestCart);
            } catch (syncErr) {
                console.error("Guest cart sync failed during login:", syncErr);
                // Non-blocking: login still succeeds even if sync fails
            }
        }

        return res.status(200).json({
            message: "Login successful",
            token,
            user: userJson,
            ...(cartSync && { cartSync })
        });
    } catch (error) {
        logger.error("Error during login", error);
        return res.status(500).json({
            message: "Failed to login",
            error: "An internal server error occurred"
        });
    }
};

exports.logoutUser = async (req, res) => {
    try {
        // For stateless JWTs, true logout happens client-side by deleting the token.
        // If a token blacklist table exists, you could invalidate the token here.
        return res.status(200).json({
            message: "Logout successful"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to logout",
            error: "An internal server error occurred"
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;


        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Return 200 even if not found to prevent email enumeration
            return res.status(200).json({ message: "If that email is registered, a password reset token has been generated." });
        }

        // Generate a random token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Hash it before saving to DB
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        // Set expiry for 1 hour from now
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000);

        await user.update({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: tokenExpires
        });

        // Send the real email
        try {
            await sendPasswordResetEmail(req.body.email, resetToken);
        } catch (emailError) {
            logger.error("Failed to dispatch email, but token was generated in DB: " + emailError.message);
        }

        return res.status(200).json({
            message: "If that email is registered, a password reset token has been sent to your inbox."
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to process forgot password request",
            error: "An internal server error occurred"
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;


        // Hash the incoming token to compare with the one in DB
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { [Op.gt]: new Date() } // Ensure it hasn't expired
            }
        });

        if (!user) {
            logger.warn(`Invalid or expired password reset token attempted: ${token}`);
            return res.status(400).json({ message: "Invalid or expired password reset token" });
        }

        const isSamePassword = await comparePassword(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ message: "New password cannot be same as old password" });
        }

        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);

        // Update user and clear reset token fields
        await user.update({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        });

        return res.status(200).json({
            message: "Password has been reset successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to reset password",
            error: "An internal server error occurred"
        });
    }
};