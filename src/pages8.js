/* ============================================================
   pages8.js — Área dos Responsáveis (somente leitura)
   Conta do responsável -> portal/<conta> com os filhos ligados.
   ============================================================ */
const G = () => !!(PT_PREVIEW.guardian || (S.mode === 'aluno' && S.portal && S.portal.guardian));
const G_TABS = [['resumo', 'Resumo', 'home'], ['homework', 'Homework', 'pencil'], ['aulas', 'Aulas', 'book'], ['progresso', 'Progresso', 'route'], ['dados', 'Dados', 'contract'], ['financeiro', 'Financeiro', 'wallet']];
ACTIONS['g-kid'] = d => { UI.gKid = d.id; render(); };
ACTIONS['g-tab'] = d => { UI.gTab = d.tab; render(); window.scrollTo && window.scrollTo(0, 0); };

function gHwList(d, limit) {
  const order = { refazer: 0, atrasada: 1, pendente: 2, entregue: 3, corrigida: 4 };
  const rows = [...(d.homework || [])].sort((a, b) => (order[a.key] ?? 9) - (order[b.key] ?? 9) || cmpStr(b.dueDate || '', a.dueDate || ''));
  const shown = limit ? rows.slice(0, limit) : rows;
  const item = h => html`<div class="pt-hw ${h.key}"><span class="ic">${ico((HW_UI[h.key] || HW_UI.pendente)[1])}</span><span class="grow"><b>${h.title}</b><small>${h.dueDate ? 'Prazo ' + fmtDateShort(h.dueDate) : 'Sem prazo'}${h.key === 'corrigida' && h.score != null ? ' · nota ' + String(h.score).replace('.', ',') + '/' + String(h.maxScore || 10).replace('.', ',') : ''}</small>${h.key === 'corrigida' && h.feedback ? html`<small class="pre" style="display:block;margin-top:4px">${h.feedback}</small>` : ''}</span>${hwChip(h.key)}</div>`;
  return { rows, html: shown.length ? html`<div class="pt-hws">${shown.map(item)}</div>` : html`<p class="muted small" style="margin:0">Nenhuma atividade por enquanto.</p>` };
}
function gFinance(d) {
  const f = d.finance; if (!f) return html`<section class="pt-card"><p class="muted small" style="margin:0">As informações financeiras não estão liberadas.</p></section>`;
  const tone = { pago: 'ok', pendente: '', atrasado: 'bad', parcial: 'warn' };
  return html`<section class="pt-card"><h2>${ico('wallet')} Mensalidade</h2>
    <div class="pt-tiles"><div><b>${f.monthly ? money(f.monthly) : '—'}</b><small>valor mensal</small></div><div><b>${f.dueDay ? 'dia ' + f.dueDay : '—'}</b><small>vencimento</small></div><div><b>${f.payMethod || '—'}</b><small>forma de pagamento</small></div></div>
    ${f.payInfo ? html`<h3 class="small muted" style="margin:14px 0 4px;font-weight:700">DADOS PARA PAGAMENTO</h3><div class="pre">${f.payInfo}</div>` : ''}</section>
  <section class="pt-card"><h2>Cobranças</h2>${f.charges.length ? html`<div class="tablewrap"><table class="tbl"><thead><tr><th>Mês</th><th>Vencimento</th><th class="num">Valor</th><th class="num">Pago</th><th>Situação</th></tr></thead><tbody>${f.charges.map(c => html`<tr><td>${fmtMonth(c.refMonth)}</td><td>${c.dueDate ? fmtDate(c.dueDate) : '—'}</td><td class="num">${money(c.amount)}</td><td class="num">${money(c.paid + c.discount)}</td><td>${badge(labelOf(PAY_STATUS, c.status), tone[c.status] || '')}</td></tr>`)}</tbody></table></div>` : html`<p class="muted small" style="margin:0">Nenhuma cobrança registrada ainda.</p>`}
    <p class="tiny muted" style="margin:12px 0 0">Informativo: aparece como pago somente depois que a professora registra o pagamento. Dúvidas? Fale com a professora.</p></section>`;
}
function gResumo(d) {
  const hw = gHwList(d, 4), pend = hw.rows.filter(h => ['pendente', 'atrasada', 'refazer'].includes(h.key)).length, ev = stageEvolution(d.stages || [], todayISO());
  return html`${ptNext(d)}
  <section class="pt-card"><h2>${ico('pencil')} Homework</h2>${pend ? html`<p class="small" style="margin:0 0 10px"><b>${pend}</b> ${pend === 1 ? 'atividade aguarda' : 'atividades aguardam'} o aluno.</p>` : html`<p class="small muted" style="margin:0 0 10px">Tudo em dia.</p>`}${hw.html}${hw.rows.length > 4 ? html`<p style="margin:12px 0 0">${btn('Ver todas', 'g-tab', { cls: 'sm', data: { tab: 'homework' } })}</p>` : ''}</section>
  ${ev.total ? html`<section class="pt-card"><h2>${ico('route')} Evolução</h2><div class="pt-tiles"><div><b>${ev.pctDone}%</b><small>do cronograma concluído</small></div><div><b>${ev.done}/${ev.total}</b><small>etapas concluídas</small></div><div><b>${d.lessonsDone}${d.lessonsTotal ? '/' + d.lessonsTotal : ''}</b><small>aulas realizadas</small></div></div></section>` : ''}
  ${(d.calendar || {}).url ? html`<section class="pt-card"><h2>${ico('calendar')} Calendar</h2><p style="margin:0">${linkBtn(d.calendar.url, 'Abrir calendário', 'calendar')}</p></section>` : ''}`;
}
function guardianView(doc) {
  const kids = (doc && doc.kids) || [];
  if (!kids.length) return html`<div class="card">${empty('Nenhum aluno ligado a esta conta', 'Peça à professora para ligar o aluno a esta conta de responsável.')}</div>`;
  const kid = kids.find(k => k.studentId === UI.gKid) || kids[0];
  const tabs = G_TABS.filter(t => t[0] !== 'financeiro' || kid.finance);
  const tab = tabs.some(t => t[0] === UI.gTab) ? UI.gTab : 'resumo';
  const pend = (kid.homework || []).filter(h => ['pendente', 'atrasada', 'refazer'].includes(h.key)).length;
  const body = { resumo: gResumo, homework: d => html`<section class="pt-card"><h2>${ico('pencil')} Homework</h2><p class="small muted" style="margin:0 0 10px">Acompanhamento somente leitura: situação, nota e comentário da professora.</p>${gHwList(d).html}</section>`, aulas: ptClasses, progresso: ptProgress, dados: ptData, financeiro: gFinance }[tab](kid);
  return html`${kids.length > 1 ? html`<div class="pt-kids" role="tablist" aria-label="Alunos">${kids.map(k => html`<button type="button" role="tab" class="btn${k === kid ? ' primary' : ''}" aria-selected="${k === kid}" data-act="g-kid" data-id="${k.studentId}">${k.name}</button>`)}</div>` : ''}
  ${bannerHtml(kid.banner)}<nav class="pt-tabs" role="tablist" aria-label="Seções do painel">${tabs.map(([k, l, ic]) => html`<button type="button" role="tab" aria-selected="${tab === k}" data-act="g-tab" data-tab="${k}">${ico(ic)}<span>${l}</span>${k === 'homework' && pend ? html`<i class="cnt">${pend}</i>` : ''}</button>`)}</nav><div class="pt-stack">${body}</div>`;
}
function guardianPage() {
  const d = S.portal, first = String(UI.userName || '').split(' ')[0];
  const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  return html`<div class="pt-wrap"><header class="pt-head"><img src="${LOGO}" alt="Logo Teacher Gabriela Campos"><div class="grow"><div class="pt-brand">${BRAND.name}</div><small>${BRAND.sub}</small></div><button type="button" class="icon-btn" data-act="toggle-theme" aria-label="Alternar tema claro e escuro">${ico(dark ? 'sun' : 'moon')}</button><button type="button" class="btn sm" data-act="pw-open">Senha</button><button type="button" class="btn sm" data-act="logout">Sair</button></header>
  <div class="pt-hello"><h1>Olá${first ? ', ' + first : ''}!</h1><p class="muted">Painel dos responsáveis · somente leitura</p>${S.syncError ? html`<p class="small" style="color:var(--bad)">Sem conexão com o servidor. Os dados abaixo podem estar desatualizados.</p>` : ''}${d && d.updatedAt ? html`<p class="tiny muted">Atualizado em ${fmtDT(d.updatedAt)}</p>` : ''}</div>
  ${guardianView(d)}<footer class="pt-foot">${BRAND.name} · ${BRAND.sub}</footer></div>`;
}

