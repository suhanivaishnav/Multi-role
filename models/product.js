"use strict";

module.exports = (sequelize, DataTypes) => {

  const Product = sequelize.define("Product", {

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    description: {
      type: DataTypes.TEXT
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },

    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    subcategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    status: {
      type: DataTypes.ENUM(
        "Active",
        "Inactive",
        "Pending",
        "Rejected"
      ),

      defaultValue: "Pending"
    }

  });

  Product.associate = function (models) {

    Product.belongsTo(models.User, {
      foreignKey: "sellerId",
      as: "seller"
    });

    Product.belongsTo(models.Subcategory, {
      foreignKey: "subcategoryId",
      as: "subcategory"
    });

  };

  return Product;
};