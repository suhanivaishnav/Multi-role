const { Cart, CartItem, Product } = require("../models");
const { Op } = require("sequelize");

// Helper to recalculate and save cart total
const recalculateCartTotal = async (cart) => {
    const items = await CartItem.findAll({ where: { cartId: cart.id } });
    const total = items.reduce((sum, item) => {
        return sum + parseFloat(item.subtotal);
    }, 0);
    cart.total = total.toFixed(2);
    await cart.save();
    return parseFloat(cart.total);
};

// POST /cart/add
// Adds a product to the authenticated user's cart
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body;

        // Validate required fields
        if (!productId) {
            return res.status(400).json({ message: "productId is required" });
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 1) {
            return res.status(400).json({ message: "Quantity must be a positive integer" });
        }

        // Validate product exists and is Active
        const product = await Product.findOne({
            where: { id: productId, status: "Active" }
        });

        if (!product) {
            return res.status(404).json({ message: "Product not found or not available" });
        }

        // Check stock
        if (product.stock < qty) {
            return res.status(400).json({
                message: `Insufficient stock. Available: ${product.stock}`
            });
        }

        // Find or create cart for the user
        const [cart] = await Cart.findOrCreate({
            where: { userId },
            defaults: { userId, total: 0 }
        });

        // Check if product already in cart
        let cartItem = await CartItem.findOne({
            where: { cartId: cart.id, productId }
        });

        if (cartItem) {
            // Update quantity if product already in cart
            const newQty = cartItem.quantity + qty;
            if (product.stock < newQty) {
                return res.status(400).json({
                    message: `Insufficient stock. Available: ${product.stock}, already in cart: ${cartItem.quantity}`
                });
            }
            cartItem.quantity = newQty;
            cartItem.subtotal = (parseFloat(product.price) * newQty).toFixed(2);
            await cartItem.save();
        } else {
            // Create new cart item
            cartItem = await CartItem.create({
                cartId: cart.id,
                productId: product.id,
                quantity: qty,
                price: parseFloat(product.price),
                subtotal: (parseFloat(product.price) * qty).toFixed(2)
            });
        }

        // Recalculate cart total
        const total = await recalculateCartTotal(cart);

        return res.status(200).json({
            message: "Product added to cart",
            cartItem: {
                id: cartItem.id,
                productId: cartItem.productId,
                productName: product.name,
                quantity: cartItem.quantity,
                price: parseFloat(cartItem.price),
                subtotal: parseFloat(cartItem.subtotal)
            },
            cartTotal: total
        });
    } catch (error) {
        console.error("addToCart error:", error);
        return res.status(500).json({
            message: "Failed to add item to cart",
            error: "An internal server error occurred"
        });
    }
};

// GET /cart/
// Returns all cart items with product details and cart total
exports.viewCart = async (req, res) => {
    try {
        const userId = req.user.id;

        const cart = await Cart.findOne({
            where: { userId },
            include: [
                {
                    model: CartItem,
                    as: "cartItems",
                    include: [
                        {
                            model: Product,
                            as: "product",
                            attributes: ["id", "name", "description", "price", "stock", "status"]
                        }
                    ]
                }
            ]
        });

        if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
            return res.status(200).json({ message: "Your cart is empty", cart: [], total: 0 });
        }

        const items = cart.cartItems.map((item) => ({
            cartItemId: item.id,
            productId: item.productId,
            productName: item.product ? item.product.name : "Unknown",
            productDescription: item.product ? item.product.description : null,
            productStatus: item.product ? item.product.status : null,
            quantity: item.quantity,
            price: parseFloat(item.price),
            subtotal: parseFloat(item.subtotal)
        }));

        return res.status(200).json({
            cartId: cart.id,
            items,
            total: parseFloat(cart.total)
        });
    } catch (error) {
        console.error("viewCart error:", error);
        return res.status(500).json({
            message: "Failed to fetch cart",
            error: "An internal server error occurred"
        });
    }
};

// PUT /cart/update/:cartItemId
// Updates the quantity of a cart item
exports.updateCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const cartItemId = parseInt(req.params.cartItemId);
        const { quantity } = req.body;

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 1) {
            return res.status(400).json({ message: "Quantity must be a positive integer" });
        }

        // Find the user's cart
        const cart = await Cart.findOne({ where: { userId } });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // Find the cart item and verify it belongs to the user's cart
        const cartItem = await CartItem.findOne({
            where: { id: cartItemId, cartId: cart.id }
        });

        if (!cartItem) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        // Validate product stock
        const product = await Product.findByPk(cartItem.productId);
        if (!product) {
            return res.status(404).json({ message: "Product no longer exists" });
        }

        if (product.stock < qty) {
            return res.status(400).json({
                message: `Insufficient stock. Available: ${product.stock}`
            });
        }

        // Update quantity and subtotal
        cartItem.quantity = qty;
        cartItem.subtotal = (parseFloat(product.price) * qty).toFixed(2);
        await cartItem.save();

        // Recalculate cart total
        const total = await recalculateCartTotal(cart);

        return res.status(200).json({
            message: "Cart item updated",
            cartItem: {
                id: cartItem.id,
                productId: cartItem.productId,
                productName: product.name,
                quantity: cartItem.quantity,
                price: parseFloat(cartItem.price),
                subtotal: parseFloat(cartItem.subtotal)
            },
            cartTotal: total
        });
    } catch (error) {
        console.error("updateCartItem error:", error);
        return res.status(500).json({
            message: "Failed to update cart item",
            error: "An internal server error occurred"
        });
    }
};

