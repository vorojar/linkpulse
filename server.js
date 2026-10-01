// LinkPulse — 推广短链与点击统计
const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
const QRCode = require('qrcode');

const PORT = parseInt(process.env.PORT || '8080', 10);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const CRON_SECRET = process.env.CRON_SECRET || '';
const SALT = process.env.IP_SALT || 'linkpulse';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 8000, // keep under the platform's scale-to-zero suspend window
});

const app = express();
app.use(express.json({ limit: '64kb' }));
app.set('trust proxy', true);

app.get('/api/health', (_req, res) => res.json({
  ok: true, ts: Date.now(),
  cache: { hits: cacheHits, misses: cacheMisses, size: slugCache.size },
}));

// ---------- 热链内存缓存（stale-while-revalidate） ----------
// 跳转是最高频路径：命中缓存时 0 次 DB 查询。单实例部署，写操作直接清对应 key。
const slugCache = new Map(); // slug -> { id, target, target_b, ab_split, ts }
const CACHE_TTL_MS = 60_000;      // 新鲜期：直接 serving
const CACHE_SWR_MS = 5 * 60_000;  // 过期宽限：先返回旧值，后台异步刷新
let cacheHits = 0, cacheMisses = 0;

async function refreshSlug(slug) {
  const { rows } = await pool.query('SELECT id, target, target_b, ab_split FROM links WHERE slug = $1', [slug]);
  if (!rows.length) { slugCache.delete(slug); return null; }
  const e = { id: rows[0].id, target: rows[0].target, target_b: rows[0].target_b || '', ab_split: rows[0].ab_split ?? 50, ts: Date.now() };
  if (slugCache.size > 2000) slugCache.clear(); // 简单上限，防极端膨胀
  slugCache.set(slug, e);
  return e;
}

async function resolveSlug(slug) {
  const now = Date.now();
  const hit = slugCache.get(slug);
  if (hit && now - hit.ts < CACHE_TTL_MS) { cacheHits++; return hit; }
  if (hit && now - hit.ts < CACHE_SWR_MS) {
    cacheHits++;
    refreshSlug(slug).catch(e => console.error('cache refresh failed:', e.message));
    return hit;
  }
  cacheMisses++;
  return refreshSlug(slug);
}

// ---------- auth ----------
function adminAuth(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'admin_not_configured' });
  const m = /^Basic (.+)$/.exec(req.headers.authorization || '');
  let ok = false;
  if (m) {
    const pair = Buffer.from(m[1], 'base64').toString('utf8');
    const i = pair.indexOf(':');
    const u = pair.slice(0, i), p = pair.slice(i + 1);
    const a = Buffer.from(`admin:${ADMIN_PASSWORD}`), b = Buffer.from(`${u}:${p}`);
    ok = a.length === b.length && crypto.timingSafeEqual(a, b) && u === 'admin';
  }
  if (!ok) {
    // 注意：故意不返回 WWW-Authenticate 头——那个头会触发浏览器原生登录弹窗，
    // 与页面自带的登录框冲突（尤其移动端内嵌浏览器会反复弹）。只走 JSON 错误。
    return res.status(401).json({ error: '密码不正确，请重试' });
  }
  next();
}

function cronAuth(req, res, next) {
  if (!CRON_SECRET) return res.status(503).json({ error: 'cron_not_configured' });
  const got = req.headers['x-cron-key'] || '';
  const a = Buffer.from(CRON_SECRET), b = Buffer.from(String(got));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    return res.status(403).json({ error: 'forbidden' });
  next();
}

