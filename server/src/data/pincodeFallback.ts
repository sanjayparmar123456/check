export type AreaStats = {
  areaLabel: string;
  deliveredOrders: number;
  rtoOrders: number;
};

export const pincodeFallback: Record<
  string,
  {
    city: string;
    state: string;
    serviceable: boolean;
    areas: string[];
    /** Key = normalized area name */
    areaStats?: Record<string, AreaStats>;
  }
> = {
  "390024": {
    city: "Vadodara",
    state: "Gujarat",
    serviceable: true,
    areas: [
      "Ram Wadi",
      "Nizampura",
      "Sama",
      "Old Chhani Road",
      "Old Chhani Jakat Naka",
      "Ram Nagar",
      "Ram Vatika",
    ],
    areaStats: {
      "ram wadi": { areaLabel: "Ram Wadi", deliveredOrders: 920, rtoOrders: 80 },
      nizampura: { areaLabel: "Nizampura", deliveredOrders: 400, rtoOrders: 120 },
    },
  },
  "395007": {
    city: "Surat",
    state: "Gujarat",
    serviceable: true,
    areas: ["Adajan", "Pal", "Rander Road", "Gorat"],
  },
};
