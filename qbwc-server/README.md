# Scanified — QuickBooks Web Connector (QBWC) server

Node.js (Express) + TypeScript SOAP endpoint compatible with the **official Intuit QBWC WSDL** (`sendRequestXML` returns a **single** qbXML string; an empty string means no more work for the session).

## What it does

1. **authenticate** — validates username/password from the `.qwc` file and issues a session ticket.
2. **sendRequestXML** — first sends `CustomerQueryRq`, then a batched `CustomerModRq` to set **AccountNumber** to a deterministic barcode (`SCAN-` + SHA-256).
3. **receiveResponseXML** — parses the customer list, queues updates, returns progress 0–100 (negative triggers **getLastError**).
4. **GET /qwc** — downloads `scanified.qwc` with `AppName` **Scanified** and your SOAP **AppURL**.

Barcodes: `generateBarcode(name)` is exported for API-style use; the sync uses `barcodeForListIdAndName(listId, name)` so each QuickBooks row stays unique.

## Run locally

```bash
cd qbwc-server
cp .env.example .env
# Edit .env — set QBWC_PASSWORD and, for real QBWC tests, PUBLIC_BASE_URL to an HTTPS tunnel
npm install
npm run dev
```

Production-style:

```bash
npm run build
npm start
```

Defaults: `http://127.0.0.1:8090`, SOAP at `http://127.0.0.1:8090/soap`, WSDL at `http://127.0.0.1:8090/soap?wsdl`.

## No ports on the QB server: Netlify + Render (HTTPS)

**Netlify cannot run SOAP.** It only serves **`https://www.scanified.com/qwc`** (the small config file). The **SOAP app must run on another host** with HTTPS. Easiest path: **Render**.

### 1) Deploy SOAP on Render

1. Push this repo (including `render.yaml` and `qbwc-server/`) to GitHub.
2. [Render](https://render.com) → **New** → **Blueprint** → connect the repo → apply (creates Web Service **`scanified-qbwc`** from `render.yaml`).
3. When the deploy finishes, copy your service URL, e.g. `https://scanified-qbwc.onrender.com`.
4. Render dashboard → **Environment** for that service → add:
   - **`PUBLIC_BASE_URL`** = `https://scanified-qbwc.onrender.com` (your real URL, no trailing slash)
   - **`QBWC_PASSWORD`** = a strong password (you will type this in Web Connector)
   - Optional: **`QBWC_OWNER_ID`** / **`QBWC_FILE_ID`** if you already registered the app in QBWC and want to keep the same IDs
5. **Save** and let Render redeploy.

**SOAP URL for Web Connector:** `https://<your-render-host>.onrender.com/soap`  
Test in a browser: `https://<your-render-host>.onrender.com/soap?wsdl` → should show WSDL XML.

**Free tier:** Render may **spin down** after idle; the first sync can be slow or time out. For production QBWC, use a **paid** Render instance (always on) or another host.

### 2) Point Netlify at Render

Netlify → **Environment variables**:

- **`QBWC_APP_URL`** = `https://<your-render-host>.onrender.com/soap` (exact SOAP URL)

Redeploy the Netlify site. Then open **`https://www.scanified.com/qwc`** — `<AppURL>` should match that HTTPS `/soap` URL.

### 3) Web Connector (on the Windows QB machine)

You do **not** need to open any port on that server for **inbound** traffic to your app. It only needs **outbound HTTPS** to Render and Netlify.

1. Download **`scanified.qwc`** from `https://www.scanified.com/qwc`.
2. **Add application** in Web Connector, enter password = **`QBWC_PASSWORD`** from Render.

## Load the app in QuickBooks Web Connector

1. On the machine where **QuickBooks Desktop** and **QuickBooks Web Connector** run, ensure the SOAP URL is reachable. For a dev PC hitting the same machine, `http://127.0.0.1:8090` works. For a remote QB machine, use **HTTPS** (e.g. ngrok) and set `PUBLIC_BASE_URL` to that origin.
2. In a browser (or `curl`), open: `http://<host>:8090/qwc` and save **`scanified.qwc`**.
3. In Web Connector: **File → Add an application**, choose the `.qwc` file.
4. Enter the password matching **`QBWC_PASSWORD`** (username is in the `.qwc` file from **`QBWC_USERNAME`**).
5. Check the app and click **Update Selected** (or wait for the scheduler).

## Test connection

- **Health:** `GET /health`
- **WSDL:** `GET http://<host>:8090/soap?wsdl` (should return XML).
- **Last synced customers (after a successful run):** `GET /customers`
- **Flag a manual sync** (next WC run still driven by QBWC): `POST /sync`

## QuickBooks notes

- **QBFS** in the `.qwc` targets QuickBooks **financial software** (not Point of Sale).
- Barcodes are written to the customer **Account Number** field so no custom DataExt setup is required. If you prefer a custom field, change `builders.ts` / mod logic accordingly.
- **OwnerID** and **FileID** should stay stable for a given deployment so Web Connector does not duplicate the app; set `QBWC_OWNER_ID` and `QBWC_FILE_ID` in `.env` (GUIDs).

## Project layout

- `src/soap/webConnectorService.ts` — SOAP methods.
- `src/qbxml/builders.ts` — QBXML construction.
- `src/qbxml/parsers.ts` — Response parsing (defensive).
- `src/services/barcodeService.ts` — Deterministic barcodes.
- `src/services/syncService.ts` — Query → mod flow and `data/last-customers.json` snapshot.
- `src/routes/qwc.ts` — `GET /qwc`.
- `wsdl/QBWebConnectorSvc.wsdl` — Intuit-compatible WSDL (addresses are placeholders; QBWC uses your **AppURL** from the `.qwc` file).

Session state is **in-memory** (per ticket). Optional SQLite can replace `src/store/sessionStore.ts` if you need multi-instance persistence.