// ---------- helpers ----------
const SLUG_RE = /^[a-zA-Z0-9_-]{3,32}$/;
function randomSlug(n = 6) {
  const alpha = 'abcdefghjkmnpqrstuvwxyz23456789';
  const buf = crypto.randomBytes(n);
  return Array.from(buf, b => alpha[b % alpha.length]).join('');
}
function cleanUrl(s) {
  try {
    const u = new URL(String(s).trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch { return null; }
}
function deviceOf(ua) {
  ua = ua.toLowerCase();
  if (/bot|crawl|spider|slurp|mediapartners|headless|python-requests|curl\//.test(ua)) return 'bot';
  if (/mobile|android|iphone|ipad|phone/.test(ua)) return 'mobile';
  return 'desktop';
}
function hostOf(ref) {
  try { return new URL(ref).hostname.replace(/^www\./, ''); }
  catch { return ref ? '(直接访问)' : '(直接访问)'; }
}
// Detect host app / browser / OS from UA (heuristic, good enough for campaign analytics).
// Covers the in-app browsers people actually share links in: WeChat, Weibo, QQ,
// DingTalk, LINE, Instagram, Facebook, X, TikTok, Snapchat, Pinterest, Reddit, LinkedIn.
function parseUA(raw) {
  const l = (raw || '').toLowerCase();
  let app = '';
  if (l.includes('micromessenger')) app = '微信';
  else if (l.includes('weibo')) app = '微博';
  else if (/\bqq\//.test(l)) app = 'QQ';
  else if (l.includes('dingtalk')) app = '钉钉';
  else if (l.includes(' line/')) app = 'LINE';
  else if (l.includes('instagram')) app = 'Instagram';
  else if (l.includes('fban/') || l.includes('fbav/')) app = 'Facebook';
  else if (l.includes('twitter')) app = 'X';
  else if (l.includes('tiktok') || l.includes('musical_ly') || l.includes('bytedance')) app = 'TikTok';
  else if (l.includes('snapchat')) app = 'Snapchat';
  else if (l.includes('pinterest')) app = 'Pinterest';
  else if (l.includes('reddit')) app = 'Reddit';
  else if (l.includes('linkedin')) app = 'LinkedIn';
  let os = '';
  if (/iphone|ipad|ipod/.test(l)) os = 'iOS';
  else if (/android/.test(l)) os = 'Android';
  else if (/windows nt/.test(l)) os = 'Windows';
  else if (/mac os x/.test(l)) os = 'macOS';
  else if (/linux/.test(l)) os = 'Linux';
  let browser = '';
  if (l.includes('micromessenger')) browser = '微信内置';
  else if (app) browser = app + ' in-app';
  else if (/edg\//.test(l)) browser = 'Edge';
  else if (/chrome\//.test(l)) browser = 'Chrome';
  else if (/safari\//.test(l)) browser = 'Safari';
  else if (/firefox\//.test(l)) browser = 'Firefox';
  return { app, browser, os };
}
function logClick(linkId, req, variant = '') {
  // fire-and-forget：不阻塞 302 跳转
  (async () => {
    try {
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '';
      const ipHash = crypto.createHash('sha256').update(SALT + '|' + ip).digest('hex').slice(0, 16);
      const ua = String(req.headers['user-agent'] || '').slice(0, 300);
      const referer = String(req.headers['referer'] || req.headers['referrer'] || '').slice(0, 500);
      const { app, browser, os } = parseUA(ua);
      const lang = String(req.headers['accept-language'] || '').split(',')[0].split(';')[0].trim().slice(0, 12);
      const utm = String(req.query.utm_source || '').slice(0, 64);
      // 查+插一条语句原子完成：比先 SELECT 再 INSERT 少一次往返，并发下也更准
      await pool.query(
        `INSERT INTO clicks (link_id, ip_hash, device, ua, referer, app_source, browser, os, lang, is_repeat, utm_source, variant)
         SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,
                EXISTS(SELECT 1 FROM clicks WHERE link_id = $1 AND ip_hash = $2 AND ts > NOW() - INTERVAL '30 minutes'),
                $10, $11`,
        [linkId, ipHash, deviceOf(ua), ua, referer, app, browser, os, lang, utm, variant]);
    } catch (e) { console.error('click log failed:', e.message); }
  })();
}
// A/B 分流：按 ab_split 权重随机选版本
function pickVariant(entry) {
  if (!entry.target_b) return { variant: '', dest: entry.target };
  const split = Math.max(0, Math.min(100, entry.ab_split ?? 50));
  return Math.random() * 100 < split
    ? { variant: 'A', dest: entry.target }
    : { variant: 'B', dest: entry.target_b };
}

// ---------- redirect (public) ----------
app.get('/favicon.ico', (_req, res) => res.status(204).end());
app.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;
  if (!SLUG_RE.test(slug)) return next();
  try {
    const entry = await resolveSlug(slug);
    if (!entry) return res.status(404).type('text/plain').send('短链不存在');
    const { variant, dest: rawDest } = pickVariant(entry);
    // utm 参数透传到目标（只透传 utm_*，不污染目标原有参数）
    let dest = rawDest;
    try {
      const url = new URL(dest);
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) {
        const v = String(req.query[k] || '').slice(0, 128);
        if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
      }
      dest = url.toString();
    } catch { /* 目标 URL 异常时原样跳转 */ }
    logClick(entry.id, req, variant);
    return res.redirect(302, dest);
  } catch (e) {
    console.error(e.message);
    return res.status(500).type('text/plain').send('服务开小差了');
  }
});

// ---------- admin API ----------
app.get('/api/links', adminAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT l.id, l.slug, l.target, l.target_b, l.ab_split, l.title, l.channel, l.created_at,
            COUNT(c.id)::int AS clicks,
            COUNT(CASE WHEN c.variant = 'A' THEN 1 END)::int AS clicks_a,
            COUNT(CASE WHEN c.variant = 'B' THEN 1 END)::int AS clicks_b
     FROM links l LEFT JOIN clicks c ON c.link_id = l.id
     GROUP BY l.id ORDER BY l.created_at DESC`);
  res.json(rows);
});

function parseAB(body) {
  const rawB = String(body.target_b || '').trim();
  const target_b = rawB ? cleanUrl(rawB) : '';
  if (rawB && !target_b) return { error: 'B 目标 URL 不合法（需 http/https）' };
  let ab_split = parseInt(body.ab_split, 10);
  if (!Number.isFinite(ab_split)) ab_split = 50;
  ab_split = Math.max(0, Math.min(100, ab_split));
  return { target_b, ab_split };
}

app.post('/api/links', adminAuth, async (req, res) => {
  const target = cleanUrl(req.body.target);
  if (!target) return res.status(400).json({ error: '目标 URL 不合法（需 http/https）' });
  const ab = parseAB(req.body);
  if (ab.error) return res.status(400).json({ error: ab.error });
  let slug = String(req.body.slug || '').trim();
  if (slug && !SLUG_RE.test(slug)) return res.status(400).json({ error: '短码需 3–32 位字母数字 / - _' });
  const title = String(req.body.title || '').slice(0, 120);
  const channel = String(req.body.channel || '').slice(0, 60);
  try {
    for (let i = 0; i < 5; i++) {
      const s = slug || randomSlug();
      try {
        const { rows } = await pool.query(
          'INSERT INTO links (slug, target, target_b, ab_split, title, channel) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
          [s, target, ab.target_b, ab.ab_split, title, channel]);
        slugCache.set(s, { id: rows[0].id, target, target_b: ab.target_b, ab_split: ab.ab_split, ts: Date.now() }); // 建链即预热缓存
        return res.status(201).json(rows[0]);
      } catch (e) {
        if (e.code === '23505' && !slug) continue; // random collision, retry
        if (e.code === '23505') return res.status(409).json({ error: '短码已被占用' });
        throw e;
      }
    }
    return res.status(500).json({ error: '短码生成失败，请重试' });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ error: '创建失败' });
  }
});

app.patch('/api/links/:id', adminAuth, async (req, res) => {
  const target = cleanUrl(req.body.target);
  if (!target) return res.status(400).json({ error: '目标 URL 不合法（需 http/https）' });
  const ab = parseAB(req.body);
  if (ab.error) return res.status(400).json({ error: ab.error });
  const title = String(req.body.title || '').slice(0, 120);
  const channel = String(req.body.channel || '').slice(0, 60);
  const { rows } = await pool.query(
    `UPDATE links SET target = $1, target_b = $2, ab_split = $3, title = $4, channel = $5
     WHERE id = $6 RETURNING slug`,
    [target, ab.target_b, ab.ab_split, title, channel, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: '短链不存在' });
  slugCache.delete(rows[0].slug); // 改目标即清缓存，下次访问重新加载
  res.json({ ok: true });
});

// 二维码：短链的推广二维码 PNG（管理接口，按当前访问域名生成）
app.get('/api/links/:id/qr', adminAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT slug FROM links WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: '短链不存在' });
  const proto = req.protocol === 'http' && req.get('x-forwarded-proto') ? req.get('x-forwarded-proto') : req.protocol;
  const url = `${proto}://${req.get('host')}/${rows[0].slug}`;
  try {
    const png = await QRCode.toBuffer(url, { width: 480, margin: 2, color: { dark: '#0b0e14', light: '#ffffff' } });
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }).send(png);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: '二维码生成失败' });
  }
});

