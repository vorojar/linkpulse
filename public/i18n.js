// LinkPulse i18n — English by default, 中文 available.
// Preference is stored in localStorage ('lp_lang'). Presentation-layer only:
// the API/DB keeps its original values; display strings are mapped here.
const STR = {
en: {
  docTitle: 'LinkPulse · Short Links & Click Analytics',
  loginSub: 'Short links & click analytics · enter the admin password',
  loginBtn: 'Open dashboard',
  wrongPw: 'Wrong password, please try again',
  brandSub: 'short links',
  tagline: 'Self-hosted short links & click analytics',
  badge: 'Self-hosted · MIT',
  kLinks: 'Links',
  kClicks: 'Total clicks',
  kToday: 'Today',
  kWeek: 'Last 7 days',
  formTitle: 'Create link',
  formEdit: 'Edit link',
  formSub: 'Leave slug empty for an auto 6-char code · channel tags where you shared it (e.g. X / newsletter / Telegram)',
  fTargetA: 'A · Target URL',
  abOn: 'Enable A/B test',
  abOnSub: 'Split traffic between two target pages by ratio and compare conversion',
  fTargetB: 'B · Target URL',
  fSplitPct: 'Traffic share to A (%)',
  fSlug: 'Custom slug (optional)',
  fSlugPh: 'e.g. launch-promo',
  fChannel: 'Channel note (optional)',
  fChannelPh: 'e.g. X post',
  fTitle: 'Title note (optional)',
  fTitlePh: 'e.g. Launch signup page',
  submitCreate: 'Create link',
  submitSave: 'Save changes',
  cancelEdit: 'Cancel',
  chartTitle: 'Click trend · 14 days',
  chartSub: 'Bars = clicks · line = unique visitors',
  legClicks: 'Clicks',
  legUniq: 'Unique visitors',
  rankChannel: 'Top channels',
  rankRef: 'Top referrers',
  last30d: '· last 30 days',
  heatTitle: 'Activity heatmap',
  heatTz: '· last 30 days · server time',
  heatHint: 'See which days & hours your audience is most active — post in the brightest cells',
  linksTitle: 'My links',
  linksSub: 'Hit Copy and share the link anywhere — redirects are tracked automatically',
  thLink: 'Short link', thTarget: 'Target', thChannel: 'Channel', thClicks: 'Clicks', thCreated: 'Created',
  feedTitle: 'Live click stream',
  feedSub: 'Latest 12 visits',
  qrTitle: 'Share QR code',
  qrImgAlt: 'QR code',
  qrDl: 'Download PNG',
  qrClose: 'Close',
  untagged: '(untagged)',
  noData: 'No data yet',
  noLinks: 'No links yet — create one above',
  noClicks: 'No clicks yet',
  btnCopy: 'Copy', btnQR: 'QR', btnEdit: 'Edit', btnDel: 'Delete',
  copied: 'Copied ✓',
  delConfirm: 'Delete this link? Its stats will be deleted too.',
  repeatPill: 'Repeat',
  clicksWord: 'clicks',
  starText: 'If LinkPulse helped you, please give us a Star on GitHub — it means a lot to us 👉',
  starDismiss: 'Dismiss',
},
zh: {
  docTitle: 'LinkPulse · 推广短链与点击统计',
  loginSub: '推广短链与点击统计 · 请输入管理密码',
  loginBtn: '进入看板',
  wrongPw: '密码不正确，请重试',
  brandSub: '链光',
  tagline: '推广短链与点击统计',
  badge: 'LinkPulse 链光',
  kLinks: '短链总数',
  kClicks: '累计点击',
  kToday: '今日点击',
  kWeek: '近 7 天点击',
  formTitle: '创建短链',
  formEdit: '编辑短链',
  formSub: '短码留空则自动生成 6 位；渠道用来区分投放位置（如：朋友圈 / 推文 / 群发）',
  fTargetA: 'A 目标链接 URL',
  abOn: '启用 A/B 测试',
  abOnSub: '同一短链按比例分流到两个目标页，对比转化效果',
  fTargetB: 'B 目标链接',
  fSplitPct: 'A 版本流量占比 %',
  fSlug: '自定义短码（可选）',
  fSlugPh: '如：muse-invite',
  fChannel: '渠道备注（可选）',
  fChannelPh: '如：朋友圈',
  fTitle: '标题备注（可选）',
  fTitlePh: '如：Muse 邀请注册',
  submitCreate: '生成短链',
  submitSave: '保存修改',
  cancelEdit: '取消编辑',
  chartTitle: '14 日点击趋势',
  chartSub: '柱状 = 点击数 · 折线 = 独立访客',
  legClicks: '点击',
  legUniq: '独立访客',
  rankChannel: '渠道排行',
  rankRef: '来源排行',
  last30d: '· 近 30 天',
  heatTitle: '活跃热力图',
  heatTz: '· 近 30 天 · 北京时间',
  heatHint: '用户哪天、几点最活跃——发推广内容就挑最亮的格子',
  linksTitle: '我的短链',
  linksSub: '点击「复制」拿到推广链接，发到任何地方；跳转自动统计',
  thLink: '短链', thTarget: '目标', thChannel: '渠道', thClicks: '点击', thCreated: '创建',
  feedTitle: '实时点击流',
  feedSub: '最近 12 次访问',
  qrTitle: '推广二维码',
  qrImgAlt: '二维码',
  qrDl: '下载 PNG',
  qrClose: '关闭',
  untagged: '(未备注)',
  noData: '暂无数据',
  noLinks: '还没有短链，在上面创建一个吧',
  noClicks: '暂无点击',
  btnCopy: '复制', btnQR: '二维码', btnEdit: '编辑', btnDel: '删除',
  copied: '已复制 ✓',
  delConfirm: '确定删除这条短链吗？它的统计也会一起删除。',
  repeatPill: '重复',
  clicksWord: '点击',
  starText: '如果 LinkPulse 帮到了你，请在 GitHub 点个 Star，这对我们意义重大 👉',
  starDismiss: '关闭',
}
};

