const { Order, OrderItem, Product, User, sequelize } = require("../models");
const { Op } = require("sequelize");
const { sendOrderPlacedEmail, sendOrderStatusUpdateEmail } = require("../helpers/email");

const restoreOrderStock = async (orderItems, transaction) => {
    for (const item of orderItems) {
        const product = await Product.findByPk(item.productId, { transaction, paranoid: false });
        if (product) {
            product.stock += item.quantity;
            await product.save({ transaction });
        }
    }
};

// 1. Place Order
exports.placeOrder = async (req, res, next) => {
    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user.id;


    const t = await sequelize.transaction();
    try {
        let totalAmount = 0;
        const orderItemsData = [];
        const emailItems = [];

        // Validate products with id and check the stock and calculate total
        for (let item of items) {
            const product = await Product.findByPk(item.productId, { transaction: t, lock: t.LOCK.UPDATE });

            if (!product) {
                await t.rollback();
                return res.status(404).json({ message: `Product not found with id ${item.productId}` });
            }

            if (product.status !== 'Active') {
                await t.rollback();
                return res.status(400).json({ message: `Product ${product.name} is not available for purchase` });
            }

            if (product.stock < item.quantity) {
                await t.rollback();
                return res.status(400).json({ message: `Insufficient stock for product ${product.name}` });
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            orderItemsData.push({
                productId: product.id,
                quantity: item.quantity,
                price: product.price
            });

            emailItems.push({
                name: product.name,
                description: `Quantity: ${item.quantity} | Price: $${product.price}`
            });

            // Decrease stock when the order placed
            product.stock -= item.quantity;
            await product.save({ transaction: t });
        }

        // Create Order
        const order = await Order.create({
            userId,
            totalAmount,
            shippingAddress,
            paymentMethod,
            status: "Pending"
        }, { transaction: t });

        // Add orderId to items
        const finalOrderItems = orderItemsData.map(item => ({
            ...item,
            orderId: order.id
        }));

        // Create Order Items
        await OrderItem.bulkCreate(finalOrderItems, { transaction: t });

        await t.commit();
    } catch (error) {
        if (!t.finished) {
            await t.rollback();
        }
        return next(error);
    }

    try {
        const user = await User.findByPk(userId);
        if (user) {
            sendOrderPlacedEmail(user.email, user.name || "Customer", order.id, totalAmount, emailItems).catch(err => console.error("Email error:", err));
        }
    } catch (err) {
        console.error("Error fetching user or sending email:", err);
    }

    return res.status(201).json({ message: "Order placed successfully", order });
};

// 2. View My Orders
exports.getMyOrders = async (req, res, next) => {
    try {
        const { status, date, orderId, sortBy, sortOrder } = req.query;
        const whereClause = { userId: req.user.id };

        if (orderId) {
            whereClause.id = orderId;
        }
        if (status) {
            whereClause.status = status;
        }
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            whereClause.createdAt = {
                [Op.gte]: startDate,
                [Op.lt]: endDate
            };
        }

        const orderClause = [];
        if (sortBy) {
            const order = (sortOrder && sortOrder.toUpperCase() === "ASC") ? "ASC" : "DESC";
            orderClause.push([sortBy, order]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }

        const orders = await Order.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: OrderItem,
                    as: "orderItems",
                    include: [{ model: Product, as: "product", attributes: ["id", "name", "price"] }]
                },
                { model: User, as: "user", attributes: ["id", "name", "email"] }
            ],
            order: orderClause,
            ...req.pagination
        });

        // Format orders to handle deleted products
        const formattedOrders = orders.rows.map(order => {
            const orderJSON = order.toJSON();
            if (orderJSON.orderItems) {
                orderJSON.orderItems = orderJSON.orderItems.map(item => {
                    if (!item.product) {
                        item.product = {
                            id: item.productId,
                            name: "Product Unavailable/Deleted",
                            price: item.price
                        };
                    }
                    return item;
                });
            }
            return orderJSON;
        });

        return res.sendPaginated(formattedOrders, orders.count, "orders");
    } catch (error) {
        next(error);
    }
};

