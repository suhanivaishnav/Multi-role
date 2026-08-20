"use strict";

module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define("CartItem", {
    cartId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  });

  CartItem.associate = function(models) {
    CartItem.belongsTo(models.Cart, {
      foreignKey: "cartId",
      as: "cart"
    });
    CartItem.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product"
    });
  };

  return CartItem;
};