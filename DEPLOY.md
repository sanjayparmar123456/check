# Live demo — 5 minute setup

## A) Render (API + database) — તમે શરૂ કર્યું

1. Dashboard → service **cod-crm-api** → **Environment** → add:

   | Key | Value |
   |-----|--------|
   | `OPENAI_API_KEY` | OpenAI dashboard થી |
   | `GOOGLE_MAPS_API_KEY` | Google Cloud થી |
   | `GOOGLE_ADDRESS_VALIDATION_KEY` | same as maps key |
   | `CORS_ORIGIN` | `*` (or your Vercel URL) |

2. **Save** → **Manual Deploy** → wait until **Live**.

3. Copy URL: `https://cod-crm-api.onrender.com`  
   Test: `https://cod-crm-api.onrender.com/health` → `{"ok":true}`

## B) Vercel (website)

1. https://vercel.com → Import GitHub repo `sanjayparmar123456/check`
2. **Root Directory** = `web`
3. **Environment Variables** (Production):

   | Key | Value |
   |-----|--------|
   | `API_URL` | `https://cod-crm-api.onrender.com` |

4. Deploy → open `https://….vercel.app`

Pincode **390024** test કરો.

## Auto-deploy

GitHub `main` push પછી Vercel auto-redeploy (if connected). Render → enable **Auto-Deploy** on repo.