/* ---------- professora: ligar responsáveis ---------- */
S.names = {};
async function guardNames(ids) {
  const miss = ids.filter(i => !(i in S.names));
  if (miss.length && NS.user && NS.user.profiles) { try { const ps = await NS.user.profiles(miss); for (const i of miss) S.names[i] = (ps && ps[i] && ps[i].name) || ''; } catch (e) { for (const i of miss) S.names[i] = ''; } }
}
async function renderGuardList(sid) {
  const box = $('#guard-list'); if (!box) return;
  const s = M.students.get(sid); if (!s) return; const ids = s.guardians || [];
  await guardNames(ids); const b2 = $('#guard-list'); if (!b2) return;
  b2.innerHTML = ids.length ? ids.map(id => `<div class="item"><div class="grow"><div class="t">${esc(S.names[id] || 'Conta sem nome')}</div><div class="small muted">${S.guardAt[id] ? 'publicado ' + esc(fmtDT(S.guardAt[id])) : 'ainda não publicado nesta sessão'}</div></div><button type="button" class="btn sm" data-act="guard-rm" data-id="${esc(id)}" data-student="${esc(sid)}">Remover</button></div>`).join('') : '<p class="muted small" style="margin:0">Nenhum responsável ligado.</p>';
}
function openGuardians(sid) {
  const s = M.students.get(sid); if (!s) return;
  openModal({ title: 'Responsáveis de ' + s.name, body: html`<div class="stack">
    <p class="small muted" style="margin:0">O responsável abre o mesmo link do painel com o próprio e-mail e senha e vê, somente para leitura: próxima aula e Zoom, calendário, contrato, cadastro, relatórios, homework com notas e (se marcado) financeiro. Uma conta pode acompanhar vários alunos.</p>
    <div id="guard-list" class="list" aria-live="polite"></div>
    <label class="chk"><input type="checkbox" data-change="guard-fin" data-id="${sid}"${s.guardFin !== false ? raw(' checked') : ''}> Mostrar o financeiro (mensalidade e situação das cobranças, só informativo)</label>
    <form data-form="acct-create" class="stack" data-student="${sid}" data-role="responsavel"><b class="small">Criar acesso de responsável</b>
      <label class="fld"><span>Nome</span><input name="name" required maxlength="120"></label>
      <label class="fld"><span>E-mail</span><input name="email" type="email" required autocomplete="off"></label>
      <label class="fld"><span>Senha provisória (8+ caracteres)</span><input name="password" type="text" minlength="8" required autocomplete="off"></label>
      <button type="submit" class="btn primary">Criar acesso e ligar</button></form>
    <label class="fld"><span>Ou ligar uma conta de responsável que já existe</span><input id="guard-q" type="search" autocomplete="off" placeholder="Digite o nome ou e-mail…" data-input="guard-search" data-student="${sid}"></label>
    <div id="guard-res" class="list" aria-live="polite"></div></div>` });
  renderGuardList(sid);
}
ACTIONS['guard-open'] = d => openGuardians(d.id);
CHANGES['guard-fin'] = async (v, t) => { const s = M.students.get(t.dataset.id); if (!s) return; await put('students', { ...s, guardFin: !!v }); toast(v ? 'Financeiro visível aos responsáveis.' : 'Financeiro oculto dos responsáveis.', 'ok'); };
let guardSeq = 0;
INPUTS['guard-search'] = async (v, t) => {
  const seq = ++guardSeq, box = $('#guard-res'); if (!box || !NS.user || !NS.user.search) return;
  let hits = []; try { hits = await NS.user.search(String(v || ''), 'responsavel'); } catch (e) { hits = []; }
  if (seq !== guardSeq || !$('#guard-res')) return;
  const sid = t.dataset.student, s = M.students.get(sid), have = (s && s.guardians) || [];
  hits = hits.filter(h => h.id && h.id !== UID && !have.includes(h.id));
  box.innerHTML = hits.length ? hits.slice(0, 20).map(h => `<button type="button" class="item" data-act="guard-pick" data-id="${esc(h.id)}" data-student="${esc(sid)}"><img src="${esc(h.avatarUrl)}" alt="" width="32" height="32" style="border-radius:50%"><div class="grow"><div class="t">${esc(h.name || 'Conta sem nome')}</div></div></button>`).join('') : '<p class="muted small" style="margin:0">Ninguém encontrado. Confira se a pessoa aceitou o convite em Compartilhar.</p>';
};
ACTIONS['guard-pick'] = async d => {
  const s = M.students.get(d.student); if (!s) return;
  const own = S.students.find(x => x.accountId === d.id);
  if (own) { toast(`Essa conta já é o acesso do aluno ${own.name}. Use outra conta para o responsável.`, 'err'); return; }
  await put('students', { ...s, guardians: [...(s.guardians || []), d.id] });
  try { await publishGuardian(d.id); toast('Responsável ligado e painel publicado.', 'ok'); } catch (e) { toast('Ligado, mas a publicação falhou: ' + errMsg(e), 'err'); }
  const q = $('#guard-q'); if (q) q.value = ''; const r = $('#guard-res'); if (r) r.innerHTML = '';
  renderGuardList(d.student);
};
ACTIONS['guard-rm'] = async d => {
  const s = M.students.get(d.student); if (!s) return;
  if (!await confirmBox({ title: 'Remover responsável', message: `Essa conta deixa de ver ${s.name}. Se ela não acompanhar mais nenhum aluno, o painel dela é apagado.`, ok: 'Remover' })) return;
  await put('students', { ...s, guardians: (s.guardians || []).filter(x => x !== d.id) });
  try { await publishGuardian(d.id); } catch (e) { toast('Removido, mas não foi possível atualizar o painel: ' + errMsg(e), 'err'); }
  toast('Responsável removido.', 'ok'); renderGuardList(d.student);
};
ACTIONS.previaresp = d => go('previaresp-' + d.id);
VIEWS.previaresp = id => {
  const s = M.students.get(id);
  if (!s) return html`<div class="card">${empty('Aluno não encontrado', '', btn('Voltar', 'go', { data: { to: 'portal' } }))}</div>`;
  PT_PREVIEW.guardian = true; UI.gKid = id;
  try {
    return html`<div class="banner"><span>${ico('eye')} Prévia: é assim que o responsável de ${s.name} vê o painel (somente leitura).</span><span class="spacer"></span>${btn('Voltar', 'go', { cls: 'sm', data: { to: 'portal' } })}</div>
    <div class="preview-frame">${guardianView(guardianDoc([id], D(), todayISO(), nowKey(), { banner: S.settings.banner, guide: S.settings.guide }))}</div>`;
  } finally { PT_PREVIEW.guardian = false; }
};

