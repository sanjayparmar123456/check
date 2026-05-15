export type AreaStats = {
  areaLabel: string;
  deliveredOrders: number;
  rtoOrders: number;
};

export type PincodeData = {
  city: string;
  state: string;
  serviceable: boolean;
  codAvailable: boolean;
  areas: string[];
  nearbyServiceable: string[];
  landmarks: string[];
  roads: string[];
  pincodeStats?: { deliveredOrders: number; rtoOrders: number };
  areaStats?: Record<string, AreaStats>;
};

export const pincodeFallback: Record<string, PincodeData> = {
  "390024": {
    city: "Vadodara",
    state: "Gujarat",
    serviceable: true,
    codAvailable: true,
    areas: [
      "Ram Wadi",
      "Nizampura",
      "Sama",
      "Old Chhani Road",
      "Old Chhani Jakat Naka",
      "Chhani",
      "New Sama",
      "Ram Nagar",
      "Ram Vatika",
    ],
    nearbyServiceable: ["Karelibaug", "Fatehgunj"],
    landmarks: [
      "Zimmerwala TVS",
      "Zimmer Plaza",
      "Inorbit Mall",
      "DMart Chhani",
      "Akshar Chowk",
    ],
    roads: [
      "Old Chhani Road",
      "Old Chhani Jakat Naka",
      "New Sama Road",
      "Chhani Jakat Naka",
    ],
    pincodeStats: { deliveredOrders: 10200, rtoOrders: 1010 },
    areaStats: {
      "ram wadi": { areaLabel: "Ram Wadi", deliveredOrders: 920, rtoOrders: 80 },
      nizampura: { areaLabel: "Nizampura", deliveredOrders: 400, rtoOrders: 120 },
      sama: { areaLabel: "Sama", deliveredOrders: 650, rtoOrders: 90 },
    },
  },
  "395007": {
    city: "Surat",
    state: "Gujarat",
    serviceable: true,
    codAvailable: true,
    areas: ["Adajan", "Pal", "Rander Road", "Gorat"],
    nearbyServiceable: ["Vesu", "City Light"],
    landmarks: ["VR Mall", "Adajan Patiya"],
    roads: ["Rander Road", "Pal Road"],
    pincodeStats: { deliveredOrders: 8000, rtoOrders: 1200 },
  },
};
