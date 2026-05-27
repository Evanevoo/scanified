const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Scheduled + manual: reserve next W##### invoice numbers for each billable customer
 * for the current billing period (month-end = in-progress month; month-start = prior month).
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return json(500, { error: 'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const querySecret = event.queryStringParameters?.secret;
  const isScheduled = event.headers?.['x-netlify-event'] === 'schedule' || event.source === 'schedule';
  const authorized =
    isScheduled
    || (cronSecret && (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret));

  if (!authorized && event.httpMethod !== 'GET') {
    return json(401, { error: 'Unauthorized' });
  }

  let body = {};
  try {
    if (event.body) body = JSON.parse(event.body);
  } catch {
    /* ignore */
  }

  const force = body.force === true || event.queryStringParameters?.force === 'true';
  const organizationId = body.organizationId || event.queryStringParameters?.organizationId || null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { preallocateCycleInvoicesForOrganization, preallocateCycleInvoicesAllOrganizations } =
      await import('../../src/services/preallocateCycleInvoices.js');

    // Scheduled runs only on month-end / month-start; manual POST can pass force=true any day.
    const options = { force: force && !isScheduled };

    if (organizationId) {
      const result = await preallocateCycleInvoicesForOrganization(supabase, organizationId, options);
      return json(200, result);
    }

    const results = await preallocateCycleInvoicesAllOrganizations(supabase, options);
    const summary = {
      organizations: results.length,
      created: results.reduce((s, r) => s + (r.created || 0), 0),
      alreadyHadNumber: results.reduce((s, r) => s + (r.alreadyHadNumber || 0), 0),
      skippedOrgs: results.filter((r) => r.skipped).length,
    };
    return json(200, { summary, results });
  } catch (err) {
    console.error('preallocate-cycle-invoices error:', err);
    return json(500, { error: err.message || String(err) });
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
