import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create write stream for access logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Custom morgan token for request body (for POST/PUT requests)
morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    return JSON.stringify(req.body);
  }
  return '';
});

// Custom morgan token for user info
morgan.token('user', (req) => {
  return req.user ? req.user._id : 'anonymous';
});

// Development format
const devFormat = ':method :url :status :response-time ms - :res[content-length] - :user - :body';

// Production format
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :user';

const logger = morgan(process.env.NODE_ENV === 'production' ? prodFormat : devFormat, {
  stream: process.env.NODE_ENV === 'production' ? accessLogStream : process.stdout,
  skip: (req, res) => res.statusCode < 400 // Skip successful requests in production
});

export default logger;
