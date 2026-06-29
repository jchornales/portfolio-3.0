import { z } from "zod";

/** Services offered — kept in sync with the contact form <select> options. */
export const SERVICES = [
  "Web Development",
  "Business Automation",
  "Reservation & Scheduling",
  "AI Chatbot Integration",
  "Something else",
] as const;

/**
 * Single source of truth for contact form validation.
 * Used client-side by react-hook-form and re-validated server-side
 * in functions/api/contact.ts before sending the email.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80, "That name is too long"),
  email: z.email("Please enter a valid email address"),
  // "" represents the unselected placeholder option, which is allowed.
  service: z.union([z.enum(SERVICES), z.literal("")]),
  message: z
    .string()
    .trim()
    .min(10, "Tell me a little more — at least 10 characters")
    .max(2000, "That message is a bit too long"),
});

export type ContactInput = z.infer<typeof contactSchema>;
