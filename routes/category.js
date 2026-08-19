const express = require("express");
const router = express.Router();

const categoryController = require("../controllers/categoryController");

//GET ALL CATEGORIES 
router.get("/", categoryController.getAllCategories);

//GET CATEGORIES BY SUBCATEGORIES (or by ID)
router.get("/:id", categoryController.getCategoryById);

module.exports = router;