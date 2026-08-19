const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const paginate = require("../middleware/pagination");

// 1. GENERAL LIST PRODUCTS (MIX / CATEGORY / SEARCH)
// - Users / Guests : Only see Active products
router.get("/", paginate, productController.getAllProducts);

// 2. GET SINGLE PRODUCT BY ID
// - Users / Guests: Only Active products
router.get("/:id", productController.getProductById);

// 3. GET PRODUCTS CATEGORY-WISE
router.get("/category/:categoryId", paginate, productController.getProductsByCategory);

// 4. GET PRODUCTS SUBCATEGORY-WISE
router.get("/subcategory/:subcategoryId", paginate, productController.getProductsBySubcategory);

module.exports = router;