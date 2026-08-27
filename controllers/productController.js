const { Op } = require("sequelize");
const { Product, User, Category, Subcategory } = require("../models");

// Standard include models configuration
const getProductIncludes = (includeSeller = true) => {
    const includes = [
        {
            model: Subcategory,
            as: "subcategory",
            attributes: [] // Empty array prevents it from showing up in the JSON response, but allows SQL JOINS for categoryId filtering
        }
    ];

    if (includeSeller) {
        includes.unshift({
            model: User,
            as: "seller",
            attributes: ["id", "name", "email", "phone", "status", "role"]
        });
    }

    return includes;
};

// Helper to determine user role category
const getUserRoleCategory = (user) => {
    if (!user) return "Guest";
    const role = (user.roles && user.roles.length > 0 ? user.roles[0].name.toLowerCase() : "");
    if (role === "admin" || role === "superadmin") {
        return "Admin";
    }
    if (role === "seller") {
        return "Seller";
    }
    return "User";
};

exports.createProduct = async (req, res) => {
    try {
        const userType = getUserRoleCategory(req.user);
        const { name, description, price, stock, subcategoryId, status } = req.body;

        let sellerId;
        let productStatus = "Pending";

        if (userType === "Seller") {
            sellerId = req.user.id;
            productStatus = "Pending"; // Sellers always start as Pending
        } else {
            // Admin is creating product
            sellerId = req.body.sellerId;
            if (!sellerId) {
                return res.status(400).json({ message: "sellerId is required when Admin creates a product" });
            }
            productStatus = status || "Active";
        }

        if (!name || price === undefined || stock === undefined || !subcategoryId) {
            return res.status(400).json({
                message: "Name, price, stock, and subcategoryId are required"
            });
        }

        if (isNaN(Number(price)) || isNaN(Number(stock)) || Number(price) < 0 || Number(stock) < 0) {
            return res.status(400).json({
                message: "Price and stock must be positive valid numbers"
            });
        }

        // Verify seller exists and is Active
        const seller = await User.findByPk(sellerId);
        if (!seller || !(seller.roles && seller.roles.some(r => r.name === "seller"))) {
            return res.status(404).json({ message: `Seller account with ID ${sellerId} not found` });
        }
        if (seller.status !== "Active") {
            return res.status(403).json({
                message: `Cannot create product: Seller account status is '${seller.status}'. Only 'Active' sellers can list products.`
            });
        }

        // Verify Subcategory exists
        const subcategory = await Subcategory.findByPk(subcategoryId);
        if (!subcategory) {
            return res.status(404).json({ message: `Subcategory with ID ${subcategoryId} not found` });
        }

        const product = await Product.create({
            name,
            description,
            price: Number(price),
            stock: Number(stock),
            sellerId,
            subcategoryId: Number(subcategoryId),
            status: productStatus
        });

        const createdProduct = await Product.findByPk(product.id, {
            include: getProductIncludes()
        });

        return res.status(201).json({
            message: userType === "Seller"
                ? "Product created successfully and submitted for Admin approval (Status: Pending)"
                : "Product created successfully by Admin",
            product: createdProduct
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to create product",
            error: error.message
        });
    }
};

exports.getMyProducts = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { status, categoryId, subcategoryId, search, sortBy, sortOrder } = req.query;

        const whereCondition = { sellerId };

        if (status) {
            whereCondition.status = status;
        }
        if (categoryId) {
            whereCondition["$subcategory.categoryId$"] = categoryId;
        }
        if (subcategoryId) {
            whereCondition.subcategoryId = subcategoryId;
        }
        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        const orderClause = [];
        if (sortBy) {
            orderClause.push([sortBy, sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }

        const { count, rows } = await Product.findAndCountAll({
            where: whereCondition,
            include: getProductIncludes(false),
            order: orderClause,
            ...req.query.pagination,
            distinct: true
        });

        return res.sendPaginated(rows, count, "products", { sellerId });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch products",
            error: error.message
        });
    }
};

exports.getAllProductsAdmin = async (req, res) => {
    try {
        const { sellerId, status, categoryId, subcategoryId, search, sortBy, sortOrder } = req.query;
        const whereCondition = {};

        if (sellerId) whereCondition.sellerId = sellerId;
        if (status) whereCondition.status = status;
        if (categoryId) whereCondition["$subcategory.categoryId$"] = categoryId;
        if (subcategoryId) whereCondition.subcategoryId = subcategoryId;
        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        const orderClause = [];
        if (sortBy) {
            orderClause.push([sortBy, sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }

        const { count, rows } = await Product.findAndCountAll({
            where: whereCondition,
            include: getProductIncludes(),
            order: orderClause,
            ...req.query.pagination,
            distinct: true
        });

        return res.sendPaginated(rows, count, "products");
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch all products for admin",
            error: error.message
        });
    }
};

exports.getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { search, sortBy, sortOrder } = req.query;
        const whereCondition = { "$subcategory.categoryId$": categoryId, status: "Active" };

        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        const orderClause = [];
        if (sortBy) {
            orderClause.push([sortBy, sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }

        const { count, rows } = await Product.findAndCountAll({
            where: whereCondition,
            include: getProductIncludes(false),
            order: orderClause,
            ...req.query.pagination,
            distinct: true
        });

        return res.sendPaginated(rows, count, "products", { categoryId: Number(categoryId) });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch category products",
            error: error.message
        });
    }
};