// 3. View Order Details
exports.getOrderDetails = async (req, res, next) => {
    try {
        const orderId = req.params.id;

        if (isNaN(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await Order.findByPk(orderId, {
            include: [
                {
                    model: OrderItem,
                    as: "orderItems",
                    include: [{ model: Product, as: "product", attributes: ["id", "name", "price"] }]
                },
                { model: User, as: "user", attributes: ["id", "name", "email"] }
            ]
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check authorization (User can only view their own order, Admin/Superadmin can view any from admin panel)
        const roles = req.user.roles || [];
        const isAdmin = roles.includes("admin") || roles.includes("superadmin");

        if (!isAdmin && order.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You do not have access to this order" });
        }

        // Handle deleted products
        const orderJSON = order.toJSON();
        if (orderJSON.orderItems) {
            orderJSON.orderItems = orderJSON.orderItems.map(item => {
                if (!item.product) {
                    item.product = {
                        id: item.productId,
                        name: "Product Unavailable/Deleted",
                        price: item.price
                    };
                }
                return item;
            });
        }

        return res.status(200).json({ message: "order", order: orderJSON });
    } catch (error) {
        next(error);
    }
};

// 4. Update Order Status (Admin/SuperAdmin)
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        if (isNaN(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await Order.findByPk(orderId, {
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email"] },
                {
                    model: OrderItem,
                    as: "orderItems",
                    include: [{ model: Product, as: "product", attributes: ["id", "name", "price"] }]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        // Normalize status to Title Case (e.g., "shipped" -> "Shipped")
        const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

        const validStatuses = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];
        if (!validStatuses.includes(formattedStatus)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        if (order.status === formattedStatus) {
            return res.status(400).json({ message: `Order is already marked as ${formattedStatus}` });
        }

        const allowedTransitions = {
            "Pending": ["Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"],
            "Confirmed": ["Processing", "Shipped", "Delivered", "Cancelled"],
            "Processing": ["Shipped", "Delivered", "Cancelled"],
            "Shipped": ["Delivered", "Cancelled"],
            "Delivered": [], // Terminal state
            "Cancelled": []  // Terminal state
        };

        if (!allowedTransitions[order.status].includes(formattedStatus)) {
            return res.status(400).json({
                message: `Invalid status transition from ${order.status} to ${formattedStatus}`
            });
        }

        const t = await sequelize.transaction();
        try {
            order.status = formattedStatus;
            await order.save({ transaction: t });

            if (formattedStatus === "Cancelled") {
                await restoreOrderStock(order.orderItems, t);
            }

            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        if (order.user) {
            sendOrderStatusUpdateEmail(order.user.email, order.user.name || "Customer", order.id, formattedStatus).catch(err => console.error("Email error:", err));
        }

        const orderJSON = order.toJSON();
        if (orderJSON.orderItems) {
            orderJSON.orderItems = orderJSON.orderItems.map(item => {
                if (!item.product) {
                    item.product = {
                        id: item.productId,
                        name: "Product Unavailable/Deleted",
                        price: item.price
                    };
                }
                return item;
            });
        }

        return res.status(200).json({ message: "Order status updated", order: orderJSON });
    } catch (error) {
        next(error);
    }
};

// 5. Admin: View All Orders
exports.getAllOrders = async (req, res, next) => {
    try {
        const { status, userId, date, orderId, sortBy, sortOrder } = req.query;

        const whereClause = {};

        if (orderId) {
            whereClause.id = orderId;
        }
        if (status) {
            whereClause.status = status;
        }
        if (userId) {
            whereClause.userId = userId;
        }
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            whereClause.createdAt = {
                [Op.gte]: startDate,
                [Op.lt]: endDate
            };
        }

        const orderClause = [];
        if (sortBy) {
            const order = (sortOrder && sortOrder.toUpperCase() === "ASC") ? "ASC" : "DESC";
            orderClause.push([sortBy, order]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }

        const orders = await Order.findAndCountAll({
            where: whereClause,
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email"] },
                {
                    model: OrderItem,
                    as: "orderItems",
                    include: [{ model: Product, as: "product", attributes: ["id", "name", "price"] }]
                }
            ],
            order: orderClause,
            ...req.pagination
        });

        // Handle deleted products
        const formattedOrders = orders.rows.map(order => {
            const orderJSON = order.toJSON();
            if (orderJSON.orderItems) {
                orderJSON.orderItems = orderJSON.orderItems.map(item => {
                    if (!item.product) {
                        item.product = {
                            id: item.productId,
                            name: "Product Unavailable/Deleted",
                            price: item.price
                        };
                    }
                    return item;
                });
            }
            return orderJSON;
        });

        return res.sendPaginated(formattedOrders, orders.count, "orders");
    } catch (error) {
        next(error);
    }
};
// 7. User: Cancel Order
exports.cancelOrder = async (req, res, next) => {
    try {
        const orderId = req.params.id;
        if (isNaN(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await Order.findOne({
            where: { id: orderId, userId: req.user.id },
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email"] },
                {
                    model: OrderItem,
                    as: "orderItems"
                }
            ]
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.status !== "Pending" && order.status !== "Confirmed") {
            return res.status(400).json({ message: `Cannot cancel order in ${order.status} status` });
        }

        const t = await sequelize.transaction();
        try {
            order.status = "Cancelled";
            await order.save({ transaction: t });
            await restoreOrderStock(order.orderItems, t);
            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        if (order.user) {
            sendOrderStatusUpdateEmail(order.user.email, order.user.name || "Customer", order.id, "Cancelled").catch(err => console.error("Email error:", err));
        }

        return res.status(200).json({ message: "Order cancelled successfully" });
    } catch (error) {
        next(error);
    }
};
