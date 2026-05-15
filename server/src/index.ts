import express from "express";
import cors from "cors";
import { z } from "zod";
import { env } from "./config.js";
import { prisma } from "./lib/db.js";
import { buildLiveAssist } from "./services/assistService.js";

const app = express();
const allowedOrigins = env.corsOrigin.split(",").map((s) => s.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*")) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      callback(new Error("CORS blocked"));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const assistSchema = z.object({
  pincode: z.string().default(""),
  area: z.string().default(""),
  roadSociety: z.string().default(""),
  landmark: z.string().default(""),
  houseNumber: z.string().default(""),
  statedCity: z.string().optional(),
  activeField: z
    .enum(["pincode", "area", "road", "landmark", "house", "none"])
    .default("none"),
});

app.post("/api/assist/live", async (req, res) => {
  try {
    const body = assistSchema.parse(req.body);
    const result = await buildLiveAssist({
      pincode: body.pincode,
      area: body.area,
      roadSociety: body.roadSociety,
      landmark: body.landmark,
      houseNumber: body.houseNumber,
      statedCity: body.statedCity,
      activeField: body.activeField,
    });
    res.json(result);
  } catch (e) {
    console.error("[assist/live]", e);
    const message = e instanceof Error ? e.message : "Assist failed";
    res.status(500).json({ error: message });
  }
});

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
});

app.post("/api/customers", async (req, res) => {
  const body = customerSchema.parse(req.body);
  const c = await prisma.customer.create({ data: body });
  res.json(c);
});

const orderCreateSchema = z.object({
  customerId: z.string(),
});

app.post("/api/orders", async (req, res) => {
  const body = orderCreateSchema.parse(req.body);
  const o = await prisma.order.create({
    data: { customerId: body.customerId, status: "DRAFT" },
  });
  res.json(o);
});

const orderPatchSchema = z.object({
  pincode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  area: z.string().optional(),
  roadSociety: z.string().optional(),
  landmark: z.string().optional(),
  houseNumber: z.string().optional(),
  serviceable: z.boolean().optional(),
  deliveryChance: z.number().optional(),
  riskLevel: z.string().optional(),
  status: z.enum(["DRAFT", "VERIFIED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

app.patch("/api/orders/:id", async (req, res) => {
  const body = orderPatchSchema.parse(req.body);
  const o = await prisma.order.update({
    where: { id: req.params.id },
    data: body,
  });
  res.json(o);
});

const riskLogSchema = z.object({
  orderId: z.string().optional(),
  level: z.string(),
  message: z.string(),
  detail: z.unknown().optional(),
});

app.post("/api/risk-logs", async (req, res) => {
  const body = riskLogSchema.parse(req.body);
  const log = await prisma.aIRiskLog.create({
    data: {
      orderId: body.orderId,
      level: body.level,
      message: body.message,
      detail: body.detail === undefined ? undefined : (body.detail as object),
    },
  });
  res.json(log);
});

app.listen(env.port, () => {
  console.log(`COD CRM API listening on http://localhost:${env.port}`);
});
