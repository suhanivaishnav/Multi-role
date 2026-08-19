'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "phone", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Users", "status", {
      type: Sequelize.ENUM("Active", "Blocked"),
      allowNull: false,
      defaultValue: "Active"
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'phone');
    await queryInterface.removeColumn('Users', 'status');
  }
};
