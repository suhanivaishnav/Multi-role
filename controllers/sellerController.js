const { User } = require("../models");
const { sanitizeUser } = require("../helpers/utils");
const { hashPassword } = require("../middleware/auth");

exports.registerSeller = async (req, res) => {
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

        const sellerUser = await User.create({
            name,
            email,
            password: hashedPassword,
            phone: phone || null,
            role: "seller",
            status: "Pending"
        });

        return res.status(201).json({
            message: "Seller registered successfully and is pending approval",
            seller: sanitizeUser(sellerUser)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to create seller",
            error: error.message
        });
    }
};

exports.getSellerProfile = async (req, res) => {
    try {
        const seller = await User.findOne({
            where: { id: req.user.id, role: "seller" },
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller profile not found" });
        }

        return res.status(200).json(seller);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch profile",
            error: error.message
        });
    }
};

exports.updateSellerProfile = async (req, res) => {
    try {
        const seller = await User.findOne({ where: { id: req.user.id, role: "seller" } });
        if (!seller) {
            return res.status(404).json({ message: "Seller profile not found" });
        }

        if (req.body.email && req.body.email !== seller.email) {
            const existingEmail = await User.findOne({ where: { email: req.body.email } });
            if (existingEmail) {
                return res.status(409).json({ message: "Email already in use by another seller" });
            }
        }

        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData.role;
        delete updateData.status;
        delete updateData.approvedByAdminId;

        if (updateData.password) {
            updateData.password = await hashPassword(updateData.password);
        }

        await seller.update(updateData);

        return res.status(200).json({
            message: "Seller profile updated successfully",
            seller: sanitizeUser(seller)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update profile",
            error: error.message
        });
    }
};

exports.deleteSellerProfile = async (req, res) => {
    try {
        const seller = await User.findOne({ where: { id: req.user.id, role: "seller" } });
        if (!seller) {
            return res.status(404).json({ message: "Seller profile not found" });
        }

        await seller.destroy();

        return res.status(200).json({ message: "Seller profile deleted successfully" });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to delete profile",
            error: error.message
        });
    }
};

