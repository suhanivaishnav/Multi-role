const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");
const adminController = require("../controllers/adminController");
const categoryController = require("../controllers/categoryController");
const subcategoryController = require("../controllers/subcategoryController");
const productController = require("../controllers/productController");
const paginate = require("../middleware/pagination");

// ─── BASELINE: All routes below require a valid token + Admin or SuperAdmin role
router.use(authenticateToken, requireRole("Admin", "SuperAdmin"));

// ─── ADMIN PROFILE ────────────────────────────────────────────────────────────

// GET /admins/profile
router.get("/profile", adminController.getAdminProfile);

// PUT|PATCH /admins/profile 
router.put("/profile", adminController.updateAdminProfile);
router.patch("/profile", adminController.updateAdminProfile);

// ─── SELLER MANAGEMENT ────────────────────────────────────────────────────────

// GET /admins/sellers (filter: ?status=Pending)
router.get("/sellers", paginate, adminController.getAllSellers);

// GET /admins/sellers/:id 
router.get("/sellers/:id", adminController.getSellerById);

// PUT|PATCH /admins/sellers/:id 
router.put("/sellers/:id", adminController.updateSellerById);
router.patch("/sellers/:id", adminController.updateSellerById);

// PATCH /admins/sellers/:id/approve    
router.patch("/sellers/:id/approve", adminController.approveSeller);

// PATCH /admins/sellers/:id/suspend
router.patch("/sellers/:id/suspend", adminController.suspendSeller);

// PATCH /admins/sellers/:id/restore 
router.patch("/sellers/:id/restore", adminController.restoreSeller);

// DELETE /admins/sellers/:id  (soft delete)
router.delete("/sellers/:id", adminController.deleteSellerById);

// DELETE /admins/sellers/:id/force  (SuperAdmin only) 
router.delete("/sellers/:id/force", requireRole("SuperAdmin"), adminController.forceDeleteSeller);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

// GET /admins/overview 
router.get("/overview", paginate, adminController.getOverview);

// ─── CATEGORY MANAGEMENT ──────────────────────────────────────────────────────

// GET /admins/categories 
router.get("/categories", paginate, adminController.getAllCategories);

// POST /admins/categories 
router.post("/categories", categoryController.createCategory);

// GET /admins/categories/:id 
router.get("/categories/:id", adminController.getCategoryById);

// PUT|PATCH /admins/categories/:id 
router.put("/categories/:id", categoryController.updateCategory);
router.patch("/categories/:id", categoryController.updateCategory);

// DELETE /admins/categories/:id 
router.delete("/categories/:id", categoryController.deleteCategory);

// ─── SUBCATEGORY MANAGEMENT ───────────────────────────────────────────────────

// GET /admins/subcategories 
router.get("/subcategories", paginate, adminController.getAllSubcategories);

// POST /admins/subcategories 
router.post("/subcategories", subcategoryController.createSubcategory);

// GET /admins/subcategories/:id 
router.get("/subcategories/:id", adminController.getSubcategoryById);

// PUT|PATCH /admins/subcategories/:id 
router.put("/subcategories/:id", subcategoryController.updateSubcategory);
router.patch("/subcategories/:id", subcategoryController.updateSubcategory);

// DELETE /admins/subcategories/:id 
router.delete("/subcategories/:id", subcategoryController.deleteSubcategory);

// ─── PRODUCT MANAGEMENT ───────────────────────────────────────────────────────

// GET /admins/products   (filter: ?status=Pending)
router.get("/products", paginate, productController.getAllProductsAdmin);

// GET /admins/products/:id 
router.get("/products/:id", productController.getProductById);

// POST /admins/products 
router.post("/products", productController.createProduct);

// PUT|PATCH /admins/products/:id 
router.put("/products/:id", productController.updateProduct);
router.patch("/products/:id", productController.updateProduct);

// PATCH /admins/products/:id/approve 
router.patch("/products/:id/approve", productController.approveProduct);

// PATCH /admins/products/:id/reject 
router.patch("/products/:id/reject", productController.rejectProduct);

// PATCH /admins/products/:id/status 
router.patch("/products/:id/status", productController.updateProductStatus);

// DELETE /admins/products/:id 
router.delete("/products/:id", productController.deleteProduct);

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────

// GET /admins/users  (filter: ?status=Active|Blocked, ?withDeleted=true)
router.get("/users", paginate, adminController.getAllUsers);

// GET /admins/users/:id  (supports ?withDeleted=true)
router.get("/users/:id", adminController.getUserById);

// PATCH /admins/users/:id/block|unblock 
router.patch("/users/:id/block", adminController.blockUser);
router.patch("/users/:id/unblock", adminController.unblockUser);

// DELETE /admins/users/:id  (soft delete) 
router.delete("/users/:id", adminController.softDeleteUser);

// PATCH /admins/users/:id/restore 
router.patch("/users/:id/restore", adminController.restoreUser);

// DELETE /admins/users/:id/force  (SuperAdmin only) 
router.delete("/users/:id/force", requireRole("SuperAdmin"), adminController.forceDeleteUser);

// ─── ADMIN MANAGEMENT (SuperAdmin only) ───────────────────────────────────────
// NOTE: These wildcard routes must stay at the bottom to prevent collision
//       with named routes like /profile, /sellers, /users etc.

// GET /admins/ 
router.get("/", requireRole("SuperAdmin"), paginate, adminController.getAllAdmins);

// GET /admins/:id 
router.get("/:id", requireRole("SuperAdmin"), adminController.getAdminById);

// PUT|PATCH /admins/:id 
router.put("/:id", requireRole("SuperAdmin"), adminController.updateAdmin);
router.patch("/:id", requireRole("SuperAdmin"), adminController.updateAdmin);

// PATCH /admins/:id/suspend|unsuspend 
router.patch("/:id/suspend", requireRole("SuperAdmin"), adminController.suspendAdmin);
router.patch("/:id/unsuspend", requireRole("SuperAdmin"), adminController.unsuspendAdmin);

module.exports = router;