import 'dotenv/config';
import express from 'express';
import soap from 'soap';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWebConnectorService } from './soap/webConnectorService.js';
import { createQwcRouter } from './routes/qwc.js';
import { loadPersistedCustomersIfAny, getLastSyncedCustomers, requestManualSync } from './services/syncService.js';
import { log } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const wsdlPath = path.join(rootDir, 'wsdl', 'QBWebConnectorSvc.wsdl');

const PORT = Number(process.env.PORT ?? '8090');
const HOST = process.env.HOST ?? '0.0.0.0';
const SOAP_PATH = process.env.SOAP_PATH ?? '/soap';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL ?? `http://127.0.0.1:${PORT}`).replace(/\/$/, '');
const APP_SUPPORT_URL = process.env.APP_SUPPORT_URL ?? 'https://www.scanified.com/support';
const QBWC_USERNAME = process.env.QBWC_USERNAME ?? 'scanified';
const QBWC_PASSWORD = process.env.QBWC_PASSWORD ?? 'change-me';
const QBWC_OWNER_ID = process.env.QBWC_OWNER_ID ?? '';
const QBWC_FILE_ID = process.env.QBWC_FILE_ID ?? '';

loadPersistedCustomersIfAny();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'scanified-qbwc' });
});

app.get('/customers', (_req, res) => {
  res.json({ customers: getLastSyncedCustomers() });
});

app.post('/sync', (_req, res) => {
  requestManualSync();
  res.json({ ok: true, message: 'Manual sync flag set for next connector run.' });
});

app.use(
  createQwcRouter({
    publicBaseUrl: PUBLIC_BASE_URL,
    soapPath: SOAP_PATH,
    appSupportUrl: APP_SUPPORT_URL,
    qbwcUsername: QBWC_USERNAME,
    ownerId: QBWC_OWNER_ID,
    fileId: QBWC_FILE_ID,
  }),
);

const wsdlXml = fs.readFileSync(wsdlPath, 'utf8');
const service = createWebConnectorService({ username: QBWC_USERNAME, password: QBWC_PASSWORD });

const server = app.listen(PORT, HOST);

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    log.error(
      `Port ${PORT} is already in use. Stop the other Node/process or set PORT in .env (Windows: netstat -ano | findstr :${PORT}).`,
    );
    process.exit(1);
  }
  throw err;
});

server.on('listening', () => {
  log.info(`HTTP listening on ${HOST}:${PORT}`, { PUBLIC_BASE_URL, SOAP_PATH });

  soap.listen(app, SOAP_PATH, service, wsdlXml, () => {
    log.info('SOAP QB Web Connector endpoint ready', {
      wsdl: `${PUBLIC_BASE_URL}${SOAP_PATH}?wsdl`,
    });
  });
});
