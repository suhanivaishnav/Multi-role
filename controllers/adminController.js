const { User, Category, Subcategory, Product } = require("../models");
const { sanitizeUser } = require("../helpers/utils");
const { hashPassword } = require("../middleware/auth");

exports.getAdminProfile = async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id, {
            attributes: { exclude: ["password"] }
        });

        if (!admin || (admin.role !== "admin" && admin.role !== "superadmin")) {
            return res.status(404).json({ message: "Admin profile not found" });
        }

        return res.status(200).json(admin);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch admin profile",
            error: error.message
        });
    }
};

exports.updateAdminProfile = async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id);
        if (!admin || (admin.role !== "admin" && admin.role !== "superadmin")) {
            return res.status(404).json({ message: "Admin profile not found" });
        }

        if (req.body.email && req.body.email !== admin.email) {
            const existingEmail = await User.findOne({ where: { email: req.body.email } });
            if (existingEmail) {
                return res.status(409).json({ message: "Email already in use" });
            }
        }

        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData.role;
        delete updateData.status;

        if (updateData.password) {
            updateData.password = await hashPassword(updateData.password);
        }

        await admin.update(updateData);

        return res.status(200).json({
            message: "Admin profile updated successfully",
            admin: sanitizeUser(admin)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update admin profile",
            error: error.message
        });
    }
};

exports.approveSeller = async (req, res) => {
    try {
        const sellerId = req.params.id || req.params.sellerId;

        const seller = await User.findByPk(sellerId);
        if (!seller || seller.role !== "seller") {
            return res.status(404).json({ message: "Seller not found" });
        }

        await seller.update({ status: "Active" });

        return res.status(200).json({
            message: "Seller approved successfully by Admin",
            seller: sanitizeUser(seller)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to approve seller",
            error: error.message
        });
    }
};

exports.suspendSeller = async (req, res) => {
    try {
        const sellerId = req.params.id || req.params.sellerId;
        const seller = await User.findByPk(sellerId);
        if (!seller || seller.role !== "seller") {
            return res.status(404).json({ message: "Seller not found" });
        }

        await seller.update({ status: "Blocked" });

        return res.status(200).json({
            message: "Seller blocked successfully by Admin",
            seller: sanitizeUser(seller)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to suspend seller",
            error: error.message
        });
    }
};


exports.getOverview = async (req, res) => {
    try {
        const [userCount, sellerCount, adminCount, categoryCount, subcategoryCount, pendingSellersCount, productsCount, pendingProductsCount, rejectedProductsCount] = await Promise.all([
            User.count({ where: { role: 'user' } }),
            User.count({ where: { role: 'seller' } }),
            User.count({ where: { role: 'admin' } }),
            Category.count(),
            Subcategory.count(),
            User.count({ where: { role: 'seller', status: 'Pending' } }),
            Product.count(),
            Product.count({ where: { status: 'Pending' } }),
            Product.count({ where: { status: 'Rejected' } })
        ]);

        const [users, sellers, categories] = await Promise.all([
            User.findAll({ where: { role: 'user' }, attributes: { exclude: ["password"] } }),
            User.findAll({ where: { role: 'seller' }, attributes: { exclude: ["password"] } }),
            Category.findAll({ include: [{ model: Subcategory, as: "subcategories" }] })
        ]);

        const overviewData = {
            totalUsers: userCount,
            totalSellers: sellerCount,
            totalPendingSellers: pendingSellersCount,
            totalCategories: categoryCount,
            totalSubcategories: subcategoryCount,
            totalProducts: productsCount,
            totalPendingProducts: pendingProductsCount,
            totalRejectedProducts: rejectedProductsCount
        };

        if (req.user && req.user.role === 'superadmin') {
            overviewData.totalAdmins = adminCount;
        }

        return res.status(200).json({
            overview: overviewData,
            users,
            sellers,
            categories
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch application overview",
            error: error.message
        });
    }
};

exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await User.findAll({
            where: { role: 'admin' },
            attributes: { exclude: ["password"] }
        });
        return res.status(200).json(admins);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch admins",
            error: error.message
        });
    }
};

exports.getAdminById = async (req, res) => {
    try {
        const admin = await User.findOne({
            where: { id: req.params.id, role: 'admin' },
            attributes: { exclude: ["password"] }
        });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        return res.status(200).json(admin);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch admin",
            error: error.message
        });
    }
};

exports.updateAdmin = async (req, res) => {
    try {
        const admin = await User.findOne({ where: { id: req.params.id, role: 'admin' } });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        if (req.body.password) {
            req.body.password = await hashPassword(req.body.password);
        }

        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData.role;

        await admin.update(updateData);
        return res.status(200).json({
            message: "Admin updated successfully",
            admin: sanitizeUser(admin)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update admin",
            error: error.message
        });
    }
};

exports.suspendAdmin = async (req, res) => {
    try {
        const admin = await User.findOne({ where: { id: req.params.id, role: 'admin' } });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        await admin.update({ status: "Blocked" });
        return res.status(200).json({ message: "Admin access suspended successfully", admin: sanitizeUser(admin) });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to suspend admin",
            error: error.message
        });
    }
};

exports.unsuspendAdmin = async (req, res) => {
    try {
        const admin = await User.findOne({ where: { id: req.params.id, role: 'admin' } });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        await admin.update({ status: "Active" });
        return res.status(200).json({ message: "Admin access restored successfully", admin: sanitizeUser(admin) });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to unsuspend admin",
            error: error.message
        });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const { status, withDeleted } = req.query;

        const whereCondition = { role: "user" };
        if (status) {
            whereCondition.status = status;
        }

        const { count, rows } = await User.findAndCountAll({
            where: whereCondition,
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] },
            paranoid: withDeleted === "true" ? false : true,
            limit: req.pagination.limit,
            offset: req.pagination.offset
        });

        return res.sendPaginated(rows, count, "users");
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch users",
            error: error.message
        });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { withDeleted } = req.query;

        const user = await User.findOne({
            where: { id: req.params.id, role: "user" },
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] },
            paranoid: withDeleted === "true" ? false : true
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch user",
            error: error.message
        });
    }
};

exports.blockUser = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id, role: "user" } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await user.update({ status: "Blocked" });

        return res.status(200).json({
            message: "User blocked successfully",
            status: user.status
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to block user",
            error: error.message
        });
    }
};

exports.unblockUser = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id, role: "user" } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await user.update({ status: "Active" });

        return res.status(200).json({
            message: "User unblocked successfully",
            status: user.status
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to unblock user",
            error: error.message
        });
    }
};

exports.softDeleteUser = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id, role: "user" } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await user.destroy(); // Soft delete because paranoid: true is enabled on model

        return res.status(200).json({ message: "User soft deleted successfully" });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to delete user",
            error: error.message
        });
    }
};

exports.restoreUser = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id, role: "user" }, paranoid: false });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.deletedAt) {
            return res.status(400).json({ message: "User is not deleted" });
        }

        await user.restore();

        return res.status(200).json({
            message: "User restored successfully",
            user: sanitizeUser(user)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to restore user",
            error: error.message
        });
    }
};

exports.forceDeleteUser = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id, role: "user" }, paranoid: false });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await user.destroy({ force: true }); // Hard/permanent deletion

        return res.status(200).json({ message: "User permanently deleted from database" });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to permanently delete user",
            error: error.message
        });
    }
};

exports.getAllSellers = async (req, res) => {
    try {
        const whereCondition = { role: "seller" };
        if (req.query.status) {
            whereCondition.status = req.query.status;
        }

        const { count, rows } = await User.findAndCountAll({
            where: whereCondition,
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] },
            limit: req.pagination.limit,
            offset: req.pagination.offset
        });

        return res.sendPaginated(rows, count, "sellers");
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch sellers",
            error: error.message
        });
    }
};

