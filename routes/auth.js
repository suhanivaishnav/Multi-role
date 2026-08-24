const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// POST /auth/login(for all users,sellers,admin,superadmin)
router.post("/login", authController.loginUser);

//POST/ logout
router.post("/logout", authController.logoutUser);

// POST /auth/forgot-password(for all users,sellers,admin,superadmin)
router.post("/forgot-password", authController.forgotPassword);

// POST /auth/reset-password/:token
router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;
