import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const UserPlanUsage = sequelize.define(
  "UserPlanUsage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    planKey: {
  type: DataTypes.STRING,
  allowNull: true, // or false if you want it required
},

    usedUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    usedProducts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    usedOffers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    usedBuyers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "UserPlanUsage",
    timestamps: true,
    indexes: [{ fields: ["userId"] }],
  }
);

export default UserPlanUsage;
