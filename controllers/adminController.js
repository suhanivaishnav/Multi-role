const { User, Role, Category, Subcategory, Product, sequelize } = require("../models");
const { Op } = require("sequelize");
const { sanitizeUser } = require("../helpers/utils");
const { hashPassword, comparePassword } = require("../middleware/auth");

exports.getAdminProfile = async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id, {
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires", "deletedAt"] }
        });

        if (!admin) {
            return res.status(404).json({ message: "Admin profile not found" });
        }

        return res.status(200).json(admin);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch admin profile",
            error: "An internal server error occurred"
        });
    }
};

exports.updateAdminProfile = async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id, {
            attributes: { exclude: ["deletedAt"] }
        });
        if (!admin) {
            return res.status(404).json({ message: "Admin profile not found" });
        }

        const { name, email, password, currentPassword, phone } = req.body;

        if (email && email !== admin.email) {
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) {
                return res.status(409).json({ message: "Email already in use" });
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
            const isMatch = await comparePassword(currentPassword, admin.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Incorrect current password" });
            }
            updateData.password = await hashPassword(password);
        }

        await admin.update(updateData);

        return res.status(200).json({
            message: "Admin profile updated successfully",
            admin: sanitizeUser(admin)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update admin profile",
            error: "An internal server error occurred"
        });
    }
};

exports.approveSeller = async (req, res) => {
    try {
        const sellerId = req.params.id || req.params.sellerId;

        const seller = await User.findByPk(sellerId, { include: ['roles'] });

        // Allow approving if they applied to be a seller (sellerStatus = Pending) or are already a seller
        if (!seller || (seller.sellerStatus === "None" && !(seller.roles && seller.roles.some(r => r.name === "seller")))) {
            return res.status(404).json({ message: "Seller application not found" });
        }

        await seller.update({ sellerStatus: "Approved", status: "Active" });

        const roleRecord = await Role.findOne({ where: { name: "seller" } });
        if (roleRecord) {
            await seller.addRole(roleRecord);
        }

        return res.status(200).json({
            message: "Seller approved successfully by Admin",
            seller: sanitizeUser(seller)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to approve seller",
            error: "An internal server error occurred"
        });
    }
};

exports.suspendSeller = async (req, res) => {
    try {
        const sellerId = req.params.id || req.params.sellerId;
        const seller = await User.findByPk(sellerId, { include: ['roles'] });

        // Allowed if they are already an approved seller, or if they applied
        if (!seller || (seller.sellerStatus === "None" && !(seller.roles && seller.roles.some(r => r.name === "seller")))) {
            return res.status(404).json({ message: "Seller not found" });
        }

        await seller.update({ sellerStatus: "Suspended" });

        const roleRecord = await Role.findOne({ where: { name: "seller" } });
        if (roleRecord) {
            await seller.removeRole(roleRecord);
        }

        return res.status(200).json({
            message: "Seller blocked successfully by Admin",
            seller: sanitizeUser(seller)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to suspend seller",
            error: "An internal server error occurred"
        });
    }
};


exports.getOverview = async (req, res) => {
    try {
        const [userCount, sellerCount, adminCount, categoryCount, subcategoryCount, pendingSellersCount, productsCount, pendingProductsCount] = await Promise.all([
            User.count({ include: [{ model: Role, as: 'roles', where: { name: 'user' } }] }),
            User.count({ include: [{ model: Role, as: 'roles', where: { name: 'seller' } }] }),
            User.count({ include: [{ model: Role, as: 'roles', where: { name: 'admin' } }] }),
            Category.count(),
            Subcategory.count(),
            User.count({ where: { sellerStatus: 'Pending' } }),
            Product.count(),
            Product.count({ where: { status: 'Pending' } })
        ]);

        const [users, sellers, admins, categories] = await Promise.all([
            User.findAll({ include: [{ model: Role, as: 'roles', where: { name: 'user' } }], attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] }, ...req.query.pagination }),
            User.findAll({ include: [{ model: Role, as: 'roles', where: { name: 'seller' } }], attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] }, ...req.query.pagination }),
            User.findAll({ include: [{ model: Role, as: 'roles', where: { name: 'admin' } }], attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] }, ...req.query.pagination }),
            Category.findAll({ include: [{ model: Subcategory, as: "subcategories" }], ...req.query.pagination })

        ]);

        const overviewData = {
            totalUsers: userCount,
            totalSellers: sellerCount,
            totalPendingSellers: pendingSellersCount,
            totalCategories: categoryCount,
            totalSubcategories: subcategoryCount,
            totalProducts: productsCount,
            totalPendingProducts: pendingProductsCount
        };

        if (req.user && req.user.roles && req.user.roles.includes("superadmin")) {
            overviewData.totalAdmins = adminCount;
            overviewData.admins = admins;
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
            error: "An internal server error occurred"
        });
    }
};

