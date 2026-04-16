import { logger } from './logger.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status) => status >= 500 || status === 429;

const getBackoffDelay = (attempt, baseDelayMs) => baseDelayMs * 2 ** (attempt - 1);

export const postSyncPayload = async ({
  apiUrl,
  apiKey,
  payload,
  maxRetries,
  retryBaseDelayMs,
  timeoutMs,
}) => {
  const endpoint = `${apiUrl.replace(/\/$/, '')}/api/sync/quickbooks`;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.info('Sending QuickBooks sync payload', { attempt, endpoint });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        logger.info('QuickBooks sync succeeded', { status: response.status, attempt });
        return;
      }

      const responseBody = await response.text();
      const retryable = isRetryableStatus(response.status);

      logger.warn('QuickBooks sync failed', {
        attempt,
        status: response.status,
        retryable,
        responseBody,
      });

      if (!retryable || attempt === maxRetries) {
        throw new Error(`API request failed with status ${response.status}: ${responseBody}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (attempt === maxRetries) {
        logger.error('QuickBooks sync failed after retries', {
          message: error.message,
          stack: error.stack,
        });
        throw error;
      }

      const delayMs = getBackoffDelay(attempt, retryBaseDelayMs);
      logger.warn('Retrying QuickBooks sync after failure', {
        attempt,
        nextAttemptInMs: delayMs,
        message: error.message,
      });
      await sleep(delayMs);
      continue;
    }

    const delayMs = getBackoffDelay(attempt, retryBaseDelayMs);
    logger.warn('Retrying QuickBooks sync due to retryable response', {
      attempt,
      nextAttemptInMs: delayMs,
    });
    await sleep(delayMs);
  }
};
