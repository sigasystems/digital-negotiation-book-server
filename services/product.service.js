import { Op } from "sequelize";
import { productsArraySchema , productSchema } from "../validations/product.validation.js";
import { ProductRepository } from "../repositories/product.repo.js";

export const ProductService = {
  
  createProducts: async (products, ownerId) => {
  const validation = productsArraySchema.safeParse(products);
  if (!validation.success) {
    throw new Error(validation.error.issues.map(e => e.message).join(", "));
  }

  const productsToCreate = validation.data;

  // Attach ownerid to each product
  const productsWithOwner = productsToCreate.map(p => ({
    ...p,
    ownerid: ownerId, // lowercase matches DB column
  }));

  const codes = productsWithOwner.map(p => p.code);

  const existingProducts = await ProductRepository.findByCodes(codes);
  if (existingProducts.length > 0) {
    const existingCodes = existingProducts.map(p => p.code);
    throw new Error(`Products with codes already exist: ${existingCodes.join(", ")}`);
  }

  return await ProductRepository.createMany(productsWithOwner);
},


  getAllProducts: async (ownerid) => {
  return await ProductRepository.findAll(ownerid);
},


  getProductById: async (id) => {
    const product = await ProductRepository.findById(id);
    if (!product) throw new Error("Product not found");
    return product;
  },

  updateProduct: async (id, data) => {
    const product = await ProductRepository.findById(id);
    if (!product) throw new Error("Product not found");

    const validation = productSchema.safeParse(data);
    if (!validation.success) {
      throw new Error(validation.error.issues.map(e => e.message).join(", "));
    }

    if (data.code && data.code !== product.code) {
      const existing = await ProductRepository.findByCode(data.code);
      if (existing) {
        throw new Error(`Product with code '${data.code}' already exists`);
      }
    }

    return await ProductRepository.update(product, data);
  },

  deleteProduct: async (id) => {
    const product = await ProductRepository.findById(id);
    if (!product) throw new Error("Product not found");
    return await ProductRepository.delete(product);
  },

  searchProduct: async (queryParams, pagination, ownerid) => {
  const { query, code, productName, species, size } = queryParams;
  const where = {};

  if (query) {
    where[Op.or] = [
      { code: { [Op.iLike]: `%${query}%` } },
      { productName: { [Op.iLike]: `%${query}%` } },
      { species: { [Op.iLike]: `%${query}%` } },
    ];
  }
  if (code) where.code = { [Op.iLike]: `%${code}%` };
  if (productName) where.productName = { [Op.iLike]: `%${productName}%` };
  if (species) where.species = { [Op.iLike]: `%${species}%` };

  if (size) {
    const sizes = Array.isArray(size) ? size : size.split(",");
    where.size = { [Op.overlap]: sizes };
  }

  // ✅ Pass ownerid into repo
  const { count, rows } = await ProductRepository.searchByOwner(ownerid, where, pagination);
  const totalPages = Math.ceil(count / pagination.limit);

  return {
    totalItems: count,
    totalPages,
    currentPage: pagination.page,
    products: rows,
  };
},
};