exports.getAllAdmins = async (req, res) => {
    try {
        const { search, sortBy, sortOrder } = req.query;
        const whereCondition = {};

        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const orderClause = [];
        if (sortBy) {
            orderClause.push([sortBy, sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }

        const admins = await User.findAll({
            where: whereCondition,
            include: [{ model: Role, as: 'roles', where: { name: 'admin' } }],
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires",] },
            order: orderClause
        });
        return res.status(200).json(admins);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch admins",
            error: "An internal server error occurred"
        });
    }
};

exports.getAdminById = async (req, res) => {
    try {
        const admin = await User.findOne({
            where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'admin' } }],
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] }
        });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        return res.status(200).json(admin);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch admin",
            error: "An internal server error occurred"
        });
    }
};

exports.updateAdmin = async (req, res) => {
    try {
        const admin = await User.findOne({ where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'admin' } }] });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        if (req.body.password) {
            req.body.password = await hashPassword(req.body.password);
        }

        const allowedFields = ["name", "email", "phone", "status", "password"];
        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        await admin.update(updateData);
        return res.status(200).json({
            message: "Admin updated successfully",
            admin: sanitizeUser(admin)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update admin",
            error: "An internal server error occurred"
        });
    }
};

exports.suspendAdmin = async (req, res) => {
    try {
        const admin = await User.findOne({ where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'admin' } }] });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        await admin.update({ status: "Blocked" });
        return res.status(200).json({ message: "Admin access suspended successfully", admin: sanitizeUser(admin) });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to suspend admin",
            error: "An internal server error occurred"
        });
    }
};

exports.unsuspendAdmin = async (req, res) => {
    try {
        const admin = await User.findOne({ where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'admin' } }] });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        await admin.update({ status: "Active" });
        return res.status(200).json({ message: "Admin access restored successfully", admin: sanitizeUser(admin) });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to unsuspend admin",
            error: "An internal server error occurred"
        });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const { status, withDeleted, search, sortBy, sortOrder } = req.query;

        const whereCondition = {};
        if (status) {
            whereCondition.status = status;
        }
        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const orderClause = [];
        if (sortBy) {
            orderClause.push([sortBy, sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }

        const { count, rows } = await User.findAndCountAll({
            where: whereCondition,
            include: [{ model: Role, as: 'roles', where: { name: 'user' } }],
            distinct: true,
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] },
            paranoid: withDeleted === "true" ? false : true,
            order: orderClause,
            ...req.query.pagination
        });

        return res.sendPaginated(rows, count, "users");
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch users",
            error: "An internal server error occurred"
        });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { withDeleted } = req.query;

        const user = await User.findOne({
            where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'user' } }],
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
            error: "An internal server error occurred"
        });
    }
};

exports.blockUser = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'user' } }] });
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
            error: "An internal server error occurred"
        });
    }
};

exports.unblockUser = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'user' } }] });
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
            error: "An internal server error occurred"
        });
    }
};

exports.softDeleteUser = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'user' } }] });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await user.destroy(); // Soft delete because paranoid: true is enabled on model

        return res.status(200).json({ message: "User soft deleted successfully" });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to delete user",
            error: "An internal server error occurred"
        });
    }
};

exports.restoreUser = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'user' } }], paranoid: false });
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
            error: "An internal server error occurred"
        });
    }
};

exports.forceDeleteUser = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'user' } }], paranoid: false });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await user.destroy({ force: true }); // Hard/permanent deletion

        return res.status(200).json({ message: "User permanently deleted from database" });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to permanently delete user",
            error: "An internal server error occurred"
        });
    }
};

exports.updateUserRoles = async (req, res) => {
    try {
        const { roles } = req.body;
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ message: "Roles array is required" });
        }

        const lowerRoles = [...new Set(roles.map(r => r.toLowerCase()))];

        if (!lowerRoles.includes("user")) {
            lowerRoles.push("user");
        }

        // Security Check: Only a SuperAdmin can assign the 'admin' or 'superadmin' roles
        if (lowerRoles.includes("admin") || lowerRoles.includes("superadmin")) {
            const isSuperAdmin = req.user && req.user.roles && req.user.roles.includes("superadmin");
            if (!isSuperAdmin) {
                return res.status(403).json({ message: "Only a SuperAdmin can assign 'admin' or 'superadmin' roles." });
            }
        }

        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch role records from DB matching the provided names
        const dbRoles = await Role.findAll({
            where: {
                name: { [Op.in]: lowerRoles }
            }
        });

        if (dbRoles.length !== lowerRoles.length) {
            return res.status(400).json({ message: "One or more provided roles are invalid" });
        }

        // Assign the roles and sync seller status in a transaction
        const t = await sequelize.transaction();
        try {
            await user.setRoles(dbRoles, { transaction: t });

            const hasSellerRole = lowerRoles.includes('seller');

            if (hasSellerRole && user.sellerStatus !== 'Approved') {
                user.sellerStatus = 'Approved';
                await user.save({ transaction: t });
            } else if (!hasSellerRole && user.sellerStatus !== 'None' && user.sellerStatus !== 'Suspended') {
                user.sellerStatus = 'None';
                await user.save({ transaction: t });
            }

            await t.commit();
        } catch (txError) {
            await t.rollback();
            throw txError;
        }

        return res.status(200).json({
            message: "User roles updated successfully",
            assignedRoles: dbRoles.map(r => r.name)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update user roles",
            error: "An internal server error occurred"
        });
    }
};

