"use server";

import { z } from "zod";
import { sendLandingLeadEmail } from "@/lib/email/send-landing-lead";

const schema = z.object({
  name: z.string().trim().min(2, { message: "name_short" }).max(120),
  email: z.string().trim().email({ message: "email_invalid" }),
  phone: z.string().trim().max(40),
  residentialHint: z.string().trim().max(200),
  message: z.string().trim().min(15, { message: "message_short" }).max(4000),
});

export type LandingLeadState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; code: string }
  | { status: "validation"; fieldErrors: Record<string, string> };

export async function submitLandingLeadAction(_prev: LandingLeadState, formData: FormData): Promise<LandingLeadState> {
  if (String(formData.get("trap") ?? "").trim()) {
    return { status: "success" };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    residentialHint: formData.get("residentialHint") ?? "",
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) {
        fieldErrors[path] = typeof issue.message === "string" ? issue.message : "invalid";
      }
    }
    return { status: "validation", fieldErrors };
  }

  const result = await sendLandingLeadEmail({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    residentialHint: parsed.data.residentialHint,
    message: parsed.data.message,
  });

  if (!result.ok) {
    return { status: "error", code: result.error };
  }

  return { status: "success" };
}
