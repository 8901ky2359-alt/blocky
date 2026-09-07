// Cloudflare Worker: 静的サイト配信＋端末間同期API（D1）
// - /api/sync : 端末のデータを受け取りマージし、その合言葉(space)の全データを返す
// - それ以外 : 静的アセット(out/)を配信

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/ping') {
      return json({ ok: true });
    }

    if (url.pathname === '/api/sync' && request.method === 'POST') {
      try {
        return await handleSync(request, env);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, 500);
      }
    }

    if (url.pathname === '/api/notion' && request.method === 'POST') {
      try {
        return await handleNotion(request, env);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, 500);
      }
    }

    // 静的アセット（通常はこのWorkerを経由せず直接配信される）
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}

// 現場記録データベース（Notion）
const NOTION_DB_ID = '6be7ca7702c04481ab1ecce611ed69a1';

function rich(t) {
  return [{ type: 'text', text: { content: String(t).slice(0, 1900) } }];
}

function notionProps(e) {
  const p = {
    '現場名': { title: rich(e.site || '現場') },
    '日付': { date: { start: e.date } },
    '売上': { number: Number(e.amount) || 0 },
  };
  if (e.workType === '常駐' || e.workType === '請負') p['種別'] = { select: { name: e.workType } };
  if (e.address) p['住所'] = { rich_text: rich(e.address) };
  if (e.lat != null && e.lng != null) p['地図'] = { url: `https://www.google.com/maps?q=${e.lat},${e.lng}` };
  if (e.expense) p['経費'] = { number: Number(e.expense) || 0 };
  if (e.memo) p['メモ'] = { rich_text: rich(e.memo) };
  return p;
}

async function handleNotion(request, env) {
  const token = env.NOTION_TOKEN;
  if (!token) return json({ error: 'not-configured' }, 400);
  const body = await request.json().catch(() => ({}));
  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (entries.length === 0) return json({ error: 'no-entries' }, 400);

  let created = 0;
  const errors = [];
  for (const e of entries) {
    if (!e || e.kind !== 'income') continue;
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ parent: { database_id: NOTION_DB_ID }, properties: notionProps(e) }),
    });
    if (res.ok) created++;
    else errors.push(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return json({ created, total: entries.length, errors: errors.slice(0, 3) });
}

async function handleSync(request, env) {
  if (!env.DB) return json({ error: 'DB unavailable' }, 500);
  const body = await request.json().catch(() => ({}));
  const space = String(body.space || '').trim();
  if (space.length < 4) return json({ error: 'invalid space' }, 400);

  const incoming = Array.isArray(body.entries) ? body.entries : [];

  // 受信データを upsert（updatedAt が新しい方を採用＝後勝ち）
  const stmts = [];
  for (const e of incoming) {
    if (!e || !e.id) continue;
    stmts.push(
      env.DB.prepare(
        `INSERT INTO entries (space, id, data, updatedAt, deleted)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(space, id) DO UPDATE SET
           data = excluded.data,
           updatedAt = excluded.updatedAt,
           deleted = excluded.deleted
         WHERE excluded.updatedAt >= entries.updatedAt`,
      ).bind(space, String(e.id), JSON.stringify(e), Number(e.updatedAt) || 0, e.deleted ? 1 : 0),
    );
  }
  // 500件ずつバッチ
  for (let i = 0; i < stmts.length; i += 500) {
    await env.DB.batch(stmts.slice(i, i + 500));
  }

  // 削除印(墓標)も含めて全件返す（他端末の削除を反映するため）
  const { results } = await env.DB.prepare(
    `SELECT data FROM entries WHERE space = ?1`,
  )
    .bind(space)
    .all();
  const entries = (results || []).map((r) => JSON.parse(r.data));
  const active = entries.filter((e) => !e.deleted).length;
  return json({ entries, count: active });
}
