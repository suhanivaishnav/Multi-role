"use strict";

const {
  Model
} = require("sequelize");

module.exports = (sequelize, DataTypes) => {

  class Subcategory extends Model {

    static associate(models) {

      Subcategory.belongsTo(models.Category, {
        foreignKey: "categoryId",
        as: "category"
      });

      Subcategory.hasMany(models.Product, {
        foreignKey: "subcategoryId",
        as: "products"
      });

      Subcategory.belongsTo(models.User, {
        foreignKey: "adminId",
        as: "admin"
      });

    }

  }

  Subcategory.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },

      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false
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
      modelName: "Subcategory",
      tableName: "Subcategories"
    }
  );

  return Subcategory;
};

