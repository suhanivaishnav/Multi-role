"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Users", "role", {
      type: Sequelize.ENUM("user", "seller", "admin", "superadmin"),
      allowNull: false,
      defaultValue: "user"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Users", "role", {
      type: Sequelize.ENUM("user", "seller", "admin"),
      allowNull: false,
      defaultValue: "user"
    });
  }
};
