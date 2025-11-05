import { z } from "zod";

export const productSchema = z.object({
  code: z.string().min(1, "Code is required"),
  productName: z.string().min(1, "Product name is required"),
  species: z
    .array(
      z
        .string()
        .min(1, "Species name cannot be empty")
        .max(150, "Each species must be under 150 characters")
    )
    .nonempty("At least one species is required"),
  size: z
    .array(
      z
        .string()
        .min(1, "Size value cannot be empty")
        .max(100, "Size must be under 100 characters")
    )
    .optional(),
});

export const productsArraySchema = z.array(productSchema).min(1, "At least one product is required");
