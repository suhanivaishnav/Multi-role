const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const paginate = require("../middleware/pagination");

// GENERAL LIST PRODUCTS (MIX / CATEGORY / SEARCH)
// - Users / Guests : Only see Active products
router.get("/", paginate, productController.getAllProducts);

//GET SINGLE PRODUCT BY ID
// - Users / Guests: Only Active products
router.get("/:id", productController.getProductById);

//GET PRODUCTS CATEGORY-WISE
router.get("/category/:categoryId", paginate, productController.getProductsByCategory);

//GET PRODUCTS SUBCATEGORY-WISE
router.get("/subcategory/:subcategoryId", paginate, productController.getProductsBySubcategory);

module.exports = router;