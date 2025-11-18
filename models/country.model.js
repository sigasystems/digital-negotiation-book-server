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

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "ownerid",
      references: {
        model: "business_owners",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
      },

      createdAt: {
        type: DataTypes.DATE,
        field: "createdat",
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: "updatedat",
    },
  },
  {
    tableName: "countries",
    timestamps: true,
  }
);

export default Country;
