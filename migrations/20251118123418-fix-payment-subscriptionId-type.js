/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
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

}

export async function down(queryInterface, Sequelize) {
  // Revert back to UUID
  await queryInterface.changeColumn('payments', 'subscriptionId', {
    type: Sequelize.UUID,
    allowNull: true,
  });

}
