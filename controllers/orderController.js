const { Order, OrderItem, Product, User, sequelize } = require("../models");

// 1. Place Order
exports.placeOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { items, shippingAddress, paymentMethod } = req.body;
        const userId = req.user.id;

        if (!shippingAddress || !paymentMethod) {
            return res.status(400).json({ message: "Shipping address and payment method are required" });
        }

        if (!items || !items.length) {
            return res.status(400).json({ message: "Order items cannot be empty" });
        }

        let totalAmount = 0;
        const orderItemsData = [];

        // Validate products and calculate total
        for (let item of items) {
            const product = await Product.findByPk(item.productId, { transaction: t });

            if (!product) {
                await t.rollback();
                return res.status(404).json({ success: false, message: `Product not found with id ${item.productId}` });
            }

            if (product.stock < item.quantity) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Insufficient stock for product ${product.name}` });
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            orderItemsData.push({
                productId: product.id,
                quantity: item.quantity,
                price: product.price
            });

            // Decrease stock
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

        return res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order
        });

    } catch (error) {
        await t.rollback();
        console.error("Place order error:", error);
        return res.status(500).json({ success: false, message: "Failed to Place the order", error: error.message });
    }
};

// 2. View My Orders
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.findAndCountAll({
            where: { userId: req.user.id },
            include: [
                {
                    model: OrderItem,
                    as: "orderItems",
                    include: [{ model: Product, as: "product", attributes: ["id", "name", "price"] }]
                }
            ],
            order: [["createdAt", "DESC"]],
            limit: req.pagination.limit,
            offset: req.pagination.offset
        });

        return res.sendPaginated(orders.rows, orders.count, "orders", { success: true });
    } catch (error) {
        console.error("Get my orders error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// 3. View Order Details
exports.getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
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
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Check authorization (User can only view their own order, Admin/Superadmin can view any)
        if (req.user.role === "user" && order.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: "Forbidden: You do not have access to this order" });
        }

        return res.status(200).json({ success: true, order });
    } catch (error) {
        console.error("Get order details error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// 4. Update Order Status (Admin/SuperAdmin)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        const validStatuses = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status value" });
        }

        const order = await Order.findByPk(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        order.status = status;
        await order.save();

        return res.status(200).json({ success: true, message: "Order status updated", order });
    } catch (error) {
        console.error("Update order status error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// 5. Admin: View All Orders
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.findAndCountAll({
            include: [
                { model: User, as: "user", attributes: ["id", "name", "email"] }
            ],
            order: [["createdAt", "DESC"]],
            limit: req.pagination.limit,
            offset: req.pagination.offset
        });

        return res.sendPaginated(orders.rows, orders.count, "orders", { success: true });
    } catch (error) {
        console.error("Get all orders error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
