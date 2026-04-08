import { Router } from 'express';
import { randomUUID } from 'node:crypto';

export interface QwcRouteOptions {
  /** Public base URL, e.g. https://abc123.ngrok-free.app (no trailing slash). */
  publicBaseUrl: string;
  /** Path where SOAP is mounted, e.g. /soap */
  soapPath: string;
  appSupportUrl: string;
  qbwcUsername: string;
  /** Stable GUIDs recommended; generated once if missing. */
  ownerId: string;
  fileId: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * GET /qwc — download a QuickBooks Web Connector configuration file.
 */
export function createQwcRouter(opts: QwcRouteOptions): Router {
  const router = Router();

  router.get('/qwc', (_req, res) => {
    const appUrl = `${opts.publicBaseUrl.replace(/\/$/, '')}${opts.soapPath}`;
    const ownerId = opts.ownerId || randomUUID();
    const fileId = opts.fileId || randomUUID();

    const xml = `<?xml version="1.0"?>
<QBWCXML>
  <AppName>Scanified</AppName>
  <AppID></AppID>
  <AppURL>${escapeXml(appUrl)}</AppURL>
  <AppDescription>Scanified QuickBooks Desktop sync (customers / barcodes)</AppDescription>
  <AppSupport>${escapeXml(opts.appSupportUrl)}</AppSupport>
  <UserName>${escapeXml(opts.qbwcUsername)}</UserName>
  <OwnerID>${escapeXml(ownerId)}</OwnerID>
  <FileID>${escapeXml(fileId)}</FileID>
  <QBType>QBFS</QBType>
  <Scheduler>
    <RunEveryNSeconds>300</RunEveryNSeconds>
  </Scheduler>
</QBWCXML>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="scanified.qwc"');
    res.send(xml);
  });

  return router;
}
