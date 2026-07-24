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
