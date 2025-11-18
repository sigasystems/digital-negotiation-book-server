'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove unique constraint if exists
    try {
      await queryInterface.removeConstraint('payments', 'payments_subscriptionId_key');
    } catch (error) {
      console.log('Constraint does not exist, skipping...');
    }

    // Change subscriptionId from UUID to STRING
    await queryInterface.changeColumn('payments', 'subscriptionId', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    console.log('✅ Changed subscriptionId type from UUID to STRING');
  },

  async down(queryInterface, Sequelize) {
    // Revert back to UUID (if needed)
    await queryInterface.changeColumn('payments', 'subscriptionId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    console.log('⏪ Reverted subscriptionId type back to UUID');
  }
};
