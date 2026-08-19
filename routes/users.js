const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");
const userController = require("../controllers/userController");

// POST /users/register & POST /users/✅
router.post("/register", userController.registerUser);
router.post("/", userController.registerUser);

// --- PROTECTED USER PROFILE ROUTES ---

// GET /users/profile - Get logged-in user profile✅
router.get("/profile", authenticateToken, requireRole("User"), userController.getProfile);

// PUT /users/profile & PATCH /users/profile - Update logged-in user profile✅
router.put("/profile", authenticateToken, requireRole("User"), userController.updateProfile);
router.patch("/profile", authenticateToken, requireRole("User"), userController.updateProfile);

// DELETE /users/profile - Delete (soft-delete) logged-in user profile✅
router.delete("/profile", authenticateToken, requireRole("User"), userController.deleteProfile);

module.exports = router;