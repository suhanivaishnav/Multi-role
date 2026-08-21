const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/auth");
const paginate = require("../middleware/pagination");

// Place a new order
router.post("/", authenticate, authorize("user"), orderController.placeOrder);

// Get my orders
router.get("/myorders", authenticate, authorize("user"), paginate, orderController.getMyOrders);

// Get order details
router.get("/:id", authenticate, authorize("user"), orderController.getOrderDetails);

module.exports = router;
