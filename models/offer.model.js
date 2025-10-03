import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import BusinessOwner from "./businessOwner.model.js";

const Offer = sequelize.define(
  "Offer",
  {
    // ---------------------------
    // About Business Owner Section
    // ---------------------------
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ---------------------------
    // Business Owner Section
    // ---------------------------
    businessOwnerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: BusinessOwner,
        key: "id",
      },
      onDelete: "CASCADE",
      field: "business_owner_id",
    },
    offerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "offer_name",
    },
    businessName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: "business_name",
    },
    fromParty: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "from_party",
    },
    origin: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    processor: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    plantApprovalNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "plant_approval_number",
    },
    brand: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    // ---------------------------
    // About Draft Section
    // ---------------------------
    draftName: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "draft_name",
    },
    offerValidityDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "offer_validity_date",
    },
    shipmentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "shipment_date",
    },
    grandTotal: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: "grand_total",
    },
    quantity: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tolerance: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentTerms: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "payment_terms",
    },
    remark: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    // ---------------------------
    // Product Info Section
    // ---------------------------
    productName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "product_name",
    },
    speciesName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "species_name",
    },
    packing: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // ---------------------------
    // Sizes/Breakups Section
    // ---------------------------
    sizeBreakups: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      field: "size_breakups",
    },

    total: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    // ---------------------------
    // System Fields
    // ---------------------------
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_deleted",
    },
    status: {
      type: DataTypes.ENUM("open", "close"),
      defaultValue: "open",
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
    deletedAt: {
      type: DataTypes.DATE,
      field: "deleted_at",
    },
  },
  {
    tableName: "offers",
    timestamps: true,
    paranoid: false,
    indexes: [{ fields: ["business_owner_id"] }],
  }
);

// Associations
BusinessOwner.hasMany(Offer, { foreignKey: "businessOwnerId", as: "activeOffers" });
Offer.belongsTo(BusinessOwner, { foreignKey: "businessOwnerId", as: "businessOwner" });

export default Offer;
