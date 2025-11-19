import { DataTypes } from "sequelize";
import sequelize from "../config/db.js"; // your Sequelize instance
import User from "./user.model.js";

const Subscription = sequelize.define("Subscription", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
 userId: {
  type: DataTypes.UUID,
  allowNull: false,
  references: {
    model: "Users",
    key: "id"
  }
},
  subscriptionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  planName: {
    type: DataTypes.STRING, // e.g., "Basic", "Advanced"
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("active", "past_due", "canceled", "trialing", "inactive"),
    defaultValue: "trialing",
  },
  paymentStatus: {
    type: DataTypes.ENUM("paid", "unpaid"),
    defaultValue: "unpaid",
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Feature limits
  maxLocations: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  maxProducts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  maxOffers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  maxBuyers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: "subscriptions",
  timestamps: true,
});

Subscription.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Subscription, { foreignKey: "userId" });

export default Subscription;
