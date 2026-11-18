import { z } from "zod";
import { displayNameSchema, timezoneSchema } from "@/lib/validators/profile";

const plainText = (min: number, max: number, empty: string) =>
  z
    .string()
    .trim()
    .min(min, empty)
    .max(max, `Use ${max} characters or fewer.`)
    .refine((value) => !/[\u0000-\u001F]/.test(value), "Remove line breaks and hidden characters.");

export const commitmentInputSchema = z
  .object({
    title: plainText(3, 80, "Name the commitment in at least 3 characters."),
    assigneeIndex: z.number().int().nullable(),
    dueLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a date and time."),
  })
  .strict();

export const createBondSchema = z
  .object({
    title: plainText(3, 80, "Name the bond in at least 3 characters."),
    purpose: plainText(1, 400, "Say what this bond is for."),
    people: z.array(z.object({ name: displayNameSchema }).strict()).max(12, "Keep this to 12 other people."),
    commitments: z
      .array(commitmentInputSchema)
      .min(1, "Add at least one commitment.")
      .max(20, "Keep this to 20 commitments."),
  })
  .strict()
  .superRefine((value, context) => {
    value.commitments.forEach((commitment, index) => {
      if (commitment.assigneeIndex === null) return;
      if (commitment.assigneeIndex < 0 || commitment.assigneeIndex >= value.people.length) {
        context.addIssue({
          code: "custom",
          path: ["commitments", index, "assigneeIndex"],
          message: "Choose a person who is on this bond.",
        });
      }
    });
  });

export const createBondBodySchema = createBondSchema.safeExtend({
  displayName: displayNameSchema.optional(),
  timezone: timezoneSchema,
});

export type CreateBondInput = z.infer<typeof createBondSchema>;
