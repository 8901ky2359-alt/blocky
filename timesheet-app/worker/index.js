// 作業日報 単独サイト用 Cloudflare Worker
// - /api/* : 認証（メール+パスワード、PBKDF2ハッシュ→署名付きトークン）・入力・承認API（D1: ts_users / ts_entries）
// - それ以外 : 静的アセット(out/)を配信
// - ロール: admin（管理者・全体承認/集計） / worker（自分の入力のみ）

const ITERATIONS = 100000;
const TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30日

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
    `CREATE TABLE IF NOT EXISTS ts_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      site TEXT NOT NULL DEFAULT '',
      work_content TEXT NOT NULL DEFAULT '',
      amount INTEGER NOT NULL DEFAULT 0,
      memo TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      admin_memo TEXT NOT NULL DEFAULT '',
      edited_by_admin INTEGER NOT NULL DEFAULT 0,
      approved_by TEXT,
      approved_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS ts_entries_user_idx ON ts_entries(user_id)`,
    `CREATE INDEX IF NOT EXISTS ts_entries_date_idx ON ts_entries(date)`,
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

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
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
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC,
  };
  return signToken(payload, env);
}

async function getAuth(request, env) {
  const h = request.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return verifyToken(m[1], env);
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

function entryRow(e, usersById) {
  return {
    id: e.id,
    userId: e.user_id,
    userName: usersById?.get(e.user_id)?.name ?? '',
    date: e.date,
    site: e.site,
    workContent: e.work_content,
    amount: e.amount,
    memo: e.memo,
    status: e.status,
    adminMemo: e.admin_memo,
    editedByAdmin: !!e.edited_by_admin,
    approvedBy: e.approved_by || null,
    approvedByName: e.approved_by ? usersById?.get(e.approved_by)?.name ?? '' : null,
    approvedAt: e.approved_at || null,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  };
}

async function allUsersMap(env) {
  const { results } = await env.DB.prepare(`SELECT id, name FROM ts_users`).all();
  return new Map((results || []).map((r) => [r.id, r]));
}

function jpDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const w = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()];
  return `${m}月${d}日(${w})`;
}
function yen(n) {
  return '¥' + Math.round(Number(n) || 0).toLocaleString('ja-JP');
}

function buildExportText(entries, { title, groupByUser }) {
  const lines = [];
  lines.push(title);
  lines.push('');

  function block(list) {
    const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let total = 0;
    for (const e of sorted) {
      total += e.amount;
      let line = `${jpDate(e.date)}　${e.site || '現場名なし'}　${e.workContent || ''}　${yen(e.amount)}`;
      lines.push(line);
      if (e.memo) lines.push(`　　メモ: ${e.memo}`);
      if (e.editedByAdmin && e.adminMemo) lines.push(`　　※管理者修正: ${e.adminMemo}`);
    }
    lines.push(`合計: ${yen(total)}（${sorted.length}件）`);
    return total;
  }

  if (groupByUser) {
    const byUser = new Map();
    for (const e of entries) {
      const k = e.userName || e.userId;
      if (!byUser.has(k)) byUser.set(k, []);
      byUser.get(k).push(e);
    }
    let grand = 0;
    for (const [name, list] of byUser) {
      lines.push(`■ ${name}`);
      grand += block(list);
      lines.push('');
    }
    lines.push('====================');
    lines.push(`全体合計: ${yen(grand)}（${entries.length}件）`);
  } else {
    block(entries);
  }

  return lines.join('\n');
}

// ---- ルーティング --------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ping') return json({ ok: true });
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, 500);
      }
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};

