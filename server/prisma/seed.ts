import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.pincodeLocality.deleteMany();
  await prisma.deliveryAnalytics.deleteMany();

  const p390 = "390024";
  const areas = [
    "Ram Wadi",
    "Nizampura",
    "Sama",
    "Old Chhani Road",
    "Old Chhani Jakat Naka",
    "Chhani",
    "New Sama",
    "Ram Nagar",
    "Ram Vatika",
  ];
  let order = 0;
  for (const a of areas) {
    await prisma.pincodeLocality.create({
      data: { pincode: p390, locality: a, sortOrder: order++ },
    });
  }

  await prisma.deliveryAnalytics.createMany({
    data: [
      {
        pincode: p390,
        areaKey: `${p390}|ram wadi`,
        areaLabel: "Ram Wadi",
        deliveredOrders: 920,
        rtoOrders: 80,
      },
      {
        pincode: p390,
        areaKey: `${p390}|nizampura`,
        areaLabel: "Nizampura",
        deliveredOrders: 400,
        rtoOrders: 120,
      },
      {
        pincode: p390,
        areaKey: `${p390}|sama`,
        areaLabel: "Sama",
        deliveredOrders: 650,
        rtoOrders: 90,
      },
    ],
  });

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
