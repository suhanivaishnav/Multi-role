"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Subcategories", {
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

      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,

        references: {
          model: "Categories",
          key: "id"
        },

        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.dropTable("Subcategories");
  }
};