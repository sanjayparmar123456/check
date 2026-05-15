export type ActiveField = "pincode" | "area" | "road" | "landmark" | "house" | "none";

export type LiveAssistResponse = {
  pincodeMatch: boolean | null;
  detectedCity: string | null;
  detectedState: string | null;
  serviceable: boolean;
  possibleAreas: string[];
  autocompleteSuggestions: string[];
  areaMatch: boolean | null;
  landmarkMatch: boolean | null;
  addressCompleteness: number;
  deliveryChance: number | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  suggestedNextQuestion: string;
  riskMessages: string[];
  googleValidation: {
    verdict: string;
    formattedAddress?: string;
    messages: string[];
  } | null;
};

/** Same-origin `/api/*` — proxied to backend via next.config rewrites */
const API = "/api";

export async function postLiveAssist(body: {
  pincode: string;
  area: string;
  roadSociety: string;
  landmark: string;
  houseNumber: string;
  statedCity?: string;
  activeField: ActiveField;
}): Promise<LiveAssistResponse> {
  const res = await fetch(`${API}/assist/live`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Assist API failed");
  return res.json();
}

export async function createCustomer(data: { name: string; phone: string }) {
  const res = await fetch(`${API}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Could not create customer — is the API running?");
  return res.json() as Promise<{ id: string; name: string; phone: string }>;
}

export async function createOrder(customerId: string) {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId }),
  });
  if (!res.ok) throw new Error("Could not create order");
  return res.json() as Promise<{ id: string }>;
}

export async function patchOrder(id: string, data: Record<string, unknown>) {
  const res = await fetch(`${API}/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Could not update order");
  return res.json();
}
