"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable("Products", {

      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },

      stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      sellerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },

      subcategoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Subcategories",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },

      status: {
        type: Sequelize.ENUM(
          "Active",
          "Inactive",
          "Pending",
          "Rejected"
        ),
        defaultValue: "Pending"
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }

    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Products");
  }
};