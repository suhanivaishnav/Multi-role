const { Category, Subcategory } = require("../models");

// CREATE CATEGORY
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({
                message: "Category name is required"
            });
        }

        const existingCategory = await Category.findOne({
            where: {
                name
            }
        });

        if (existingCategory) {
            return res.status(409).json({
                message: "Category already exists"
            });
        }

        const adminId = req.user.id;
        const category = await Category.create({ name, description, adminId });
        return res.status(201).json({
            message: "Category created successfully",
            category
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to create category",
            error: error.message
        });
    }
};

// GET ALL CATEGORIES
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        return res.status(200).json(categories);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch categories",
            error: error.message
        });
    }
};

// GET CATEGORIES BY SUBCATEGORIES
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findByPk(
            req.params.id,
            {
                include: [
                    {
                        model: Subcategory,
                        as: "subcategories"
                    }
                ]
            }
        );

        if (!category) {
            return res.status(404).json({
                message: "Category not found"
            });
        }

        return res.status(200).json(category);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch category",
            error: error.message
        });
    }
};

// UPDATE CATEGORY
exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);

        if (!category) {
            return res.status(404).json({
                message: "Category not found"
            });
        }

        await category.update(req.body);

        return res.status(200).json({
            message: "Category updated successfully",
            category
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update category",
            error: error.message
        });
    }
};

// DELETE CATEGORY
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);

        if (!category) {
            return res.status(404).json({
                message: "Category not found"
            });
        }

        await category.destroy();

        return res.status(200).json({
            message: "Category deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to delete category",
            error: error.message
        });
    }
};
