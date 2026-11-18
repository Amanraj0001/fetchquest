import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io as connect } from 'socket.io-client';
import { createApp } from '../app.js';
import { openStore } from '../store.js';
import { columns } from '../fieldwork.js';

async function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'fetchquest-test-'));
  const dataFile = join(directory, 'data.csv');
  writeFileSync(dataFile, columns.join(','));
  const mails = [];
  const service = createApp({ dbPath: join(directory, 'test.sqlite'), encryptionKey: randomBytes(32),
    dataFile, adminEmail: 'admin@example.test', sendMail: async message => mails.push(message), rateLimits: false });
  await new Promise(resolve => service.http.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${service.http.address().port}`;
  t.after(async () => { await service.close(); rmSync(directory, { recursive: true, force: true }); });
  async function api(path, { method = 'GET', body, token } = {}) {
    const response = await fetch(`${base}/api${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  }
  async function account(name) {
    const email = `${name}@example.test`; const password = 'test-password-123';
    const registration = await api('/auth/register', { method: 'POST', body: { name, email, password, isAdmin: true } });
    assert.equal(registration.status, 201);
    const url = new URL(mails.at(-1).text.match(/http[^\s]+/)[0]);
    assert.equal((await api(`/auth/verify-email?token=${url.searchParams.get('token')}`)).status, 200);
    assert.equal((await api(`/auth/verify-email?token=${url.searchParams.get('token')}`)).status, 200);
    const login = await api('/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(login.status, 200);
    return { ...login.data, email, password };
  }
  async function quest(owner) {
    const result = await api('/requests', { method: 'POST', token: owner.token,
      body: { itemsList: 'Test notebook', deliveryLocation: 'Test hostel common area', estimatedCost: 35, tip: 0 } });
    assert.equal(result.status, 201);
    return result.data.request;
  }
  return { service, api, account, quest, mails, base, dataFile, directory };
}

test('authentication, verification, privacy, persistence and logout', async t => {
  const f = await fixture(t);
  assert.equal((await f.api('/users/me')).status, 401);
  const user = await f.account('alice');
  assert.equal(user.user.isAdmin, false);
  assert.equal(user.user.passwordHash, undefined);
  assert.equal((await f.api('/users/admin/all-users', { token: user.token })).status, 403);
  const secondConnection = openStore(join(f.directory, 'test.sqlite'));
  assert.equal(secondConnection.get('users', user.user._id).email, user.email);
  secondConnection.close();
  await f.api('/auth/logout', { method: 'POST', token: user.token });
  assert.equal((await f.api('/users/me', { token: user.token })).status, 401);
});

test('request workflow enforces ownership, single acceptance, contact privacy and rating uniqueness', async t => {
  const f = await fixture(t);
  const owner = await f.account('owner'); const runner = await f.account('runner'); const other = await f.account('other');
  const phone = '9876543210';
  await f.api('/users/update-phone', { method: 'PATCH', token: owner.token, body: { phone } });
  assert.ok(!f.service.store.get('users', owner.user._id).phone.includes(phone));
  const q = await f.quest(owner); const path = `/requests/${q._id}`;
  assert.equal((await f.api(`${path}/accept`, { method: 'PATCH', token: owner.token })).status, 400);
  const accepted = await Promise.all([runner, other].map(u => f.api(`${path}/accept`, { method: 'PATCH', token: u.token })));
  assert.deepEqual(accepted.map(r => r.status).sort(), [200, 409]);
  const winner = accepted[0].status === 200 ? runner : other;
  const loser = winner === runner ? other : runner;
  assert.equal((await f.api(`${path}/contact`, { token: loser.token })).status, 403);
  assert.equal((await f.api(`${path}/contact`, { token: winner.token })).data.phone, phone);
  assert.equal((await f.api(`${path}/complete`, { method: 'PATCH', token: winner.token })).status, 403);
  assert.equal((await f.api(`${path}/complete`, { method: 'PATCH', token: owner.token })).status, 200);
  assert.equal((await f.api(`${path}/contact`, { token: winner.token })).status, 403);
  assert.equal((await f.api(`${path}/rate`, { method: 'POST', token: owner.token, body: { rating: 5 } })).status, 200);
  assert.equal((await f.api(`${path}/rate`, { method: 'POST', token: owner.token, body: { rating: 5 } })).status, 409);
  assert.equal((await f.api('/users/me', { token: winner.token })).data.user.averageRating, 5);
});

test('bad inputs, cancellation, deletion and personal request lists', async t => {
  const f = await fixture(t); const owner = await f.account('owner'); const runner = await f.account('runner');
  assert.equal((await f.api('/requests', { method: 'POST', token: owner.token, body: { itemsList: 'x', deliveryLocation: 'y', estimatedCost: -1, tip: 2 } })).status, 400);
  const q = await f.quest(owner); const path = `/requests/${q._id}`;
  await f.api(`${path}/accept`, { method: 'PATCH', token: runner.token });
  assert.equal((await f.api('/requests/my-runs', { token: runner.token })).data.requests.length, 1);
  assert.equal((await f.api('/users/delete', { method: 'DELETE', token: runner.token, body: { password: runner.password } })).status, 409);
  assert.equal((await f.api(`${path}/cancel`, { method: 'PATCH', token: runner.token })).data.request.status, 'open');
  assert.equal((await f.api('/requests/my-runs', { token: runner.token })).data.requests.length, 0);
  assert.equal((await f.api(path, { method: 'DELETE', token: runner.token })).status, 403);
  assert.equal((await f.api(path, { method: 'DELETE', token: owner.token })).status, 200);
});

test('password reset is single use and invalidates previous sessions', async t => {
  const f = await fixture(t); const user = await f.account('alice');
  await f.api('/auth/forgot-password', { method: 'POST', body: { email: user.email } });
  const url = new URL(f.mails.at(-1).text.match(/http[^\s]+/)[0]);
  const body = { email: user.email, token: url.searchParams.get('token'), password: 'changed-password-456' };
  assert.equal((await f.api('/auth/reset-password', { method: 'POST', body })).status, 200);
  assert.equal((await f.api('/auth/reset-password', { method: 'POST', body })).status, 400);
  assert.equal((await f.api('/users/me', { token: user.token })).status, 401);
  assert.equal((await f.api('/auth/login', { method: 'POST', body: { email: user.email, password: body.password } })).status, 200);
});

test('admin suspension revokes sessions, appeal verifies identity, unsuspension restores login', async t => {
  const f = await fixture(t); const admin = await f.account('admin'); const user = await f.account('alice');
  const path = `/users/admin/user/${user.user._id}/suspend`;
  assert.equal((await f.api(path, { method: 'PATCH', token: admin.token, body: { reason: 'Test reason' } })).status, 200);
  assert.equal((await f.api('/users/me', { token: user.token })).status, 401);
  const body = { email: user.email, password: user.password };
  assert.equal((await f.api('/auth/login', { method: 'POST', body })).data.isSuspended, true);
  assert.equal((await f.api('/auth/submit-appeal', { method: 'POST', body: { ...body, appealMessage: 'Test appeal' } })).status, 200);
  assert.equal((await f.api('/users/admin/analytics', { token: admin.token })).data.users.pendingAppeals, 1);
  await f.api(path, { method: 'PATCH', token: admin.token, body: {} });
  assert.equal((await f.api('/auth/login', { method: 'POST', body })).status, 200);
});

const once = (socket, event) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 4000);
  socket.once(event, value => { clearTimeout(timer); resolve(value); });
});
test('chat authenticates sockets, rejects outsiders and ignores forged sender IDs', async t => {
  const f = await fixture(t); const owner = await f.account('owner'); const runner = await f.account('runner'); const stranger = await f.account('stranger');
  const q = await f.quest(owner);
  await f.api(`/requests/${q._id}/accept`, { method: 'PATCH', token: runner.token });
  const sockets = [];
  const socketFor = async token => {
    const socket = connect(f.base, { autoConnect: false, auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(socket); const connected = once(socket, 'connect'); socket.connect(); await connected; return socket;
  };
  t.after(() => sockets.forEach(s => s.disconnect()));
  const a = await socketFor(owner.token); const b = await socketFor(runner.token); const c = await socketFor(stranger.token);
  const emit = (socket, event, payload) => new Promise(resolve => socket.emit(event, payload, resolve));
  assert.equal((await emit(c, 'joinRoom', { questId: q._id })).ok, false);
  await emit(a, 'joinRoom', { questId: q._id }); await emit(b, 'joinRoom', { questId: q._id });
  const received = once(b, 'receiveMessage');
  await emit(a, 'sendMessage', { questId: q._id, senderId: stranger.user._id, text: 'Synthetic test message' });
  assert.equal((await received).senderId, owner.user._id);
  await f.api(`/requests/${q._id}/cancel`, { method: 'PATCH', token: runner.token });
  assert.equal((await emit(b, 'sendMessage', { questId: q._id, text: 'Should fail' })).ok, false);
  assert.equal(f.service.store.all('messages').length, 0);
});

test('fieldwork endpoint reads actual file changes and reports missing or malformed data', async t => {
  const f = await fixture(t); const user = await f.account('alice');
  assert.equal((await f.api('/fieldwork/report')).status, 401);
  assert.equal((await f.api('/fieldwork/report', { token: user.token })).data.validRows, 0);
  writeFileSync(f.dataFile, 'bad,header');
  assert.equal((await f.api('/fieldwork/report', { token: user.token })).status, 422);
});