const DOW = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  zh: ['日', '一', '二', '三', '四', '五', '六'],
};

// Server/DB keeps original values; map them for English display only.
const APPMAP = { '微信': 'WeChat', '微博': 'Weibo', '钉钉': 'DingTalk', '微信内置': 'WeChat webview', '(直接访问)': 'Direct' };
const ERRMAP = {
  'B 目标 URL 不合法（需 http/https）': 'B target URL invalid (must be http/https)',
  '短码已被占用': 'Slug already taken',
  '短码生成失败，请重试': 'Slug generation failed, please retry',
};

let LANG = localStorage.getItem('lp_lang') || 'en';
const t = k => (STR[LANG] && STR[LANG][k] != null) ? STR[LANG][k] : (STR.en[k] ?? k);
const dispApp = s => LANG === 'en' ? (APPMAP[s] || s) : s;
const dispErr = m => LANG === 'en' ? (ERRMAP[m] || m) : m;
const heatTip = (d, h, n) => LANG === 'en'
  ? `${DOW.en[d]} ${h}:00 · ${n} clicks`
  : `周${DOW.zh[d]} ${h}点 · ${n} 点击`;

function applyI18n() {
  document.documentElement.lang = LANG === 'en' ? 'en' : 'zh-CN';
  document.title = t('docTitle');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  ['langBtn', 'langBtnLogin'].forEach(id => { const b = document.getElementById(id); if (b) b.textContent = LANG === 'en' ? '中文' : 'EN'; });
  if (typeof render === 'function' && typeof lastStats !== 'undefined' && lastStats) render();
}
function setLang(l) { LANG = l; try { localStorage.setItem('lp_lang', l); } catch {} applyI18n(); }
