import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, 'logs');
const logFile = path.join(logsDir, 'server.log');

// Убедимся, что директория для логов существует
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export function logEvent(type, roomId, message, data = {}) {
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    type,
    roomId: roomId || 'SYSTEM',
    message,
    ...data
  };

  const logString = `[${timestamp}] [${type.toUpperCase()}] [Room: ${roomId || 'N/A'}] ${message} ${Object.keys(data).length ? JSON.stringify(data) : ''}\n`;

  if (type === 'error') {
    console.error(logString);
  } else {
    console.log(logString.trim());
  }

  fs.appendFile(logFile, logString, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
}
