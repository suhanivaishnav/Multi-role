const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const cartController = require("../controllers/cartController");

// ─── GUEST CART ROUTES (no auth required) ─────────────────────────────────────

// POST /cart/guest/add
// Guest: validate product & stock, return enriched cart (no DB write)
router.post("/guest/add", cartController.guestAddToCart);

// POST /cart/guest/view
// Guest: send the local cart array, get back enriched details & total
router.post("/guest/view", cartController.guestViewCart);

// ─── AUTHENTICATED CART ROUTES (user role required) ───────────────────────────

// Apply auth middleware to all routes below
router.use(authenticate, authorize("user"));

// POST /cart/checkout — checkout gate, confirms auth before payment
router.post("/checkout", cartController.checkoutGate);

// POST /cart/add — Add a product to the cart
router.post("/add", cartController.addToCart);

// GET /cart/ — View cart with all items and total
router.get("/", cartController.viewCart);

// PUT /cart/update/:cartItemId — Update item quantity
router.put("/update/:cartItemId", cartController.updateCartItem);

// DELETE /cart/remove/:cartItemId — Remove item from cart
router.delete("/remove/:cartItemId", cartController.removeCartItem);

module.exports = router;
