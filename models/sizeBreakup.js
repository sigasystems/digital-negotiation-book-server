import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const SizeBreakup = sequelize.define("SizeBreakup", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  offerDraftProductId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  size: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  breakup: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  condition: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: "size_breakups",
  timestamps: true,
});

export default SizeBreakup;
