/* ============================================================
   ui.js — templates seguros, ícones, formatação, modais, formulários, gráficos
   ============================================================ */

/* Registros de manipuladores (preenchidos pelas páginas) */
const ACTIONS = {}, FORMS = {}, CHANGES = {}, INPUTS = {}, VIEWS = {};
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- templates com escape automático ---------- */
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = s => new Raw(String(s));
const part = v => v instanceof Raw ? v.s : Array.isArray(v) ? v.map(part).join('') : (v === false || v == null) ? '' : esc(v);
const html = (strs, ...vals) => new Raw(strs.reduce((o, s, i) => o + s + (i < vals.length ? part(vals[i]) : ''), ''));
const attrs = o => raw(Object.entries(o || {}).filter(([, v]) => v !== false && v != null).map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${esc(v)}"`).join(''));

/* ---------- ícones ---------- */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.2c2.6.2 4.5 2 4.5 5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/>',
  pencil: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3h6v1M8.5 10h7M8.5 14h7M8.5 17.5h4"/>',
  plan: '<path d="M4 6.5h9M4 12h9M4 17.5h6"/><path d="M15.5 14.5l2.2 2.2 3.8-4.4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.5 2.5 4.5-5"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  left: '<path d="M14.5 6l-6 6 6 6"/>', right: '<path d="M9.5 6l6 6-6 6"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/>', trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/>',
  dots: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
  video: '<rect x="3" y="6" width="12.5" height="12" rx="2.5"/><path d="M15.5 10.5l5-3v9l-5-3"/>',
  contract: '<path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M14 3.5V8h4M8.5 12.5h7M8.5 16h5"/>',
  route: '<circle cx="6" cy="18" r="2.3"/><circle cx="18" cy="6" r="2.3"/><path d="M8.3 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.7"/>',
  key: '<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5L20 3M16.5 6.5l2.5 2.5M14 9l2 2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  send: '<path d="M21 3L10 14M21 3l-6.5 18-3.5-7.5L3.5 10z"/>', redo: '<path d="M20 5v5h-5"/><path d="M19.5 10A8 8 0 1 0 20 14"/>', paperclip: '<path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7-7L13 4.5a3.4 3.4 0 0 1 4.8 4.8l-7.8 7.8a1.8 1.8 0 0 1-2.5-2.5l7-7"/>', award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/>', image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.7"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
  file: '<path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1zM14 3.5V8h4"/>', user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>'
};
const ico = (n, s) => raw(`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"${s ? ` style="width:${s}px;height:${s}px"` : ''}>${ICONS[n] || ''}</svg>`);

/* ---------- formatação (usa as configurações) ---------- */
const loc = () => (S.settings && S.settings.locale) || 'pt-BR';
const fmtDate = s => s ? new Intl.DateTimeFormat(loc(), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parseD(s)) : '—';
const fmtDateShort = s => s ? new Intl.DateTimeFormat(loc(), { day: '2-digit', month: 'short' }).format(parseD(s)).replace('.', '') : '—';
const fmtDateLong = s => new Intl.DateTimeFormat(loc(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseD(s));
const fmtMonth = ym => { const t = new Intl.DateTimeFormat(loc(), { month: 'long', year: 'numeric' }).format(parseD(ym + '-01')); return t.charAt(0).toUpperCase() + t.slice(1); };
const fmtMonthShort = ym => new Intl.DateTimeFormat(loc(), { month: 'short' }).format(parseD(ym + '-01')).replace('.', '');
const fmtDT = key => key ? `${fmtDate(String(key).slice(0, 10))}${String(key).length > 10 ? ' ' + String(key).slice(11, 16) : ''}` : '—';
const money = n => new Intl.NumberFormat(loc(), { style: 'currency', currency: (S.settings && S.settings.currency) || 'BRL' }).format(Number(n) || 0);
const num = (v, d) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : (d == null ? 0 : d); };
const wdName = (d, short) => (short ? WD_SHORT : WEEKDAYS)[d];

