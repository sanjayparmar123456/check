import { env } from "../config.js";

type GeocodeResult = {
  city?: string;
  state?: string;
  formattedAddress?: string;
};

export async function geocodePincode(pincode: string): Promise<GeocodeResult | null> {
  const key = env.googleMapsApiKey;
  if (!key || pincode.length !== 6) return null;

  const q = encodeURIComponent(`${pincode} India`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${q}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status: string;
    results?: Array<{ formatted_address: string; address_components: Array<{ long_name: string; types: string[] }> }>;
  };
  if (data.status !== "OK" || !data.results?.[0]) return null;

  const components = data.results[0].address_components;
  let city: string | undefined;
  let state: string | undefined;
  for (const c of components) {
    if (
      c.types.includes("locality") ||
      c.types.includes("postal_town") ||
      c.types.includes("administrative_area_level_2")
    ) {
      city = city ?? c.long_name;
    }
    if (c.types.includes("administrative_area_level_1")) {
      state = c.long_name;
    }
  }
  return {
    city,
    state,
    formattedAddress: data.results[0].formatted_address,
  };
}

export async function placesAutocomplete(
  input: string,
  pincode?: string
): Promise<string[]> {
  const key = env.googleMapsApiKey;
  if (!key || input.trim().length < 2) return [];

  const body = {
    input: pincode ? `${input}, ${pincode} India` : `${input} India`,
    includedPrimaryTypes: ["establishment", "geocode"],
    languageCode: "en",
  };

  const res = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "suggestions.placePrediction.text",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) return [];
  const data = (await res.json()) as {
    suggestions?: Array<{ placePrediction?: { text?: { text?: string } } }>;
  };
  const out: string[] = [];
  for (const s of data.suggestions ?? []) {
    const t = s.placePrediction?.text?.text;
    if (t) out.push(t);
  }
  return out.slice(0, 8);
}

export type AddressValidationSummary = {
  verdict: "PASS" | "FIX" | "UNKNOWN";
  formattedAddress?: string;
  granularity?: string;
  messages: string[];
};

export async function validateAddressStructured(addressLines: {
  regionCode: string;
  postalCode: string;
  locality?: string;
  addressLines: string[];
}): Promise<AddressValidationSummary | null> {
  const key = env.googleAddressValidationKey;
  if (!key) return null;

  const res = await fetch(
    "https://addressvalidation.googleapis.com/v1:validateAddress?key=" + encodeURIComponent(key),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addressLines }),
    }
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    result?: {
      verdict?: { addressComplete?: boolean; validationGranularity?: string };
      address?: { formattedAddress?: string };
      metadata?: { business?: boolean };
    };
  };

  const v = data.result?.verdict;
  const messages: string[] = [];
  if (v?.addressComplete === false) messages.push("Address appears incomplete per Google validation.");
  const formatted = data.result?.address?.formattedAddress;
  const verdict: AddressValidationSummary["verdict"] =
    v?.addressComplete === true ? "PASS" : v?.addressComplete === false ? "FIX" : "UNKNOWN";

  return {
    verdict,
    formattedAddress: formatted,
    granularity: v?.validationGranularity,
    messages,
  };
}
