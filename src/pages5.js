/* ============================================================
   pages5.js — Materiais, Objetivos, Tarefas, Configurações
   ============================================================ */

/* =================== MATERIAIS =================== */
const matUrl = m => m.assetId ? fileUrl(m.assetId) : (m.link || '');
const matUsage = id => ({
  lessons: S.lessons.filter(l => (l.materials || []).includes(id)),
  plans: S.plans.filter(p => planActivities(p).some(a => a.materialId === id))
});
function openMaterialForm(id, opts) {
  opts = opts || {};
  const old = id ? M.materials.get(id) : null;
  const m = old || { title: '', category: 'pdf', skill: '', level: '', description: '', link: '', tags: [], studentIds: opts.studentIds || [], showStudent: !!opts.studentIds };
  const canUpload = !!NS.assets;
  openModal({
    title: old ? 'Editar material' : 'Novo material', wide: true, form: { name: 'material', id: id || '' }, body: html`
    <div class="g2">${fld('Título *', input('title', m.title, { a: { required: true, maxlength: 160 } }))}${fld('Categoria', select('category', MAT_CAT, m.category))}</div>
    <div class="g3">${fld('Habilidade', select('skill', [['', '—'], ...SKILLS], m.skill || ''))}${fld('Nível', select('level', [['', 'Qualquer'], ...LEVELS], m.level || ''))}${fld('Etiquetas (separe por vírgula)', input('tags', (m.tags || []).join(', ')))}</div>
    ${fld('Descrição', textarea('description', m.description, { rows: 2 }))}
    <label class="chk"><input type="checkbox" name="showStudent" value="1"${m.showStudent ? raw(' checked') : ''}> Mostrar na área do aluno (slides, PDFs e links da aula; se você marcar alunos abaixo, só eles veem)</label>
    <div class="g2">${fld('Link (site, vídeo, drive…)', input('link', m.link, { type: 'url', a: { placeholder: 'https://…' } }))}
      ${canUpload ? fld('Ou enviar um arquivo (até 20 MB)', html`<input type="file" name="file" id="f_file">`, { hint: m.assetId ? 'Arquivo atual: ' + (m.fileName || 'anexo') + '. Enviar outro substitui o atual.' : 'PDF, imagem, áudio, vídeo, texto…' }) : html`<p class="hint">O envio de arquivos exige permissão de edição nesta página. Você pode guardar o link do material.</p>`}</div>
    <div class="fld"><span>Associar a alunos</span>${S.students.length ? checks('studentIds', [...S.students].sort((a, b) => cmpStr(a.name, b.name)).map(s => [s.id, s.name]), m.studentIds, 'checks scrollbox') : html`<div class="hint">Nenhum aluno cadastrado.</div>`}</div>`
  });
}
FORMS.material = async (v, form, ds) => {
  const old = ds.id ? M.materials.get(ds.id) : null;
  const title = v.title.trim(); if (!title) { toast('Informe o título.', 'err'); return; }
  const file = form.elements.file && form.elements.file.files[0];
  let assetId = old ? old.assetId || '' : '', fileName = old ? old.fileName || '' : '';
  if (file) {
    if (file.size > 20 * 1024 * 1024) { toast('O arquivo passa de 20 MB.', 'err'); return; }
    if (!NS.assets) { toast('O envio de arquivos não está disponível. Use um link.', 'err'); return; }
    try { const up = await NS.assets.upload(file); assetId = up.id; fileName = file.name; } catch (e) { toast('Não foi possível enviar o arquivo: ' + errMsg(e), 'err'); return; }
  }
  if (!assetId && !v.link.trim() && !old) { /* material sem arquivo/link é permitido (ex.: livro físico) */ }
  await put('materials', { ...(old || { createdAt: nowKey() }), title, category: v.category, skill: v.skill, level: v.level, description: v.description, link: v.link.trim(), tags: v.tags.split(',').map(s => s.trim()).filter(Boolean), studentIds: v.studentIds || [], showStudent: v.showStudent === '1', assetId, fileName });
  closeModal(); toast(old ? 'Material atualizado.' : 'Material salvo na biblioteca.', 'ok');
};
ACTIONS['mat-new'] = () => openMaterialForm();
ACTIONS['mat-del'] = async d => {
  const m = M.materials.get(d.id); if (!m) return; const u = matUsage(d.id);
  if (!await confirmBox({ title: 'Excluir material?', message: `${u.lessons.length || u.plans.length ? `Ele aparece em ${u.lessons.length} aula(s) e ${u.plans.length} plano(s); esses vínculos deixam de mostrar o material.\n\n` : ''}${m.assetId ? 'O arquivo enviado também será apagado.' : 'O registro será removido da biblioteca.'}`, danger: true, ok: 'Excluir' })) return;
  await releaseAsset(m.assetId);
  await del('materials', d.id); closeAllModals(); toast('Material excluído.', 'ok');
};
ACTIONS['mat-new-group'] = d => { closeAllModals(); openMaterialForm(null, { studentIds: d.ids.split(',') }); };
ACTIONS['mat-edit'] = d => { closeAllModals(); openMaterialForm(d.id); };
ACTIONS['mat-open'] = d => {
  const m = M.materials.get(d.id); if (!m) return; const u = matUsage(d.id), url = matUrl(m);
  openModal({
    title: m.title, body: html`<div class="stack"><div class="row">${badge(labelOf(MAT_CAT, m.category), 'acc')}${m.skill ? skillTag(m.skill) : ''}${m.level ? badge(m.level) : ''}${demoTag(m)}</div>
    ${m.description ? html`<div class="pre">${m.description}</div>` : ''}${(m.tags || []).length ? html`<div class="row">${m.tags.map(t => badge('#' + t))}</div>` : ''}
    ${url ? html`<p><a class="btn primary" href="${url}" target="_blank" rel="noopener">${m.assetId ? 'Abrir arquivo' : 'Abrir link'}</a> ${m.fileName ? html`<span class="muted small">${m.fileName}</span>` : ''}</p>` : html`<p class="muted small">Sem arquivo ou link (material físico).</p>`}
    <dl class="kv"><dt>Alunos</dt><dd>${(m.studentIds || []).length ? m.studentIds.map(stName).join(', ') : 'Nenhum'}</dd><dt>Usado em</dt><dd>${u.lessons.length} aula(s) · ${u.plans.length} plano(s)</dd></dl></div>`,
    footer: html`${iconBtn('trash', 'mat-del', 'Excluir', { id: d.id }, 'danger')}<span class="spacer"></span>${btn('Editar', 'mat-edit', { data: { id: d.id }, icon: 'edit' })}`
  });
};
VIEWS.materiais = () => {
  const f = getF('mat', { q: '', cat: '', skill: '', student: '' }), q = norm(f.q);
  const list = S.materials.filter(m => (!f.cat || m.category === f.cat) && (!f.skill || m.skill === f.skill) && (!f.student || (m.studentIds || []).includes(f.student)) && (!q || norm([m.title, m.description, (m.tags || []).join(' ')].join(' ')).includes(q))).sort((a, b) => cmpStr(a.title, b.title));
  return html`${pageHead('Biblioteca de Materiais', 'Guarde PDFs, links, vídeos e worksheets e associe aos alunos, aulas e planos.', btn('Novo material', 'mat-new', { cls: 'primary', icon: 'plus' }))}
  <div class="filters"><div class="grow"><input type="search" id="mat-q" placeholder="Buscar por título, descrição ou etiqueta" value="${f.q}" data-input="filter" data-page="mat" data-key="q" aria-label="Buscar materiais"></div>
  ${select('cat', [['', 'Todas as categorias'], ...MAT_CAT], f.cat, { id: 'mat-cat', a: { 'data-change': 'filter', 'data-page': 'mat', 'data-key': 'cat', 'aria-label': 'Categoria' } })}
  ${select('skill', [['', 'Todas as habilidades'], ...SKILLS], f.skill, { id: 'mat-sk', a: { 'data-change': 'filter', 'data-page': 'mat', 'data-key': 'skill', 'aria-label': 'Habilidade' } })}
  ${select('student', studentOptions({ blank: 'Todos os alunos', includeInactive: true }), f.student, { id: 'mat-st', a: { 'data-change': 'filter', 'data-page': 'mat', 'data-key': 'student', 'aria-label': 'Aluno' } })}</div>
  ${list.length ? html`<div class="cards">${limited('mat', list).map(m => { const u = matUsage(m.id); return html`<div class="card"><div class="row"><button type="button" class="link" style="font-weight:700;text-align:left" data-act="mat-open" data-id="${m.id}">${m.title}</button>${demoTag(m)}</div>
    <div class="row">${badge(labelOf(MAT_CAT, m.category), 'acc')}${m.skill ? skillTag(m.skill) : ''}${m.level ? badge(m.level) : ''}</div>
    ${m.description ? html`<p class="small muted" style="margin:6px 0">${String(m.description).slice(0, 110)}</p>` : ''}
    <div class="small muted">${(m.studentIds || []).length} aluno(s) · usado em ${u.lessons.length} aula(s) e ${u.plans.length} plano(s)</div>
    <div class="row" style="margin-top:8px">${matUrl(m) ? html`<a class="btn sm primary" href="${matUrl(m)}" target="_blank" rel="noopener">Abrir</a>` : ''}${btn('Editar', 'mat-edit', { cls: 'sm', data: { id: m.id } })}${iconBtn('trash', 'mat-del', 'Excluir', { id: m.id }, 'danger')}</div></div>`; })}</div>${moreBtn('mat', list)}`
    : empty(S.materials.length ? 'Nenhum material encontrado' : 'Biblioteca vazia', S.materials.length ? 'Ajuste os filtros.' : 'Adicione links ou envie arquivos para reutilizar nas aulas.', S.materials.length ? '' : btn('Novo material', 'mat-new', { cls: 'primary' }))}`;
};

