const { Category, Subcategory } = require("../models");
const { Op } = require('sequelize');

// CREATE SUBCATEGORY
exports.createSubcategory = async (req, res) => {
    try {
        const { name, categoryId, description } = req.body;

        if (!name || !categoryId) {
            return res.status(400).json({
                message: "Name and categoryId are required"
            });
        }

        const category = await Category.findByPk(categoryId);

        if (!category) {
            return res.status(404).json({
                message: "Category not found"
            });
        }

        const adminId = req.user.id;
        const subcategory = await Subcategory.create({ name, categoryId, description, adminId });
        return res.status(201).json({
            message: "Subcategory created successfully",
            subcategory
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to create subcategory",
            error: "An internal server error occurred"
        });
    }
};

// GET ALL SUBCATEGORIES
exports.getAllSubcategories = async (req, res) => {
    try {
        const { search, sortBy, sortOrder, categoryId } = req.query;
        const whereCondition = {};
        if (categoryId) {
            whereCondition.categoryId = categoryId;
        }
        if (search) {
            whereCondition.name = { [Op.like]: `%${search}%` };
        }

        const orderClause = [];
        if (sortBy) {
            orderClause.push([sortBy, sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]);
        } else {
            orderClause.push(["createdAt", "DESC"]);
        }
        const subcategories = await Subcategory.findAll({
            where: whereCondition,
            order: orderClause,
            include: [
                {
                    model: Category,
                    as: "category"
                }
            ],
            ...(req.query.pagination || {})
        });

        const count = await Subcategory.count({ where: whereCondition });
        return res.sendPaginated(subcategories, count);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch subcategories",
            error: "An internal server error occurred"
        });
    }
};

// GET SUBCATEGORY BY ID
exports.getSubcategoryById = async (req, res) => {
    try {
        const subcategory = await Subcategory.findByPk(
            req.params.id,
            {
                include: [
                    {
                        model: Category,
                        as: "category"
                    }
                ]
            }
        );

        if (!subcategory) {
            return res.status(404).json({
                message: "Subcategory not found"
            });
        }

        return res.status(200).json(subcategory);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch subcategory",
            error: "An internal server error occurred"
        });
    }
};

// UPDATE SUBCATEGORY
exports.updateSubcategory = async (req, res) => {
    try {
        const subcategory = await Subcategory.findByPk(req.params.id);

        if (!subcategory) {
            return res.status(404).json({
                message: "Subcategory not found"
            });
        }

        if (req.body.categoryId) {
            const category = await Category.findByPk(req.body.categoryId);

            if (!category) {
                return res.status(404).json({
                    message: "Category not found"
                });
            }
        }

        await subcategory.update(req.body);

        return res.status(200).json({
            message: "Subcategory updated successfully",
            subcategory
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update subcategory",
            error: "An internal server error occurred"
        });
    }
};

// DELETE SUBCATEGORY
exports.deleteSubcategory = async (req, res) => {
    try {
        const subcategory = await Subcategory.findByPk(req.params.id);

        if (!subcategory) {
            return res.status(404).json({
                message: "Subcategory not found"
            });
        }

        await subcategory.destroy();

        return res.status(200).json({
            message: "Subcategory deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to delete subcategory",
            error: "An internal server error occurred"
        });
    }
};
