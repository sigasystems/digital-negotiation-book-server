import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Country = sequelize.define(
  "Country",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    country: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    ownerid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "business_owners",
        key: "id",
      },
    },
  },
  {
    tableName: "countries",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  }
);

export default Country;
