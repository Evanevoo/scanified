/**
 * Serves QuickBooks Web Connector app config XML at GET /qwc (via netlify.toml redirect).
 *
 * Set in Netlify → Site configuration → Environment variables:
 *   QBWC_APP_URL     — Full SOAP endpoint QBWC must call, e.g. https://your-api.example.com/soap
 *   QBWC_SUPPORT_URL — Optional; default https://www.scanified.com/support
 *   QBWC_USERNAME    — Username embedded in the .qwc (password is entered in QBWC UI)
 *   QBWC_OWNER_ID    — Stable GUID (recommended; generate once)
 *   QBWC_FILE_ID     — Stable GUID (recommended; generate once)
 */

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const appUrl = process.env.QBWC_APP_URL?.trim();
  if (!appUrl) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body:
        'QBWC_APP_URL is not configured. Set it in Netlify to your public SOAP URL (e.g. https://api.scanified.com/soap).',
    };
  }

  const supportUrl =
    process.env.QBWC_SUPPORT_URL?.trim() || 'https://www.scanified.com/support';
  const username = process.env.QBWC_USERNAME?.trim() || 'scanified';
  const ownerId = process.env.QBWC_OWNER_ID?.trim() || '';
  const fileId = process.env.QBWC_FILE_ID?.trim() || '';

  const xml = `<?xml version="1.0"?>
<QBWCXML>
  <AppName>Scanified</AppName>
  <AppID></AppID>
  <AppURL>${escapeXml(appUrl)}</AppURL>
  <AppDescription>Scanified QuickBooks Desktop sync (customers / barcodes)</AppDescription>
  <AppSupport>${escapeXml(supportUrl)}</AppSupport>
  <UserName>${escapeXml(username)}</UserName>
  <OwnerID>${escapeXml(ownerId)}</OwnerID>
  <FileID>${escapeXml(fileId)}</FileID>
  <QBType>QBFS</QBType>
  <Scheduler>
    <RunEveryNSeconds>300</RunEveryNSeconds>
  </Scheduler>
</QBWCXML>`;

  if (event.httpMethod === 'HEAD') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': 'attachment; filename="scanified.qwc"',
      },
      body: '',
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="scanified.qwc"',
      'Cache-Control': 'no-store',
    },
    body: xml,
  };
};
