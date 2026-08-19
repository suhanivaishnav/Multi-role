const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");
const adminController = require("../controllers/adminController");
const categoryController = require("../controllers/categoryController");
const subcategoryController = require("../controllers/subcategoryController");
const productController = require("../controllers/productController");
const paginate = require("../middleware/pagination");

// --- PROTECTED ADMIN PROFILE ROUTES ---

// GET /admins/profile - Get logged-in admin or superadmin profile✅
router.get("/profile", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.getAdminProfile);

// PUT /admins/profile & PATCH /admins/profile - Update logged-in admin or superadmin profile✅
router.put("/profile", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.updateAdminProfile);
router.patch("/profile", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.updateAdminProfile);

//SELLER MANAGEMENT 
// APPROVE SELLER WORKFLOW (PATCH /admins/sellers/:id/approve & PATCH /admins/sellers/:sellerId/approve)✅
router.patch("/sellers/:id/approve", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.approveSeller);

// SUSPEND SELLER WORKFLOW (PATCH /admins/sellers/:id/suspend & PATCH /admins/sellers/:sellerId/suspend)✅
router.patch("/sellers/:id/suspend", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.suspendSeller);

// GET ALL SELLERS✅ (Pending sellers can be viewed using /sellers?status=Pending)
router.get("/sellers", authenticateToken, requireRole("Admin", "SuperAdmin"), paginate, adminController.getAllSellers);

// GET ONE SELLER BY ID✅
router.get("/sellers/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.getSellerById);

// UPDATE SELLER DETAILS✅
router.put("/sellers/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.updateSellerById);
router.patch("/sellers/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.updateSellerById);

//SOFT DELETE SELLER✅
router.delete("/sellers/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.deleteSellerById);

//RESTORE SELLER✅
router.patch("/sellers/:id/restore", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.restoreSeller);

//FORCE DELETE SELLER✅
router.delete("/sellers/:id/force", authenticateToken, requireRole("SuperAdmin"), adminController.forceDeleteSeller);

// GET APPLICATION OVERVIEW / DASHBOARD (ADMIN ACCESS)✅
router.get("/overview", authenticateToken, requireRole("Admin", "SuperAdmin"), paginate, adminController.getOverview);

//CATEGORIES
// GET ALL CATEGORIES✅
router.get("/categories", authenticateToken, requireRole("Admin", "SuperAdmin"), paginate, adminController.getAllCategories);

// CREATE CATEGORY✅
router.post("/categories", authenticateToken, requireRole("Admin", "SuperAdmin"), categoryController.createCategory);

// GET SINGLE CATEGORY BY ID✅
router.get("/categories/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.getCategoryById);

// UPDATE CATEGORY✅
router.put("/categories/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), categoryController.updateCategory);
router.patch("/categories/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), categoryController.updateCategory);

// DELETE CATEGORY✅
router.delete("/categories/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), categoryController.deleteCategory);

//SUBCATEGORY
// GET ALL SUBCATEGORIES✅
router.get("/subcategories", authenticateToken, requireRole("Admin", "SuperAdmin"), paginate, adminController.getAllSubcategories);

// CREATE SUBCATEGORY✅
router.post("/subcategories", authenticateToken, requireRole("Admin", "SuperAdmin"), subcategoryController.createSubcategory);

// GET SINGLE SUBCATEGORY BY ID✅
router.get("/subcategories/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.getSubcategoryById);

// UPDATE SUBCATEGORY✅
router.put("/subcategories/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), subcategoryController.updateSubcategory);
router.patch("/subcategories/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), subcategoryController.updateSubcategory);

// DELETE SUBCATEGORY✅
router.delete("/subcategories/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), subcategoryController.deleteSubcategory);

// --- PRODUCT MANAGEMENT (ADMIN ONLY) ---

// ADMIN LIST ALL PRODUCTS✅
router.get("/products", authenticateToken, requireRole("Admin", "SuperAdmin"), paginate, productController.getAllProductsAdmin);

// (Pending products can be viewed using /products?status=Pending)

// GET SINGLE PRODUCT BY ID✅
router.get("/products/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), productController.getProductById);

// CREATE PRODUCT✅
router.post("/products", authenticateToken, requireRole("Admin", "SuperAdmin"), productController.createProduct);

// UPDATE PRODUCT✅
router.put("/products/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), productController.updateProduct);
router.patch("/products/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), productController.updateProduct);

// APPROVE PRODUCT WORKFLOW✅
router.patch("/products/:id/approve", authenticateToken, requireRole("Admin", "SuperAdmin"), productController.approveProduct);

// REJECT PRODUCT WORKFLOW✅
router.patch("/products/:id/reject", authenticateToken, requireRole("Admin", "SuperAdmin"), productController.rejectProduct);

// UPDATE PRODUCT STATUS DIRECTLY✅
router.patch("/products/:id/status", authenticateToken, requireRole("Admin", "SuperAdmin"), productController.updateProductStatus);

// DELETE PRODUCT✅
router.delete("/products/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), productController.deleteProduct);

// --- USER MANAGEMENT WORKFLOW (ADMIN ONLY) ---

// GET ALL USERS✅ (Supports ?status=Active|Blocked & ?withDeleted=true)
router.get("/users", authenticateToken, requireRole("Admin", "SuperAdmin"), paginate, adminController.getAllUsers);

// GET ONE USER BY ID✅ (Supports ?withDeleted=true)
router.get("/users/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.getUserById);

// BLOCK / UNBLOCK USER✅
router.patch("/users/:id/block", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.blockUser);
router.patch("/users/:id/unblock", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.unblockUser);

// SOFT DELETE USER✅
router.delete("/users/:id", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.softDeleteUser);

// RESTORE SOFT DELETED USER✅
router.patch("/users/:id/restore", authenticateToken, requireRole("Admin", "SuperAdmin"), adminController.restoreUser);

// FORCE (PERMANENT) DELETE USER✅
router.delete("/users/:id/force", authenticateToken, requireRole("SuperAdmin"), adminController.forceDeleteUser);

// --- ADMIN SPECIFIC ROUTES (MUST BE AT BOTTOM TO PREVENT ROUTE COLLISIONS) ---

// GET ALL ADMINS✅
router.get("/", authenticateToken, requireRole("SuperAdmin"), paginate, adminController.getAllAdmins);

// GET ONE ADMIN BY ID✅
router.get("/:id", authenticateToken, requireRole("SuperAdmin"), adminController.getAdminById);

// UPDATE ADMIN✅
router.put("/:id", authenticateToken, requireRole("SuperAdmin"), adminController.updateAdmin);
router.patch("/:id", authenticateToken, requireRole("SuperAdmin"), adminController.updateAdmin);

// SUSPEND / UNSUSPEND ADMIN✅
router.patch("/:id/suspend", authenticateToken, requireRole("SuperAdmin"), adminController.suspendAdmin);
router.patch("/:id/unsuspend", authenticateToken, requireRole("SuperAdmin"), adminController.unsuspendAdmin);

module.exports = router;