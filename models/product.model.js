  import { DataTypes } from "sequelize";
  import sequelize from "../config/db.js";
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
      model: "business_owners",
      key: "id",
    },
  },
  offerDraftId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "offers_draft",
      key: "draftNo",
    },
  },
  }, {
    tableName: "products",
    timestamps: true,
  });

  export default Product;
