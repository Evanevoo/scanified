# QuickBooks Desktop Sync (QODBC + Node.js)

This sync pulls customer and invoice data from QuickBooks Desktop via QODBC and posts it to:

- `POST /api/sync/quickbooks`

## 1) Install dependencies

From the repository root:

```bash
npm install
```

## 2) Install and configure QODBC (Windows)

1. Install QuickBooks Desktop on the machine that will run the sync.
2. Install QODBC Desktop Edition (32-bit or 64-bit to match your QuickBooks install).
3. Open QuickBooks Desktop company file as the same Windows user that runs the sync.
4. During first connection attempt, allow the QODBC app certificate in QuickBooks:
   - `Edit -> Preferences -> Integrated Applications -> Company Preferences`
   - Ensure QODBC is authorized.
5. Confirm QODBC can query QuickBooks using the QODBC Test Tool.

## 3) Set up ODBC DSN on Windows

1. Open ODBC Data Sources:
   - 64-bit: `C:\Windows\System32\odbcad32.exe`
   - 32-bit: `C:\Windows\SysWOW64\odbcad32.exe`
2. Create a **System DSN** using the **QODBC Driver for QuickBooks**.
3. Name it (example: `QuickBooksData`) and save.
4. Test the DSN connection.

You can then use either:

- DSN connection string:
  - `DSN=QuickBooksData;`
- Full connection string (if your setup requires driver details):
  - `Driver={QODBC Driver for QuickBooks};DSN=QuickBooksData;`

## 4) Environment variables

Create a `.env` file in repo root:

```env
QB_ODBC_CONNECTION_STRING=DSN=QuickBooksData;
QB_SYNC_API_URL=https://your-api.example.com
QB_SYNC_API_KEY=your-api-key

# Optional tuning
QB_SYNC_API_TIMEOUT_MS=30000
QB_SYNC_MAX_RETRIES=3
QB_SYNC_RETRY_BASE_DELAY_MS=1000
```

## 5) Run manually

```bash
npm run sync:quickbooks
```

## 6) Schedule every 10 minutes

### Option A: Linux/macOS cron

```cron
*/10 * * * * cd /path/to/gas-cylinder-app && /usr/bin/node scripts/quickbooks-sync/index.js >> /var/log/qb-sync.log 2>&1
```

### Option B: Windows Task Scheduler (recommended for QuickBooks Desktop)

1. Open **Task Scheduler** -> **Create Task**.
2. Run as the same user that can open the QuickBooks company file.
3. Trigger: Daily, repeat task every `10 minutes`, for `Indefinitely`.
4. Action:
   - Program/script: `node`
   - Add arguments: `scripts/quickbooks-sync/index.js`
   - Start in: `C:\gas-cylinder-app`
5. Set environment variables for that user (or configure a `.env` in the working directory).

## 7) Payload shape

The script posts JSON like:

```json
{
  "source": "quickbooks-desktop",
  "syncedAt": "2026-03-26T17:00:00.000Z",
  "customers": [
    {
      "name": "Acme Corp",
      "email": "billing@acme.com",
      "phone": "555-123-4567",
      "balance": 1200.5
    }
  ],
  "invoices": [
    {
      "invoiceNumber": "10045",
      "customer": "Acme Corp",
      "date": "2026-03-25T00:00:00.000Z",
      "total": 350.0,
      "lineItems": [
        {
          "item": "Cylinder Rental",
          "description": "Monthly rental",
          "quantity": 10,
          "rate": 35,
          "amount": 350
        }
      ]
    }
  ]
}
```

## Notes

- Ensure QuickBooks Desktop is installed and accessible on the machine running this script.
- QODBC table schemas can vary by version/settings. If your fields differ, adjust queries in `scripts/quickbooks-sync/quickbooksClient.js`.