/* ---------- avisos por WhatsApp (um clique seu abre a conversa com o texto pronto) ---------- */
const NTF = { sid: '', kind: 'painel', hid: '' };
function waNumber(x) { let d = String(x || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.length === 10 || d.length === 11) d = '55' + d; return d.length >= 12 && d.length <= 15 ? d : ''; }
function ntfText(who) {
  const s = M.students.get(NTF.sid), h = NTF.hid && M.homework.get(NTF.hid), f = String(s.name || '').split(' ')[0], r = who === 'resp', u = APP_URL;
  const t = h ? h.title : '', pz = h && h.dueDate ? ' (prazo ' + fmtDateShort(h.dueDate) + ')' : '';
  if (NTF.kind === 'hw') return r ? `Olá! Há uma nova atividade para ${f}: "${t}"${pz}. Acompanhe no painel: ${u}` : `Olá, ${f}! Uma nova atividade está no seu painel: "${t}"${pz}. Acesse: ${u}`;
  if (NTF.kind === 'corrigido') return r ? `Olá! A atividade "${t}" de ${f} foi corrigida. Veja a nota e o comentário no painel: ${u}` : `Olá, ${f}! Sua atividade "${t}" foi corrigida e devolvida. Veja a nota e o comentário no painel: ${u}`;
  return r ? `Olá! O painel de aulas de ${f} foi atualizado. Acesse: ${u}` : `Olá, ${f}! Seu painel de aulas foi atualizado. Acesse: ${u}`;
}
function ntfSync(setText) {
  const who = $('#ntf-who').value, s = M.students.get(NTF.sid), num = waNumber(who === 'resp' ? s.guardianPhone : s.phone), ta = $('#ntf-text'), a = $('#ntf-a'), hint = $('#ntf-hint');
  if (setText) ta.value = ntfText(who);
  if (num) { a.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(ta.value); a.removeAttribute('aria-disabled'); hint.textContent = ''; }
  else { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); hint.textContent = 'Sem telefone válido para este destinatário. Cadastre em Alunos > editar (com DDD).'; }
}
ACTIONS['ntf-open'] = d => {
  const s = M.students.get(d.id); if (!s) return;
  Object.assign(NTF, { sid: d.id, kind: d.kind || 'painel', hid: d.hid || '' });
  const first = waNumber(s.phone) || !waNumber(s.guardianPhone) ? 'aluno' : 'resp';
  openModal({ title: 'Avisar ' + s.name.split(' ')[0], narrow: true, body: html`<div class="stack">
    <p class="small muted" style="margin:0">O site não envia mensagem sozinho. Aqui você confere o texto e, ao clicar em <b>Abrir WhatsApp</b>, a conversa abre com tudo pronto: é só apertar enviar. Nenhum aviso de cobrança é gerado por aqui.</p>
    <label class="fld"><span>Para</span><select id="ntf-who" data-change="ntf-who"><option value="aluno"${first === 'aluno' ? raw(' selected') : ''}>Aluno${s.phone ? ' · ' + s.phone : ' (sem telefone)'}</option><option value="resp"${first === 'resp' ? raw(' selected') : ''}>Responsável${s.guardianPhone ? ' · ' + s.guardianPhone : ' (sem telefone)'}</option></select></label>
    <label class="fld"><span>Mensagem (você pode editar)</span><textarea id="ntf-text" rows="5" data-input="ntf-upd"></textarea></label>
    <p id="ntf-hint" class="small" style="color:var(--bad);margin:0" aria-live="polite"></p>
    ${s.email ? html`<p class="small muted" style="margin:0">E-mail do aluno: ${s.email}. Para e-mail, use <b>Copiar mensagem</b> e cole no seu e-mail.</p>` : ''}</div>`,
    footer: html`<span class="spacer"></span>${btn('Copiar mensagem', 'ntf-copy', { icon: 'copy' })}<a id="ntf-a" class="btn primary" target="_blank" rel="noopener noreferrer">${ico('send')} Abrir WhatsApp</a>` });
  ntfSync(true);
};
CHANGES['ntf-who'] = () => ntfSync(true);
INPUTS['ntf-upd'] = () => ntfSync(false);
ACTIONS['ntf-copy'] = async () => { const ta = $('#ntf-text'); try { await navigator.clipboard.writeText(ta.value); toast('Mensagem copiada.', 'ok'); } catch (e) { ta.focus(); ta.select(); toast('Selecione e copie a mensagem na caixa.', 'err'); } };
