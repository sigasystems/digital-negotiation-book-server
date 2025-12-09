// import { z } from "zod";

// export const businessOwnerSchema = z
//   .object({
//     first_name: z
//       .string()
//       .min(2, "First name must be at least 2 characters")
//       .optional()
//       .nullable(),
//     last_name: z
//       .string()
//       .min(2, "Last name must be at least 2 characters")
//       .optional()
//       .nullable(),
//     email: z.string().email("Invalid email format").optional(),
//     phoneNumber: z
//       .string()
//       .min(10, "Phone number must be at least 10 digits")
//       .max(20, "Phone number must be at most 20 digits")
//       .optional()
//       .nullable(),
//     businessName: z.string().optional(),
//     registrationNumber: z.string().optional().nullable(),
//     country: z.string().optional(),
//     state: z.string().optional().nullable(),
//     city: z.string().optional().nullable(),
//     address: z.string().optional().nullable(),
//     postalCode: z.string().optional().nullable(),
//   })
//   .partial();





import { z } from "zod";

export const businessOwnerSchema = z.object({
  businessName: z
    .string()
    .min(1, "Business name is required"),

  email: z
    .string()
    .email("Invalid email format"),

  country: z
    .string()
    .min(1, "Country is required"),

  // Optional fields
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),

  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must be at most 20 digits")
    .nullable()
    .optional(),

  registrationNumber: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
});
