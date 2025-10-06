import { z } from "zod";

export const locationSchema = z.object({
  locationName: z.string().min(1, "Location name is required"),
  code: z.string().min(1, "Code is required"),
  portalCode: z.string().min(1, "Portal code is required"),
  country: z.string().min(1, "Country is required"),
});

export const locationUpdateSchema = z.object({
  locationName: z.string().optional(),
  code: z.string().optional(),
  portalCode: z.string().optional(),
  country: z.string().optional(),
});

export const locationsArraySchema = z.array(locationSchema).min(1, "At least one location is required");