// DELETE /cart/remove/:cartItemId
// Removes a single item from the cart and returns updated cart
exports.removeCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const cartItemId = parseInt(req.params.cartItemId);

        // Find the user's cart
        const cart = await Cart.findOne({ where: { userId } });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // Find the cart item and verify it belongs to the user's cart
        const cartItem = await CartItem.findOne({
            where: { id: cartItemId, cartId: cart.id }
        });

        if (!cartItem) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        await cartItem.destroy();

        // Recalculate cart total
        const total = await recalculateCartTotal(cart);

        // Fetch updated items for the response
        const updatedItems = await CartItem.findAll({
            where: { cartId: cart.id },
            include: [
                {
                    model: Product,
                    as: "product",
                    attributes: ["id", "name", "price"]
                }
            ]
        });

        const items = updatedItems.map((item) => ({
            cartItemId: item.id,
            productId: item.productId,
            productName: item.product ? item.product.name : "Unknown",
            quantity: item.quantity,
            price: parseFloat(item.price),
            subtotal: parseFloat(item.subtotal)
        }));

        return res.status(200).json({
            message: "Item removed from cart",
            cartId: cart.id,
            items,
            total
        });
    } catch (error) {
        console.error("removeCartItem error:", error);
        return res.status(500).json({
            message: "Failed to remove cart item",
            error: "An internal server error occurred"
        });
    }
};

// ─── GUEST CART ───────────────────────────────────────────────────────────────

// POST /cart/guest/add
// Validates a product for a guest user and returns enriched cart item data.
// Does NOT persist to DB — client holds the cart in local state.
exports.guestAddToCart = async (req, res) => {
    try {
        const { productId, quantity, guestCart = [] } = req.body;

        if (!productId) {
            return res.status(400).json({ message: "productId is required" });
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 1) {
            return res.status(400).json({ message: "Quantity must be a positive integer" });
        }

        // Validate product
        const product = await Product.findOne({
            where: { id: productId, status: "Active" }
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found or not available" });
        }

        // Check current qty already in guest cart for this product
        const existingEntry = guestCart.find(
            (i) => parseInt(i.productId) === parseInt(productId)
        );
        const alreadyInCart = existingEntry ? parseInt(existingEntry.quantity) : 0;
        const totalQty = alreadyInCart + qty;

        if (product.stock < totalQty) {
            return res.status(400).json({
                message: `Insufficient stock. Available: ${product.stock}${
                    alreadyInCart ? `, already in cart: ${alreadyInCart}` : ""
                }`
            });
        }

        // Build the updated guest cart
        let updatedCart;
        if (existingEntry) {
            updatedCart = guestCart.map((i) =>
                parseInt(i.productId) === parseInt(productId)
                    ? { productId: parseInt(productId), quantity: totalQty }
                    : i
            );
        } else {
            updatedCart = [
                ...guestCart,
                { productId: parseInt(productId), quantity: qty }
            ];
        }

        // Enrich the full cart with product details and compute totals
        const enriched = await enrichGuestCart(updatedCart);

        return res.status(200).json({
            message: "Product added to guest cart",
            guestCart: enriched.items,
            total: enriched.total
        });
    } catch (error) {
        console.error("guestAddToCart error:", error);
        return res.status(500).json({
            message: "Failed to add item to guest cart",
            error: "An internal server error occurred"
        });
    }
};

// POST /cart/guest/view
// Accepts the client-held guest cart array and returns enriched details + total.
exports.guestViewCart = async (req, res) => {
    try {
        const { guestCart = [] } = req.body;

        if (!Array.isArray(guestCart) || guestCart.length === 0) {
            return res.status(200).json({ message: "Your guest cart is empty", items: [], total: 0 });
        }

        const enriched = await enrichGuestCart(guestCart);

        return res.status(200).json({
            items: enriched.items,
            total: enriched.total
        });
    } catch (error) {
        console.error("guestViewCart error:", error);
        return res.status(500).json({
            message: "Failed to view guest cart",
            error: "An internal server error occurred"
        });
    }
};

// POST /cart/checkout
// Checkout gate — requires authentication.
// Returns the user's current cart so the client can proceed to payment.
exports.checkoutGate = async (req, res) => {
    try {
        const userId = req.user.id;

        const cart = await Cart.findOne({
            where: { userId },
            include: [
                {
                    model: CartItem,
                    as: "cartItems",
                    include: [
                        {
                            model: Product,
                            as: "product",
                            attributes: ["id", "name", "price", "stock", "status"]
                        }
                    ]
                }
            ]
        });

        if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
            return res.status(200).json({ message: "Your cart is empty. Add items before checking out.", items: [], total: 0 });
        }

        const items = cart.cartItems.map((item) => ({
            cartItemId: item.id,
            productId: item.productId,
            productName: item.product ? item.product.name : "Unknown",
            quantity: item.quantity,
            price: parseFloat(item.price),
            subtotal: parseFloat(item.subtotal)
        }));

        return res.status(200).json({
            message: "Proceed to payment",
            requiresAuth: false,
            cartId: cart.id,
            items,
            total: parseFloat(cart.total)
        });
    } catch (error) {
        console.error("checkoutGate error:", error);
        return res.status(500).json({
            message: "Failed to proceed to checkout",
            error: "An internal server error occurred"
        });
    }
};

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

