const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");
const sellerController = require("../controllers/sellerController");
const productController = require("../controllers/productController");
const paginate = require("../middleware/pagination");

//REGISTER SELLER (POST /sellers/register & POST /sellers/)✅
router.post("/register", sellerController.registerSeller);
router.post("/", sellerController.registerSeller);

// --- PROTECTED SELLER PROFILE ROUTES ---

// GET /sellers/profile - Get logged-in seller profile✅
router.get("/profile", authenticateToken, requireRole("Seller"), sellerController.getSellerProfile);

// PUT /sellers/profile & PATCH /sellers/profile - Update logged-in seller profile✅
router.put("/profile", authenticateToken, requireRole("Seller"), sellerController.updateSellerProfile);
router.patch("/profile", authenticateToken, requireRole("Seller"), sellerController.updateSellerProfile);

// DELETE /sellers/profile - Delete logged-in seller account✅
router.delete("/profile", authenticateToken, requireRole("Seller"), sellerController.deleteSellerProfile);

// --- PRODUCT MANAGEMENT (SELLER ONLY) ---

// GET SELLER'S OWN PRODUCTS✅(can filter by ?categoryId=5 and subcategory like this)
router.get("/products", authenticateToken, requireRole("Seller"), paginate, productController.getMyProducts);

// (Pending products can be viewed using /products?status=Pending)

// GET SINGLE PRODUCT BY ID (SELLER'S OWN OR ANY ACTIVE)✅
router.get("/products/:id", authenticateToken, requireRole("Seller"), productController.getProductById);

// CREATE PRODUCT✅
router.post("/products", authenticateToken, requireRole("Seller"), productController.createProduct);

// UPDATE PRODUCT✅
router.put("/products/:id", authenticateToken, requireRole("Seller"), productController.updateProduct);
router.patch("/products/:id", authenticateToken, requireRole("Seller"), productController.updateProduct);

// DELETE PRODUCT✅
router.delete("/products/:id", authenticateToken, requireRole("Seller"), productController.deleteProduct);

module.exports = router;
