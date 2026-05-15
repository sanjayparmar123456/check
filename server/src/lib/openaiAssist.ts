import OpenAI from "openai";
import { env } from "../config.js";

const client = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

export type LlmAssist = {
  suggestedNextQuestion: string;
  riskNotes: string[];
  deliveryChanceHint: number | null;
  riskLevelHint: "LOW" | "MEDIUM" | "HIGH" | null;
};

export async function runAssistLlm(payload: {
  pincode?: string;
  city?: string;
  state?: string;
  area?: string;
  roadSociety?: string;
  landmark?: string;
  houseNumber?: string;
  analyticsSnippet: string;
  rulesFromSystem: string[];
}): Promise<LlmAssist | null> {
  if (!client) return null;

  const system = `You are an assistant for Indian COD call-center agents verifying addresses. You never speak to the end customer.
Output strict JSON only with keys: suggestedNextQuestion (Hinglish short phrase the agent can say), riskNotes (string array, max 4), deliveryChanceHint (0-100 number or null), riskLevelHint ("LOW"|"MEDIUM"|"HIGH"|null).
Use Hinglish for suggestedNextQuestion when appropriate. Do not confirm orders. Be concise.`;

  const user = JSON.stringify({
    ...payload,
    instruction:
      "Suggest the single best next question for the agent, list concrete risks (pincode/city mismatch, missing house number, vague landmark), and optional hints for delivery chance and risk level informed by analytics snippet.",
  });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LlmAssist;
    return {
      suggestedNextQuestion: String(parsed.suggestedNextQuestion ?? ""),
      riskNotes: Array.isArray(parsed.riskNotes) ? parsed.riskNotes.map(String) : [],
      deliveryChanceHint:
        typeof parsed.deliveryChanceHint === "number"
          ? Math.min(100, Math.max(0, parsed.deliveryChanceHint))
          : null,
      riskLevelHint: parsed.riskLevelHint ?? null,
    };
  } catch {
    return null;
  }
}