app.delete('/api/links/:id', adminAuth, async (req, res) => {
  const { rows } = await pool.query('DELETE FROM links WHERE id = $1 RETURNING slug', [req.params.id]);
  if (rows.length) slugCache.delete(rows[0].slug); // 删链即清缓存，不会出现"删了还能跳"
  res.json({ ok: true });
});

app.get('/api/stats/overview', adminAuth, async (_req, res) => {
  const q = (t, p = []) => pool.query(t, p).then(r => r.rows);
  const [tot, today, series, ref, chan, recent, heat] = await Promise.all([
    q(`SELECT (SELECT COUNT(*)::int FROM links) AS links,
              (SELECT COUNT(*)::int FROM clicks) AS clicks,
              (SELECT COUNT(*)::int FROM clicks WHERE ts >= NOW() - INTERVAL '7 days') AS week_clicks`),
    q(`SELECT COUNT(*)::int AS n, COUNT(DISTINCT ip_hash)::int AS u
       FROM clicks WHERE ts >= CURRENT_DATE`),
    q(`SELECT d.day::text AS day, COALESCE(s.clicks,0)::int AS clicks, COALESCE(s.uniques,0)::int AS uniques
       FROM (SELECT generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day')::date AS day) d
       LEFT JOIN (SELECT day, SUM(clicks)::int clicks, SUM(uniques)::int uniques
                  FROM daily_stats GROUP BY day) s ON s.day = d.day
       ORDER BY d.day`),
    q(`SELECT COALESCE(NULLIF(referer,''),'(直接访问)') AS referer, COUNT(*)::int AS clicks
       FROM clicks WHERE ts >= NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 8`),
    q(`SELECT l.channel AS channel, COUNT(c.id)::int AS clicks
       FROM clicks c JOIN links l ON l.id = c.link_id
       WHERE c.ts >= NOW() - INTERVAL '30 days' AND l.channel <> ''
       GROUP BY 1 ORDER BY 2 DESC LIMIT 8`),
    q(`SELECT c.ts, l.slug, l.title, c.device, c.referer, c.ua,
              c.app_source, c.browser, c.os, c.lang, c.is_repeat, c.utm_source
       FROM clicks c JOIN links l ON l.id = c.link_id
       ORDER BY c.ts DESC LIMIT 12`),
    // 活跃热力图：近 30 天，周(0=周日)×小时，按北京时间
    q(`SELECT EXTRACT(DOW FROM ts AT TIME ZONE 'Asia/Shanghai')::int AS dow,
              EXTRACT(HOUR FROM ts AT TIME ZONE 'Asia/Shanghai')::int AS hr,
              COUNT(*)::int AS n
       FROM clicks WHERE ts >= NOW() - INTERVAL '30 days' GROUP BY 1, 2`),
  ]);
  res.json({
    totals: { ...tot[0], today_clicks: today[0].n, today_uniques: today[0].u },
    series,
    topReferrers: ref.map(r => ({ host: hostOf(r.referer), clicks: r.clicks })),
    topChannels: chan,
    recent: recent.map(r => ({
      ts: r.ts, slug: r.slug, title: r.title, device: r.device,
      referer: hostOf(r.referer), ua: r.ua.slice(0, 80),
      app: r.app_source, browser: r.browser, os: r.os, lang: r.lang,
      repeat: r.is_repeat, utm: r.utm_source,
    })),
    heatmap: heat,
  });
});

// ---------- cron: 每日聚合（幂等，可重跑） ----------
app.post('/api/cron/aggregate', cronAuth, async (req, res) => {
  const runId = req.headers['insta-cron-run-id'] || `manual-${Date.now()}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO daily_stats (link_id, day, clicks, uniques)
       SELECT link_id, (ts AT TIME ZONE 'Asia/Shanghai')::date AS day,
              COUNT(*), COUNT(DISTINCT ip_hash)
       FROM clicks WHERE ts >= NOW() - INTERVAL '45 days'
       GROUP BY link_id, day
       ON CONFLICT (link_id, day) DO UPDATE
         SET clicks = EXCLUDED.clicks, uniques = EXCLUDED.uniques
       RETURNING link_id`);
    res.json({ ok: true, runId, rows: rows.length });
  } catch (e) {
    console.error('aggregate failed:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- static + SPA ----------
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use((_req, res) => res.status(404).type('text/plain').send('not found'));

const server = app.listen(PORT, () => console.log(`LinkPulse listening on :${PORT}`));
process.on('SIGTERM', () => {
  console.log('SIGTERM: draining…');
  server.close(() => pool.end().then(() => process.exit(0)));
});
