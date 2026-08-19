const { User } = require("../models");
const { Op } = require("sequelize");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../helpers/email");
const { comparePassword, generateToken, hashPassword } = require("../middleware/auth");

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ where: { email } });
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
            role: user.role
        });

        const userJson = user.toJSON();
        delete userJson.password;

        return res.status(200).json({
            message: "Login successful",
            token,
            user: userJson
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to login",
            error: "An internal server error occurred"
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

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
            console.error("Failed to dispatch email, but token was generated in DB.");
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

        if (!token || !newPassword) {
            return res.status(400).json({ message: "Token and new password are required" });
        }

        // Hash the incoming token to compare with the one in DB
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { [Op.gt]: new Date() } // Ensure it hasn't expired
            }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired password reset token" });
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
