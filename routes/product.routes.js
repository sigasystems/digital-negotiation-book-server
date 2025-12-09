import express from "express";
import productController from "../controllers/product.controller.js";
import { authenticateJWT } from "../middlewares/authenticateJWT.js";
import { checkPlanLimit } from "../middlewares/checkPlanLimit.js"; // ← add this
import checkPlanValidity from "../middlewares/checkPlanValidity.js";
const router = express.Router();

// 🧭 product creation counts toward product limit
router.post(
  "/add-product",
  authenticateJWT,
  checkPlanValidity,
  checkPlanLimit("product"),
  productController.createProducts
);
router.get(
  "/getall-products",
  authenticateJWT,
  productController.getAllProducts
);
router.get(
  "/get-product/:id",
  authenticateJWT,
  productController.getProductById
);
router.put(
  "/update-product/:id",
  authenticateJWT,
  productController.updateProduct
);
router.delete(
  "/delete-product/:id",
  authenticateJWT,
  productController.deleteProduct
);
router.get("/search", authenticateJWT, productController.searchProduct);

export default router;
