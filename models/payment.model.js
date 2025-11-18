import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./user.model.js";
import { Plan } from "./index.js";

const Payment = sequelize.define("Payment", {
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
        key: "id",
      },
    },
    businessOwnerId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: "INR",
    },
    status: {
      type: DataTypes.ENUM("pending", "success", "failed"),
      defaultValue: "pending",
    },
    paymentMethod: {
      type: DataTypes.ENUM("card", "upi", "netbanking", "wallet"),
      defaultValue: "card",
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    subscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    invoicePdf: {
      type: DataTypes.STRING,
    },
  }, {
    timestamps: true,
    tableName: "payments",   
  });


Payment.belongsTo(User, { foreignKey: "userId" });
Payment.belongsTo(Plan, { foreignKey: "planId" });

export default Payment;
