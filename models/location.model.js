import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Location = sequelize.define("Location", {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
     ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
      field:"ownerid",
    references: {
      model: "business_owners",
      key: "id",
      },
  },

  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  state: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  createdAt: {
    type: DataTypes.DATE,
      field: "createdat",
  },
    updatedAt: {
    type: DataTypes.DATE,
      field: "updatedat",
  },
  countryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "countryid",
      references: {
        model: "countries",
        key: "id",
      },
    },
}, {
  tableName: "locations",
  timestamps: true,
    indexes: [
      { fields: ["ownerId"] },
      { fields: ["city"] },
      { fields: ["state"] },
    ],
});

export default Location;
