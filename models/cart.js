"use strict";

module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define("Cart", {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    }
  });

  Cart.associate = function(models) {
    Cart.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user"
    });
    Cart.hasMany(models.CartItem, {
      foreignKey: "cartId",
      as: "cartItems"
    });
  };

  return Cart;
};