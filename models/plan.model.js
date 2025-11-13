import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Plan = sequelize.define(
  "Plan",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isIn: [["trial","advanced", "basic", "pro", "custom"]], 
      },
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },

    currency: {
      type: DataTypes.STRING,
      defaultValue: "INR",
    },

    billingCycle: {
      type: DataTypes.ENUM("monthly", "yearly"),
      defaultValue: "monthly",
    },
    stripeProductId: {
  type: DataTypes.STRING,
  allowNull: true,
},
stripePriceMonthlyId: {
  type: DataTypes.STRING,
  allowNull: true,
},
stripePriceYearlyId: {
  type: DataTypes.STRING,
  allowNull: true,
},
priceMonthly: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: true,
},
priceYearly: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: true,
},

    // Limits
    maxUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: { min: 0 },
    },

    maxProducts: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      validate: { min: 0 },
    },

    maxOffers: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      validate: { min: 0 },
    },

    maxBuyers: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      validate: { min: 0 },
    },

    // Features
    features: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },

    trialDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },

    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
    },
  },
  {
    tableName: "plans",
    timestamps: true,
  }
);

export default Plan;
