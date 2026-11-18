import { z } from "zod";
import { isValidTimeZone } from "@/lib/time";

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Use at least 2 characters.")
  .max(40, "Use 40 characters or fewer.")
  .regex(
    /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .'-]*$/u,
    "Use letters, numbers, spaces, apostrophes, or hyphens.",
  )
  .refine((value) => !value.includes("@"), "Leave out an email address. Bond does not look people up that way.");

export const timezoneSchema = z
  .string()
  .trim()
  .min(1, "Choose a timezone.")
  .max(80, "That timezone name is too long.")
  .refine(isValidTimeZone, "Choose a timezone from the list.");

export const profileBodySchema = z
  .object({
    displayName: displayNameSchema,
    timezone: timezoneSchema,
  })
  .strict();
