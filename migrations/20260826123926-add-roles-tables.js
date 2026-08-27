'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Create Roles table
      await queryInterface.createTable('Roles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }, { transaction });

      // 2. Create UserRoles table
      await queryInterface.createTable('UserRoles', {
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        roleId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          references: {
            model: 'Roles',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }, { transaction });

      // 3. Insert default roles
      await queryInterface.bulkInsert('Roles', [
        { name: 'user', createdAt: new Date(), updatedAt: new Date() },
        { name: 'seller', createdAt: new Date(), updatedAt: new Date() },
        { name: 'admin', createdAt: new Date(), updatedAt: new Date() },
        { name: 'superadmin', createdAt: new Date(), updatedAt: new Date() }
      ], { transaction });

      // 4. Migrate existing users' roles
      const roles = await queryInterface.sequelize.query(
        `SELECT id, name FROM \`Roles\`;`,
        { transaction, type: Sequelize.QueryTypes.SELECT }
      );
      
      const roleMap = {};
      roles.forEach(r => { roleMap[r.name] = r.id; });

      const users = await queryInterface.sequelize.query(
        `SELECT id, role FROM \`Users\`;`,
        { transaction, type: Sequelize.QueryTypes.SELECT }
      );

      const userRolesToInsert = [];
      users.forEach(u => {
        if (u.role && roleMap[u.role]) {
          userRolesToInsert.push({
            userId: u.id,
            roleId: roleMap[u.role],
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      });

      if (userRolesToInsert.length > 0) {
        await queryInterface.bulkInsert('UserRoles', userRolesToInsert, { transaction });
      }

      // 5. Remove role column from Users
      await queryInterface.removeColumn('Users', 'role', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Add back the role column
      await queryInterface.addColumn('Users', 'role', {
        type: Sequelize.ENUM("user", "seller", "admin", "superadmin"),
        allowNull: false,
        defaultValue: "user"
      }, { transaction });

      // 2. Drop tables
      await queryInterface.dropTable('UserRoles', { transaction });
      await queryInterface.dropTable('Roles', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
