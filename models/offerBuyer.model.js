import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import {BusinessOwner, Offer, Buyer} from "./index.js";

const OfferBuyer = sequelize.define(
  "OfferBuyer",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    offerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "offer_id",
    },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "buyer_id",
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "owner_id",
    },
    status: {
      type: DataTypes.STRING(50),
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
  },
  {
    tableName: "offer_buyers",
    timestamps: true,
    indexes: [
      { fields: ["offer_id"] },
      { fields: ["buyer_id"] },
      { fields: ["owner_id"] }, // add index for faster lookup
    ],
  }
);

// Associations
Offer.hasMany(OfferBuyer, { foreignKey: "offerId", as: "offerBuyers" });
OfferBuyer.belongsTo(Offer, { foreignKey: "offerId", as: "offer" });

Buyer.hasMany(OfferBuyer, { foreignKey: "buyerId", as: "buyerOffers" });
OfferBuyer.belongsTo(Buyer, { foreignKey: "buyerId", as: "buyer" });

// Optional: link owner if needed
if (BusinessOwner) {
  BusinessOwner.hasMany(OfferBuyer, { foreignKey: "ownerId", as: "ownerOffers" });
  OfferBuyer.belongsTo(BusinessOwner, { foreignKey: "ownerId", as: "owner" });
}

export default OfferBuyer;