exports.getAllSellers = async (req, res) => {
    try {
        const { status, search, sortBy, sortOrder } = req.query;
        const whereCondition = { sellerStatus: { [Op.ne]: "None" } };
        if (status) {
            whereCondition.sellerStatus = status;
        }
        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const orderClause = [];
        if (sortBy) {
            orderClause.push([sortBy, sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }

        const { count, rows } = await User.findAndCountAll({
            where: whereCondition,
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] },
            order: orderClause,
            ...req.query.pagination
        });

        return res.sendPaginated(rows, count, "sellers");
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch sellers",
            error: "An internal server error occurred"
        });
    }
};

exports.getSellerById = async (req, res) => {
    try {
        const seller = await User.findOne({
            where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'seller' } }],
            attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        return res.status(200).json(seller);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch seller",
            error: "An internal server error occurred"
        });
    }
};

exports.updateSellerById = async (req, res) => {
    try {
        const seller = await User.findOne({ where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'seller' } }] });
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        if (req.body.email && req.body.email !== seller.email) {
            const existingEmail = await User.findOne({ where: { email: req.body.email } });
            if (existingEmail) {
                return res.status(409).json({ message: "Email already in use by another user" });
            }
        }

        const allowedFields = ["name", "email", "phone", "status", "password"];
        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

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
            error: "An internal server error occurred"
        });
    }
};

exports.deleteSellerById = async (req, res) => {
    try {
        const seller = await User.findOne({ where: { id: req.params.id }, include: [{ model: Role, as: 'roles', where: { name: 'seller' } }] });
        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        const roleRecord = await Role.findOne({ where: { name: "seller" } });
        if (roleRecord) {
            await seller.removeRole(roleRecord);
        }
        await seller.update({ sellerStatus: "None" });

        return res.status(200).json({ message: "Seller role removed successfully (base user account preserved)" });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to delete seller",
            error: "An internal server error occurred"
        });
    }
};

exports.restoreSeller = async (req, res) => {
    try {
        const sellerId = req.params.id;
        const user = await User.findByPk(sellerId, { include: ["roles"] });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const roleRecord = await Role.findOne({ where: { name: "seller" } });
        if (!roleRecord) {
            return res.status(500).json({ message: "Seller role not found in database" });
        }

        const t = await sequelize.transaction();
        try {
            await user.addRole(roleRecord, { transaction: t });
            user.sellerStatus = "Approved";
            await user.save({ transaction: t });
            await t.commit();

            return res.status(200).json({
                message: "Seller restored and approved successfully"
            });
        } catch (txError) {
            await t.rollback();
            throw txError;
        }

    } catch (error) {
        return res.status(500).json({
            message: "Failed to restore seller",
            error: "An internal server error occurred"
        });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const { search, sortBy, sortOrder } = req.query;
        const include = [];

        if (req.user && req.user.roles && req.user.roles.includes("superadmin")) {
            include.push({
                model: User,
                as: "admin",
                attributes: ["id", "name", "email"]
            });
        }

        const whereCondition = {};
        if (search) {
            whereCondition.name = { [Op.like]: `%${search}%` };
        }

        const orderClause = [];
        if (sortBy) {
            orderClause.push([sortBy, sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }

        const categories = await Category.findAll({
            where: whereCondition,
            include,
            order: orderClause
        });
        return res.status(200).json(categories);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch categories",
            error: "An internal server error occurred"
        });
    }
};

exports.getAllSubcategories = async (req, res) => {
    try {
        const { search, sortBy, sortOrder, categoryId } = req.query;
        const include = [{
            model: Category,
            as: "category"
        }];

        // SuperAdmins can see which admin created the subcategory
        if (req.user && req.user.roles && req.user.roles.includes("superadmin")) {
            include.push({
                model: User,
                as: "admin",
                attributes: ["id", "name", "email"]
            });
        }

        const whereCondition = {};
        if (categoryId) {
            whereCondition.categoryId = categoryId;
        }
        if (search) {
            whereCondition.name = { [Op.like]: `%${search}%` };
        }

        const orderClause = [];
        if (sortBy) {
            orderClause.push([sortBy, sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }

        const subcategories = await Subcategory.findAll({
            where: whereCondition,
            include,
            order: orderClause,
            ...(req.query.pagination || {})
        });
        return res.status(200).json(subcategories);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch subcategories",
            error: "An internal server error occurred"
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

        if (req.user && req.user.roles && req.user.roles.includes("superadmin")) {
            include.push({
                model: User,
                as: "admin",
                attributes: ["id", "name", "email"]
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
            error: "An internal server error occurred"
        });
    }
};

exports.getSubcategoryById = async (req, res) => {
    try {
        const include = [{
            model: Category,
            as: "category"
        }];

        if (req.user && req.user.roles && req.user.roles.includes("superadmin")) {
            include.push({
                model: User,
                as: "admin",
                attributes: ["id", "name", "email"]
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
            error: "An internal server error occurred"
        });
    }
};

