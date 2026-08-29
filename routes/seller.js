const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole, validateRegistration, validateUpdate, validateProduct } = require("../middleware/auth");
const sellerController = require("../controllers/sellerController");
const productController = require("../controllers/productController");
const paginate = require("../middleware/pagination");

// ─── PUBLIC ROUTES (no auth required) ────────────────────────────────────────

// POST /sellers/register
router.post("/register", validateRegistration, sellerController.registerSeller);
router.post("/", validateRegistration, sellerController.registerSeller);

// ─── BASELINE: All routes below require a valid token + Seller role ───────────
router.use(authenticateToken, requireRole("Seller"));

// ─── SELLER PROFILE ───────────────────────────────────────────────────────────

// GET /sellers/profile 
router.get("/profile", sellerController.getSellerProfile);

// PUT|PATCH /sellers/profile 
router.put("/profile", validateUpdate, sellerController.updateSellerProfile);
router.patch("/profile", validateUpdate, sellerController.updateSellerProfile);

// DELETE /sellers/profile 
router.delete("/profile", sellerController.deleteSellerProfile);

// ─── PRODUCT MANAGEMENT ───────────────────────────────────────────────────────

// GET /sellers/products   (filter: ?status=Pending, ?categoryId=5)
router.get("/products", paginate, productController.getMyProducts);

// GET /sellers/products/:id 
router.get("/products/:id", productController.getProductById);

// POST /sellers/products 
router.post("/products", validateProduct, productController.createProduct);

// PUT|PATCH /sellers/products/:id 
router.put("/products/:id", validateProduct, productController.updateProduct);
router.patch("/products/:id", validateProduct, productController.updateProduct);

// DELETE /sellers/products/:id 
router.delete("/products/:id", productController.deleteProduct);

module.exports = router;
