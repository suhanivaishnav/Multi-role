"use strict";

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false
      },

      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },

      // role: {
      //   type: DataTypes.ENUM(
      //     "user",
      //     "seller",
      //     "admin",
      //     "superadmin"
      //   ),
      //   allowNull: false,
      //   defaultValue: "user"
      // },

      status: {
        type: DataTypes.ENUM(
          "Active",
          "Pending",
          "Blocked"
        ),
        allowNull: false,
        defaultValue: "Active"
      },

      resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true
      },

      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true
      },

      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },

      sellerStatus: {
        type: DataTypes.ENUM('None', 'Pending', 'Approved', 'Rejected', 'Suspended'),
        allowNull: false,
        defaultValue: 'None'
      }
    },
    {
      tableName: "Users",
      paranoid: true
    }
  );

  User.associate = function (models) {
    User.hasMany(models.Category, {
      foreignKey: "adminId",
      as: "createdCategories"
    });

    User.hasMany(models.Subcategory, {
      foreignKey: "adminId",
      as: "createdSubcategories"
    });

    User.hasMany(models.Product, {
      foreignKey: "sellerId",
      as: "products"
    });

    User.hasOne(models.Cart, {
      foreignKey: "userId",
      as: "cart"
    });

    User.hasMany(models.Order, {
      foreignKey: "userId",
      as: "orders"
    });

    User.belongsToMany(models.Role, {
      through: "UserRoles",
      foreignKey: "userId",
      otherKey: "roleId",
      as: "roles"
    });
  };

  return User;
};