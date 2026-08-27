"use strict";

module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    "Role",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      }
    },
    {
      tableName: "Roles",
      timestamps: true
    }
  );

  Role.associate = function (models) {
    Role.belongsToMany(models.User, {
      through: "UserRoles", // Uses the table name or model name, generally table name string is fine. Better to use models.UserRole if defined.
      foreignKey: "roleId",
      otherKey: "userId",
      as: "users"
    });
  };

  return Role;
};
