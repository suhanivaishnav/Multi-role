"use strict";

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("Categories", "adminId", {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null initially so migration doesn't fail on existing data
      references: {
        model: "Users",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await queryInterface.addColumn("Subcategories", "adminId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("Subcategories", "adminId");
    await queryInterface.removeColumn("Categories", "adminId");
  }
};
