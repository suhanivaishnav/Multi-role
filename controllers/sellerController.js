const { User, Role } = require("../models");
const { sanitizeUser } = require("../helpers/utils");
const { hashPassword, comparePassword } = require("../middleware/auth");

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
            status: "Active",
            sellerStatus: "Pending"
        });

        const roleRecord = await Role.findOne({ where: { name: "user" } });
        if (roleRecord) {
            await sellerUser.addRole(roleRecord);
        }

        return res.status(201).json({
            message: "Seller registered successfully and is pending approval",
            seller: sanitizeUser(sellerUser)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to create seller",
            error: "An internal server error occurred"
        });
    }
};

exports.getSellerProfile = async (req, res) => {
    try {
        const seller = await User.findOne({
            where: { id: req.user.id }, include: [{ model: Role, as: 'roles', where: { name: 'seller' } }],
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires", "deletedAt"] }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller profile not found" });
        }

        return res.status(200).json(seller);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch profile",
            error: "An internal server error occurred"
        });
    }
};

exports.updateSellerProfile = async (req, res) => {
    try {
        const seller = await User.findOne({
            where: { id: req.user.id }, include: [{ model: Role, as: 'roles', where: { name: 'seller' } }],
            attributes: { exclude: ["deletedAt"] }
        });
        if (!seller) {
            return res.status(404).json({ message: "Seller profile not found" });
        }

        const { name, email, password, currentPassword, phone } = req.body;

        if (email && email !== seller.email) {
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) {
                return res.status(409).json({ message: "Email already in use by another seller" });
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;

        if (password) {
            if (!currentPassword) {
                return res.status(400).json({ message: "currentPassword is required to change your password" });
            }
            const isMatch = await comparePassword(currentPassword, seller.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Incorrect current password" });
            }
            updateData.password = await hashPassword(password);
        }

        await seller.update(updateData);

        return res.status(200).json({
            message: "Seller profile updated successfully",
            seller: sanitizeUser(seller)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update profile",
            error: "An internal server error occurred"
        });
    }
};

exports.deleteSellerProfile = async (req, res) => {
    try {
        const seller = await User.findOne({ where: { id: req.user.id }, include: [{ model: Role, as: 'roles', where: { name: 'seller' } }] });
        if (!seller) {
            return res.status(404).json({ message: "Seller profile not found" });
        }

        await seller.destroy();

        return res.status(200).json({ message: "Seller profile deleted successfully" });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to delete profile",
            error: "An internal server error occurred"
        });
    }
};

