import { Op } from "sequelize";
import {
  productsArraySchema,
  productSchema,
} from "../validations/product.validation.js";
import ProductRepository from "../repositories/product.repository.js";

export const ProductService = {
  createProducts: async (products, ownerId) => {
    if (!ownerId) throw new Error("ownerId is required");

    const validation = productsArraySchema.safeParse(products);
    if (!validation.success) {
      throw new Error(validation.error.issues.map((e) => e.message).join(", "));
    }

      const productsToCreate = validation.data.map((p) => ({
      ...p,
      ownerId,
    }));

    const codes = productsToCreate.map((p) => p.code.trim());
    const duplicateCodes = codes.filter(
      (code, idx) => codes.indexOf(code) !== idx
    );
    if (duplicateCodes.length > 0) {
      throw new Error(
        `Duplicate product codes in request: ${[...new Set(duplicateCodes)].join(", ")}`
      );
    }

    const existingProducts = await ProductRepository.findByCodes(codes, ownerId);
    if (existingProducts.length > 0) {
      const existingCodes = existingProducts.map((p) => p.code);
      throw new Error(
        `Products with these codes already exist: ${existingCodes.join(", ")}`
      );
    }

    return await ProductRepository.createMany(productsToCreate);
  },

  getAllProducts: async (ownerId, { page, limit }) => {
  if (!ownerId) throw new Error("ownerId is required");
  return await ProductRepository.findAll(ownerId, { page, limit });
},

  getProductById: async (id, ownerId) => {
    if (!ownerId) throw new Error("ownerId is required");

    const product = await ProductRepository.findById(id);
    if (!product || product.ownerId !== ownerId)
      throw new Error("Product not found");
    return product;
  },

  updateProduct: async (id, data, ownerId) => {
    if (!ownerId) throw new Error("ownerId is required");

    const product = await ProductRepository.findById(id);
    if (!product || product.ownerId !== ownerId) {
      throw new Error("Product not found");
    }

    const validation = productsArraySchema.safeParse([data]);
    if (!validation.success) {
      throw new Error(validation.error.issues.map((e) => e.message).join(", "));
    }

    const updatedProduct = { ...validation.data[0], ownerId };

    if (updatedProduct.code && updatedProduct.code !== product.code) {
      const existing = await ProductRepository.findByCode(updatedProduct.code, ownerId);
      if (existing) {
        throw new Error(`Product with code '${updatedProduct.code}' already exists`);
      }
    }

    return await ProductRepository.update(product, updatedProduct);
  },

  deleteProduct: async (id, ownerId) => {
    if (!ownerId) throw new Error("ownerId is required");

    const product = await ProductRepository.findById(id);
    if (!product || product.ownerId !== ownerId)
      throw new Error("Product not found");

    return await ProductRepository.delete(product);
  },

  searchProduct: async (queryParams, pagination, ownerId) => {
    if (!ownerId) throw new Error("ownerId is required");

    const { query, code, productName, species, size } = queryParams;
    const where = { ownerId };

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

    const { count, rows } = await ProductRepository.search(where, pagination);
    const totalPages = Math.ceil(count / pagination.limit);

    return {
      totalItems: count,
      totalPages,
      currentPage: pagination.page,
      products: rows,
    };
  },
};
