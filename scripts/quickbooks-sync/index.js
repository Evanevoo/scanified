import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { fetchQuickBooksData } from './quickbooksClient.js';
import { transformQuickBooksData } from './transformers.js';
import { postSyncPayload } from './apiClient.js';

const run = async () => {
  const startedAt = Date.now();

  try {
    validateConfig();
    logger.info('Starting QuickBooks Desktop sync');

    const qbData = await fetchQuickBooksData(config.odbcConnectionString);
    const payload = transformQuickBooksData(qbData);

    logger.info('Prepared sync payload', {
      customers: payload.customers.length,
      invoices: payload.invoices.length,
    });

    await postSyncPayload({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      payload,
      maxRetries: config.maxRetries,
      retryBaseDelayMs: config.retryBaseDelayMs,
      timeoutMs: config.timeoutMs,
    });

    logger.info('QuickBooks sync finished', { durationMs: Date.now() - startedAt });
  } catch (error) {
    logger.error('QuickBooks sync run failed', { message: error.message, stack: error.stack });
    process.exitCode = 1;
  }
};

run();
