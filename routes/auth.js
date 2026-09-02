const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { validateRequest } = require("../middleware/validate");

// POST /auth/login(for all users,sellers,admin,superadmin)
router.post("/login", validateRequest('auth.login'), authController.loginUser);

//POST/ logout
router.post("/logout", authController.logoutUser);

// POST /auth/forgot-password(for all users,sellers,admin,superadmin)
router.post("/forgot-password", validateRequest('auth.forgotPassword'), authController.forgotPassword);

// POST /auth/reset-password/:token
router.post("/reset-password/:token", 
    validateRequest('auth.resetPasswordParams', 'params'),
    validateRequest('auth.resetPassword'),
    authController.resetPassword
);

module.exports = router;
