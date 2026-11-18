import { randomBytes, scrypt, timingSafeEqual, createHash, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
export const digest = text => createHash('sha256').update(text).digest('hex');
export const token = () => randomBytes(32).toString('hex');
export function fail(status, msg) { throw Object.assign(new Error(msg), { status }); }
export function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, `${label} must contain 1–${max} characters.`);
  return value.trim();
}
export function email(value) {
  const result = text(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail(400, 'Enter a valid email address.');
  return result;
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128) fail(400, 'Password must contain 10–128 characters.');
  return value;
}
export async function hashPassword(value) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await derive(password(value), salt, 64)).toString('hex')}`;
}
export async function checkPassword(value, stored) {
  if (typeof value !== 'string' || value.length > 128 || !stored) return false;
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(await derive(value, salt, 64), Buffer.from(hash, 'hex'));
}
export function encrypt(value, key) {
  if (!value) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString('base64')).join('.');
}
export function decrypt(value, key) {
  if (!value) return '';
  const [iv, tag, data] = value.split('.').map(s => Buffer.from(s, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', key, iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}
