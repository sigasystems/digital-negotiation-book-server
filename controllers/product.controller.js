import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import { asyncHandler } from "../handlers/asyncHandler.js";
import { getPagination } from "../handlers/pagination.js";
import { ProductService } from "../services/product.service.js";

export const createProducts = asyncHandler(async (req, res) => {
  const ownerId = req.user?.id;
  try {
    const products = await ProductService.createProducts(req.body, ownerId);
    return successResponse(res, 201, "Products created successfully", products);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
});

export const getAllProducts = asyncHandler(async (req, res) => {
  const ownerId = req.user?.id;
  try {
    const products = await ProductService.getAllProducts(ownerId);
    const total = products.length;
    return successResponse(res, 200, "Products retrieved successfully", { total, products });
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
});

export const getProductById = asyncHandler(async (req, res) => {
  const ownerId = req.user?.id;
  try {
    const product = await ProductService.getProductById(req.params.id, ownerId);
    return successResponse(res, 200, "Product retrieved successfully", product);
  } catch (error) {
    return errorResponse(res, 404, error.message);
  }
});

export const updateProduct = asyncHandler(async (req, res) => {
  const ownerId = req.user?.id;
  try {
    const updated = await ProductService.updateProduct(req.params.id, req.body, ownerId);
    return successResponse(res, 200, "Product updated successfully", updated);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const ownerId = req.user?.id;
  try {
    await ProductService.deleteProduct(req.params.id, ownerId);
    return successResponse(res, 200, "Product deleted successfully");
  } catch (error) {
    return errorResponse(res, 404, error.message);
  }
});

export const searchProduct = asyncHandler(async (req, res) => {
  const ownerId = req.user?.id;
  const { limit, offset, page } = getPagination(req.query);
  try {
    const result = await ProductService.searchProduct(req.query, { limit, offset, page }, ownerId);
    return successResponse(res, 200, "Products retrieved successfully", result);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
});

export default {
  createProducts,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProduct,
};
