'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'sellerStatus', {
      type: Sequelize.ENUM('None', 'Pending', 'Approved', 'Rejected'),
      allowNull: false,
      defaultValue: 'None'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'sellerStatus');
  }
};
