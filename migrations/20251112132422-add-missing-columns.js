export async function up(queryInterface, Sequelize) {
  const offerDraftProducts = await queryInterface.describeTable("offer_draft_products");
  const sizeBreakups = await queryInterface.describeTable("size_breakups");

  // Helper function to safely add a column
  async function safeAddColumn(tableName, table, column, options) {
    if (!table[column]) {
      await queryInterface.addColumn(tableName, column, options);
    } else {
    }
  }

  // Offer Draft Products table
  await safeAddColumn("offer_draft_products", offerDraftProducts, "sizeDetails", {
    type: Sequelize.STRING(100),
    allowNull: true,
  });

  await safeAddColumn("offer_draft_products", offerDraftProducts, "breakupDetails", {
    type: Sequelize.STRING(100),
    allowNull: true,
  });

  await safeAddColumn("offer_draft_products", offerDraftProducts, "priceDetails", {
    type: Sequelize.STRING(50),
    allowNull: true,
  });

  await safeAddColumn("offer_draft_products", offerDraftProducts, "packing", {
    type: Sequelize.STRING(100),
    allowNull: true,
  });

  // Size Breakups table
  await safeAddColumn("size_breakups", sizeBreakups, "sizeDetails", {
    type: Sequelize.STRING(100),
    allowNull: true,
  });

  await safeAddColumn("size_breakups", sizeBreakups, "breakupDetails", {
    type: Sequelize.STRING(100),
    allowNull: true,
  });

  await safeAddColumn("size_breakups", sizeBreakups, "priceDetails", {
    type: Sequelize.STRING(50),
    allowNull: true,
  });

  await safeAddColumn("size_breakups", sizeBreakups, "packing", {
    type: Sequelize.STRING(100),
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("offer_draft_products", "sizeDetails").catch(() => {});
  await queryInterface.removeColumn("offer_draft_products", "breakupDetails").catch(() => {});
  await queryInterface.removeColumn("offer_draft_products", "priceDetails").catch(() => {});
  await queryInterface.removeColumn("offer_draft_products", "packing").catch(() => {});

  await queryInterface.removeColumn("size_breakups", "sizeDetails").catch(() => {});
  await queryInterface.removeColumn("size_breakups", "breakupDetails").catch(() => {});
  await queryInterface.removeColumn("size_breakups", "priceDetails").catch(() => {});
  await queryInterface.removeColumn("size_breakups", "packing").catch(() => {});
}
