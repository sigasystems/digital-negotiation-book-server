  import { DataTypes } from "sequelize";
  import sequelize from "../config/db.js";
  import BusinessOwner from "./businessOwner.model.js";
  const Product = sequelize.define("Product", {
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
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    species: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    size: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'business_owners',
      key: 'id'
    },
    field: "ownerId",
  },
  }, {
    tableName: "products",
    timestamps: true,
  });

// Association with BusinessOwner
Product.belongsTo(BusinessOwner, { foreignKey: "ownerId", as: "owner" });
BusinessOwner.hasMany(Product, { foreignKey: "ownerId", as: "products" });

  export default Product;
