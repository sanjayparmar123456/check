# COD Order Verification CRM (AI-assisted)

Call-center CRM where **only the agent** talks to the customer. AI runs as a **live side panel**: pincode → locality hints, autocomplete, validation signals, delivery chance, risk level, and suggested next questions. **No auto-finalization** and **no customer-facing bot** in this MVP.

## Repo layout

- `web/` — Next.js 15 + TypeScript + Tailwind (agent UI)
- `server/` — Express + Prisma + PostgreSQL (API + assist orchestration)
- `docker-compose.yml` — local PostgreSQL

## Security (important)

You pasted **live API keys in chat**. Treat them as **compromised**: **revoke/rotate** them in OpenAI and Google Cloud, create new keys, and store them only in local `.env` files that are **never committed**.

## Quick start

1. **Database**

   ```bash
   docker compose up -d
   ```

2. **Backend**

   ```bash
   cd server
   cp .env.example .env
   # set DATABASE_URL, OPENAI_API_KEY, GOOGLE_MAPS_API_KEY (and optional GOOGLE_ADDRESS_VALIDATION_KEY)
   npx prisma db push
   npm run db:seed
   npm run dev
   ```

3. **Frontend**

   ```bash
   cd web
   cp .env.example .env.local
   # NEXT_PUBLIC_API_URL=http://localhost:4000
   npm run dev
   ```

Open `http://localhost:3000`. Click **Start session** (creates `Customer` + `Order`), enter pincode `390024` to see Vadodara localities, then use **Finalize manually** to persist `VERIFIED` with analytics/risk fields.

## Data model (Prisma)

- `Customer`, `Order` (draft → verified), `DeliveryAnalytics`, `AIRiskLog`, `PincodeLocality`
- Sample pincode `390024` + analytics seeded; extend with India Post pincode CSV import as a follow-up.

## External APIs

- **OpenAI** — Hinglish-style next-question + extra risk notes (JSON mode).
- **Google Maps** — Geocoding (pin → city/state), Places Autocomplete (New), Address Validation (when enough lines are present).

If Google keys are absent, the app still runs using bundled pincode fallback + DB localities.

## Product rules encoded in UX/API

- AI **does not** speak to the customer (UI is agent-only).
- AI **does not** auto-confirm orders; **Finalize manually** writes `VERIFIED` only when the agent clicks it.

## Live demo (GitHub → Vercel + Render)

Repo: [github.com/sanjayparmar123456/check](https://github.com/sanjayparmar123456/check)

1. **Push code** (already on GitHub after first push).
2. **Backend — [Render](https://render.com)**  
   - New **Blueprint** → connect repo → uses `render.yaml`  
   - Set env: `CORS_ORIGIN` = your Vercel URL, `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY`  
   - Copy API URL (e.g. `https://cod-crm-api.onrender.com`)
3. **Frontend — [Vercel](https://vercel.com)**  
   - Import repo → **Root Directory** = `web`  
   - Env: `NEXT_PUBLIC_API_URL` = Render API URL above  
   - Deploy → open the `.vercel.app` link

## Next.js security note

This scaffold used `next@15.3.2`, which npm reported as affected by a published advisory. Upgrade Next when you pick a maintenance window: `npm i next@latest` in `web/`.
