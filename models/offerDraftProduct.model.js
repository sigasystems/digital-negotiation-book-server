import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const OfferDraftProduct = sequelize.define("OfferDraftProduct", {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  draftNo: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  productName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  species: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  sizeDetails: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  breakupDetails: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  priceDetails: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: "offer_draft_products",
  timestamps: true,
});

export default OfferDraftProduct;
