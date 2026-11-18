import express from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { openStore } from './store.js';
import { digest, token, fail, text, email, hashPassword, checkPassword, encrypt, decrypt } from './security.js';
import { readReport } from './fieldwork.js';

export function createApp({ dbPath = ':memory:', encryptionKey, origin = 'http://localhost:5173',
  dataFile = resolve('data.csv'), minSamples = 3, adminEmail = '', sendMail,
  distDir = resolve('dist'), rateLimits = true } = {}) {
  if (!Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32) throw new Error('A 32-byte encryption key is required.');
  if (typeof sendMail !== 'function') throw new Error('A mail delivery function is required.');
  const store = openStore(dbPath);
  const app = express();
  const http = createServer(app);
  const io = new Server(http, { cors: { origin }, maxHttpBufferSize: 16 * 1024 });
  const now = () => new Date().toISOString();
  const make = data => ({ _id: randomUUID(), createdAt: now(), ...data });
  const allUsers = () => store.all('users');
  const quests = () => store.all('quests');
  const findEmail = address => allUsers().find(user => user.email === address);
  const revoke = id => {
    for (const s of store.all('sessions')) if (s.userId === id) store.remove('sessions', s._id);
    for (const socket of io.sockets.sockets.values()) if (socket.data.userId === id) socket.disconnect(true);
  };
  const publicUser = user => {
    if (!user) return { _id: 'deleted', name: 'Deleted user', averageRating: 0 };
    const ratings = store.all('ratings').filter(r => r.to === user._id);
    return { _id: user._id, name: user.name, profilePictureUrl: user.profilePictureUrl || '',
      averageRating: ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0,
      numberOfRatings: ratings.length,
      requestsMade: quests().filter(q => q.requesterId === user._id).length,
      runsCompleted: quests().filter(q => q.runnerId === user._id && q.status === 'completed').length };
  };
  const privateUser = user => ({ ...publicUser(user), email: user.email, phone: decrypt(user.phone, encryptionKey),
    isAdmin: !!user.isAdmin, isVerified: !!user.isVerified, isSuspended: !!user.isSuspended,
    createdAt: user.createdAt, suspensionReason: user.suspensionReason, suspendedAt: user.suspendedAt,
    hasAppealed: !!user.hasAppealed, appealMessage: user.appealMessage, appealDate: user.appealDate });
  const adminUser = user => { const result = privateUser(user); delete result.phone; return result; };
  const presentQuest = quest => ({ ...quest, requesterId: publicUser(store.get('users', quest.requesterId)),
    runnerId: quest.runnerId ? publicUser(store.get('users', quest.runnerId)) : null });
  function sessionUser(raw) {
    if (typeof raw !== 'string' || !/^[a-f0-9]{64}$/.test(raw)) fail(401, 'Please log in.');
    const session = store.get('sessions', digest(raw));
    if (!session || session.expiresAt <= Date.now()) fail(401, 'Session expired. Please log in.');
    const user = store.get('users', session.userId);
    if (!user || !user.isVerified) fail(401, 'Please log in.');
    if (user.isSuspended) fail(403, 'Account suspended.');
    return user;
  }
  function auth(req, res, next) {
    try { req.user = sessionUser(req.headers.authorization?.replace(/^Bearer /, '')); next(); }
    catch (error) { next(error); }
  }
  function admin(req, res, next) {
    if (!req.user.isAdmin) return next(Object.assign(new Error('Administrator access required.'), { status: 403 }));
    next();
  }
  function questById(id) { const q = store.get('quests', id); if (!q) fail(404, 'Request not found.'); return q; }
  function participant(q, id) { if (q.requesterId !== id && q.runnerId !== id) fail(403, 'Only participants can access this request.'); }
  function clearRoom(id) { io.in(id).socketsLeave(id); }
  function removeQuest(id) {
    clearRoom(id);
    store.remove('quests', id);
    for (const collection of ['messages', 'ratings']) for (const row of store.all(collection)) if (row.questId === id) store.remove(collection, row._id);
  }
  function deleteUser(user) {
    if (quests().some(q => q.status === 'accepted' && [q.requesterId, q.runnerId].includes(user._id))) fail(409, 'Complete or cancel active requests before deleting this account.');
    if (user.isAdmin && allUsers().filter(u => u.isAdmin).length === 1) fail(409, 'Assign another administrator first.');
    store.transaction(() => {
      revoke(user._id);
      for (const q of quests()) if ([q.requesterId, q.runnerId].includes(user._id)) removeQuest(q._id);
      for (const t of store.all('tokens')) if (t.userId === user._id) store.remove('tokens', t._id);
      store.remove('avatars', user._id);
      store.remove('users', user._id);
    });
  }
  async function mailToken(user, kind) {
    const raw = token();
    const record = { _id: digest(raw), userId: user._id, kind, expiresAt: Date.now() + 60 * 60 * 1000 };
    store.put('tokens', record);
    const page = kind === 'verify' ? 'verify-email' : 'reset-password';
    const url = `${origin}/${page}?token=${raw}&email=${encodeURIComponent(user.email)}`;
    try { await sendMail({ to: user.email, subject: kind === 'verify' ? 'Verify your FetchQuest email' : 'Reset your FetchQuest password', text: `Open this link within one hour:\n${url}\nIf you did not request this, ignore it.` }); }
    catch { store.remove('tokens', record._id); fail(503, 'Email delivery failed. Please try again.'); }
  }
  function readToken(raw, kind) {
    if (typeof raw !== 'string') fail(400, 'Invalid or expired link.');
    const record = store.get('tokens', digest(raw));
    if (!record || record.kind !== kind || record.expiresAt <= Date.now()) fail(400, 'Invalid or expired link.');
    const user = store.get('users', record.userId);
    if (!user) fail(400, 'Invalid or expired link.');
    return { record, user };
  }

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.use((req, res, next) => { req.body ??= {}; next(); });
  if (rateLimits) {
    app.use('/api', rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false, message: { msg: 'Too many requests. Try again shortly.' } }));
    app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 40, standardHeaders: 'draft-7', legacyHeaders: false, message: { msg: 'Too many authentication attempts. Try again later.' } }));
  }
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.post('/api/auth/register', async (req, res) => {
    const address = email(req.body.email);
    const name = text(req.body.name, 'Name', 80);
    const passwordHash = await hashPassword(req.body.password);
    let user = findEmail(address);
    if (user?.isVerified) fail(409, 'Email is already registered.');
    if (user) {
      if (!await checkPassword(req.body.password, user.passwordHash)) fail(409, 'Email is already registered. Use password recovery.');
    } else {
      user = store.put('users', make({ email: address, name, passwordHash, isVerified: false,
        isAdmin: address === adminEmail.toLowerCase(), isSuspended: false, phone: '' }));
    }
    await mailToken(user, 'verify');
    res.status(201).json({ msg: 'Registration saved. Open the verification email. In local development, the link is printed in the backend terminal.' });
  });
  app.get('/api/auth/verify-email', (req, res) => {
    const { record, user } = readToken(req.query.token, 'verify');
    user.isVerified = true;
    // Verification is idempotent until expiry, including React StrictMode's repeated request.
    store.transaction(() => { store.put('users', user); store.put('tokens', { ...record, used: true }); });
    res.json({ msg: 'Email verified. You can now log in.' });
  });
  app.post('/api/auth/login', async (req, res) => {
    let user = findEmail(email(req.body.email));
    if (!user || !await checkPassword(req.body.password, user.passwordHash)) fail(401, 'Incorrect email or password.');
    user = store.get('users', user._id);
    if (!user) fail(401, 'Incorrect email or password.');
    if (user.isSuspended) return res.status(403).json({ msg: 'Account suspended.', isSuspended: true, userId: user._id,
      suspensionReason: user.suspensionReason, suspendedAt: user.suspendedAt, hasAppealed: user.hasAppealed });
    if (!user.isVerified) fail(403, 'Verify your email before logging in.');
    const raw = token();
    store.put('sessions', { _id: digest(raw), userId: user._id, expiresAt: Date.now() + 24 * 60 * 60_000 });
    res.json({ token: raw, user: privateUser(user) });
  });
  app.post('/api/auth/logout', auth, (req, res) => {
    store.remove('sessions', digest(req.headers.authorization.slice(7)));
    for (const socket of io.sockets.sockets.values()) if (socket.handshake.auth.token === req.headers.authorization.slice(7)) socket.disconnect(true);
    res.json({ msg: 'Logged out.' });
  });
  app.post('/api/auth/forgot-password', async (req, res) => {
    const user = findEmail(email(req.body.email));
    if (user) await mailToken(user, 'reset');
    res.json({ msg: 'If that account exists, a reset link has been sent. In local development, check the backend terminal.' });
  });
  app.post('/api/auth/reset-password', async (req, res) => {
    const passwordHash = await hashPassword(req.body.password);
    const { user } = readToken(req.body.token, 'reset');
    if (user.email !== email(req.body.email)) fail(400, 'Invalid or expired link.');
    user.passwordHash = passwordHash;
    store.transaction(() => {
      store.put('users', user); revoke(user._id);
      for (const t of store.all('tokens')) if (t.userId === user._id && t.kind === 'reset') store.remove('tokens', t._id);
    });
    res.json({ msg: 'Password updated. Please log in.' });
  });
  app.post('/api/auth/submit-appeal', async (req, res) => {
    const user = findEmail(email(req.body.email));
    if (!user || !await checkPassword(req.body.password, user.passwordHash)) fail(401, 'Incorrect credentials.');
    const current = store.get('users', user._id);
    if (!current?.isSuspended) fail(400, 'Account is not suspended.');
    current.appealMessage = text(req.body.appealMessage, 'Appeal', 2000);
    current.hasAppealed = true; current.appealDate = now();
    store.put('users', current);
    res.json({ msg: 'Appeal submitted.' });
  });

  app.get('/api/users/me', auth, (req, res) => res.json({ user: privateUser(req.user) }));
  app.patch('/api/users/update', auth, (req, res) => {
    req.user.name = text(req.body.name, 'Name', 80);
    store.put('users', req.user); res.json({ user: privateUser(req.user) });
  });
  app.patch('/api/users/update-phone', auth, (req, res) => {
    if (typeof req.body.phone !== 'string' || !/^(?:\d{10})?$/.test(req.body.phone)) fail(400, 'Phone must be empty or contain 10 digits.');
    req.user.phone = encrypt(req.body.phone, encryptionKey);
    store.put('users', req.user); res.json({ msg: 'Phone updated.', user: privateUser(req.user) });
  });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024, files: 1 } });
  app.post('/api/users/upload', auth, upload.single('image'), (req, res) => {
    const b = req.file?.buffer;
    const png = b?.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = b?.[0] === 255 && b?.[1] === 216 && b?.[2] === 255;
    if (!png && !jpeg) fail(400, 'Upload a PNG or JPEG image up to 1 MB.');
    store.put('avatars', { _id: req.user._id, mime: png ? 'image/png' : 'image/jpeg', data: b.toString('base64') });
    req.user.profilePictureUrl = `/api/avatars/${req.user._id}?v=${Date.now()}`;
    store.put('users', req.user); res.json({ user: privateUser(req.user) });
  });
  app.get('/api/avatars/:id', (req, res) => {
    const avatar = store.get('avatars', req.params.id);
    if (!avatar) fail(404, 'Image not found.');
    res.type(avatar.mime).send(Buffer.from(avatar.data, 'base64'));
  });
  app.delete('/api/users/delete', auth, async (req, res) => {
    if (!await checkPassword(req.body.password, req.user.passwordHash)) fail(401, 'Incorrect password.');
    const user = store.get('users', req.user._id);
    if (!user) fail(404, 'User not found.');
    deleteUser(user); res.json({ msg: 'Account deleted.' });
  });

  app.get('/api/requests', (req, res) => res.json({ requests: quests().filter(q => q.status === 'open').reverse().map(presentQuest) }));
  app.get('/api/requests/my-requests', auth, (req, res) => res.json({ requests: quests().filter(q => q.requesterId === req.user._id).reverse().map(presentQuest) }));
  app.get('/api/requests/my-runs', auth, (req, res) => res.json({ requests: quests().filter(q => q.runnerId === req.user._id).reverse().map(presentQuest) }));
  app.post('/api/requests', auth, (req, res) => {
    const itemsList = text(req.body.itemsList, 'Items', 1000);
    const deliveryLocation = text(req.body.deliveryLocation, 'Delivery location', 160);
    for (const field of ['estimatedCost', 'tip']) {
      const value = req.body[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) fail(400, `${field} must be between 0 and 100000 with at most two decimal places.`);
    }
    const q = store.put('quests', make({ itemsList, deliveryLocation, estimatedCost: req.body.estimatedCost,
      tip: req.body.tip, requesterId: req.user._id, runnerId: null, status: 'open' }));
    res.status(201).json({ request: presentQuest(q) });
  });
  app.patch('/api/requests/:id/:action', auth, (req, res) => {
    const q = questById(req.params.id);
    const action = req.params.action;
    if (action === 'accept') {
      if (q.requesterId === req.user._id) fail(400, 'You cannot accept your own request.');
      if (q.status !== 'open') fail(409, 'This request is no longer open.');
      q.runnerId = req.user._id; q.status = 'accepted'; q.acceptedAt = now();
    } else if (action === 'cancel') {
      participant(q, req.user._id);
      if (q.status !== 'accepted') fail(409, 'Only accepted requests can be cancelled.');
      clearRoom(q._id);
      // Do not expose the previous runner's chat to the next runner.
      for (const msg of store.all('messages')) if (msg.questId === q._id) store.remove('messages', msg._id);
      q.runnerId = null; q.status = 'open'; delete q.acceptedAt;
    } else if (action === 'complete') {
      if (q.requesterId !== req.user._id) fail(403, 'Only the requester can mark delivery complete.');
      if (q.status !== 'accepted') fail(409, 'Only accepted requests can be completed.');
      q.status = 'completed'; q.completedAt = now(); clearRoom(q._id);
    } else fail(404, 'Unknown action.');
    store.put('quests', q); res.json({ request: presentQuest(q) });
  });
  app.delete('/api/requests/:id', auth, (req, res) => {
    const q = questById(req.params.id);
    if (q.requesterId !== req.user._id) fail(403, 'Only the requester can delete this request.');
    if (q.status !== 'open') fail(409, 'Only open requests can be deleted.');
    store.transaction(() => removeQuest(q._id)); res.json({ msg: 'Request deleted.' });
  });
  app.get('/api/requests/:id/contact', auth, (req, res) => {
    const q = questById(req.params.id); participant(q, req.user._id);
    if (q.status !== 'accepted') fail(403, 'Contact details are only available during an active delivery.');
    const other = store.get('users', q.requesterId === req.user._id ? q.runnerId : q.requesterId);
    const phone = decrypt(other?.phone, encryptionKey);
    if (!phone) fail(404, 'This user has not added a phone number.');
    res.json({ phone });
  });
  app.post('/api/requests/:id/rate', auth, (req, res) => {
    const q = questById(req.params.id); participant(q, req.user._id);
    if (q.status !== 'completed') fail(409, 'Complete delivery before rating.');
    const rating = req.body.rating;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) fail(400, 'Rating must be an integer from 1 to 5.');
    const id = `${q._id}:${req.user._id}`;
    if (store.get('ratings', id)) fail(409, 'You already rated this delivery.');
    store.put('ratings', { _id: id, questId: q._id, from: req.user._id,
      to: q.requesterId === req.user._id ? q.runnerId : q.requesterId, rating });
    res.json({ msg: 'Rating saved.' });
  });

  app.get('/api/users/admin/all-users', auth, admin, (req, res) => res.json({ users: allUsers().map(adminUser) }));
  app.get('/api/users/admin/analytics', auth, admin, (req, res) => {
    const users = allUsers(); const requests = quests(); const completed = requests.filter(q => q.status === 'completed');
    const recent = row => Date.parse(row.createdAt) > Date.now() - 7 * 86400000;
    const sum = field => completed.reduce((total, q) => total + q[field], 0);
    res.json({ users: { total: users.length, verified: users.filter(u => u.isVerified).length,
      suspended: users.filter(u => u.isSuspended).length, pendingAppeals: users.filter(u => u.isSuspended && u.hasAppealed).length, newLast7Days: users.filter(recent).length },
      requests: { total: requests.length, open: requests.filter(q => q.status === 'open').length,
        accepted: requests.filter(q => q.status === 'accepted').length, completed: completed.length, rated: 0, newLast7Days: requests.filter(recent).length },
      financial: { totalTransactionVolume: sum('estimatedCost') + sum('tip'), totalItemsCost: sum('estimatedCost'), totalTipsEarned: sum('tip'), completedTransactions: completed.length } });
  });
  app.patch('/api/users/admin/user/:id/:action', auth, admin, (req, res) => {
    const user = store.get('users', req.params.id);
    if (!user) fail(404, 'User not found.');
    if (user._id === req.user._id) fail(400, 'You cannot change your own administrator or suspension status.');
    if (req.params.action === 'suspend') {
      user.isSuspended = !user.isSuspended;
      user.suspensionReason = user.isSuspended ? text(req.body.reason, 'Reason', 500) : '';
      user.suspendedAt = user.isSuspended ? now() : null; user.hasAppealed = false;
      user.appealMessage = ''; user.appealDate = null;
      if (user.isSuspended) revoke(user._id);
    } else if (req.params.action === 'toggle-admin') user.isAdmin = !user.isAdmin;
    else fail(404, 'Unknown action.');
    store.put('users', user); res.json({ msg: 'User updated.', user: adminUser(user) });
  });
  app.delete('/api/users/admin/user/:id/delete', auth, admin, (req, res) => {
    const user = store.get('users', req.params.id);
    if (!user) fail(404, 'User not found.');
    if (user._id === req.user._id) fail(400, 'Use your profile to delete your own account.');
    deleteUser(user); res.json({ msg: 'User deleted.', user: null });
  });
  app.get('/api/fieldwork/report', auth, (req, res) => {
    try { res.json(readReport(dataFile, { minSamples })); }
    catch (error) { fail(422, error.code === 'ENOENT' ? 'data.csv is missing. Collect your observations first.' : error.message); }
  });

  io.use((socket, next) => {
    try { socket.data.userId = sessionUser(socket.handshake.auth.token)._id; next(); }
    catch (error) { next(error); }
  });
  io.on('connection', socket => {
    let windowStart = Date.now(); let events = 0;
    const handler = fn => (payload, ack) => {
      try {
        if (Date.now() - windowStart > 60000) { events = 0; windowStart = Date.now(); }
        if (++events > 120) fail(429, 'Too many chat events. Try again shortly.');
        const user = sessionUser(socket.handshake.auth.token);
        if (!payload || typeof payload.questId !== 'string') fail(400, 'A questId is required.');
        const q = questById(payload.questId); participant(q, user._id);
        if (q.status !== 'accepted') fail(409, 'Chat is available only during an active delivery.');
        fn(payload, q, user);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (error) {
        if (typeof ack === 'function') ack({ ok: false, msg: error.message });
        socket.emit('chatError', { msg: error.message });
      }
    };
    socket.on('joinRoom', handler((payload, q, user) => {
      socket.join(q._id);
      socket.emit('questDetails', { quest: presentQuest(q), otherUser: publicUser(store.get('users', q.requesterId === user._id ? q.runnerId : q.requesterId)) });
      socket.emit('messageHistory', store.all('messages').filter(m => m.questId === q._id).slice(-200));
    }));
    socket.on('sendMessage', handler((payload, q, user) => {
      const message = store.put('messages', make({ questId: q._id, senderId: user._id, text: text(payload.text, 'Message', 2000) }));
      io.to(q._id).emit('receiveMessage', message);
    }));
    socket.on('leaveRoom', payload => { if (typeof payload?.questId === 'string') socket.leave(payload.questId); });
  });
  app.use('/api', (req, res) => res.status(404).json({ msg: 'API route not found.' }));
  if (existsSync(join(distDir, 'index.html'))) {
    app.use(express.static(distDir));
    app.get('/{*path}', (req, res) => res.sendFile(join(distDir, 'index.html')));
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof multer.MulterError ? 400 : error.status || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({ msg: status === 500 ? 'Unexpected server error.' : error.message });
  });
  return { app, http, io, store, async close() {
    await new Promise(resolveClose => io.close(resolveClose));
    store.close();
  } };
}
