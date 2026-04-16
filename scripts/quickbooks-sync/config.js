import dotenv from 'dotenv';

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  odbcConnectionString: process.env.QB_ODBC_CONNECTION_STRING,
  apiUrl: process.env.QB_SYNC_API_URL,
  apiKey: process.env.QB_SYNC_API_KEY,
  timeoutMs: toInt(process.env.QB_SYNC_API_TIMEOUT_MS, 30000),
  maxRetries: toInt(process.env.QB_SYNC_MAX_RETRIES, 3),
  retryBaseDelayMs: toInt(process.env.QB_SYNC_RETRY_BASE_DELAY_MS, 1000),
};

export const validateConfig = () => {
  const missing = [];

  if (!config.odbcConnectionString) missing.push('QB_ODBC_CONNECTION_STRING');
  if (!config.apiUrl) missing.push('QB_SYNC_API_URL');
  if (!config.apiKey) missing.push('QB_SYNC_API_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
