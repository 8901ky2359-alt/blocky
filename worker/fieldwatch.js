// Field Watch API（ログイン・売上・請求先・承認・入金）
// - 認証: メール+パスワード（PBKDF2ハッシュ）→ 署名付きトークン（HMAC-SHA256）
// - データ: D1 (ts_users / fw_clients / fw_sales / fw_profiles)
// - ロール: admin（総合管理画面・全員分） / worker（管理画面・自分の分のみ）

const ITERATIONS = 100000;
// ログアウトボタンが無いので長めに保持し、開くたびに延長する
const TOKEN_TTL_SEC = 60 * 60 * 24 * 365;
// トークンの世代。名前を選ぶだけで入れた頃（パスワード無し）のトークンを無効にするため、
// Field Watch のログインで発行したものだけを受け付ける
const TOKEN_VERSION = 2;

let schemaReady = false;

async function ensureSchema(env) {
  if (schemaReady) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS ts_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'worker',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS fw_clients (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      cutoff INTEGER NOT NULL DEFAULT 31,
      pay_offset INTEGER NOT NULL DEFAULT 1,
      pay_day INTEGER NOT NULL DEFAULT 31,
      use_count INTEGER NOT NULL DEFAULT 0,
      last_used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS fw_sales (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      site TEXT NOT NULL DEFAULT '',
      work TEXT NOT NULL DEFAULT '',
      amount INTEGER NOT NULL DEFAULT 0,
      memo TEXT NOT NULL DEFAULT '',
      client_name TEXT NOT NULL DEFAULT '',
      cutoff INTEGER NOT NULL DEFAULT 31,
      pay_offset INTEGER NOT NULL DEFAULT 1,
      pay_day INTEGER NOT NULL DEFAULT 31,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_by TEXT,
      approved_at INTEGER,
      paid INTEGER NOT NULL DEFAULT 0,
      paid_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS fw_sales_user_idx ON fw_sales(user_id)`,
    `CREATE TABLE IF NOT EXISTS fw_profiles (
      user_id TEXT PRIMARY KEY,
      data TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL
    )`,
  ];
  for (const sql of stmts) await env.DB.prepare(sql).run();
  schemaReady = true;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}

// ---- 変換ヘルパー -----------------------------------------------------

function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
function b64urlEncodeBytes(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecodeToBytes(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ---- パスワード（PBKDF2） ----------------------------------------------

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return { hash: toHex(new Uint8Array(bits)), salt: toHex(salt) };
}

async function verifyPassword(password, hashHex, saltHex) {
  const salt = fromHex(saltHex);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(new Uint8Array(bits)) === hashHex;
}

// ---- トークン（HMAC署名） ----------------------------------------------

function getSecret(env) {
  // 本番では `wrangler secret put TIMESHEET_SESSION_SECRET` で設定推奨。
  // 未設定でも動作するようフォールバックを用意（README参照）。
  return env.TIMESHEET_SESSION_SECRET || 'blocky-timesheet-fallback-secret-please-set-a-real-one';
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

async function signToken(payload, env) {
  const body = b64urlEncodeBytes(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(getSecret(env));
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return `${body}.${b64urlEncodeBytes(new Uint8Array(sig))}`;
}

async function verifyToken(token, env) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  try {
    const key = await hmacKey(getSecret(env));
    const ok = await crypto.subtle.verify('HMAC', key, b64urlDecodeToBytes(sig), new TextEncoder().encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecodeToBytes(body)));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function makeUserToken(user, env) {
  const payload = {
    uid: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    v: TOKEN_VERSION,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC,
  };
  return signToken(payload, env);
}

async function getAuth(request, env) {
  const h = request.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const payload = await verifyToken(m[1], env);
  return payload && payload.v === TOKEN_VERSION ? payload : null;
}

async function sameText(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// ---- 汎用ヘルパー -------------------------------------------------------

function newId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)).replace(/-/g, '');
}

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function userRow(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.created_at };
}

const CUTOFFS = [5, 10, 15, 20, 25, 31]; // 31 = 月末
const PAY_DAYS = [5, 10, 15, 20, 25, 31];

function saleRow(s, usersById) {
  return {
    id: s.id,
    userId: s.user_id,
    userName: usersById?.get(s.user_id)?.name ?? '',
    date: s.date,
    site: s.site,
    work: s.work,
    amount: s.amount,
    memo: s.memo,
    clientName: s.client_name,
    cutoff: s.cutoff,
    payOffset: s.pay_offset,
    payDay: s.pay_day,
    status: s.status,
    approvedAt: s.approved_at || null,
    paid: !!s.paid,
    paidAt: s.paid_at || null,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

function clientRow(c) {
  return { id: c.id, name: c.name, cutoff: c.cutoff, payOffset: c.pay_offset, payDay: c.pay_day };
}

async function allUsersMap(env) {
  const { results } = await env.DB.prepare(`SELECT id, name FROM ts_users`).all();
  return new Map((results || []).map((r) => [r.id, r]));
}

// 売上の入力内容を検証して正規化する（不正なら error を返す）
function readSaleInput(body) {
  const date = String(body.date || '').trim();
  const site = String(body.site || '').trim();
  const work = String(body.work || '').trim();
  const amount = Math.round(Number(body.amount) || 0);
  const memo = String(body.memo || '').trim();
  const clientName = String(body.clientName || '').trim();
  const cutoff = Number(body.cutoff);
  const payOffset = Number(body.payOffset);
  const payDay = Number(body.payDay);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'invalid-date' };
  if (!site) return { error: 'site-required' };
  if (amount <= 0) return { error: 'amount-required' };
  if (!clientName) return { error: 'client-required' };
  if (!CUTOFFS.includes(cutoff) || !PAY_DAYS.includes(payDay) || ![0, 1, 2].includes(payOffset)) {
    return { error: 'invalid-terms' };
  }
  return { value: { date, site, work, amount, memo, clientName, cutoff, payOffset, payDay } };
}

// 請求先を保存（同じ名前なら締め日・入金日を更新し、使用回数を増やす）
async function upsertClient(env, userId, v) {
  const now = Date.now();
  const existing = await env.DB.prepare(`SELECT id FROM fw_clients WHERE user_id = ?1 AND name = ?2`)
    .bind(userId, v.clientName)
    .first();
  if (existing) {
    await env.DB.prepare(
      `UPDATE fw_clients SET cutoff=?1, pay_offset=?2, pay_day=?3, use_count=use_count+1, last_used=?4 WHERE id=?5`,
    )
      .bind(v.cutoff, v.payOffset, v.payDay, now, existing.id)
      .run();
    return;
  }
  await env.DB.prepare(
    `INSERT INTO fw_clients (id, user_id, name, cutoff, pay_offset, pay_day, use_count, last_used, created_at)
     VALUES (?1,?2,?3,?4,?5,?6,1,?7,?7)`,
  )
    .bind(newId(), userId, v.clientName, v.cutoff, v.payOffset, v.payDay, now)
    .run();
}

function idList(body) {
  return Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean).slice(0, 500) : [];
}

// ---- 以前の「売上管理」（端末同期の entries テーブル）からの取り込み ----

// 旧アプリの締日グループ（すべて月末締め）→ 入金日
const LEGACY_GROUP_PAY_DAY = { A: 5, B: 25, C: 31 };
const LEGACY_NO_CLIENT = '請求先未設定';

function legacyLastDay(y, m) {
  return new Date(y, m, 0).getDate();
}

// 月末締めの売上の入金日（YYYY-MM-DD）
function legacyPaymentDate(date, payDay) {
  const [y, m] = date.split('-').map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const d = Math.min(payDay, legacyLastDay(ny, nm));
  return `${ny}-${String(nm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// 取り込める売上（収入）を読み出して、新しい形に直す
async function readLegacySales(env) {
  let rows;
  try {
    // 合言葉ごとの本体データだけ（"::hire" などの派生データは対象外）
    rows = (await env.DB.prepare(`SELECT id, data, updatedAt, deleted FROM entries WHERE space NOT LIKE '%::%'`).all()).results || [];
  } catch {
    return { sales: [], skippedExpense: 0 }; // 旧テーブルが無い
  }
  const latest = new Map();
  for (const r of rows) {
    const cur = latest.get(r.id);
    if (!cur || r.updatedAt > cur.updatedAt) latest.set(r.id, r);
  }
  const today = new Date().toISOString().slice(0, 10);
  const sales = [];
  let skippedExpense = 0;
  for (const r of latest.values()) {
    if (r.deleted) continue;
    let e;
    try {
      e = JSON.parse(r.data);
    } catch {
      continue;
    }
    if (!e || e.deleted || !/^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ''))) continue;
    const amount = Math.round(Number(e.amount) || 0);
    if (e.kind === 'expense' || amount <= 0) {
      skippedExpense++;
      continue;
    }
    const payDay = LEGACY_GROUP_PAY_DAY[e.billGroup] ?? 31;
    const payDate = legacyPaymentDate(e.date, payDay);
    const memo = [e.workType, e.hiredName ? `雇用: ${e.hiredName}` : '', e.memo].filter(Boolean).join(' ／ ');
    sales.push({
      id: `legacy-${r.id}`,
      date: e.date,
      site: String(e.site || '').trim() || '現場名なし',
      work: String(e.category || '').trim(),
      amount,
      memo,
      clientName: String(e.billTo || '').trim() || LEGACY_NO_CLIENT,
      cutoff: 31,
      payOffset: 1,
      payDay,
      // 入金日を過ぎているものは入金済みとして取り込む
      paid: payDate < today,
      createdAt: Number(e.createdAt) || Date.now(),
    });
  }
  return { sales, skippedExpense };
}

// ---- ルーティング --------------------------------------------------------

export async function handleFieldWatch(request, env, url) {
  await ensureSchema(env);
  const sub = url.pathname.slice('/api/fw'.length) || '/';
  const method = request.method;

  if (sub === '/setup-status' && method === 'GET') {
    const { results } = await env.DB.prepare(`SELECT COUNT(*) AS c FROM ts_users`).all();
    return json({ needsSetup: (results?.[0]?.c ?? 0) === 0 });
  }

  // 最初の1回だけ：管理者（総合管理画面）のアカウントを作る
  if (sub === '/setup' && method === 'POST') {
    const { results } = await env.DB.prepare(`SELECT COUNT(*) AS c FROM ts_users`).all();
    if ((results?.[0]?.c ?? 0) > 0) return json({ error: 'already-setup' }, 400);
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || '').trim();
    if (!isValidEmail(email)) return json({ error: 'invalid-email' }, 400);
    if (password.length < 6) return json({ error: 'weak-password' }, 400);
    if (!name) return json({ error: 'name-required' }, 400);
    const { hash, salt } = await hashPassword(password);
    const id = newId();
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO ts_users (id, email, password_hash, password_salt, name, role, created_at) VALUES (?1,?2,?3,?4,?5,'admin',?6)`,
    )
      .bind(id, email, hash, salt, name, now)
      .run();
    const user = { id, email, name, role: 'admin', created_at: now };
    return json({ token: await makeUserToken(user, env), user: userRow(user) });
  }

  if (sub === '/login' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const row = await env.DB.prepare(`SELECT * FROM ts_users WHERE email = ?1`).bind(email).first();
    if (!row) return json({ error: 'invalid-credentials' }, 401);
    const ok = await verifyPassword(password, row.password_hash, row.password_salt);
    if (!ok) return json({ error: 'invalid-credentials' }, 401);
    return json({ token: await makeUserToken(row, env), user: userRow(row) });
  }

  // 管理者がログインできなくなったときの復旧。Cloudflare の Secret（FW_RECOVERY_KEY）を
  // 知っている人だけが、総合管理画面のアカウントのメールアドレスとパスワードを付け直せる
  if (sub === '/recover' && method === 'POST') {
    const recoveryKey = env.FW_RECOVERY_KEY;
    if (!recoveryKey) return json({ error: 'not-configured' }, 400);
    const body = await request.json().catch(() => ({}));
    if (!(await sameText(String(body.key || ''), recoveryKey))) return json({ error: 'invalid-key' }, 401);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!isValidEmail(email)) return json({ error: 'invalid-email' }, 400);
    if (password.length < 6) return json({ error: 'weak-password' }, 400);
    const admin = await env.DB.prepare(`SELECT * FROM ts_users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`).first();
    if (!admin) return json({ error: 'not-found' }, 404);
    const taken = await env.DB.prepare(`SELECT id FROM ts_users WHERE email = ?1 AND id != ?2`).bind(email, admin.id).first();
    if (taken) return json({ error: 'email-taken' }, 409);
    const { hash, salt } = await hashPassword(password);
    await env.DB.prepare(`UPDATE ts_users SET email=?1, password_hash=?2, password_salt=?3 WHERE id=?4`)
      .bind(email, hash, salt, admin.id)
      .run();
    const user = { ...admin, email };
    return json({ token: await makeUserToken(user, env), user: userRow(user) });
  }

  // ここから先は認証必須
  const auth = await getAuth(request, env);
  if (!auth) return json({ error: 'unauthorized' }, 401);
  const isAdmin = auth.role === 'admin';

  // 開くたびにトークンを延長して返す（ログアウトしない運用）
  if (sub === '/me' && method === 'GET') {
    const row = await env.DB.prepare(`SELECT * FROM ts_users WHERE id = ?1`).bind(auth.uid).first();
    if (!row) return json({ error: 'not-found' }, 404);
    return json({ user: userRow(row), token: await makeUserToken(row, env) });
  }

  // ---- 仲間（アカウント）の管理：管理者のみ ----
  if (sub === '/users' && method === 'GET') {
    if (!isAdmin) return json({ error: 'forbidden' }, 403);
    const { results } = await env.DB.prepare(`SELECT * FROM ts_users ORDER BY created_at ASC`).all();
    return json({ users: (results || []).map(userRow) });
  }

  if (sub === '/users' && method === 'POST') {
    if (!isAdmin) return json({ error: 'forbidden' }, 403);
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || '').trim();
    if (!name) return json({ error: 'name-required' }, 400);
    if (!isValidEmail(email)) return json({ error: 'invalid-email' }, 400);
    if (password.length < 6) return json({ error: 'weak-password' }, 400);
    const exists = await env.DB.prepare(`SELECT id FROM ts_users WHERE email = ?1`).bind(email).first();
    if (exists) return json({ error: 'email-taken' }, 409);
    const { hash, salt } = await hashPassword(password);
    const id = newId();
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO ts_users (id, email, password_hash, password_salt, name, role, created_at) VALUES (?1,?2,?3,?4,?5,'worker',?6)`,
    )
      .bind(id, email, hash, salt, name, now)
      .run();
    return json({ user: userRow({ id, email, name, role: 'worker', created_at: now }) });
  }

  const userMatch = sub.match(/^\/users\/([^/]+)$/);
  if (userMatch && (method === 'PATCH' || method === 'DELETE')) {
    if (!isAdmin) return json({ error: 'forbidden' }, 403);
    const id = userMatch[1];
    if (method === 'DELETE') {
      if (id === auth.uid) return json({ error: 'cannot-delete-self' }, 400);
      await env.DB.prepare(`DELETE FROM ts_users WHERE id = ?1`).bind(id).run();
      return json({ ok: true });
    }
    const body = await request.json().catch(() => ({}));
    if (body.email !== undefined) {
      const email = String(body.email || '').trim().toLowerCase();
      if (!isValidEmail(email)) return json({ error: 'invalid-email' }, 400);
      const taken = await env.DB.prepare(`SELECT id FROM ts_users WHERE email = ?1 AND id != ?2`).bind(email, id).first();
      if (taken) return json({ error: 'email-taken' }, 409);
      await env.DB.prepare(`UPDATE ts_users SET email=?1 WHERE id=?2`).bind(email, id).run();
    }
    if (body.password !== undefined) {
      if (String(body.password).length < 6) return json({ error: 'weak-password' }, 400);
      const { hash, salt } = await hashPassword(String(body.password));
      await env.DB.prepare(`UPDATE ts_users SET password_hash=?1, password_salt=?2 WHERE id=?3`).bind(hash, salt, id).run();
    }
    if (body.name) {
      await env.DB.prepare(`UPDATE ts_users SET name=?1 WHERE id=?2`).bind(String(body.name).trim(), id).run();
    }
    return json({ ok: true });
  }

  // ---- 以前の売上管理のデータ取り込み（管理者のみ・何度押しても二重にならない） ----
  if (sub === '/legacy' && (method === 'GET' || method === 'POST')) {
    if (!isAdmin) return json({ error: 'forbidden' }, 403);
    const { sales, skippedExpense } = await readLegacySales(env);
    const { results } = await env.DB.prepare(`SELECT id FROM fw_sales WHERE id LIKE 'legacy-%'`).all();
    const done = new Set((results || []).map((r) => r.id));
    const todo = sales.filter((x) => !done.has(x.id));
    const summary = {
      importable: todo.length,
      importableTotal: todo.reduce((n, x) => n + x.amount, 0),
      unpaid: todo.filter((x) => !x.paid).length,
      alreadyImported: sales.length - todo.length,
      skippedExpense,
    };
    if (method === 'GET') return json(summary);
    const now = Date.now();
    for (const x of todo) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO fw_sales (id, user_id, date, site, work, amount, memo, client_name, cutoff, pay_offset, pay_day,
           status, approved_by, approved_at, paid, paid_at, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,'approved',?2,?12,?13,?14,?15,?12)`,
      )
        .bind(x.id, auth.uid, x.date, x.site, x.work, x.amount, x.memo, x.clientName, x.cutoff, x.payOffset, x.payDay,
          now, x.paid ? 1 : 0, x.paid ? now : null, x.createdAt)
        .run();
    }
    // 請求先も登録しておく（次から売上入力のボタンに出る）
    const clients = new Map();
    for (const x of todo) if (x.clientName !== LEGACY_NO_CLIENT) clients.set(x.clientName, x);
    for (const x of clients.values()) {
      const exists = await env.DB.prepare(`SELECT id FROM fw_clients WHERE user_id = ?1 AND name = ?2`).bind(auth.uid, x.clientName).first();
      if (!exists) {
        await env.DB.prepare(
          `INSERT INTO fw_clients (id, user_id, name, cutoff, pay_offset, pay_day, use_count, last_used, created_at)
           VALUES (?1,?2,?3,?4,?5,?6,1,?7,?7)`,
        )
          .bind(newId(), auth.uid, x.clientName, x.cutoff, x.payOffset, x.payDay, now)
          .run();
      }
    }
    return json({ ...summary, imported: todo.length });
  }

  // ---- 請求先（自分が入れたもの） ----
  if (sub === '/clients' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM fw_clients WHERE user_id = ?1 ORDER BY use_count DESC, last_used DESC`,
    )
      .bind(auth.uid)
      .all();
    return json({ clients: (results || []).map(clientRow) });
  }

  const clientMatch = sub.match(/^\/clients\/([^/]+)$/);
  if (clientMatch && method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM fw_clients WHERE id = ?1 AND user_id = ?2`).bind(clientMatch[1], auth.uid).run();
    return json({ ok: true });
  }

  // ---- 売上 ----
  if (sub === '/sales' && method === 'GET') {
    const sql = isAdmin
      ? `SELECT * FROM fw_sales WHERE deleted = 0 ORDER BY date DESC, created_at DESC`
      : `SELECT * FROM fw_sales WHERE deleted = 0 AND user_id = ?1 ORDER BY date DESC, created_at DESC`;
    const stmt = isAdmin ? env.DB.prepare(sql) : env.DB.prepare(sql).bind(auth.uid);
    const { results } = await stmt.all();
    const usersById = await allUsersMap(env);
    return json({ sales: (results || []).map((r) => saleRow(r, usersById)) });
  }

  if (sub === '/sales' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { value: v, error } = readSaleInput(body);
    if (error) return json({ error }, 400);
    const id = newId();
    const now = Date.now();
    // 管理者が自分で入れた売上は承認済み、仲間の入力は承認待ち
    const status = isAdmin ? 'approved' : 'pending';
    await env.DB.prepare(
      `INSERT INTO fw_sales (id, user_id, date, site, work, amount, memo, client_name, cutoff, pay_offset, pay_day,
         status, approved_by, approved_at, paid, created_at, updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,0,?15,?15)`,
    )
      .bind(id, auth.uid, v.date, v.site, v.work, v.amount, v.memo, v.clientName, v.cutoff, v.payOffset, v.payDay,
        status, isAdmin ? auth.uid : null, isAdmin ? now : null, now)
      .run();
    await upsertClient(env, auth.uid, v);
    const row = await env.DB.prepare(`SELECT * FROM fw_sales WHERE id = ?1`).bind(id).first();
    return json({ sale: saleRow(row, new Map([[auth.uid, { name: auth.name }]])) });
  }

  if (sub === '/sales/approve' && method === 'POST') {
    if (!isAdmin) return json({ error: 'forbidden' }, 403);
    const body = await request.json().catch(() => ({}));
    const ids = idList(body);
    const approve = body.approved !== false;
    const now = Date.now();
    for (const id of ids) {
      await env.DB.prepare(
        `UPDATE fw_sales SET status=?1, approved_by=?2, approved_at=?3, updated_at=?4 WHERE id=?5 AND deleted=0`,
      )
        .bind(approve ? 'approved' : 'pending', approve ? auth.uid : null, approve ? now : null, now, id)
        .run();
    }
    return json({ ok: true });
  }

  if (sub === '/sales/paid' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const ids = idList(body);
    const paid = body.paid !== false;
    const now = Date.now();
    for (const id of ids) {
      const sql = isAdmin
        ? `UPDATE fw_sales SET paid=?1, paid_at=?2, updated_at=?3 WHERE id=?4 AND deleted=0`
        : `UPDATE fw_sales SET paid=?1, paid_at=?2, updated_at=?3 WHERE id=?4 AND deleted=0 AND user_id=?5`;
      const stmt = env.DB.prepare(sql);
      await (isAdmin
        ? stmt.bind(paid ? 1 : 0, paid ? now : null, now, id)
        : stmt.bind(paid ? 1 : 0, paid ? now : null, now, id, auth.uid)
      ).run();
    }
    return json({ ok: true });
  }

  const saleMatch = sub.match(/^\/sales\/([^/]+)$/);
  if (saleMatch && (method === 'PUT' || method === 'DELETE')) {
    const id = saleMatch[1];
    const row = await env.DB.prepare(`SELECT * FROM fw_sales WHERE id = ?1 AND deleted = 0`).bind(id).first();
    if (!row) return json({ error: 'not-found' }, 404);
    // 仲間は自分の承認待ちの記録だけ直せる。管理者は全部直せる
    if (!isAdmin && !(row.user_id === auth.uid && row.status === 'pending')) return json({ error: 'forbidden' }, 403);
    const now = Date.now();
    if (method === 'DELETE') {
      await env.DB.prepare(`UPDATE fw_sales SET deleted=1, updated_at=?1 WHERE id=?2`).bind(now, id).run();
      return json({ ok: true });
    }
    const body = await request.json().catch(() => ({}));
    const { value: v, error } = readSaleInput(body);
    if (error) return json({ error }, 400);
    await env.DB.prepare(
      `UPDATE fw_sales SET date=?1, site=?2, work=?3, amount=?4, memo=?5, client_name=?6, cutoff=?7, pay_offset=?8,
         pay_day=?9, updated_at=?10 WHERE id=?11`,
    )
      .bind(v.date, v.site, v.work, v.amount, v.memo, v.clientName, v.cutoff, v.payOffset, v.payDay, now, id)
      .run();
    await upsertClient(env, row.user_id, v);
    const updated = await env.DB.prepare(`SELECT * FROM fw_sales WHERE id = ?1`).bind(id).first();
    return json({ sale: saleRow(updated, await allUsersMap(env)) });
  }

  // ---- 請求書の発行者情報（自分の分） ----
  if (sub === '/profile' && method === 'GET') {
    const row = await env.DB.prepare(`SELECT data FROM fw_profiles WHERE user_id = ?1`).bind(auth.uid).first();
    let data = {};
    try {
      data = row ? JSON.parse(row.data) : {};
    } catch {
      data = {};
    }
    return json({ profile: data });
  }

  if (sub === '/profile' && method === 'PUT') {
    const body = await request.json().catch(() => ({}));
    const keys = ['issuerName', 'tradeName', 'address', 'phone', 'bank', 'invoiceNo'];
    const data = {};
    for (const k of keys) data[k] = String(body[k] ?? '').slice(0, 500);
    await env.DB.prepare(
      `INSERT INTO fw_profiles (user_id, data, updated_at) VALUES (?1,?2,?3)
       ON CONFLICT(user_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
    )
      .bind(auth.uid, JSON.stringify(data), Date.now())
      .run();
    return json({ profile: data });
  }

  return json({ error: 'not-found' }, 404);
}
