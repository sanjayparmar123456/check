# શરૂ કરો (2 commands)

## PC પર local demo

**Terminal 1 — API**
```bash
cd server
npm run dev
```

**Terminal 2 — Website**
```bash
cd web
npm run dev
```

બ્રાઉઝર ખોલો: **http://localhost:3000** (અથવા terminal માં જે port દેખાય — 3001/3002)

**Test:** Pincode `390024` → Area `ram` → Landmark `zimmer`

---

## Live internet demo (Vercel + Render)

### Render (API) — તમે કર્યું
1. https://dashboard.render.com → service **cod-crm-api** → **Environment**
2. Keys paste: `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `CORS_ORIGIN` = `*`
3. Deploy → URL copy: `https://cod-crm-api.onrender.com`

### Vercel (website)
1. https://vercel.com/new → GitHub repo **check**
2. Root Directory: **web**
3. Env: `API_URL` = `https://cod-crm-api.onrender.com`
4. Deploy → `.vercel.app` link = **live demo**

---

## Links

- GitHub: https://github.com/sanjayparmar123456/check
- API health: `https://YOUR-RENDER-URL.onrender.com/health`