// Enriches a raw guest cart array with product details and calculates totals.
// Skips invalid/inactive products silently.
async function enrichGuestCart(guestCart) {
    const productIds = guestCart.map((i) => parseInt(i.productId));
    const products = await Product.findAll({
        where: { id: { [Op.in]: productIds }, status: "Active" },
        attributes: ["id", "name", "description", "price", "stock", "status"]
    });

    const productMap = {};
    products.forEach((p) => (productMap[p.id] = p));

    let total = 0;
    const items = [];

    for (const entry of guestCart) {
        const pid = parseInt(entry.productId);
        const qty = parseInt(entry.quantity);
        const product = productMap[pid];
        if (!product || isNaN(qty) || qty < 1) continue;

        const effectiveQty = Math.min(qty, product.stock);
        const subtotal = parseFloat((parseFloat(product.price) * effectiveQty).toFixed(2));
        total += subtotal;

        items.push({
            productId: pid,
            productName: product.name,
            productDescription: product.description,
            quantity: effectiveQty,
            price: parseFloat(product.price),
            subtotal
        });
    }

    return { items, total: parseFloat(total.toFixed(2)) };
}

// syncGuestCart — merges a guest cart into a user's persisted DB cart.
// Called internally after login or registration.
// Returns { synced, skipped } summary.
exports.syncGuestCart = async (userId, guestCart) => {
    if (!Array.isArray(guestCart) || guestCart.length === 0) {
        return { synced: [], skipped: [] };
    }

    const synced = [];
    const skipped = [];

    // Find or create user's cart
    const [cart] = await Cart.findOrCreate({
        where: { userId },
        defaults: { userId, total: 0 }
    });

    for (const entry of guestCart) {
        const productId = parseInt(entry.productId);
        const qty = parseInt(entry.quantity);

        if (isNaN(productId) || isNaN(qty) || qty < 1) {
            skipped.push({ productId: entry.productId, reason: "Invalid productId or quantity" });
            continue;
        }

        // Validate product
        const product = await Product.findOne({
            where: { id: productId, status: "Active" }
        });
        if (!product) {
            skipped.push({ productId, reason: "Product not found or inactive" });
            continue;
        }

        // Find existing cart item for this product
        let cartItem = await CartItem.findOne({
            where: { cartId: cart.id, productId }
        });

        if (cartItem) {
            // Merge: add quantities, capped at available stock
            const mergedQty = Math.min(cartItem.quantity + qty, product.stock);
            if (mergedQty === cartItem.quantity) {
                // No change possible (already at max stock)
                skipped.push({
                    productId,
                    productName: product.name,
                    reason: `Already at max stock (${product.stock})`
                });
                continue;
            }
            cartItem.quantity = mergedQty;
            cartItem.subtotal = (parseFloat(product.price) * mergedQty).toFixed(2);
            await cartItem.save();
        } else {
            // Add new item, capped at stock
            const finalQty = Math.min(qty, product.stock);
            cartItem = await CartItem.create({
                cartId: cart.id,
                productId,
                quantity: finalQty,
                price: parseFloat(product.price),
                subtotal: (parseFloat(product.price) * finalQty).toFixed(2)
            });
        }

        synced.push({
            productId,
            productName: product.name,
            quantity: cartItem.quantity,
            subtotal: parseFloat(cartItem.subtotal)
        });
    }

    // Recalculate cart total after full sync
    await recalculateCartTotal(cart);

    return { synced, skipped };
};
