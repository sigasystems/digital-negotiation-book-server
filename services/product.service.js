import { Op } from "sequelize";
import {
  productsArraySchema,
  productSchema,
} from "../validations/product.validation.js";
import ProductRepository from "../repositories/product.repo.js";

export const ProductService = {
  createProducts: async (products, ownerId) => {
    if (!ownerId) throw new Error("ownerId is required");

    const validation = productsArraySchema.safeParse(products);
    if (!validation.success) {
      throw new Error(validation.error.issues.map((e) => e.message).join(", "));
    }

    const productsToCreate = validation.data.map((p) => ({ ...p, ownerId }));
    const codes = productsToCreate.map((p) => p.code);

    const existingProducts = await ProductRepository.findByCodes(
      codes,
      ownerId
    );
    if (existingProducts.length > 0) {
      const existingCodes = existingProducts.map((p) => p.code);
      throw new Error(
        `Products with codes already exist: ${existingCodes.join(", ")}`
      );
    }

    return await ProductRepository.createMany(productsToCreate);
  },

  getAllProducts: async (ownerId) => {
    if (!ownerId) throw new Error("ownerId is required");
    return await ProductRepository.findAll(ownerId);
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
    if (!product || product.ownerId !== ownerId)
      throw new Error("Product not found");

    const validation = productSchema.safeParse(data);
    if (!validation.success) {
      throw new Error(validation.error.issues.map((e) => e.message).join(", "));
    }

    if (data.code && data.code !== product.code) {
      const existing = await ProductRepository.findByCode(data.code, ownerId);
      if (existing)
        throw new Error(`Product with code '${data.code}' already exists`);
    }

    return await ProductRepository.update(product, data);
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
