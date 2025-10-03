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
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    size: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Array of sizes
      allowNull: true,
    },
    ownerid: {
        type: DataTypes.UUID,
        allowNull: false,
      },
  }, {
    tableName: "products",
    timestamps: true,
  });

// Association with BusinessOwner
Product.belongsTo(BusinessOwner, { foreignKey: "ownerid", as: "owner" });
BusinessOwner.hasMany(Product, { foreignKey: "ownerid", as: "products" });

  export default Product;