async function handleApi(request, env, url) {
  await ensureSchema(env);
  const sub = url.pathname.slice('/api'.length) || '/';
  const method = request.method;

  if (sub === '/setup-status' && method === 'GET') {
    const { results } = await env.DB.prepare(`SELECT COUNT(*) AS c FROM ts_users`).all();
    return json({ needsSetup: (results?.[0]?.c ?? 0) === 0 });
  }

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
    const token = await makeUserToken(user, env);
    return json({ token, user: userRow(user) });
  }

  if (sub === '/login' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const row = await env.DB.prepare(`SELECT * FROM ts_users WHERE email = ?1`).bind(email).first();
    if (!row) return json({ error: 'invalid-credentials' }, 401);
    const ok = await verifyPassword(password, row.password_hash, row.password_salt);
    if (!ok) return json({ error: 'invalid-credentials' }, 401);
    const token = await makeUserToken(row, env);
    return json({ token, user: userRow(row) });
  }

  // ここから先は認証必須
  const auth = await getAuth(request, env);
  if (!auth) return json({ error: 'unauthorized' }, 401);

  if (sub === '/me' && method === 'GET') {
    const row = await env.DB.prepare(`SELECT * FROM ts_users WHERE id = ?1`).bind(auth.uid).first();
    if (!row) return json({ error: 'not-found' }, 404);
    return json({ user: userRow(row) });
  }

  if (sub === '/me' && method === 'PATCH') {
    const body = await request.json().catch(() => ({}));
    const password = String(body.password || '');
    if (password.length < 6) return json({ error: 'weak-password' }, 400);
    const { hash, salt } = await hashPassword(password);
    await env.DB.prepare(`UPDATE ts_users SET password_hash=?1, password_salt=?2 WHERE id=?3`)
      .bind(hash, salt, auth.uid)
      .run();
    return json({ ok: true });
  }

  // ---- 作業員管理（管理者のみ） ----
  if (sub === '/users' && method === 'GET') {
    if (auth.role !== 'admin') return json({ error: 'forbidden' }, 403);
    const { results } = await env.DB.prepare(`SELECT * FROM ts_users ORDER BY created_at ASC`).all();
    return json({ users: (results || []).map(userRow) });
  }

  if (sub === '/users' && method === 'POST') {
    if (auth.role !== 'admin') return json({ error: 'forbidden' }, 403);
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || '').trim();
    const role = body.role === 'admin' ? 'admin' : 'worker';
    if (!isValidEmail(email)) return json({ error: 'invalid-email' }, 400);
    if (password.length < 6) return json({ error: 'weak-password' }, 400);
    if (!name) return json({ error: 'name-required' }, 400);
    const exists = await env.DB.prepare(`SELECT id FROM ts_users WHERE email = ?1`).bind(email).first();
    if (exists) return json({ error: 'email-taken' }, 409);
    const { hash, salt } = await hashPassword(password);
    const id = newId();
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO ts_users (id, email, password_hash, password_salt, name, role, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)`,
    )
      .bind(id, email, hash, salt, name, role, now)
      .run();
    return json({ user: userRow({ id, email, name, role, created_at: now }) });
  }

  const userMatch = sub.match(/^\/users\/([^/]+)$/);
  if (userMatch && (method === 'PATCH' || method === 'DELETE')) {
    if (auth.role !== 'admin') return json({ error: 'forbidden' }, 403);
    const id = userMatch[1];
    if (method === 'DELETE') {
      if (id === auth.uid) return json({ error: 'cannot-delete-self' }, 400);
      await env.DB.prepare(`DELETE FROM ts_users WHERE id = ?1`).bind(id).run();
      return json({ ok: true });
    }
    const body = await request.json().catch(() => ({}));
    if (body.password) {
      if (String(body.password).length < 6) return json({ error: 'weak-password' }, 400);
      const { hash, salt } = await hashPassword(String(body.password));
      await env.DB.prepare(`UPDATE ts_users SET password_hash=?1, password_salt=?2 WHERE id=?3`)
        .bind(hash, salt, id)
        .run();
    }
    if (body.name) {
      await env.DB.prepare(`UPDATE ts_users SET name=?1 WHERE id=?2`).bind(String(body.name).trim(), id).run();
    }
    return json({ ok: true });
  }

  // ---- 作業日報エントリ ----
  if (sub === '/entries' && method === 'GET') {
    const month = url.searchParams.get('month');
    const status = url.searchParams.get('status');
    const userIdParam = url.searchParams.get('userId');
    const clauses = ['deleted = 0'];
    const binds = [];
    if (auth.role !== 'admin') {
      clauses.push(`user_id = ?${binds.length + 1}`);
      binds.push(auth.uid);
    } else if (userIdParam) {
      clauses.push(`user_id = ?${binds.length + 1}`);
      binds.push(userIdParam);
    }
    if (month) {
      clauses.push(`date LIKE ?${binds.length + 1}`);
      binds.push(`${month}%`);
    }
    if (status) {
      clauses.push(`status = ?${binds.length + 1}`);
      binds.push(status);
    }
    const sql = `SELECT * FROM ts_entries WHERE ${clauses.join(' AND ')} ORDER BY date DESC, created_at DESC`;
    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    const usersById = await allUsersMap(env);
    return json({ entries: (results || []).map((r) => entryRow(r, usersById)) });
  }

  if (sub === '/entries' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const date = String(body.date || '').trim();
    const site = String(body.site || '').trim();
    const workContent = String(body.workContent || '').trim();
    const amount = Number(body.amount) || 0;
    const memo = String(body.memo || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'invalid-date' }, 400);
    if (!site) return json({ error: 'site-required' }, 400);
    const id = newId();
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO ts_entries (id, user_id, date, site, work_content, amount, memo, status, admin_memo, edited_by_admin, created_at, updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,'pending','',0,?8,?8)`,
    )
      .bind(id, auth.uid, date, site, workContent, amount, memo, now)
      .run();
    const row = await env.DB.prepare(`SELECT * FROM ts_entries WHERE id = ?1`).bind(id).first();
    return json({ entry: entryRow(row, new Map([[auth.uid, { name: auth.name }]])) });
  }

  const entryMatch = sub.match(/^\/entries\/([^/]+)$/);
  if (entryMatch && (method === 'PUT' || method === 'DELETE')) {
    const id = entryMatch[1];
    const row = await env.DB.prepare(`SELECT * FROM ts_entries WHERE id = ?1 AND deleted = 0`).bind(id).first();
    if (!row) return json({ error: 'not-found' }, 404);
    const isOwner = row.user_id === auth.uid;
    const isAdmin = auth.role === 'admin';
    if (!isAdmin && !(isOwner && row.status === 'pending')) return json({ error: 'forbidden' }, 403);

    if (method === 'DELETE') {
      await env.DB.prepare(`UPDATE ts_entries SET deleted=1, updated_at=?1 WHERE id=?2`).bind(Date.now(), id).run();
      return json({ ok: true });
    }

    const body = await request.json().catch(() => ({}));
    const date = body.date != null ? String(body.date).trim() : row.date;
    const site = body.site != null ? String(body.site).trim() : row.site;
    const workContent = body.workContent != null ? String(body.workContent).trim() : row.work_content;
    const amount = body.amount != null ? Number(body.amount) || 0 : row.amount;
    const memo = body.memo != null ? String(body.memo).trim() : row.memo;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'invalid-date' }, 400);
    if (!site) return json({ error: 'site-required' }, 400);
    const editedByAdmin =
      isAdmin && !isOwner
        ? 1
        : isAdmin && (date !== row.date || site !== row.site || workContent !== row.work_content || amount !== row.amount)
          ? 1
          : row.edited_by_admin;
    await env.DB.prepare(
      `UPDATE ts_entries SET date=?1, site=?2, work_content=?3, amount=?4, memo=?5, edited_by_admin=?6, updated_at=?7 WHERE id=?8`,
    )
      .bind(date, site, workContent, amount, memo, editedByAdmin, Date.now(), id)
      .run();
    const updated = await env.DB.prepare(`SELECT * FROM ts_entries WHERE id = ?1`).bind(id).first();
    const usersById = await allUsersMap(env);
    return json({ entry: entryRow(updated, usersById) });
  }

  const approveMatch = sub.match(/^\/entries\/([^/]+)\/approve$/);
  if (approveMatch && method === 'POST') {
    if (auth.role !== 'admin') return json({ error: 'forbidden' }, 403);
    const id = approveMatch[1];
    const row = await env.DB.prepare(`SELECT * FROM ts_entries WHERE id = ?1 AND deleted = 0`).bind(id).first();
    if (!row) return json({ error: 'not-found' }, 404);
    const body = await request.json().catch(() => ({}));
    const date = body.date != null ? String(body.date).trim() : row.date;
    const site = body.site != null ? String(body.site).trim() : row.site;
    const workContent = body.workContent != null ? String(body.workContent).trim() : row.work_content;
    const amount = body.amount != null ? Number(body.amount) || 0 : row.amount;
    const adminMemo = body.adminMemo != null ? String(body.adminMemo).trim() : row.admin_memo;
    const changed = date !== row.date || site !== row.site || workContent !== row.work_content || amount !== row.amount;
    const editedByAdmin = changed || !!adminMemo ? 1 : row.edited_by_admin;
    const now = Date.now();
    await env.DB.prepare(
      `UPDATE ts_entries SET date=?1, site=?2, work_content=?3, amount=?4, admin_memo=?5, edited_by_admin=?6,
         status='approved', approved_by=?7, approved_at=?8, updated_at=?8 WHERE id=?9`,
    )
      .bind(date, site, workContent, amount, adminMemo, editedByAdmin, auth.uid, now, id)
      .run();
    const updated = await env.DB.prepare(`SELECT * FROM ts_entries WHERE id = ?1`).bind(id).first();
    const usersById = await allUsersMap(env);
    return json({ entry: entryRow(updated, usersById) });
  }

  const reopenMatch = sub.match(/^\/entries\/([^/]+)\/reopen$/);
  if (reopenMatch && method === 'POST') {
    if (auth.role !== 'admin') return json({ error: 'forbidden' }, 403);
    const id = reopenMatch[1];
    await env.DB.prepare(
      `UPDATE ts_entries SET status='pending', approved_by=NULL, approved_at=NULL, updated_at=?1 WHERE id=?2 AND deleted=0`,
    )
      .bind(Date.now(), id)
      .run();
    const updated = await env.DB.prepare(`SELECT * FROM ts_entries WHERE id = ?1`).bind(id).first();
    if (!updated) return json({ error: 'not-found' }, 404);
    const usersById = await allUsersMap(env);
    return json({ entry: entryRow(updated, usersById) });
  }

  // ---- テキスト出力 ----
  if (sub === '/export' && method === 'GET') {
    const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const statusParam = url.searchParams.get('status') || 'approved';
    const userIdParam = url.searchParams.get('userId');
    const clauses = ['deleted = 0', `date LIKE ?1`];
    const binds = [`${month}%`];
    if (statusParam !== 'all') {
      clauses.push(`status = ?${binds.length + 1}`);
      binds.push(statusParam);
    }
    if (auth.role !== 'admin') {
      clauses.push(`user_id = ?${binds.length + 1}`);
      binds.push(auth.uid);
    } else if (userIdParam) {
      clauses.push(`user_id = ?${binds.length + 1}`);
      binds.push(userIdParam);
    }
    const sql = `SELECT * FROM ts_entries WHERE ${clauses.join(' AND ')} ORDER BY date ASC, created_at ASC`;
    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    const usersById = await allUsersMap(env);
    const entries = (results || []).map((r) => entryRow(r, usersById));
    const [y, m] = month.split('-');
    const groupByUser = auth.role === 'admin' && !userIdParam;
    const who = auth.role === 'admin' ? (userIdParam ? `${usersById.get(userIdParam)?.name ?? ''} さん` : '全員') : auth.name;
    const title = `【作業日報】${y}年${Number(m)}月分（${who}）`;
    const body = buildExportText(entries, { title, groupByUser });
    return text(body);
  }

  return json({ error: 'not-found' }, 404);
}
