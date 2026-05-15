/** Free India Post pincode lookup — works for all Indian pincodes */
export type IndiaPostResult = {
  city: string;
  state: string;
  areas: string[];
  district: string;
  valid: boolean;
};

export async function lookupIndiaPincode(pincode: string): Promise<IndiaPostResult | null> {
  if (pincode.length !== 6) return null;

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{
      Status: string;
      Message: string;
      PostOffice?: Array<{
        Name: string;
        District: string;
        State: string;
        Block?: string;
        Division?: string;
      }>;
    }>;

    const block = data[0];
    if (!block || block.Status !== "Success" || !block.PostOffice?.length) {
      return null;
    }

    const offices = block.PostOffice;
    const state = offices[0].State;
    const district = offices[0].District;
    const city = district || offices[0].Name;

    const areas = Array.from(
      new Set(
        offices
          .map((o) => o.Name)
          .filter((n) => n && n.length > 1)
      )
    ).slice(0, 25);

    return {
      city,
      state,
      district,
      areas,
      valid: true,
    };
  } catch {
    return null;
  }
}
