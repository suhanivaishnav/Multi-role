const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validate");
const sellerController = require("../controllers/sellerController");
const productController = require("../controllers/productController");
const paginate = require("../middleware/pagination");

// ─── PUBLIC ROUTES (no auth required) ────────────────────────────────────────

// POST /sellers/register
router.post("/register", validateRequest('user.registration'), sellerController.registerSeller);
router.post("/", validateRequest('user.registration'), sellerController.registerSeller);

// ─── BASELINE: All routes below require a valid token + Seller role ───────────
router.use(authenticateToken, requireRole("Seller"));

// ─── SELLER PROFILE ───────────────────────────────────────────────────────────

// GET /sellers/profile 
router.get("/profile", sellerController.getSellerProfile);

// PUT|PATCH /sellers/profile 
router.put("/profile", validateRequest('user.update'), sellerController.updateSellerProfile);
router.patch("/profile", validateRequest('user.update'), sellerController.updateSellerProfile);

// DELETE /sellers/profile 
router.delete("/profile", sellerController.deleteSellerProfile);

// ─── PRODUCT MANAGEMENT ───────────────────────────────────────────────────────

// GET /sellers/products   (filter: ?status=Pending, ?categoryId=5) working pagination
router.get("/products", paginate, productController.getMyProducts);

// GET /sellers/products/:id 
router.get("/products/:id", productController.getProductById);

// POST /sellers/products 
router.post("/products", validateRequest('product.create'), productController.createProduct);

// PUT|PATCH /sellers/products/:id 
router.put("/products/:id", validateRequest('product.update'), productController.updateProduct);
router.patch("/products/:id", validateRequest('product.update'), productController.updateProduct);

// DELETE /sellers/products/:id 
router.delete("/products/:id", productController.deleteProduct);

module.exports = router;