/* =================== OBJETIVOS =================== */
function openGoalForm(id, opts) {
  opts = opts || {};
  const old = id ? M.goals.get(id) : null;
  const g = old || { studentId: opts.studentId || '', name: '', skill: '', status: 'nao_iniciado', progress: 0, deadline: '', notes: '' };
  openModal({
    title: old ? 'Editar objetivo' : 'Novo objetivo de aprendizagem', form: { name: 'goal', id: id || '' }, body: html`
    ${fld('Aluno *', select('studentId', studentOptions({ keep: g.studentId, blank: 'Escolha o aluno…' }), g.studentId, { a: { required: true } }))}
    ${fld('Objetivo *', input('name', g.name, { a: { required: true, maxlength: 160, placeholder: 'Ex.: Conduzir reuniões em inglês' } }))}
    <div class="g3">${fld('Habilidade', select('skill', [['', '—'], ...SKILLS], g.skill || ''))}${fld('Situação', select('status', GOAL_STATUS, g.status))}${fld('Prazo (opcional)', input('deadline', g.deadline, { type: 'date' }))}</div>
    ${fld('Progresso (%)', input('progress', g.status === 'concluido' ? 100 : g.progress, { type: 'number', a: { min: 0, max: 100, step: 5 } }), { hint: 'Usado quando a situação é "Em andamento". Concluído = 100%.' })}
    ${fld('Observações', textarea('notes', g.notes, { rows: 2 }))}`,
    footer: ''
  });
  if (old) { const f = document.querySelector('#modals').lastElementChild.querySelector('.modal-f'); if (f) f.insertAdjacentHTML('afterbegin', `<button type="button" class="btn danger" data-act="goal-del" data-id="${esc(id)}" style="margin-right:auto">Excluir</button>`); }
}
FORMS.goal = async (v, f, ds) => {
  const old = ds.id ? M.goals.get(ds.id) : null; const name = v.name.trim();
  if (!v.studentId || !name) { toast('Informe aluno e objetivo.', 'err'); return; }
  await put('goals', { ...(old || { createdAt: nowKey() }), studentId: v.studentId, name, skill: v.skill, status: v.status, progress: v.status === 'concluido' ? 100 : v.status === 'nao_iniciado' ? 0 : clamp(num(v.progress, 0), 0, 99), deadline: v.deadline, notes: v.notes });
  closeModal(); toast('Objetivo salvo.', 'ok');
};
ACTIONS['goal-del'] = async d => {
  if (!await confirmBox({ title: 'Excluir objetivo?', message: 'Ele também deixa de aparecer nos planos semanais vinculados.', danger: true, ok: 'Excluir' })) return;
  await del('goals', d.id); closeAllModals(); toast('Objetivo excluído.', 'ok');
};
ACTIONS['goal-add'] = () => openGoalForm();
CHANGES['goal-status'] = (v, t) => { const g = M.goals.get(t.dataset.id); if (g) put('goals', { ...g, status: v, progress: v === 'concluido' ? 100 : v === 'nao_iniciado' ? 0 : (g.progress || 10) }); };
VIEWS.objetivos = () => {
  const f = getF('obj', { student: '', status: '' });
  const list = S.goals.filter(g => M.students.get(g.studentId) && (!f.student || g.studentId === f.student) && (!f.status || g.status === f.status));
  const by = new Map(); list.forEach(g => { if (!by.has(g.studentId)) by.set(g.studentId, []); by.get(g.studentId).push(g); });
  const groups = [...by.entries()].sort((a, b) => cmpStr(stName(a[0]), stName(b[0])));
  return html`${pageHead('Objetivos de Aprendizagem', 'Metas individuais com progresso. Aparecem no perfil do aluno, nos planos e nos relatórios.', btn('Novo objetivo', 'goal-add', { cls: 'primary', icon: 'plus' }))}
  <div class="filters">${select('student', studentOptions({ blank: 'Todos os alunos', includeInactive: true }), f.student, { id: 'obj-st', a: { 'data-change': 'filter', 'data-page': 'obj', 'data-key': 'student', 'aria-label': 'Aluno' } })}
  ${select('status', [['', 'Todas as situações'], ...GOAL_STATUS], f.status, { id: 'obj-status', a: { 'data-change': 'filter', 'data-page': 'obj', 'data-key': 'status', 'aria-label': 'Situação' } })}</div>
  ${groups.length ? html`<div class="stack">${groups.map(([sid, gs]) => html`<div class="card"><div class="card-h"><div class="who">${avatar(M.students.get(sid), 32)}<h2>${stName(sid)}</h2></div>${btn('Abrir aluno', 'open-student', { cls: 'sm', data: { id: sid } })}</div>
    <div class="list">${gs.map(g => html`<div class="item"><div class="grow"><div class="t">${g.name} ${demoTag(g)}</div>${bar(goalPct(g))}${g.deadline ? html`<div class="small muted">Prazo: ${fmtDate(g.deadline)}</div>` : ''}</div>${g.skill ? skillTag(g.skill) : ''}<span class="small num">${goalPct(g)}%</span>
      <select aria-label="Situação" data-change="goal-status" data-id="${g.id}" style="width:auto">${GOAL_STATUS.map(([k, l]) => html`<option value="${k}"${g.status === k ? raw(' selected') : ''}>${l}</option>`)}</select>${iconBtn('edit', 'goal-edit', 'Editar', { id: g.id })}</div>`)}</div></div>`)}</div>`
    : empty(S.goals.length ? 'Nenhum objetivo neste filtro' : 'Nenhum objetivo cadastrado', S.goals.length ? 'Mude os filtros.' : 'Defina metas para cada aluno e acompanhe o progresso.', S.goals.length ? '' : btn('Novo objetivo', 'goal-add', { cls: 'primary' }))}`;
};

