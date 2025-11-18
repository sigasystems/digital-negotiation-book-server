import { z } from "zod";

export const locationSchema = z.object({
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  code: z.string().min(1, "Code is required"),

  countryName: z.string().min(1).optional(),
  countryCode: z.string().min(1).optional(),
})
.refine(
  (data) => {
    return !!(data.countryName && data.countryCode);
  },
  {
    message: "countryName and countryCode are required",
    path: ["country"],
  }
);

export const locationUpdateSchema = locationSchema.partial();

export const locationsArraySchema = z.array(locationSchema).min(1, "At least one location is required").max(5, "You can add a maximum of 5 locations");

export const updateLocationSchema = z.object({
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must be less than 100 characters"),
  state: z
    .string()
    .min(1, "State is required")
    .max(100, "State must be less than 100 characters"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be less than 10 characters"),
  countryId: z
    .string()
    .uuid("Country ID must be a valid UUID")
});