exports.getProductsBySubcategory = async (req, res) => {
    try {
        const { subcategoryId } = req.params;
        const { search, sortBy, sortOrder } = req.query;
        const whereCondition = { subcategoryId, status: "Active" };

        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        const orderClause = [];
        if (sortBy) {
            orderClause.push([sortBy, sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }

        const { count, rows } = await Product.findAndCountAll({
            where: whereCondition,
            include: getProductIncludes(false),
            order: orderClause,
            ...req.query.pagination,
            distinct: true
        });

        return res.sendPaginated(rows, count, "products", { subcategoryId: Number(subcategoryId) });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch subcategory products",
            error: error.message
        });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const {
            categoryId, subcategoryId, search,
            minPrice, maxPrice, sortBy, inStock
        } = req.query;

        const whereCondition = { status: "Active" };

        // Common filters
        if (categoryId) {
            const catIds = categoryId.split(",").map(id => Number(id.trim()));
            whereCondition["$subcategory.categoryId$"] = { [Op.in]: catIds };
        }
        if (subcategoryId) {
            const subcatIds = subcategoryId.split(",").map(id => Number(id.trim()));
            whereCondition.subcategoryId = { [Op.in]: subcatIds };
        }

        if (inStock === "true") {
            whereCondition.stock = { [Op.gt]: 0 };
        } else if (inStock === "false") {
            whereCondition.stock = 0;
        }

        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            whereCondition.price = {};
            if (minPrice !== undefined) whereCondition.price[Op.gte] = Number(minPrice);
            if (maxPrice !== undefined) whereCondition.price[Op.lte] = Number(maxPrice);
        }

        // Sorting
        let order = [["createdAt", "DESC"]];
        if (sortBy === "price_low_high" || sortBy === "price_asc") {
            order = [["price", "ASC"]];
        } else if (sortBy === "price_high_low" || sortBy === "price_desc") {
            order = [["price", "DESC"]];
        } else if (sortBy === "name_asc") {
            order = [["name", "ASC"]];
        } else if (sortBy === "newest") {
            order = [["createdAt", "DESC"]];
        }

        const { count, rows } = await Product.findAndCountAll({
            where: whereCondition,
            include: getProductIncludes(false),
            order,
            ...req.query.pagination,
            distinct: true
        });

        return res.sendPaginated(rows, count, "products");
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch products",
            error: error.message
        });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const userType = getUserRoleCategory(req.user);
        const includeSeller = userType === "Admin" || userType === "Seller";

        const product = await Product.findByPk(req.params.id, {
            include: getProductIncludes(includeSeller)
        });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (product.status !== "Active") {
            if (userType === "Guest" || userType === "User") {
                return res.status(404).json({ message: "Product not found or not available" });
            }

            if (userType === "Seller" && product.sellerId !== req.user.id) {
                return res.status(404).json({ message: "Product not found or not available" });
            }
            // Admins pass through and can see all statuses
        }

        return res.status(200).json(product);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch product",
            error: error.message
        });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const userType = getUserRoleCategory(req.user);
        const product = await Product.findByPk(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (userType === "Seller") {
            // Verify ownership
            if (product.sellerId !== req.user.id) {
                return res.status(403).json({ message: "Access denied: You can only edit your own products" });
            }
        }

        const updateData = { ...req.body };

        if (updateData.price !== undefined) {
            if (isNaN(Number(updateData.price)) || Number(updateData.price) < 0) {
                return res.status(400).json({ message: "Price must be a positive valid number" });
            }
        }
        if (updateData.stock !== undefined) {
            if (isNaN(Number(updateData.stock)) || Number(updateData.stock) < 0) {
                return res.status(400).json({ message: "Stock must be a positive valid number" });
            }
        }

        // Prevent sellers from re-assigning product ownership or self-activating status
        if (userType === "Seller") {
            delete updateData.sellerId;
            delete updateData.status; // Sellers cannot self-approve or change status to Active directly
        }

        // If subcategory is updated, validate it
        if (updateData.subcategoryId) {
            const subcat = await Subcategory.findByPk(updateData.subcategoryId);
            if (!subcat) {
                return res.status(404).json({ message: `Subcategory with ID ${updateData.subcategoryId} not found` });
            }
        }

        await product.update(updateData);

        const updatedProduct = await Product.findByPk(product.id, {
            include: getProductIncludes()
        });

        return res.status(200).json({
            message: "Product updated successfully",
            product: updatedProduct
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update product",
            error: error.message
        });
    }
};

exports.approveProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        await product.update({ status: "Active" });

        const updatedProduct = await Product.findByPk(product.id, {
            include: getProductIncludes()
        });

        return res.status(200).json({
            message: "Product approved successfully by Admin. It is now Active and visible to users.",
            product: updatedProduct
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to approve product",
            error: error.message
        });
    }
};

exports.rejectProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        await product.update({ status: "Rejected" });

        const updatedProduct = await Product.findByPk(product.id, {
            include: getProductIncludes()
        });

        return res.status(200).json({
            message: "Product Rejected by Admin.",
            product: updatedProduct
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to reject product",
            error: error.message
        });
    }
};

exports.updateProductStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ["Active", "Inactive", "Pending", "Rejected"];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                message: `Valid status is required. Allowed: ${validStatuses.join(", ")}`
            });
        }

        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        await product.update({ status });

        const updatedProduct = await Product.findByPk(product.id, {
            include: getProductIncludes()
        });

        return res.status(200).json({
            message: `Product status updated to '${status}' by Admin`,
            product: updatedProduct
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update product status",
            error: error.message
        });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const userType = getUserRoleCategory(req.user);
        const product = await Product.findByPk(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (userType === "Seller") {
            if (product.sellerId !== req.user.id) {
                return res.status(403).json({ message: "Access denied: You can only delete your own products" });
            }
        }

        await product.destroy();

        return res.status(200).json({
            message: "Product deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to delete product",
            error: error.message
        });
    }
};