/* ---------- peças visuais ---------- */
const badge = (t, tone) => html`<span class="badge ${tone ? 'b-' + tone : ''}">${t}</span>`;
const LS_SHORT = { agendada: 'Agendada', realizada: 'Realizada', ausente: 'Ausente', cancelada: 'Cancelada', reagendada: 'Reagendada' };
const LS_TONE = { agendada: 'info', realizada: 'ok', ausente: 'bad', cancelada: '', reagendada: 'warn' };
const lessonBadge = st => badge(LS_SHORT[st] || st, LS_TONE[st]);
const PAY_TONE = { pago: 'ok', pendente: 'info', atrasado: 'bad', parcial: 'warn', sem_cobranca: '', '-': '' };
const payBadge = st => st === '-' ? raw('<span class="muted">—</span>') : badge(labelOf(PAY_STATUS, st), PAY_TONE[st]);
const HW_TONE = { atribuida: 'info', em_andamento: 'info', entregue: 'warn', pendente_correcao: 'warn', corrigida: 'ok', concluida: 'ok', refazer: 'warn' };
const hwBadge = st => hwChip(HW_KEY_OF_STATUS[st] || 'pendente', labelOf(HW_STATUS, st));
/* selo com ícone: Pendente / Atrasada / Entregue / Corrigida / Refazer (chave de HW_UI) */
const hwChip = (key, label) => { const u = HW_UI[key] || HW_UI.pendente; return raw(`<span class="hwchip ${u[2]}" title="${esc(label || u[0])}">${ico(u[1]).s}<span>${esc(label || u[0])}</span></span>`); };
const hwChipLabel = key => ({ entregue: 'Entregue', pendente: 'Pendente', atrasada: 'Atrasada', corrigida: 'Corrigida', refazer: 'Refazer', rascunho: 'Em andamento' }[key]);
/* documento editável: só estas marcas sobrevivem (nada de script, link, imagem ou style) */
const DOC_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'H3', 'SPAN', 'MARK']);
const DOC_CLS = /^(hl-[ryg]|tc-[rb])$/;
function cleanDoc(src, max) {
  src = String(src == null ? '' : src); if (src.length > (max || 60000)) src = src.slice(0, max || 60000);
  const d = new DOMParser().parseFromString('<body>' + src + '</body>', 'text/html'), out = document.createElement('div');
  (function walk(from, to) {
    for (const n of from.childNodes) {
      if (n.nodeType === 3) to.appendChild(document.createTextNode(n.nodeValue));
      else if (n.nodeType === 1) {
        if (DOC_TAGS.has(n.tagName)) { const e = document.createElement(n.tagName.toLowerCase()); const c = (n.getAttribute('class') || '').split(/\s+/).filter(x => DOC_CLS.test(x)).join(' '); if (c) e.className = c; walk(n, e); to.appendChild(e); }
        else if (!['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'MATH'].includes(n.tagName)) walk(n, to);
      }
    }
  })(d.body, out);
  return out.innerHTML;
}
const docEmpty = h => !String(h || '').replace(/<[^>]*>/g, '').trim();
const skillTag = k => SKILLS.some(s => s[0] === k) ? html`<span class="sk sk-${k}">${labelOf(SKILLS, k)}</span>` : '';
const demoTag = x => x && x.demo ? raw('<span class="demo-tag" title="Registro fictício de demonstração">DEMO</span>') : '';
const bar = (pct, tone) => html`<div class="bar ${tone || ''}" role="progressbar" aria-valuenow="${clamp(Math.round(pct), 0, 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${clamp(pct, 0, 100)}%"></i></div>`;
const hueOf = s => { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ['--h-grammar', '--h-vocabulary', '--h-reading', '--h-writing', '--h-listening', '--h-speaking', '--h-pronunciation'][h % 7]; };
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const avatar = (st, size) => html`<span class="av" style="--s:${size || 36}px;--h:var(${hueOf(st && st.name)})">${st && typeof st.photo === 'string' && st.photo.startsWith('data:image/') ? raw(`<img alt="" src="${esc(st.photo)}">`) : initials(st && st.name)}</span>`;
const empty = (title, text, action) => html`<div class="empty"><h3>${title}</h3><p>${text}</p>${action || ''}</div>`;
const stat = (label, value, o) => html`<div class="stat ${(o && o.tone) || ''}"><small>${label}</small><b>${value}</b>${o && o.note ? html`<em>${o.note}</em>` : ''}</div>`;
const pageHead = (title, sub, actions) => html`<div class="page-h"><div><h1>${title}</h1>${sub ? html`<p>${sub}</p>` : ''}</div><div class="row">${actions || ''}</div></div>`;
const btn = (label, act, o) => html`<button type="button" class="btn ${(o && o.cls) || ''}" data-act="${act}"${attrs(Object.fromEntries(Object.entries((o && o.data) || {}).map(([k, v]) => ['data-' + k, v])))}>${(o && o.icon) ? ico(o.icon) : ''}${label}</button>`;
const iconBtn = (icon, act, label, data, cls) => html`<button type="button" class="icon-btn ${cls || ''}" data-act="${act}" title="${label}" aria-label="${label}"${attrs(Object.fromEntries(Object.entries(data || {}).map(([k, v]) => ['data-' + k, v])))}>${ico(icon)}</button>`;

/* ---------- campos de formulário ---------- */
const fld = (label, inner, o) => html`<label class="fld ${(o && o.cls) || ''}"><span>${label}</span>${inner}${o && o.hint ? html`<small>${o.hint}</small>` : ''}</label>`;
const input = (name, value, o) => html`<input name="${name}" id="${(o && o.id) || 'f_' + name}" type="${(o && o.type) || 'text'}" value="${value == null ? '' : value}"${attrs(o && o.a)}>`;
const textarea = (name, value, o) => html`<textarea name="${name}" id="${(o && o.id) || 'f_' + name}" rows="${(o && o.rows) || 3}"${attrs(o && o.a)}>${value == null ? '' : value}</textarea>`;
const select = (name, options, value, o) => html`<select name="${name}" id="${(o && o.id) || 'f_' + name}"${attrs(o && o.a)}>${options.map(op => { const [v, l] = Array.isArray(op) ? op : [op, op]; return html`<option value="${v}"${v === value ? raw(' selected') : ''}>${l}</option>`; })}</select>`;
const checks = (name, options, selected, cls) => html`<div class="${cls || 'checks'}">${options.map(op => { const [v, l] = Array.isArray(op) ? op : [op, op]; return html`<label class="chk"><input type="checkbox" name="${name}[]" value="${v}"${(selected || []).includes(v) ? raw(' checked') : ''}> ${l}</label>`; })}</div>`;
const studentOptions = (o) => {
  const list = S.students.filter(s => !s.archived && (s.status !== 'inativo' || (o && o.includeInactive) || s.id === (o && o.keep))).sort((a, b) => cmpStr(a.name, b.name));
  if (o && o.keep && !list.some(s => s.id === o.keep) && M.students.get(o.keep)) list.push(M.students.get(o.keep));
  return [...(o && o.blank ? [['', o.blank]] : []), ...list.map(s => [s.id, s.name + (s.demo ? ' (demo)' : '')])];
};
const formData = form => { const o = {}; for (const [k, v] of new FormData(form)) { if (k.endsWith('[]')) (o[k.slice(0, -2)] ||= []).push(v); else o[k] = v; } return o; };

/* ---------- modais, confirmação, avisos ---------- */
const modals = [];
function openModal(o) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg'; bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true');
  const head = html`<div class="modal-h"><h2>${o.title}</h2><button type="button" class="icon-btn" data-act="modal-close" aria-label="Fechar">${ico('x')}</button></div>`;
  let inner;
  if (o.form) {
    inner = html`<form class="form-wrap" data-form="${o.form.name}" data-id="${o.form.id || ''}"${attrs(o.form.data)}><div class="modal-b"><div class="form">${o.body}</div></div><div class="modal-f"><button type="button" class="btn" data-act="modal-close">Cancelar</button><button type="submit" class="btn primary">${o.form.submit || 'Salvar'}</button></div></form>`;
  } else {
    inner = html`<div class="modal-b">${o.body}</div>${o.footer ? html`<div class="modal-f">${o.footer}</div>` : ''}`;
  }
  bg.innerHTML = html`<div class="modal ${o.wide ? 'wide' : ''} ${o.narrow ? 'narrow' : ''}">${head}${inner}</div>`.s;
  $('#modals').appendChild(bg); modals.push(bg);
  bg.addEventListener('mousedown', e => { if (e.target === bg) closeModal(bg); });
  const first = bg.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea');
  if (first && !o.noFocus) first.focus();
  return bg;
}
function closeModal(bg) {
  bg = bg || modals[modals.length - 1];
  if (!bg) return;
  const i = modals.indexOf(bg); if (i >= 0) modals.splice(i, 1);
  bg.remove();
  if (bg._onClose) bg._onClose();
}
const closeAllModals = () => { while (modals.length) closeModal(); };
function confirmBox(o) {
  return new Promise(res => {
    const bg = openModal({
      title: o.title, narrow: true, noFocus: true,
      body: html`<div class="pre">${o.message}</div>`,
      footer: html`<button type="button" class="btn" data-act="cf-no">${o.cancel || 'Cancelar'}</button><button type="button" class="btn ${o.danger ? 'danger' : 'primary'}" data-act="cf-yes">${o.ok || 'Confirmar'}</button>`
    });
    bg._cf = res;
    bg._onClose = () => { if (bg._cf) { const r = bg._cf; bg._cf = null; r(false); } };
    const y = bg.querySelector('[data-act="cf-yes"]'); if (y) y.focus();
  });
}
ACTIONS['cf-yes'] = (d, t) => { const bg = t.closest('.modal-bg'); const r = bg._cf; bg._cf = null; closeModal(bg); if (r) r(true); };
ACTIONS['cf-no'] = (d, t) => closeModal(t.closest('.modal-bg'));
ACTIONS['modal-close'] = (d, t) => closeModal(t.closest('.modal-bg'));

