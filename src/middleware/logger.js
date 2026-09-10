const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

const LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL || 'INFO'];

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
}

function writeAsync(content) {
  fs.appendFile(LOG_FILE, content, (err) => {
    if (err) console.error('Log write failed:', err);
  });
}

const logger = {
  error(message, meta) {
    if (LEVELS.ERROR <= CURRENT_LEVEL) {
      writeAsync(formatMessage('ERROR', message, meta));
    }
  },

  warn(message, meta) {
    if (LEVELS.WARN <= CURRENT_LEVEL) {
      writeAsync(formatMessage('WARN', message, meta));
    }
  },

  info(message, meta) {
    if (LEVELS.INFO <= CURRENT_LEVEL) {
      writeAsync(formatMessage('INFO', message, meta));
    }
  },

  debug(message, meta) {
    if (LEVELS.DEBUG <= CURRENT_LEVEL) {
      writeAsync(formatMessage('DEBUG', message, meta));
    }
  }
};

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
}

module.exports = { logger, requestLogger };
