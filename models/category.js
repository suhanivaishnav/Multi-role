"use strict";

const {
  Model
} = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {

    static associate(models) {

      Category.hasMany(models.Subcategory, {
        foreignKey: "categoryId",
        as: "subcategories"
      });



      Category.belongsTo(models.User, {
        foreignKey: "adminId",
        as: "admin"
      });

    }

  }

  Category.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      adminId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "id"
        }
      }
    },
    {
      sequelize,
      modelName: "Category",
      tableName: "Categories"
    }
  );

  return Category;
};