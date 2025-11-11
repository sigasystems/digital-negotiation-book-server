import { z } from "zod";

export const ProductSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().min(1).max(100),
  species: z.string().min(1).max(100),
  sizeBreakups: z.array(
    z.object({
      size: z.string().min(1),
      breakup: z.number().int().positive(),
      price: z.number().positive(),
      condition: z.string().max(50).optional(),
    })
  ).min(1, "At least one size breakup is required"),
});

export const OfferSchema = z.object({
  businessOwnerId: z.string().uuid("Invalid business owner ID"),
  fromParty: z.string().min(1).max(150, "From party must be less than 150 characters"),
  origin: z.string().min(1).max(50, "Origin must be less than 50 characters"),
  processor: z.string().max(50, "Processor must be less than 50 characters").optional(),
  plantApprovalNumber: z.string().min(1).max(50, "Plant approval number must be less than 50 characters"),
  brand: z.string().min(1).max(50, "Brand must be less than 50 characters"),
  draftName: z.string().max(50, "Draft name must be less than 50 characters").optional(),
  offerValidityDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: "Invalid offer validity date",
  }),
  shipmentDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: "Invalid shipment date",
  }),
  packing: z.string().optional(),
  quantity: z.string().optional(),
  tolerance: z.string().optional(),
  paymentTerms: z.string().optional(),
  remark: z.string().max(100, "Remark must be less than 100 characters").optional(),
  grandTotal: z.number().positive("Grand total must be a positive number"),
  products: z.array(ProductSchema).min(1, "At least one product is required"),
  isDeleted: z.boolean().optional().default(false),
  status: z.enum(["open", "close"]).optional().default("open"),
  deletedAt: z.date().nullable().optional(),
});

export const createOfferSchema = OfferSchema;

export const createOfferBuyerSchemaValidation = z.object({
  offerId: z.number().int({ message: "offerId must be an integer" }),
  buyerId: z.string().uuid({ message: "buyerId must be a valid UUID" }),
  status: z
    .enum(["open", "accepted", "rejected", "countered", "close"])
    .optional()
    .default("open"),
});

export const createOfferVersionSchemaValidation = z.object({
  offerBuyerId: z.number().int({ message: "offerBuyerId must be an integer" }),
  versionNo: z.number().int({ message: "versionNo must be an integer" }).optional(),
  madeBy: z.enum(["seller", "buyer"], { required_error: "madeBy is required" }),

  productName: z.string().min(1, "productName is required"),
  speciesName: z.string().min(1, "speciesName is required"),
  brand: z.string().min(1, "brand is required"),
  plantApprovalNumber: z.string().min(1, "plantApprovalNumber is required"),
  quantity: z.string().optional().nullable(),
  tolerance: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  sizeBreakups: z
    .array(
      z.object({
        size: z.string().min(1),
        quantity: z.number().nonnegative(),
      })
    )
    .optional()
    .default([]),
  grandTotal: z.number().optional().nullable(),
  shipmentDate: z
    .string()
    .optional()
    .nullable()
    .refine((date) => !date || !isNaN(Date.parse(date)), {
      message: "shipmentDate must be a valid date",
    }),
  remark: z.string().max(100).optional().nullable(),
});
