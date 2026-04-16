const formatMeta = (meta) => {
  if (!meta) return '';
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch (error) {
    return ` {"metaError":"Unable to serialize log metadata","reason":"${error.message}"}`;
  }
};

const log = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  // Plain JSON-ish line format for easy ingestion in logs.
  console[level === 'error' ? 'error' : 'log'](`[${timestamp}] [${level.toUpperCase()}] ${message}${formatMeta(meta)}`);
};

export const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};
