import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const OfferSizeBreakup = sequelize.define("OfferSizeBreakup", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    offerProductId: { type: DataTypes.UUID, allowNull: false },
    size: { type: DataTypes.STRING(50) },
    breakup: { type: DataTypes.FLOAT },
    price: { type: DataTypes.STRING(50) },
    condition: { type: DataTypes.STRING(100) },
}, {
    tableName: "offer_size_breakups",
    timestamps: true,
});

export default OfferSizeBreakup;