/* =================== TAREFAS =================== */
function openTaskForm(id) {
  const old = id ? M.tasks.get(id) : null;
  const t = old || { title: '', category: 'Preparar aula', priority: 'media', dueDate: todayISO(), studentId: '', notes: '', done: false };
  openModal({
    title: old ? 'Editar tarefa' : 'Nova tarefa', narrow: true, form: { name: 'task', id: id || '' }, body: html`
    ${fld('Tarefa *', input('title', t.title, { a: { required: true, maxlength: 160 } }))}
    <div class="g2">${fld('Categoria', select('category', TASK_CAT, t.category))}${fld('Prioridade', select('priority', TASK_PRIORITY, t.priority))}</div>
    <div class="g2">${fld('Prazo', input('dueDate', t.dueDate, { type: 'date' }))}${fld('Aluno (opcional)', select('studentId', studentOptions({ keep: t.studentId, blank: '—', includeInactive: true }), t.studentId || ''))}</div>
    ${fld('Observações', textarea('notes', t.notes, { rows: 2 }))}`
  });
}
FORMS.task = async (v, f, ds) => {
  const old = ds.id ? M.tasks.get(ds.id) : null; const title = v.title.trim();
  if (!title) { toast('Informe a tarefa.', 'err'); return; }
  await put('tasks', { ...(old || { done: false, createdAt: nowKey() }), title, category: v.category, priority: v.priority, dueDate: v.dueDate, studentId: v.studentId, notes: v.notes });
  closeModal(); toast('Tarefa salva.', 'ok');
};
ACTIONS['task-new'] = () => openTaskForm();
ACTIONS['task-edit'] = d => openTaskForm(d.id);
ACTIONS['task-toggle'] = async d => { const t = M.tasks.get(d.id); if (t) await put('tasks', { ...t, done: !t.done, doneDate: !t.done ? todayISO() : '' }); };
ACTIONS['task-del'] = async d => {
  if (!await confirmBox({ title: 'Excluir tarefa?', message: 'A tarefa será removida.', danger: true, ok: 'Excluir' })) return;
  await del('tasks', d.id); toast('Tarefa excluída.', 'ok');
};
const PRIO_ORDER = { alta: 0, media: 1, baixa: 2 }, PRIO_TONE = { alta: 'bad', media: 'warn', baixa: '' };
const taskItem = (t, today) => html`<div class="item"><button type="button" class="icon-btn" data-act="task-toggle" data-id="${t.id}" aria-label="${t.done ? 'Reabrir tarefa' : 'Concluir tarefa'}" aria-pressed="${!!t.done}" style="${t.done ? 'color:var(--ok)' : ''}">${ico('check')}</button>
  <div class="grow"><div class="t" style="${t.done ? 'text-decoration:line-through;opacity:.7' : ''}">${t.title} ${demoTag(t)}</div><div class="small muted">${t.category || ''}${t.studentId ? ' · ' + stName(t.studentId) : ''}${t.dueDate ? ' · ' + fmtDate(t.dueDate) : ''}</div></div>
  ${badge(labelOf(TASK_PRIORITY, t.priority), PRIO_TONE[t.priority])}${iconBtn('edit', 'task-edit', 'Editar', { id: t.id })}${iconBtn('trash', 'task-del', 'Excluir', { id: t.id }, 'danger')}</div>`;
