const express = require("express");
const router = express.Router();

const subcategoryController = require("../controllers/subcategoryController");

//GET ALL SUBCATEGORIES
router.get("/", subcategoryController.getAllSubcategories);

//GET SUBCATEGORY BY ID 
router.get("/:id", subcategoryController.getSubcategoryById);

module.exports = router;