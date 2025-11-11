import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import BusinessOwner from "./businessOwner.model.js";

const OfferDraft = sequelize.define("OfferDraft", {
    draftNo: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    businessOwnerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    fromParty: {
      type: DataTypes.STRING(150),
      allowNull: false,
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
    },
    brand: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    draftName: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    offerValidityDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    shipmentDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    packing: {
      type: DataTypes.STRING,
      allowNull: true,
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
    },
    remark: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  grandTotal: {
    type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("open", "close"),
      defaultValue: "open",
    },
  isDeleted: {
      type: DataTypes.BOOLEAN,
    defaultValue: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
    allowNull: true,
  },
}, {
    tableName: "offers_draft",
    timestamps: true,
});

export default OfferDraft;