function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || ''); el.textContent = msg; el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  const host = $('#toasts'); if (!host) return;
  host.appendChild(el); setTimeout(() => el.remove(), kind === 'err' ? 7000 : 3400);
}

/* ---------- gráficos (SVG próprio, desenhados em escala única) ---------- */
function niceMax(v) { if (!(v > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
function chartFrame(w, h, pad, max, fmt, labels, xAt) {
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (h - pad.t - pad.b) * (1 - i / 4);
    g += `<line class="gl" x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}"/><text x="${pad.l - 7}" y="${y + 3.5}" text-anchor="end">${esc(fmt(max * i / 4))}</text>`;
  }
  labels.forEach((lb, i) => { g += `<text x="${xAt(i).toFixed(1)}" y="${h - 8}" text-anchor="middle">${esc(lb)}</text>`; });
  return g;
}
const legendOf = series => series.length > 1 || (series[0] && series[0].name) ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
function lineChart(o) {
  const w = 640, h = 250, pad = { l: 44, r: 18, t: 16, b: 30 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const fmt = o.fmt || (v => Math.round(v * 10) / 10);
  const vals = o.series.flatMap(s => s.values).filter(v => v != null);
  const m = o.max != null ? o.max : niceMax(Math.max(1, ...vals));
  const X = i => pad.l + (o.labels.length <= 1 ? iw / 2 : iw * i / (o.labels.length - 1));
  const Y = v => pad.t + ih * (1 - v / m);
  let g = chartFrame(w, h, pad, m, fmt, o.labels, X);
  for (const s of o.series) {
    let d = '', pen = false;
    s.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)} `; pen = true; });
    g += `<path d="${d}" style="fill:none;stroke:${s.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.values.forEach((v, i) => { if (v != null) g += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="4" style="fill:${s.color};stroke:var(--surface)" stroke-width="2"><title>${esc(s.name)} · ${esc(o.labels[i])}: ${esc(fmt(v))}</title></circle>`; });
    const last = s.values.map((v, i) => [v, i]).filter(x => x[0] != null).pop();
    if (last && o.series.length === 1) g += `<text x="${X(last[1]).toFixed(1)}" y="${(Y(last[0]) - 10).toFixed(1)}" text-anchor="middle" style="fill:var(--ink);font-weight:700">${esc(fmt(last[0]))}</text>`;
  }
  return raw(`<div class="chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(o.aria || '')}">${g}</svg>${legendOf(o.series)}</div>`);
}
function barChart(o) {
  const w = 640, h = 250, pad = { l: 48, r: 12, t: 16, b: 30 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const fmt = o.fmt || (v => Math.round(v * 10) / 10);
  const m = o.max != null ? o.max : niceMax(Math.max(1, ...o.series.flatMap(s => s.values.map(v => v || 0))));
  const n = o.labels.length, k = o.series.length, gw = iw / n, bw = Math.min(34, gw * 0.72 / k);
  const X = i => pad.l + gw * i + gw / 2;
  let g = chartFrame(w, h, pad, m, fmt, o.labels, X);
  o.series.forEach((s, j) => s.values.forEach((v, i) => {
    if (!v) return;
    const bh = ih * v / m, x = pad.l + gw * i + (gw - bw * k) / 2 + bw * j, y = pad.t + ih - bh;
    g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="4" style="fill:${s.color}"><title>${esc(s.name)} · ${esc(o.labels[i])}: ${esc(fmt(v))}</title></rect>`;
    if (n <= 7 && k <= 2) g += `<text x="${(x + bw / 2 - 1).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" style="fill:var(--ink);font-weight:700">${esc(fmt(v))}</text>`;
  }));
  return raw(`<div class="chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(o.aria || '')}">${g}</svg>${legendOf(o.series)}</div>`);
}
