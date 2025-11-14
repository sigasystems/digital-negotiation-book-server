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
    references: {
      model: 'business_owners',
      key: 'id'
    }
  },
  locationName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  portalCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  countryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "countries",
        key: "id",
      },
    },
}, {
  tableName: "locations",
  timestamps: true,
});

export default Location;
