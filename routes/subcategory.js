const express = require("express");
const router = express.Router();
const paginate = require("../middleware/pagination");
const subcategoryController = require("../controllers/subcategoryController");

//GET ALL SUBCATEGORIES
router.get("/", paginate, subcategoryController.getAllSubcategories);

//GET SUBCATEGORY BY ID 
router.get("/:id", subcategoryController.getSubcategoryById);

module.exports = router;