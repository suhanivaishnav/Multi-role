'use strict';

const { hashPassword } = require("../middleware/auth");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const adminPassword = await hashPassword("admin123");
    const supportPassword = await hashPassword("support123");
    const superAdminPassword = await hashPassword("superadmin123");

    await queryInterface.bulkInsert("Users", [
      {
        name: "Main Admin",
        email: "admin@gmail.com",
        password: adminPassword,
        role: "admin",
        status: "Active",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Support Admin",
        email: "support@gmail.com",
        password: supportPassword,
        role: "admin",
        status: "Active",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Super Admin",
        email: "superadmin@gmail.com",
        password: superAdminPassword,
        role: "superadmin",
        status: "Active",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Users", { role: "admin" }, {});
  }
};
