const { User, Role } = require("../models");
const { sanitizeUser } = require("../helpers/utils");
const { hashPassword, comparePassword, generateToken } = require("../middleware/auth");
const { syncGuestCart } = require("./cartController");

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, phone, guestCart } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            status: "Active",
            sellerStatus: req.body.applySeller ? "Pending" : "None"
        });

        const roleRecord = await Role.findOne({ where: { name: "user" } });
        if (roleRecord) {
            await user.addRole(roleRecord);
        }

        // Generate token immediately so the client can use it right after registering
        const token = generateToken({ id: user.id, roles: ["user"] });

        // Sync guest cart if provided
        let cartSync = null;
        if (guestCart && Array.isArray(guestCart) && guestCart.length > 0) {
            try {
                cartSync = await syncGuestCart(user.id, guestCart);
            } catch (syncErr) {
                console.error("Guest cart sync failed during registration:", syncErr);
                // Non-blocking: registration still succeeds even if sync fails
            }
        }

        return res.status(201).json({
            message: "User registered successfully",
            token,
            user: sanitizeUser(user),
            ...(cartSync && { cartSync })
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to create user",
            error: "An internal server error occurred"
        });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires", "deletedAt"] }
        });

        if (!user) {
            return res.status(404).json({ message: "User profile not found" });
        }

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch profile",
            error: "An internal server error occurred"
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ["deletedAt"] }
        });
        if (!user) {
            return res.status(404).json({ message: "User profile not found" });
        }

        const { name, email, password, currentPassword, phone } = req.body;

        if (email && email !== user.email) {
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) {
                return res.status(409).json({ message: "Email already in use by another user" });
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;

        if (password) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Current Password is required to change your password" });
            }
            const isMatch = await comparePassword(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Incorrect current password" });
            }
            updateData.password = await hashPassword(password);
        }

        await user.update(updateData);

        return res.status(200).json({
            message: "Profile updated successfully",
            user: sanitizeUser(user)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update profile",
            error: "An internal server error occurred"
        });
    }
};

exports.deleteProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User profile not found" });
        }

        await user.destroy();

        return res.status(200).json({ message: "Profile deleted successfully" });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to delete profile",
            error: "An internal server error occurred"
        });
    }
};

exports.applySeller = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, { attributes: { exclude: ["deletedAt"] } });
        if (!user) {
            return res.status(404).json({ message: "User profile not found" });
        }

        if (user.sellerStatus === "Approved") {
            return res.status(400).json({ message: "You are already an approved seller" });
        }

        if (user.sellerStatus === "Pending") {
            return res.status(400).json({ message: "Your seller application is already pending" });
        }

        await user.update({ sellerStatus: "Pending" });

        return res.status(200).json({
            message: "Successfully applied to become a seller. Please wait for admin approval.",
            user: sanitizeUser(user)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to apply as a seller",
            error: "An internal server error occurred"
        });
    }
};

