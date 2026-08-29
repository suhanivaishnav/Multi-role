'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Note: SQLite table recreation for FK changes might require this
    await queryInterface.changeColumn('Orders', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.changeColumn('OrderItems', 'productId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Orders', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.changeColumn('OrderItems', 'productId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  }
};