VIEWS.tarefas = () => {
  const today = todayISO(), open = S.tasks.filter(t => !t.done), byP = (a, b) => (PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]) || cmpStr(a.dueDate || '9', b.dueDate || '9');
  const groups = [['Atrasadas', open.filter(t => t.dueDate && t.dueDate < today), 'bad'], ['Hoje', open.filter(t => t.dueDate === today)], ['Próximas', open.filter(t => t.dueDate && t.dueDate > today)], ['Sem prazo', open.filter(t => !t.dueDate)]];
  const done = S.tasks.filter(t => t.done).sort((a, b) => cmpStr(b.doneDate || '', a.doneDate || ''));
  const dn = getF('task', {}).showDone;
  return html`${pageHead('Tarefas da Professora', 'Seus afazeres de preparação, correção e organização.', btn('Nova tarefa', 'task-new', { cls: 'primary', icon: 'plus' }))}
  ${S.tasks.length ? html`<div class="stack">${groups.filter(g => g[1].length).map(([l, ts, tone]) => html`<div class="card"><div class="card-h"><h2>${l} (${ts.length})</h2></div><div class="list">${ts.sort(byP).map(t => taskItem(t, today))}</div></div>`)}
    ${!open.length ? html`<div class="card">${empty('Tudo em dia', 'Nenhuma tarefa aberta.')}</div>` : ''}
    <div class="card"><div class="card-h"><h2>Concluídas (${done.length})</h2>${done.length ? btn(dn ? 'Ocultar' : 'Mostrar', 'task-showdone', { cls: 'sm' }) : ''}</div>${dn ? html`<div class="list">${done.slice(0, 100).map(t => taskItem(t, today))}</div>` : ''}</div></div>`
    : empty('Nenhuma tarefa', 'Anote o que você precisa preparar, corrigir ou organizar.', btn('Nova tarefa', 'task-new', { cls: 'primary' }))}`;
};
ACTIONS['task-showdone'] = () => { const f = getF('task', {}); f.showDone = !f.showDone; render(); };

