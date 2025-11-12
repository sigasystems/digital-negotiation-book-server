import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const OfferProduct = sequelize.define("OfferProduct", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    offerId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    productName: { type: DataTypes.STRING(100), allowNull: false },
    species: { type: DataTypes.STRING(100), allowNull: false },
    sizeDetails: { type: DataTypes.STRING(100) },
    breakupDetails: { type: DataTypes.STRING(100) },
    priceDetails: { type: DataTypes.STRING(50) },
    packing: { type: DataTypes.STRING(100) },
}, {
    tableName: "offer_products",
    timestamps: true,
});

export default OfferProduct;
