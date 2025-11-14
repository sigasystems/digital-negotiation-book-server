import { z } from "zod";

export const countryArraySchema = z
  .array(
    z.object({
      code: z.string().min(1, "Code is required"),
      country: z.string().min(1, "Country name is required"),
    })
  )
  .min(1, "At least one country is required")
  .max(5, "You can add a maximum of 5 countries at once");
  
export const updateCountrySchema = z.object({
  code: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
});