/* =================== CONFIGURAÇÕES =================== */
const LOCALES = [['pt-BR', 'Português (Brasil)'], ['en-US', 'English (US)'], ['es-ES', 'Español']];
const CURRENCIES = [['BRL', 'Real (BRL)'], ['USD', 'Dólar (USD)'], ['EUR', 'Euro (EUR)']];
FORMS.settings = async v => {
  const name = (v.platformName || '').trim() || 'English Teacher Hub';
  const methods = String(v.paymentMethods || '').split('\n').map(s => s.trim()).filter(Boolean);
  await saveSettings({
    teacherName: v.teacherName.trim(), platformName: name, businessName: v.businessName.trim(), businessEmail: v.businessEmail.trim(), businessPhone: v.businessPhone.trim(),
    locale: v.locale, currency: v.currency, theme: v.theme, density: v.density, weekStart: +v.weekStart,
    defaultDuration: clamp(parseInt(v.defaultDuration, 10) || 60, 5, 480), defaultMonthly: num(v.defaultMonthly, 0), defaultDueDay: clamp(parseInt(v.defaultDueDay, 10) || 10, 1, 31),
    absenceCountsPackage: v.absenceCountsPackage === '1', reportIntervalDays: clamp(parseInt(v.reportIntervalDays, 10) || 60, 7, 365), paymentMethods: methods.length ? methods : ['Pix', 'Dinheiro']
  });
  toast('Configurações salvas.', 'ok');
};
const CSV_SETS = {
  alunos: ['alunos', () => S.students, [['Nome', s => s.name], ['E-mail', s => s.email], ['Telefone', s => s.phone], ['Nível', s => s.level], ['Situação', s => s.status], ['Arquivado', s => s.archived ? 'sim' : 'não'], ['Início', s => s.startDate], ['Curso', s => s.courseType], ['Mensalidade', s => s.monthly], ['Vencimento (dia)', s => s.dueDay]]],
  aulas: ['aulas', () => [...S.lessons].sort((a, b) => cmpStr(lessonKey(a), lessonKey(b))), [['Data', l => l.date], ['Hora', l => l.time], ['Aluno', l => stName(l.studentId)], ['Tema', l => l.topic], ['Duração', l => l.duration], ['Tipo', l => labelOf(LESSON_TYPE, l.type)], ['Status', l => LS_SHORT[l.status] || l.status], ['Conteúdo', l => l.content]]],
  pagamentos: ['pagamentos', () => [...S.payments].sort((a, b) => cmpStr(a.date, b.date)), [['Data', p => p.date], ['Aluno', p => stName(p.studentId)], ['Referência', p => p.refMonth], ['Valor', p => p.amount], ['Desconto', p => p.discount || 0], ['Forma', p => p.method], ['Observações', p => p.notes]]],
  cobrancas: ['cobrancas', () => [...S.charges].sort((a, b) => cmpStr(a.refMonth, b.refMonth)), [['Referência', c => c.refMonth], ['Aluno', c => stName(c.studentId)], ['Valor', c => c.amount], ['Vencimento', c => c.dueDate], ['Pago', c => settleCharge(c, S.payments, todayISO()).paid], ['Saldo', c => settleCharge(c, S.payments, todayISO()).balance], ['Situação', c => labelOf(PAY_STATUS, settleCharge(c, S.payments, todayISO()).status)]]],
  homework: ['homework', () => [...S.homework].sort((a, b) => cmpStr(a.assignedDate, b.assignedDate)), [['Aluno', h => stName(h.studentId)], ['Título', h => h.title], ['Atribuída', h => h.assignedDate], ['Prazo', h => h.dueDate], ['Status', h => labelOf(HW_STATUS, h.status)], ['Nota', h => h.score], ['Nota máxima', h => h.maxScore]]],
  relatorios: ['relatorios', () => [...S.reports].sort((a, b) => cmpStr(a.periodEnd, b.periodEnd)), [['Aluno', r => stName(r.studentId)], ['Início', r => r.periodStart], ['Fim', r => r.periodEnd], ['Média', r => skillAvg(r)], ...SKILLS.map(([k, l]) => [l, r => scoreOf(r, k)])]],
  tarefas: ['tarefas', () => S.tasks, [['Tarefa', t => t.title], ['Categoria', t => t.category], ['Prioridade', t => labelOf(TASK_PRIORITY, t.priority)], ['Prazo', t => t.dueDate], ['Concluída', t => t.done ? 'sim' : 'não']]]
};
ACTIONS['csv-export'] = async d => {
  const [name, rows, cols] = CSV_SETS[d.set]; const list = rows();
  if (!list.length) { toast('Não há registros para exportar.', 'err'); return; }
  await saveFile(`${name}-${todayISO()}.csv`, new Blob([toCSV(list, cols)], { type: 'text/csv;charset=utf-8' }));
};
ACTIONS['backup-export'] = async () => {
  const ok = await saveFile(`backup-english-teacher-hub-${todayISO()}.json`, new Blob([JSON.stringify(backupObject(), null, 1)], { type: 'application/json' }));
  if (ok) { await saveSettings({ lastBackup: nowKey() }); }
};
ACTIONS['backup-restore'] = () => openModal({
  title: 'Restaurar backup', narrow: true, form: { name: 'restore', submit: 'Restaurar' }, body: html`
  ${fld('Arquivo de backup (.json)', html`<input type="file" name="file" accept=".json,application/json" required>`)}
  ${fld('Como restaurar', select('mode', [['merge', 'Mesclar: acrescenta e atualiza, sem apagar o que já existe'], ['replace', 'Substituir: apaga tudo e restaura somente o backup']], 'merge'))}
  <p class="hint">Antes de substituir, baixe um backup dos dados atuais.</p>`
});
FORMS.restore = async (v, form) => {
  const file = form.elements.file.files[0]; if (!file) { toast('Escolha o arquivo.', 'err'); return; }
  let obj, total;
  try { obj = JSON.parse(await file.text()); total = validateBackup(obj); } catch (e) { toast(e.message && !/JSON/.test(e.message) ? e.message : 'Não foi possível ler este arquivo. Ele precisa ser um backup .json do sistema.', 'err'); return; }
  const replace = v.mode === 'replace';
  if (!await confirmBox({ title: replace ? 'Substituir todos os dados?' : 'Restaurar backup?', message: `O backup tem ${total} registros (exportado em ${fmtDate(String(obj.exportedAt || '').slice(0, 10))}).${replace ? '\n\nTODOS os dados atuais serão apagados antes.' : '\n\nRegistros com o mesmo identificador serão sobrescritos.'}`, danger: replace, ok: replace ? 'Apagar e restaurar' : 'Restaurar' })) return;
  try { const n = await restoreBackup(obj, replace); closeModal(); toast(n + ' registros restaurados.', 'ok'); } catch (e) { toast('A restauração falhou: ' + errMsg(e), 'err'); }
};
ACTIONS['wipe-all'] = () => openModal({
  title: 'Apagar todos os dados', narrow: true, form: { name: 'wipe', submit: 'Apagar tudo' }, body: html`<p style="margin:0">Isso apaga <b>todos</b> os alunos, aulas, pagamentos e demais registros. Não dá para desfazer. Baixe um backup antes.</p>
  ${fld('Digite APAGAR para confirmar', input('word', '', { a: { autocomplete: 'off' } }))}`
});
FORMS.wipe = async v => {
  if (String(v.word).trim() !== 'APAGAR') { toast('Digite APAGAR para confirmar.', 'err'); return; }
  await wipeAll(); await saveSettings({ demoLoaded: false }); closeModal(); toast('Todos os dados foram apagados.', 'ok'); go('dashboard');
};
VIEWS.configuracoes = () => {
  const s = S.settings, st = { ok: 'conectado e salvo', sync: 'sincronizando…', off: 'sem conexão com o banco (alterações recentes podem não estar salvas)' }[syncState()], total = COLS.reduce((n, c) => n + S[c].length, 0);
  return html`${pageHead('Configurações', 'Perfil, preferências, dados e segurança.')}
  <form class="card form" data-form="settings" style="margin-bottom:var(--gap)"><div class="card-h"><h2>Perfil e preferências</h2></div>
    <div class="g2">${fld('Seu nome', input('teacherName', s.teacherName))}${fld('Nome do sistema', input('platformName', s.platformName, { a: { maxlength: 60 } }))}</div>
    <div class="g3">${fld('Nome do negócio', input('businessName', s.businessName))}${fld('E-mail de contato', input('businessEmail', s.businessEmail, { type: 'email' }))}${fld('Telefone', input('businessPhone', s.businessPhone))}</div>
    <div class="g4">${fld('Idioma de datas e números', select('locale', LOCALES, s.locale))}${fld('Moeda', select('currency', CURRENCIES, s.currency))}${fld('Tema', select('theme', [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']], s.theme))}${fld('Densidade', select('density', [['comfortable', 'Confortável'], ['compact', 'Compacta']], s.density))}</div>
    <div class="g4">${fld('Semana começa em', select('weekStart', [['1', 'Segunda'], ['0', 'Domingo']], String(s.weekStart)))}${fld('Duração padrão da aula (min)', input('defaultDuration', s.defaultDuration, { type: 'number', a: { min: 5, max: 480 } }))}${fld('Mensalidade padrão', input('defaultMonthly', s.defaultMonthly, { type: 'number', a: { min: 0, step: '0.01' } }))}${fld('Dia de vencimento padrão', input('defaultDueDay', s.defaultDueDay, { type: 'number', a: { min: 1, max: 31 } }))}</div>
    <div class="g2">${fld('Lembrar de relatório a cada (dias)', input('reportIntervalDays', s.reportIntervalDays, { type: 'number', a: { min: 7, max: 365 } }))}${fld('Falta desconta do pacote de aulas?', select('absenceCountsPackage', [['0', 'Não (padrão): só aulas realizadas descontam'], ['1', 'Sim: faltas também descontam']], s.absenceCountsPackage ? '1' : '0'))}</div>
    ${fld('Formas de pagamento (uma por linha)', textarea('paymentMethods', (s.paymentMethods || []).join('\n'), { rows: 4 }))}
    <div class="row"><button type="submit" class="btn primary">Salvar configurações</button></div></form>

  <div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h2>Onde seus dados ficam</h2></div>
    <p style="margin:0 0 8px">Os dados são gravados no banco de dados PostgreSQL do servidor da sua API. Eles continuam lá quando você fecha ou recarrega a página e aparecem em qualquer aparelho em que você entrar com a sua conta.</p>
    <dl class="kv"><dt>Conta</dt><dd>${UI.userName || 'sua conta'}</dd><dt>Registros</dt><dd>${total}</dd><dt>Sincronização</dt><dd>${st}</dd><dt>Último backup</dt><dd>${s.lastBackup ? fmtDT(s.lastBackup) : 'nunca'}</dd></dl>
    <div class="row" style="margin-top:10px">${btn('Trocar minha senha', 'pw-open', { icon: 'edit' })}${btn('Sair', 'logout')}</div>
    <p class="hint" style="margin:10px 0 0">Faça um backup de vez em quando e confira com quem hospeda o banco como são feitas as cópias de segurança. Não registre senhas nem dados de cartão.</p></div>

  <div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h2>Backup e exportação</h2></div>
    <div class="row">${btn('Baixar backup completo (JSON)', 'backup-export', { cls: 'primary', icon: 'download' })}${btn('Restaurar backup…', 'backup-restore', { icon: 'download' })}</div>
    <h3 class="small muted" style="margin:16px 0 8px">Planilhas (CSV, abrem no Excel e Google Sheets)</h3>
    <div class="row">${Object.entries(CSV_SETS).map(([k, v]) => btn(v[0][0].toUpperCase() + v[0].slice(1), 'csv-export', { cls: 'sm', data: { set: k } }))}</div></div>

  <div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h2>Dados de demonstração</h2></div>
    <p class="muted small" style="margin:0 0 10px">Alunos e registros fictícios (marcados DEMO) para você conhecer o sistema. Podem ser removidos a qualquer momento sem afetar seus dados reais.</p>
    <div class="row">${btn('Carregar dados de demonstração', 'demo-load', { icon: 'plus' })}${btn('Remover dados de demonstração', 'demo-remove')}</div></div>

  <div class="card"><div class="card-h"><h2>Zona de risco</h2></div><p class="muted small" style="margin:0 0 10px">Apaga tudo (reais e demonstração). Baixe um backup antes.</p>${btn('Apagar todos os dados…', 'wipe-all', { cls: 'danger' })}</div>`;
};
