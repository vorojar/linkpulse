// LinkPulse dashboard
const $ = id => document.getElementById(id);
const auth = () => 'Basic ' + btoa('admin:' + (sessionStorage.getItem('lp_pw') || ''));

async function api(path, opts = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Authorization': auth(), ...(opts.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { showLogin(j.error || '密码不正确，请重试'); throw new Error('auth'); }
  if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}

function showLogin(msg) {
  $('app').classList.add('hidden');
  $('login').classList.remove('hidden');
  if (msg) $('loginErr').textContent = msg;
}
function showApp() {
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
}

$('loginBtn').onclick = doLogin;
$('pw').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
async function doLogin() {
  sessionStorage.setItem('lp_pw', $('pw').value);
  $('loginErr').textContent = '';
  try { await load(); showApp(); }
  catch (e) { if (e.message !== 'auth') $('loginErr').textContent = e.message; }
}

const fmtT = iso => {
  const d = new Date(iso);
  return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' +
         String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let editId = null, linkCache = [];

function drawHeatmap(cells) {
  const DOW = ['日', '一', '二', '三', '四', '五', '六'];
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  (cells || []).forEach(c => { if (c.dow >= 0 && c.dow < 7 && c.hr >= 0 && c.hr < 24) grid[c.dow][c.hr] = c.n; });
  const max = Math.max(1, ...grid.flat());
  let html = '<div class="hh"><span></span>' + Array.from({ length: 24 }, (_, h) => `<span class="hx">${h % 3 === 0 ? h : ''}</span>`).join('') + '</div>';
  grid.forEach((row, d) => {
    html += `<div class="hh"><span class="hy">${DOW[d]}</span>` + row.map((n, h) => {
      const a = n ? (0.12 + 0.88 * (n / max)) : 0;
      return `<span class="hc" title="周${DOW[d]} ${h}点 · ${n} 点击" style="background:rgba(184,245,61,${a.toFixed(2)})"></span>`;
    }).join('') + '</div>';
  });
  $('heatmap').innerHTML = html;
}

function drawChart(series) {
  const svg = $('chart'), W = 600, H = 220, P = 8;
  const max = Math.max(1, ...series.map(s => s.clicks));
  const bw = (W - P * 2) / series.length;
  let bars = '', pts = [];
  series.forEach((s, i) => {
    const h = Math.max(2, (s.clicks / max) * (H - 70));
    const x = P + i * bw + bw * 0.18, w = bw * 0.64;
    bars += `<rect x="${x.toFixed(1)}" y="${(H - 30 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="#b8f53d" opacity="0.85"><title>${s.day} · ${s.clicks} 点击</title></rect>`;
    const ly = H - 30 - Math.max(2, (s.uniques / max) * (H - 70));
    pts.push(`${(x + w / 2).toFixed(1)},${ly.toFixed(1)}`);
    if (i % 2 === 0) bars += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 10}" font-size="9" fill="#8b94a9" text-anchor="middle">${s.day.slice(5)}</text>`;
  });
  svg.innerHTML = bars + `<polyline points="${pts.join(' ')}" fill="none" stroke="#67e8f9" stroke-width="2"/>` +
    pts.map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3" fill="#67e8f9"/>`).join('');
}

function rank(el, rows, key) {
  const max = Math.max(1, ...rows.map(r => r.clicks));
  el.innerHTML = rows.length ? rows.map(r =>
    `<div class="r"><span class="name">${esc(r[key] || '(未备注)')}</span>` +
    `<span class="bar"><i style="width:${(r.clicks / max * 100).toFixed(0)}%"></i></span>` +
    `<span class="n">${r.clicks}</span></div>`).join('')
    : '<div class="empty">暂无数据</div>';
}

async function load() {
  const [links, stats] = await Promise.all([api('/api/links'), api('/api/stats/overview')]);
  const t = stats.totals;
  $('sLinks').textContent = t.links;
  $('sClicks').textContent = t.clicks;
  $('sToday').innerHTML = `${t.today_clicks} <small>/ ${t.today_uniques}</small>`;
  $('sWeek').textContent = t.week_clicks;
  drawChart(stats.series);
  drawHeatmap(stats.heatmap);
  rank($('rankChannel'), stats.topChannels, 'channel');
  rank($('rankRef'), stats.topReferrers, 'host');
  linkCache = links;

  const base = location.origin + '/';
  $('linkRows').innerHTML = links.length ? links.map(l => {
    const ab = l.target_b
      ? `<span class="pill ab">A/B ${l.ab_split}/${100 - l.ab_split}</span><div class="abn">A:${l.clicks_a} · B:${l.clicks_b}</div>`
      : '<span style="color:#3a4358">–</span>';
    return `<tr>
    <td><span class="slug">${base}${esc(l.slug)}</span></td>
    <td><span class="tgt" title="${esc(l.target)}${l.target_b ? '\nB: ' + esc(l.target_b) : ''}">${esc(l.title || l.target)}</span></td>
    <td>${ab}</td>
    <td>${l.channel ? `<span class="pill">${esc(l.channel)}</span>` : '<span style="color:#3a4358">–</span>'}</td>
    <td class="num">${l.clicks}</td>
    <td style="color:#8b94a9">${fmtT(l.created_at)}</td>
    <td><div class="rowbtns">
      <button class="ghost small" data-copy="${base}${esc(l.slug)}">复制</button>
      <button class="ghost small" data-qr="${l.id}">二维码</button>
      <button class="ghost small" data-edit="${l.id}">编辑</button>
      <button class="danger" data-del="${l.id}">删除</button>
    </div></td></tr>`; }).join('')
    : '<tr><td colspan="7"><div class="empty">还没有短链，在上面创建一个吧</div></td></tr>';

  $('feed').innerHTML = stats.recent.length ? stats.recent.map(c => {
    const sys = [c.os, c.browser].filter(Boolean).join(' · ') || c.device;
    return `<div class="f${c.repeat ? ' rep' : ''}">
    <span class="t">${fmtT(c.ts)}</span>
    <span class="slug">/${esc(c.slug)}</span>
    ${c.app ? `<span class="pill app">${esc(c.app)}</span>` : ''}
    <span class="dev">${esc(sys)}</span>
    ${c.lang ? `<span class="lang">${esc(c.lang)}</span>` : ''}
    ${c.repeat ? `<span class="pill rep">重复</span>` : ''}
    <span style="color:#8b94a9">${esc(c.referer)}${c.utm ? ' · utm:' + esc(c.utm) : ''}</span>
  </div>`; }).join('') : '<div class="empty">暂无点击</div>';
}

