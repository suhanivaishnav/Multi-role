const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validate");
const userController = require("../controllers/userController");

// ─── PUBLIC ROUTES (no auth required) ────────────────────────────────────────

// POST /users/register 
router.post("/register", validateRequest('user.registration'), userController.registerUser);
router.post("/", validateRequest('user.registration'), userController.registerUser);

// ─── BASELINE: All routes below require a valid token + User role ─────────────
router.use(authenticateToken, requireRole("User"));

// ─── USER PROFILE ─────────────────────────────────────────────────────────────

// GET /users/profile 
router.get("/profile", userController.getProfile);

// PUT|PATCH /users/profile 
router.put("/profile", validateRequest('user.update'), userController.updateProfile);
router.patch("/profile", validateRequest('user.update'), userController.updateProfile);

// DELETE /users/profile (soft-delete) 
router.delete("/profile", userController.deleteProfile);

// POST /apply-seller
router.post("/apply-seller", userController.applySeller);

module.exports = router;