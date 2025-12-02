import { z } from "zod";

// export const ProductSchema = z.object({
//   productId: z.string().uuid(),
//   productName: z.string().min(1).max(100),
//   species: z.string().min(1).max(100),
//   sizeDetails: z.string().max(100).optional(), 
//   breakupDetails: z.string().max(100).optional(),
//   priceDetails: z.string().max(50).optional(),  
//   packing: z.string().optional(),
//   sizeBreakups: z.array(
//     z.object({
//       size: z.string().min(1),
//       breakup: z.number().int().positive(),
//       price: z.number().positive(),
//       condition: z.string().max(50).optional(),
//     })
//   ).min(1, "At least one size breakup is required"),
// });


const numberStringToNumber = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return isNaN(n) ? v : n;
    }
    return v;
  },
  z.number()
);

export const SizeBreakupSchema = z.object({
  size: z.string().min(1),
  breakup: numberStringToNumber,
  price: numberStringToNumber,
  condition: z.string().optional(),
  sizeDetails: z.string().optional(),
  breakupDetails: z.string().optional(),
  priceDetails: z.string().optional()
});

export const ProductSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  species: z.string(),
  sizeDetails: z.string(),
  breakupDetails: z.string(),
  priceDetails: z.string(),
  packing: z.string(),
  sizeBreakups: z.array(SizeBreakupSchema).min(1)
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
  quantity: z.string().optional(),
  tolerance: z.string().optional(),
  paymentTerms: z.string().optional(),
  remark: z.string().max(100, "Remark must be less than 100 characters").optional(),
  grandTotal: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().positive("Grand total must be a positive number")
  ),
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

