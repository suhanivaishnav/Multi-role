const { User } = require("../models");
const { sanitizeUser } = require("../helpers/utils");
const { hashPassword } = require("../middleware/auth");

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

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
            role: "user",
            status: "Active"
        });

        return res.status(201).json({
            message: "User registered successfully",
            user: sanitizeUser(user)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to create user",
            error: error.message
        });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] }
        });

        if (!user) {
            return res.status(404).json({ message: "User profile not found" });
        }

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch profile",
            error: error.message
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User profile not found" });
        }

        if (req.body.email && req.body.email !== user.email) {
            const existingEmail = await User.findOne({ where: { email: req.body.email } });
            if (existingEmail) {
                return res.status(409).json({ message: "Email already in use by another user" });
            }
        }

        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData.role;
        delete updateData.status;

        if (updateData.password) {
            updateData.password = await hashPassword(updateData.password);
        }

        await user.update(updateData);

        return res.status(200).json({
            message: "Profile updated successfully",
            user: sanitizeUser(user)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update profile",
            error: error.message
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
            error: error.message
        });
    }
};

