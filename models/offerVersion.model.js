import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { Buyer, Offer } from "./index.js";

const OfferVersion = sequelize.define(
  "OfferVersion",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Buyer,
        key: "id",
      },
      onDelete: "CASCADE",
      field: "buyer_id",
    },
    offerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "offers",
        key: "id",
      },
      onDelete: "CASCADE",
      field: "offer_id",
    },
    offerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "offer_name",
    },
    versionNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "version_no",
    },
    fromParty: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "from_party",
    },
    toParty: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "to_party",
    },

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
    brand: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    plantApprovalNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "plant_approval_number",
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
    sizeBreakups: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      field: "size_breakups",
    },
    grandTotal: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: "grand_total",
    },
    shipmentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "shipment_date",
    },
    remark: {
      type: DataTypes.STRING(100),
      allowNull: true,
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
  },
  {
    tableName: "offer_versions",
    timestamps: true,
    indexes: [{ fields: ["buyer_id"] }],
  }
);

Buyer.hasMany(OfferVersion, { foreignKey: "buyerId", as: "offerVersions" });
OfferVersion.belongsTo(Buyer, { foreignKey: "buyerId", as: "buyer" });
Offer.hasMany(OfferVersion, { foreignKey: "offerId", as: "versions" });
OfferVersion.belongsTo(Offer, { foreignKey: "offerId", as: "offer" });

export default OfferVersion;