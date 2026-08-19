const express = require("express");
const router = express.Router();
const paginate = require("../middleware/pagination");

const categoryController = require("../controllers/categoryController");

//GET ALL CATEGORIES 
router.get("/", paginate, categoryController.getAllCategories);

//GET CATEGORIES BY SUBCATEGORIES (or by ID)
router.get("/:id", categoryController.getCategoryById);

module.exports = router;