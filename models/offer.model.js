import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import {Buyer, BusinessOwner} from "./index.js";

const Offer = sequelize.define("Offer", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessOwnerId: {
    type: DataTypes.UUID, allowNull: false,
    field: "business_owner_id",
  },
  offerName: {
    type: DataTypes.STRING, allowNull: false,
    field: "offer_name"
  },
  businessName: {
    type: DataTypes.STRING, allowNull: false,
    field: "business_name"
  },
  fromParty: { type: DataTypes.STRING, allowNull: false, field: "from_party" },
  toParty: { type: DataTypes.STRING, allowNull: false, field: "from_party" },
  buyerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "buyer_id",
      references: {
        model: Buyer,
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
  origin: { type: DataTypes.STRING, allowNull: false },
  processor: { type: DataTypes.STRING },
  plantApprovalNumber: {
    type: DataTypes.STRING, allowNull: false,
    field: "plant_approval_number"
  },
  brand: { type: DataTypes.STRING, allowNull: false },
  draftName: {
    type: DataTypes.STRING,
    field: "draft_name"
  },
  offerValidityDate: {
    type: DataTypes.DATE, allowNull: false,
    field: "offer_validity_date"
  },
  shipmentDate: {
    type: DataTypes.DATE,
    field: "shipment_date"
  },
  grandTotal: {
    type: DataTypes.FLOAT,
    field: "grand_total"
  },
  quantity: { type: DataTypes.STRING },
  tolerance: { type: DataTypes.STRING },
  paymentTerms: {
    type: DataTypes.STRING,
    field: "payment_terms"
  },
  remark: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM("open", "close"), defaultValue: "open" },
  isDeleted: {
    type: DataTypes.BOOLEAN, defaultValue: false,
    field: "is_deleted",
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
}, {
  tableName: "offers",
  timestamps: true,
});

BusinessOwner.hasMany(Offer, { foreignKey: "businessOwnerId", as: "offers" });
Offer.belongsTo(BusinessOwner, { foreignKey: "businessOwnerId", as: "businessOwner" });

export default Offer;
