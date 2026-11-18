import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { createApp } from './app.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtime = resolve(process.env.DATA_DIR || join(root, 'runtime'));
mkdirSync(runtime, { recursive: true });
const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 8000);
const origin = process.env.APP_ORIGIN || (production ? '' : 'http://localhost:5173');
if (!origin || !/^https?:\/\/[^/]+$/.test(origin)) throw new Error('APP_ORIGIN must be a full origin without a trailing slash.');
if (production && !origin.startsWith('https://')) throw new Error('Production APP_ORIGIN must use HTTPS.');
let encryptionKey;
if (process.env.PHONE_ENCRYPTION_KEY) {
  if (!/^[a-fA-F0-9]{64}$/.test(process.env.PHONE_ENCRYPTION_KEY)) throw new Error('PHONE_ENCRYPTION_KEY must contain 64 hexadecimal characters.');
  encryptionKey = Buffer.from(process.env.PHONE_ENCRYPTION_KEY, 'hex');
} else {
  if (production) throw new Error('Set PHONE_ENCRYPTION_KEY for production.');
  const keyFile = join(runtime, 'phone.key');
  if (!existsSync(keyFile)) writeFileSync(keyFile, randomBytes(32), { mode: 0o600, flag: 'wx' });
  encryptionKey = readFileSync(keyFile);
}
let sendMail;
if (process.env.SMTP_HOST) {
  if (!process.env.MAIL_FROM) throw new Error('MAIL_FROM is required for SMTP.');
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465',
    requireTLS: process.env.SMTP_PORT !== '465',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
  sendMail = message => transport.sendMail({ from: process.env.MAIL_FROM, ...message });
} else {
  if (production) throw new Error('Configure SMTP before starting in production.');
  sendMail = async message => console.log(`\nLOCAL DEVELOPMENT EMAIL to ${message.to}\n${message.subject}\n${message.text}\n`);
}
const minSamples = Number(process.env.MIN_ROUTE_SAMPLES || 3);
if (!Number.isInteger(minSamples) || minSamples < 1) throw new Error('MIN_ROUTE_SAMPLES must be a positive integer.');
const service = createApp({ dbPath: join(runtime, 'fetchquest.sqlite'), encryptionKey, origin, sendMail,
  adminEmail: process.env.ADMIN_EMAIL || '', dataFile: resolve(process.env.FIELDWORK_CSV || join(root, 'data.csv')),
  minSamples, distDir: join(root, 'dist') });
service.http.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`FetchQuest backend listening on port ${port}. Frontend: ${origin}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await service.close(); process.exit(0); });
