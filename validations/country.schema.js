import { z } from "zod";

export const countryArraySchema = z
  .array(
    z.object({
      name: z.string().min(1, "Country name is required"),
      code: z.string().min(1, "Country code is required"),
    })
  )
  .min(1, "At least one country is required")
  .max(5, "You can add a maximum of 5 countries at once");
  
export const updateCountrySchema = z.object({
  name: z.string().min(1, "Country name is required").optional(),
  code: z.string().min(1, "Country code is required").optional(),
});
