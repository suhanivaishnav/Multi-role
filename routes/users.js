const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");
const userController = require("../controllers/userController");

// ─── PUBLIC ROUTES (no auth required) ────────────────────────────────────────

// POST /users/register 
router.post("/register", userController.registerUser);
router.post("/", userController.registerUser);

// ─── BASELINE: All routes below require a valid token + User role ─────────────
router.use(authenticateToken, requireRole("User"));

// ─── USER PROFILE ─────────────────────────────────────────────────────────────

// GET /users/profile 
router.get("/profile", userController.getProfile);

// PUT|PATCH /users/profile 
router.put("/profile", userController.updateProfile);
router.patch("/profile", userController.updateProfile);

// DELETE /users/profile (soft-delete) 
router.delete("/profile", userController.deleteProfile);

module.exports = router;