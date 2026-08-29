"use strict";

module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define("Order", {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.ENUM(
        "Pending",
        "Confirmed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled"
      ),
      defaultValue: "Pending"
    },
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });

  Order.associate = function(models) {
    Order.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user"
    });
    Order.hasMany(models.OrderItem, {
      foreignKey: "orderId",
      as: "orderItems"
    });
  };

  return Order;
};
