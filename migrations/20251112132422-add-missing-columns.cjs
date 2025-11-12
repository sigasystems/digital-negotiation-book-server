"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // ✅ Offer Draft Products table
    await queryInterface.addColumn("offer_draft_products", "sizeDetails", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("offer_draft_products", "breakupDetails", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("offer_draft_products", "priceDetails", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn("offer_draft_products", "packing", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    // ✅ Size Breakups table (if those columns are also missing)
    await queryInterface.addColumn("size_breakups", "sizeDetails", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("size_breakups", "breakupDetails", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("size_breakups", "priceDetails", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn("size_breakups", "packing", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("offer_draft_products", "sizeDetails");
    await queryInterface.removeColumn("offer_draft_products", "breakupDetails");
    await queryInterface.removeColumn("offer_draft_products", "priceDetails");
    await queryInterface.removeColumn("offer_draft_products", "packing");

    await queryInterface.removeColumn("size_breakups", "sizeDetails");
    await queryInterface.removeColumn("size_breakups", "breakupDetails");
    await queryInterface.removeColumn("size_breakups", "priceDetails");
    await queryInterface.removeColumn("size_breakups", "packing");
  },
};