exports.getSellerById = async (req, res) => {
    try {
        const seller = await User.findOne({
            where: { id: req.params.id, role: "seller" },
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        return res.status(200).json(seller);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch seller",
            error: error.message
        });
    }
};

exports.updateSellerById = async (req, res) => {
    try {
        const seller = await User.findOne({ where: { id: req.params.id, role: "seller" } });
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        if (req.body.email && req.body.email !== seller.email) {
            const existingEmail = await User.findOne({ where: { email: req.body.email } });
            if (existingEmail) {
                return res.status(409).json({ message: "Email already in use by another user" });
            }
        }

        const updateData = { ...req.body };

        if (updateData.password) {
            updateData.password = await hashPassword(updateData.password);
        }

        await seller.update(updateData);

        return res.status(200).json({
            message: "Seller updated successfully",
            seller: sanitizeUser(seller)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update seller",
            error: error.message
        });
    }
};

exports.deleteSellerById = async (req, res) => {
    try {
        const seller = await User.findOne({ where: { id: req.params.id, role: "seller" } });
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        await seller.destroy();

        return res.status(200).json({ message: "Seller deleted successfully" });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to delete seller",
            error: error.message
        });
    }
};

exports.restoreSeller = async (req, res) => {
    try {
        const seller = await User.findOne({ where: { id: req.params.id, role: "seller" }, paranoid: false });
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        if (!seller.deletedAt) {
            return res.status(400).json({ message: "Seller is not deleted" });
        }

        await seller.restore();

        return res.status(200).json({
            message: "Seller restored successfully",
            seller: sanitizeUser(seller)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to restore seller",
            error: error.message
        });
    }
};

exports.forceDeleteSeller = async (req, res) => {
    try {
        const seller = await User.findOne({ where: { id: req.params.id, role: "seller" }, paranoid: false });
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        await seller.destroy({ force: true }); // Hard/permanent deletion

        return res.status(200).json({ message: "Seller permanently deleted from database" });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to permanently delete seller",
            error: error.message
        });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const include = [];

        // SuperAdmins can see which admin created the category
        if (req.user && req.user.role === 'superadmin') {
            include.push({
                model: User,
                as: "admin",
                attributes: ["id", "name", "email", "role"]
            });
        }

        const categories = await Category.findAll({ include });
        return res.status(200).json(categories);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch categories",
            error: error.message
        });
    }
};

exports.getAllSubcategories = async (req, res) => {
    try {
        const include = [{
            model: Category,
            as: "category"
        }];

        // SuperAdmins can see which admin created the subcategory
        if (req.user && req.user.role === 'superadmin') {
            include.push({
                model: User,
                as: "admin",
                attributes: ["id", "name", "email", "role"]
            });
        }

        const subcategories = await Subcategory.findAll({ include });
        return res.status(200).json(subcategories);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch subcategories",
            error: error.message
        });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const include = [
            {
                model: Subcategory,
                as: "subcategories"
            }
        ];

        if (req.user && req.user.role === 'superadmin') {
            include.push({
                model: User,
                as: "admin",
                attributes: ["id", "name", "email", "role"]
            });
        }

        const category = await Category.findByPk(req.params.id, { include });
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        return res.status(200).json(category);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch category",
            error: error.message
        });
    }
};

exports.getSubcategoryById = async (req, res) => {
    try {
        const include = [{
            model: Category,
            as: "category"
        }];

        if (req.user && req.user.role === 'superadmin') {
            include.push({
                model: User,
                as: "admin",
                attributes: ["id", "name", "email", "role"]
            });
        }

        const subcategory = await Subcategory.findByPk(req.params.id, { include });
        if (!subcategory) {
            return res.status(404).json({ message: "Subcategory not found" });
        }
        return res.status(200).json(subcategory);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch subcategory",
            error: error.message
        });
    }
};

