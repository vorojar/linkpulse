// LinkPulse dashboard (i18n via i18n.js — t(), dispApp(), dispErr(), DOW, heatTip())
const $ = id => document.getElementById(id);
const auth = () => 'Basic ' + btoa('admin:' + (sessionStorage.getItem('lp_pw') || ''));

async function api(path, opts = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Authorization': auth(), ...(opts.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { showLogin(t('wrongPw')); throw new Error('auth'); }
  if (!r.ok) throw new Error(dispErr(j.error) || ('HTTP ' + r.status));
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
  const sb = $('starBanner');
  if (sb) {
    let hide = false;
    try { hide = localStorage.getItem('lp_star_hide') === '1'; } catch {}
    sb.style.display = hide ? 'none' : '';
  }
}

$('loginBtn').onclick = doLogin;
$('pw').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
$('langBtn').onclick = () => setLang(LANG === 'en' ? 'zh' : 'en');
$('langBtnLogin').onclick = () => setLang(LANG === 'en' ? 'zh' : 'en');
const starClose = $('starClose');
if (starClose) starClose.onclick = () => {
  $('starBanner').style.display = 'none';
  try { localStorage.setItem('lp_star_hide', '1'); } catch {}
};
async function doLogin() {
  sessionStorage.setItem('lp_pw', $('pw').value);
  $('loginErr').textContent = '';
  try { await load(); showApp(); }
  catch (e) { if (e.message !== 'auth') $('loginErr').textContent = dispErr(e.message); }
}

const fmtT = iso => {
  const d = new Date(iso);
  return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' +
         String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let editId = null, linkCache = [], lastStats = null;

function drawHeatmap(cells) {
  const dow = DOW[LANG] || DOW.en;
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  (cells || []).forEach(c => { if (c.dow >= 0 && c.dow < 7 && c.hr >= 0 && c.hr < 24) grid[c.dow][c.hr] = c.n; });
  const max = Math.max(1, ...grid.flat());
  let html = '<div class="hh"><span></span>' + Array.from({ length: 24 }, (_, h) => `<span class="hx">${h % 3 === 0 ? h : ''}</span>`).join('') + '</div>';
  grid.forEach((row, d) => {
    html += `<div class="hh"><span class="hy">${dow[d]}</span>` + row.map((n, h) => {
      const a = n ? (0.12 + 0.88 * (n / max)) : 0;
      return `<span class="hc" title="${esc(heatTip(d, h, n))}" style="background:rgba(184,245,61,${a.toFixed(2)})"></span>`;
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
    bars += `<rect x="${x.toFixed(1)}" y="${(H - 30 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="#b8f53d" opacity="0.85"><title>${s.day} · ${s.clicks} ${t('clicksWord')}</title></rect>`;
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
    `<div class="r"><span class="name">${esc(dispApp(r[key] || t('untagged')))}</span>` +
    `<span class="bar"><i style="width:${(r.clicks / max * 100).toFixed(0)}%"></i></span>` +
    `<span class="n">${r.clicks}</span></div>`).join('')
    : `<div class="empty">${t('noData')}</div>`;
}

async function load() {
  const [links, stats] = await Promise.all([api('/api/links'), api('/api/stats/overview')]);
  linkCache = links;
  lastStats = stats;
  render();
}

function render() {
  const stats = lastStats;
  if (!stats) return;
  const links = linkCache;
  const tt = stats.totals;
  $('sLinks').textContent = tt.links;
  $('sClicks').textContent = tt.clicks;
  $('sToday').innerHTML = `${tt.today_clicks} <small>/ ${tt.today_uniques}</small>`;
  $('sWeek').textContent = tt.week_clicks;
  drawChart(stats.series);
  drawHeatmap(stats.heatmap);
  rank($('rankChannel'), stats.topChannels, 'channel');
  rank($('rankRef'), stats.topReferrers, 'host');

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
      <button class="ghost small" data-copy="${base}${esc(l.slug)}">${t('btnCopy')}</button>
      <button class="ghost small" data-qr="${l.id}">${t('btnQR')}</button>
      <button class="ghost small" data-edit="${l.id}">${t('btnEdit')}</button>
      <button class="danger" data-del="${l.id}">${t('btnDel')}</button>
    </div></td></tr>`; }).join('')
    : `<tr><td colspan="7"><div class="empty">${t('noLinks')}</div></td></tr>`;

  $('feed').innerHTML = stats.recent.length ? stats.recent.map(c => {
    const sys = [c.os, c.browser].filter(Boolean).map(dispApp).join(' · ') || c.device;
    return `<div class="f${c.repeat ? ' rep' : ''}">
    <span class="t">${fmtT(c.ts)}</span>
    <span class="slug">/${esc(c.slug)}</span>
    ${c.app ? `<span class="pill app">${esc(dispApp(c.app))}</span>` : ''}
    <span class="dev">${esc(sys)}</span>
    ${c.lang ? `<span class="lang">${esc(c.lang)}</span>` : ''}
    ${c.repeat ? `<span class="pill rep">${t('repeatPill')}</span>` : ''}
    <span style="color:#8b94a9">${esc(dispApp(c.referer))}${c.utm ? ' · utm:' + esc(c.utm) : ''}</span>
  </div>`; }).join('') : `<div class="empty">${t('noClicks')}</div>`;
}

document.addEventListener('click', async e => {
  const cp = e.target.closest('[data-copy]');
  if (cp) {
    try { await navigator.clipboard.writeText(cp.dataset.copy); }
    catch { const i = document.createElement('input'); i.value = cp.dataset.copy; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove(); }
    cp.textContent = t('copied'); setTimeout(() => cp.textContent = t('btnCopy'), 1200);
    return;
  }
  const qr = e.target.closest('[data-qr]');
  if (qr) { openQR(parseInt(qr.dataset.qr, 10)); return; }
  const ed = e.target.closest('[data-edit]');
  if (ed) { startEdit(parseInt(ed.dataset.edit, 10)); return; }
  const del = e.target.closest('[data-del]');
  if (del && confirm(t('delConfirm'))) {
    await api('/api/links/' + del.dataset.del, { method: 'DELETE' });
    if (editId === parseInt(del.dataset.del, 10)) cancelEdit();
    load().catch(() => {});
  }
});

async function openQR(id) {
  const l = linkCache.find(x => x.id === id); if (!l) return;
  const r = await fetch('/api/links/' + id + '/qr', { headers: { 'Authorization': auth() } });
  if (r.status === 401) { showLogin(t('wrongPw')); return; }
  if (!r.ok) return;
  const url = URL.createObjectURL(await r.blob());
  $('qrImg').src = url; $('qrImg').alt = t('qrImgAlt');
  $('qrDl').href = url; $('qrDl').download = l.slug + '-qr.png';
  $('qrTitle').textContent = t('qrTitle') + ' · /' + l.slug;
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
  $('formTitle').textContent = t('formTitle');
  $('submitBtn').textContent = t('submitCreate');
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
  $('formTitle').textContent = t('formEdit') + ' · /' + l.slug;
  $('submitBtn').textContent = t('submitSave');
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
  } catch (err) { $('createErr').textContent = dispErr(err.message); }
});

// Refresh stats every 30s while the dashboard is open
setInterval(() => { if (!$('app').classList.contains('hidden')) load().catch(() => {}); }, 30000);

applyI18n();
(async () => {
  if (sessionStorage.getItem('lp_pw')) {
    try { await load(); showApp(); } catch { showLogin(); }
  } else showLogin();
})();