document.addEventListener('click', async e => {
  const cp = e.target.closest('[data-copy]');
  if (cp) {
    try { await navigator.clipboard.writeText(cp.dataset.copy); }
    catch { const i = document.createElement('input'); i.value = cp.dataset.copy; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove(); }
    cp.textContent = '已复制 ✓'; setTimeout(() => cp.textContent = '复制', 1200);
    return;
  }
  const qr = e.target.closest('[data-qr]');
  if (qr) { openQR(parseInt(qr.dataset.qr, 10)); return; }
  const ed = e.target.closest('[data-edit]');
  if (ed) { startEdit(parseInt(ed.dataset.edit, 10)); return; }
  const del = e.target.closest('[data-del]');
  if (del && confirm('确定删除这条短链吗？它的统计也会一起删除。')) {
    await api('/api/links/' + del.dataset.del, { method: 'DELETE' });
    if (editId === parseInt(del.dataset.del, 10)) cancelEdit();
    load().catch(() => {});
  }
});

async function openQR(id) {
  const l = linkCache.find(x => x.id === id); if (!l) return;
  const r = await fetch('/api/links/' + id + '/qr', { headers: { 'Authorization': auth() } });
  if (r.status === 401) { showLogin('密码不正确，请重试'); return; }
  if (!r.ok) return;
  const url = URL.createObjectURL(await r.blob());
  $('qrImg').src = url; $('qrDl').href = url; $('qrDl').download = l.slug + '-qr.png';
  $('qrTitle').textContent = '推广二维码 · /' + l.slug;
  $('qrUrl').textContent = location.origin + '/' + l.slug;
  $('qrModal').classList.add('show');
}
$('qrClose').onclick = () => $('qrModal').classList.remove('show');
$('qrModal').addEventListener('click', e => { if (e.target.id === 'qrModal') $('qrModal').classList.remove('show'); });

function clearForm() {
  $('fTarget').value = $('fSlug').value = $('fTitle').value = $('fChannel').value = $('fTargetB').value = '';
  $('fSplit').value = 50;
  $('fAB').checked = false; $('abFields').style.display = 'none';
}
$('fAB').addEventListener('change', () => {
  $('abFields').style.display = $('fAB').checked ? '' : 'none';
});
function cancelEdit() {
  editId = null; clearForm();
  $('formTitle').textContent = '创建短链';
  $('submitBtn').textContent = '生成短链';
  $('cancelEdit').style.display = 'none';
  $('fSlug').disabled = false;
}
function startEdit(id) {
  const l = linkCache.find(x => x.id === id); if (!l) return;
  editId = id;
  $('fTarget').value = l.target;
  const ab = !!l.target_b;
  $('fAB').checked = ab; $('abFields').style.display = ab ? '' : 'none';
  $('fTargetB').value = l.target_b || ''; $('fSplit').value = l.ab_split ?? 50;
  $('fSlug').value = l.slug; $('fSlug').disabled = true;
  $('fTitle').value = l.title || ''; $('fChannel').value = l.channel || '';
  $('formTitle').textContent = '编辑短链 · /' + l.slug;
  $('submitBtn').textContent = '保存修改';
  $('cancelEdit').style.display = '';
  $('formTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
$('cancelEdit').onclick = cancelEdit;

$('createForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('createErr').textContent = '';
  const abOn = $('fAB').checked;
  const body = {
    target: $('fTarget').value, slug: $('fSlug').value,
    title: $('fTitle').value, channel: $('fChannel').value,
    target_b: abOn ? $('fTargetB').value : '',
    ab_split: abOn ? parseInt($('fSplit').value || '50', 10) : 50,
  };
  try {
    if (editId) {
      await api('/api/links/' + editId, { method: 'PATCH', body: JSON.stringify(body) });
      cancelEdit();
    } else {
      await api('/api/links', { method: 'POST', body: JSON.stringify(body) });
      clearForm();
    }
    load().catch(() => {});
  } catch (err) { $('createErr').textContent = err.message; }
});

// 每 30 秒刷新统计（看板常开时实时感）
setInterval(() => { if (!$('app').classList.contains('hidden')) load().catch(() => {}); }, 30000);

(async () => {
  if (sessionStorage.getItem('lp_pw')) {
    try { await load(); showApp(); } catch { showLogin(); }
  } else showLogin();
})();
