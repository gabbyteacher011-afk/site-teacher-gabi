/* ============================================================
   pages1.js — Dashboard, Alunos, Perfil do aluno
   ============================================================ */
const QUICK = [['Cadastrar aluno', 'q-student', 'users'], ['Agendar aula', 'q-lesson', 'calendar'], ['Registrar aula', 'q-register', 'book'], ['Criar exercício', 'q-exercise', 'pencil'], ['Atribuir homework', 'q-homework', 'check'], ['Criar Weekly Study Plan', 'q-plan', 'plan'], ['Registrar pagamento', 'q-payment', 'wallet'], ['Criar relatório', 'q-report', 'chart']];
const quickGrid = () => html`<div class="quick">${QUICK.map(([l, a, i]) => html`<button type="button" class="btn" data-act="${a}">${ico(i)}${l}</button>`)}</div>`;
const quickDo = fn => () => { closeAllModals(); return fn(); };
ACTIONS['q-student'] = quickDo(() => openStudentForm());
ACTIONS['q-lesson'] = quickDo(() => openLessonForm());
ACTIONS['q-register'] = quickDo(() => openLessonForm(null, { register: true }));
ACTIONS['q-exercise'] = quickDo(() => openExerciseForm());
ACTIONS['q-homework'] = quickDo(() => openHomeworkForm());
ACTIONS['q-plan'] = quickDo(() => openPlanForm());
ACTIONS['q-payment'] = quickDo(() => openPaymentForm());
ACTIONS['q-report'] = quickDo(() => openReportForm());
ACTIONS['quick-add'] = () => openModal({ title: 'O que você quer fazer?', body: quickGrid() });
ACTIONS.lesson = d => openLessonDetail(d.id);

const ageOf = b => { if (!b) return null; const d = parseD(b), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--; return a; };
const scheduleText = s => (s.schedule || []).map(x => `${WD_SHORT[x.day]} ${x.time}`).join(' · ') || '—';
const lessonItem = (l, withDate) => html`<button type="button" class="item" data-act="lesson" data-id="${l.id}">
  <div class="grow"><div class="t">${stName(l.studentId)}</div><div class="muted small">${l.topic || 'Sem tema definido'}</div></div>
  <div class="right small"><b class="num">${withDate ? fmtDateShort(l.date) + ' · ' : ''}${l.time}</b><div class="muted">${l.duration || 60} min</div></div>${lessonBadge(l.status)}</button>`;
const nextLessonText = (id) => { const l = nextLessonOf(S.lessons, id, nowKey()); return l ? `${fmtDateShort(l.date)} ${l.time}` : '—'; };

/* =================== DASHBOARD =================== */
VIEWS.dashboard = () => {
  const today = todayISO(), now = nowKey(), ym = monthOf(today), Dd = D();
  const live = S.students.filter(s => !s.archived);
  const active = live.filter(s => s.status === 'ativo'), inactive = live.filter(s => s.status === 'inativo'), paused = live.filter(s => s.status === 'pausado');
  const todayL = S.lessons.filter(l => l.date === today && l.status !== 'cancelada' && l.status !== 'reagendada').sort((a, b) => cmpStr(a.time, b.time));
  const toDo = todayL.filter(l => l.status === 'agendada').length;
  const upcoming = S.lessons.filter(l => l.status === 'agendada' && lessonKey(l) >= now && l.date !== today).sort((a, b) => cmpStr(lessonKey(a), lessonKey(b))).slice(0, 6);
  const doneMonth = S.lessons.filter(l => l.status === 'realizada' && monthOf(l.date) === ym).length;
  const fin = monthFinance(ym, Dd, today), T = fin.totals;
  const rowsBy = st => fin.rows.filter(r => st.includes(r.status));
  const pend = rowsBy(['pendente', 'parcial']), late = rowsBy(['atrasado']);
  const hwCorrect = S.homework.filter(needsCorrection), hwReview = S.homework.filter(h => h.status === 'corrigida'), hwLate = S.homework.filter(h => isHwOverdue(h, today));
  const needRep = active.map(s => ({ s, why: needsReport(s, S.reports, S.lessons, today, S.settings.reportIntervalDays) })).filter(x => x.why);
  const pendingByStudent = active.map(s => ({ s, n: S.homework.filter(h => h.studentId === s.id && (h.status === 'atribuida' || h.status === 'em_andamento')).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
  const activePlans = S.plans.filter(p => planIsCurrent(p, today) && M.students.get(p.studentId));
  const lastReports = [...S.reports].sort((a, b) => cmpStr(b.date, a.date)).slice(0, 5);
  const hasDemo = S.settings.demoLoaded || S.students.some(s => s.demo);
  const name = S.settings.teacherName || UI.userName;

  return html`
  ${pageHead(`Olá${name ? ', ' + name.split(' ')[0] : ''}`, fmtDateLong(today).replace(/^./, c => c.toUpperCase()), '')}
  ${hasDemo ? html`<div class="banner"><span>${ico('alert')} Você está vendo dados de demonstração. Os alunos, aulas e valores marcados como DEMO são fictícios.</span><span class="spacer"></span>${btn('Remover dados de demonstração', 'demo-remove', { cls: 'sm' })}</div>` : ''}
  ${!S.students.length ? html`<div class="card" style="margin-bottom:var(--gap)">${empty('Bem-vinda ao seu espaço de trabalho', 'Comece cadastrando o primeiro aluno. Se preferir conhecer o sistema antes, carregue alunos fictícios de demonstração e remova quando quiser.', html`<div class="row" style="justify-content:center">${btn('Cadastrar primeiro aluno', 'q-student', { cls: 'primary', icon: 'plus' })}${btn('Carregar dados de demonstração', 'demo-load')}${btn('Configurar meu nome', 'go', { data: { to: 'configuracoes' } })}</div>`)}</div>` : ''}
  <div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h2>Ações rápidas</h2></div>${quickGrid()}</div>

  <div class="stats" style="margin-bottom:var(--gap)">
    ${stat('Alunos ativos', active.length, { tone: 't-mint', note: paused.length ? `${paused.length} pausado(s)` : '' })}
    ${stat('Alunos inativos', inactive.length)}
    ${stat('Aulas hoje', todayL.length, { tone: 't-sky', note: todayL.length ? `${toDo} ainda por fazer` : 'nenhuma agendada' })}
    ${stat('Aulas realizadas no mês', doneMonth, { tone: 't-peri' })}
    ${stat('Homework a corrigir', hwCorrect.length, { tone: 't-peach' })}
    ${stat('Atividades a revisar', hwReview.length, { note: 'corrigidas, ainda não concluídas' })}
    ${stat('Homework atrasado', hwLate.length, { tone: hwLate.length ? 't-rose' : '' })}
    ${stat('Relatórios a atualizar', needRep.length, { tone: 't-lav', note: needRep.length ? 'veja abaixo' : 'tudo em dia' })}
  </div>

  <div class="cols c21" style="margin-bottom:var(--gap)">
    <div class="card"><div class="card-h"><h2>Agenda</h2>${btn('Abrir calendário', 'go', { cls: 'sm ghost', data: { to: 'calendario' } })}</div>
      <h3 class="small muted" style="margin:0 0 4px;font-weight:700">HOJE</h3>
      <div class="list">${todayL.length ? todayL.map(l => lessonItem(l)) : html`<p class="muted small" style="margin:8px 0 14px">Nenhuma aula hoje.</p>`}</div>
      <h3 class="small muted" style="margin:14px 0 4px;font-weight:700">PRÓXIMAS AULAS</h3>
      <div class="list">${upcoming.length ? upcoming.map(l => lessonItem(l, true)) : html`<p class="muted small" style="margin:8px 0 0">Nenhuma aula agendada à frente. ${btn('Agendar aula', 'q-lesson', { cls: 'sm' })}</p>`}</div>
    </div>
    <div class="card"><div class="card-h"><h2>Financeiro de ${fmtMonth(ym)}</h2>${btn('Abrir financeiro', 'go', { cls: 'sm ghost', data: { to: 'financeiro' } })}</div>
      <dl class="kv" style="grid-template-columns:1fr auto">
        <dt>Receita prevista</dt><dd class="num right"><b>${money(T.previsto)}</b></dd>
        <dt>Receita recebida</dt><dd class="num right" style="color:var(--ok)"><b>${money(T.recebido)}</b></dd>
        <dt>Mensalidades pendentes</dt><dd class="num right">${pend.length} · ${money(T.pendente)}</dd>
        <dt>Mensalidades atrasadas</dt><dd class="num right" style="color:${late.length ? 'var(--bad)' : 'inherit'}">${late.length} · ${money(T.atrasado)}</dd>
        ${T.semCobranca > 0 ? html`<dt>Sem cobrança gerada</dt><dd class="num right">${money(T.semCobranca)}</dd>` : ''}
      </dl>
      <div style="margin-top:14px">${bar(T.previsto ? T.recebido / T.previsto * 100 : 0, 'ok')}<p class="tiny muted" style="margin:6px 0 0">${T.previsto ? Math.round(T.recebido / T.previsto * 100) + '% do previsto já recebido' : 'Sem mensalidades previstas neste mês'}${T.semCobranca > 0 ? '. A previsão inclui mensalidades de alunos ativos que ainda não têm cobrança gerada.' : ''}</p></div>
    </div>
  </div>

  <div class="cols c2">
    <div class="card"><div class="card-h"><h2>Alunos com atividades pendentes</h2></div>
      <div class="list">${pendingByStudent.length ? pendingByStudent.slice(0, 6).map(x => html`<button type="button" class="item" data-act="open-student" data-id="${x.s.id}">${avatar(x.s, 32)}<div class="grow"><div class="t">${x.s.name}</div></div>${badge(x.n + (x.n === 1 ? ' atividade' : ' atividades'), 'warn')}</button>`) : html`<p class="muted small" style="margin:0">Nenhum aluno com atividade pendente.</p>`}</div></div>
    <div class="card"><div class="card-h"><h2>Planos de estudo ativos nesta semana</h2></div>
      <div class="list">${activePlans.length ? activePlans.slice(0, 6).map(p => { const pr = planProgress(p); return html`<button type="button" class="item" data-act="open-plan" data-id="${p.id}">${avatar(M.students.get(p.studentId), 32)}<div class="grow"><div class="t">${stName(p.studentId)}</div>${bar(pr.pct)}</div><span class="small num">${pr.done}/${pr.total}</span></button>`; }) : html`<p class="muted small" style="margin:0">Nenhum Weekly Study Plan para esta semana. ${btn('Criar plano', 'q-plan', { cls: 'sm' })}</p>`}</div></div>
    <div class="card"><div class="card-h"><h2>Alunos que precisam de avaliação</h2></div>
      <div class="list">${needRep.length ? needRep.slice(0, 6).map(x => html`<button type="button" class="item" data-act="new-report-for" data-id="${x.s.id}">${avatar(x.s, 32)}<div class="grow"><div class="t">${x.s.name}</div><div class="muted small">${x.why === 'sem_relatorio' ? 'Ainda sem relatório' : 'Último relatório há mais de ' + S.settings.reportIntervalDays + ' dias'}</div></div>${badge('Criar', 'acc')}</button>`) : html`<p class="muted small" style="margin:0">Todos os alunos ativos estão com avaliação em dia.</p>`}</div></div>
    <div class="card"><div class="card-h"><h2>Últimos relatórios registrados</h2></div>
      <div class="list">${lastReports.length ? lastReports.map(r => html`<button type="button" class="item" data-act="open-report" data-id="${r.id}">${avatar(M.students.get(r.studentId), 32)}<div class="grow"><div class="t">${stName(r.studentId)}</div><div class="muted small">${fmtDate(r.periodStart)} a ${fmtDate(r.periodEnd)}</div></div>${skillAvg(r) != null ? badge('média ' + skillAvg(r), 'acc') : ''}</button>`) : html`<p class="muted small" style="margin:0">Nenhum relatório registrado ainda.</p>`}</div></div>
  </div>`;
};
ACTIONS['open-student'] = d => go('aluno-' + d.id);
ACTIONS['open-plan'] = d => go('plano-' + d.id);
ACTIONS['open-report'] = d => openReportView(d.id);
ACTIONS['new-report-for'] = d => openReportForm(null, { studentId: d.id });

/* =================== ALUNOS (lista) =================== */
VIEWS.alunos = () => {
  const f = getF('alunos', { q: '', level: '', status: '', archived: false, fin: '' });
  const today = todayISO(), q = norm(f.q);
  let rows = S.students.filter(s => f.archived ? s.archived : !s.archived)
    .filter(s => !f.level || s.level === f.level).filter(s => !f.status || s.status === f.status)
    .filter(s => !q || norm(s.name).includes(q) || norm(s.email).includes(q))
    .map(s => ({ s, fin: studentFinance(s, S.charges, S.payments, today) }))
    .filter(r => !f.fin || r.fin.status === f.fin)
    .sort((a, b) => (a.s.status === 'ativo' ? 0 : 1) - (b.s.status === 'ativo' ? 0 : 1) || cmpStr(a.s.name, b.s.name));
  const shown = limited('alunos', rows);
  return html`
  ${pageHead('Alunos', 'Cadastro, perfil e situação de cada aluno.', btn('Cadastrar aluno', 'q-student', { cls: 'primary', icon: 'plus' }))}
  <div class="filters">
    <div class="grow"><input id="fa-q" type="search" placeholder="Buscar por nome ou e-mail" value="${f.q}" data-input="filter" data-page="alunos" data-key="q" aria-label="Buscar aluno"></div>
    ${select('level', [['', 'Todos os níveis'], ...LEVELS], f.level, { id: 'fa-level', a: { 'data-change': 'filter', 'data-page': 'alunos', 'data-key': 'level', 'aria-label': 'Filtrar por nível' } })}
    ${select('status', [['', 'Todos os status'], ...STUDENT_STATUS], f.status, { id: 'fa-status', a: { 'data-change': 'filter', 'data-page': 'alunos', 'data-key': 'status', 'aria-label': 'Filtrar por status' } })}
    ${select('fin', [['', 'Qualquer situação financeira'], ...PAY_STATUS], f.fin, { id: 'fa-fin', a: { 'data-change': 'filter', 'data-page': 'alunos', 'data-key': 'fin', 'aria-label': 'Filtrar por situação financeira' } })}
    <label class="chk"><input type="checkbox" id="fa-arch"${f.archived ? raw(' checked') : ''} data-change="filter" data-page="alunos" data-key="archived"> Ver arquivados</label>
  </div>
  ${rows.length ? html`<div class="tablewrap"><table class="tbl"><thead><tr><th>Nome</th><th>Nível</th><th>Frequência</th><th>Próxima aula</th><th>Status</th><th class="num">Mensalidade</th><th>Situação financeira</th><th></th></tr></thead><tbody>
    ${shown.map(({ s, fin }) => html`<tr data-act="open-student" data-id="${s.id}">
      <td><div class="who">${avatar(s, 34)}<b>${s.name}</b>${demoTag(s)}</div></td>
      <td>${s.level || '—'}</td><td>${s.frequency || '—'}</td><td class="nowrap">${nextLessonText(s.id)}</td>
      <td>${badge(labelOf(STUDENT_STATUS, s.status), s.status === 'ativo' ? 'ok' : s.status === 'pausado' ? 'warn' : '')}</td>
      <td class="num">${s.monthly ? money(s.monthly) : '—'}</td>
      <td>${payBadge(fin.status)}${fin.overdue > 0 ? html` <span class="tiny muted">${money(fin.overdue)}</span>` : ''}</td>
      <td class="acts">${iconBtn('edit', 'st-edit', 'Editar', { id: s.id })}${iconBtn(s.archived ? 'upload' : 'folder', 'st-archive', s.archived ? 'Desarquivar' : 'Arquivar', { id: s.id })}${iconBtn('trash', 'st-delete', 'Excluir', { id: s.id }, 'danger')}</td></tr>`)}
  </tbody></table></div>${moreBtn('alunos', rows)}`
      : html`<div class="card">${S.students.length ? empty('Nenhum aluno encontrado', 'Ajuste a busca ou os filtros para ver outros alunos.', '') : empty('Nenhum aluno cadastrado', 'Cadastre seu primeiro aluno para começar a organizar aulas, exercícios, planos e pagamentos.', btn('Cadastrar aluno', 'q-student', { cls: 'primary' }))}</div>`}`;
};
ACTIONS['st-edit'] = d => openStudentForm(d.id);
ACTIONS['st-archive'] = async d => {
  const s = M.students.get(d.id); if (!s) return;
  await put('students', { ...s, archived: !s.archived });
  toast(s.archived ? 'Aluno desarquivado.' : 'Aluno arquivado. Ele sai das listas, mas todo o histórico é mantido.', 'ok');
};
ACTIONS['st-delete'] = async d => {
  const s = M.students.get(d.id); if (!s) return;
  const c = studentCounts(d.id);
  const lines = [['aulas', c.lessons], ['homework', c.homework], ['planos de estudo', c.plans], ['relatórios', c.reports], ['pagamentos', c.payments], ['cobranças', c.charges], ['objetivos', c.goals], ['observações', c.notes], ['pacotes de aulas', c.packages], ['contrato', c.contracts], ['etapas do cronograma', c.stages]].filter(x => x[1]);
  const ok = await confirmBox({
    title: 'Excluir aluno?', danger: true, ok: 'Excluir definitivamente',
    message: html`<p style="margin:0 0 10px">Você vai excluir <b>${s.name}</b> e <b>todo o histórico</b> ligado a ele${lines.length ? ':' : '.'}</p>${lines.length ? html`<ul style="margin:0 0 10px;padding-left:20px">${lines.map(l => html`<li>${l[1]} ${l[0]}</li>`)}</ul>` : ''}<p class="muted small" style="margin:0">Isso não pode ser desfeito. Se o aluno só parou de ter aulas, use <b>Arquivar</b> para manter o histórico.</p>`
  });
  if (!ok) return;
  await deleteStudentCascade(d.id);
  toast('Aluno excluído.', 'ok');
  if (parseRoute().page === 'aluno') go('alunos');
};

/* ---------- formulário de aluno ---------- */
function openStudentForm(id) {
  const s = id ? M.students.get(id) : null;
  const st = s || { status: 'ativo', level: 'Básico', startDate: todayISO(), duration: S.settings.defaultDuration, monthly: S.settings.defaultMonthly || '', dueDay: S.settings.defaultDueDay, payMethod: S.settings.paymentMethods[0] || '', frequency: '1x por semana', courseType: 'Inglês geral', schedule: [] };
  const sch = d => (st.schedule || []).find(x => x.day === d);
  openModal({
    title: s ? 'Editar aluno' : 'Cadastrar aluno', wide: true, form: { name: 'student', id: s ? s.id : '' }, body: html`
    <div class="photo-row"><span id="photo-prev">${avatar({ name: st.name || 'Novo aluno', photo: st.photo }, 64)}</span>
      <div class="stack-s"><label class="btn sm" style="cursor:pointer">${ico('upload')} Escolher foto<input type="file" accept="image/*" data-change="photo-pick" style="display:none" aria-label="Foto de perfil"></label><button type="button" class="btn sm ghost" data-act="photo-clear">Remover foto</button><span class="hint">Opcional. A foto é reduzida e guardada junto do cadastro.</span></div>
      <input type="hidden" name="photo" id="f_photo" value="${st.photo || ''}"></div>
    <div class="g2">${fld('Nome completo *', input('name', st.name, { a: { required: true, maxlength: 120, autocomplete: 'off' } }))}${fld('Status', select('status', STUDENT_STATUS, st.status))}</div>
    <div class="g3">${fld('E-mail', input('email', st.email, { type: 'email', a: { autocomplete: 'off' } }))}${fld('Telefone', input('phone', st.phone, { type: 'tel', a: { autocomplete: 'off' } }))}${fld('Data de nascimento', input('birth', st.birth, { type: 'date' }))}</div>
    <label class="chk"><input type="checkbox" name="minor" value="1"${st.minor ? raw(' checked') : ''}> Aluno menor de idade (permite liberar a Área dos Responsáveis em "Área do Aluno")</label>
    ${fld('Telefone do responsável (WhatsApp, opcional)', input('guardianPhone', st.guardianPhone, { type: 'tel', a: { autocomplete: 'off' } }))}
    <div class="g3">${fld('Início das aulas', input('startDate', st.startDate, { type: 'date' }))}${fld('Nível de inglês', select('level', LEVELS, st.level))}${fld('Tipo de curso', select('courseType', COURSE_TYPES, st.courseType))}</div>
    ${fld('Objetivos de aprendizagem', textarea('goals', st.goals, { a: { placeholder: 'Ex.: ganhar fluência para reuniões em inglês' } }))}
    <h4>Rotina de aulas</h4>
    <div class="g2">${fld('Frequência', select('frequency', FREQ, st.frequency))}${fld('Duração da aula (min)', input('duration', st.duration, { type: 'number', a: { min: 15, max: 240, step: 5 } }))}</div>
    <div class="sched">${WEEKDAYS.map((n, d) => html`<label class="chk"><input type="checkbox" name="sch[]" value="${d}"${sch(d) ? raw(' checked') : ''}> ${n}</label><input type="time" name="time_${d}" value="${sch(d) ? sch(d).time : '18:00'}" aria-label="Horário de ${n}">`)}</div>
    <h4>Financeiro</h4>
    <div class="g3">${fld('Valor da mensalidade', input('monthly', st.monthly, { type: 'number', a: { min: 0, step: '0.01' } }))}${fld('Dia de vencimento', input('dueDay', st.dueDay, { type: 'number', a: { min: 1, max: 31 } }))}${fld('Forma de pagamento', select('payMethod', S.settings.paymentMethods, st.payMethod))}</div>
    <h4>Aula online</h4>
    ${fld('Turma (só uma; Zoom e Calendar da turma valem para quem está nela)', select('groupId', [['', 'Sem turma (aula individual)'], ...S.groups.map(g => [g.id, g.name])], st.groupId || ''))}
    ${fld('Link do Zoom (aparece na área do aluno)', input('zoomUrl', st.zoomUrl, { type: 'url', a: { placeholder: 'https://zoom.us/j/…' } }))}
    ${fld('Observações', textarea('observations', st.observations))}`
  });
}
CHANGES['photo-pick'] = async (v, t) => {
  const file = t.files && t.files[0]; if (!file) return;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Não foi possível ler esta imagem.')); i.src = url; });
    const c = document.createElement('canvas'); c.width = c.height = 192;
    const k = Math.min(img.width, img.height), ctx = c.getContext('2d');
    ctx.drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, 192, 192);
    URL.revokeObjectURL(url);
    const data = c.toDataURL('image/jpeg', 0.82);
    $('#f_photo').value = data; $('#photo-prev').innerHTML = avatar({ name: 'x', photo: data }, 64).s;
  } catch (e) { toast(e.message, 'err'); }
};
ACTIONS['photo-clear'] = () => { $('#f_photo').value = ''; const n = $('#f_name'); $('#photo-prev').innerHTML = avatar({ name: n ? n.value : '?' }, 64).s; };
FORMS.student = async (v, form, ds) => {
  const old = ds.id ? M.students.get(ds.id) : null, name = v.name.trim();
  if (!name) { toast('Informe o nome completo do aluno.', 'err'); return; }
  if (v.zoomUrl.trim() && !isHttpUrl(v.zoomUrl.trim())) { toast('O link do Zoom precisa começar com https://', 'err'); return; }
  const schedule = (v.sch || []).map(d => ({ day: +d, time: v['time_' + d] || '18:00' })).sort((a, b) => a.day - b.day);
  const st = {
    ...(old || {}), name, photo: v.photo || '', email: v.email.trim(), phone: v.phone.trim(), birth: v.birth, startDate: v.startDate, level: v.level,
    goals: v.goals, courseType: v.courseType, frequency: v.frequency, duration: num(v.duration, 60), schedule, monthly: num(v.monthly),
    dueDay: clamp(parseInt(v.dueDay, 10) || 10, 1, 31), payMethod: v.payMethod, observations: v.observations, zoomUrl: v.zoomUrl.trim(), groupId: v.groupId || '', minor: v.minor === '1', guardianPhone: (v.guardianPhone || '').trim(), status: v.status, archived: !!(old && old.archived)
  };
  if (!old) { st.createdAt = Date.now(); st.levelHistory = [{ date: todayISO(), from: null, to: st.level }]; }
  else if (old.level !== st.level) st.levelHistory = [...(old.levelHistory || []), { date: todayISO(), from: old.level, to: st.level }];
  const id = await put('students', st);
  closeModal(); toast(old ? 'Dados do aluno atualizados.' : 'Aluno cadastrado.', 'ok');
  if (!old) go('aluno-' + id);
};

/* =================== PERFIL DO ALUNO =================== */
const STUDENT_TABS = [['visao', 'Visão geral'], ['contrato', 'Contrato e evolução'], ['aulas', 'Histórico de aulas'], ['hw', 'Exercícios e Homework'], ['planos', 'Weekly Study Plans'], ['relatorios', 'Relatórios'], ['fin', 'Financeiro'], ['obs', 'Observações'], ['linha', 'Linha do tempo']];
ACTIONS['st-tab'] = d => { UI.tab['aluno-' + d.id] = d.tab; render(); };
VIEWS.aluno = id => {
  const s = M.students.get(id);
  if (!s) return html`<div class="card">${empty('Aluno não encontrado', 'Este aluno foi excluído ou o link está incorreto.', btn('Voltar para Alunos', 'go', { cls: 'primary', data: { to: 'alunos' } }))}</div>`;
  const tab = UI.tab['aluno-' + id] || 'visao';
  const body = { visao: stTabOverview, contrato: stTabContract, aulas: stTabLessons, hw: stTabHomework, planos: stTabPlans, relatorios: stTabReports, fin: stTabFinance, obs: stTabNotes, linha: stTabTimeline }[tab](s);
  return html`
  <button type="button" class="back" data-act="go" data-to="alunos">${ico('left')} Alunos</button>
  <div class="page-h"><div class="who" style="gap:16px">${avatar(s, 64)}<div><h1 style="font-size:clamp(28px,3.6vw,38px)">${s.name} ${demoTag(s)}</h1>
    <div class="row" style="margin-top:8px">${badge(s.level, 'acc')}${badge(labelOf(STUDENT_STATUS, s.status), s.status === 'ativo' ? 'ok' : s.status === 'pausado' ? 'warn' : '')}${s.courseType ? badge(s.courseType) : ''}${s.archived ? badge('Arquivado', 'warn') : ''}</div></div></div>
    <div class="row">${btn('Agendar aula', 'st-new-lesson', { cls: 'primary', icon: 'calendar', data: { id } })}${btn('Editar', 'st-edit', { icon: 'edit', data: { id } })}${iconBtn(s.archived ? 'upload' : 'folder', 'st-archive', s.archived ? 'Desarquivar' : 'Arquivar', { id })}${iconBtn('trash', 'st-delete', 'Excluir aluno', { id }, 'danger')}</div></div>
  <div class="tabs" role="tablist">${STUDENT_TABS.map(([k, l]) => html`<button type="button" role="tab" aria-selected="${tab === k}" data-act="st-tab" data-id="${id}" data-tab="${k}">${l}</button>`)}</div>
  ${body}`;
};
ACTIONS['st-new-lesson'] = d => openLessonForm(null, { studentId: d.id });

function stTabOverview(s) {
  const today = todayISO(), now = nowKey();
  const mine = S.lessons.filter(l => l.studentId === s.id), att = attendance(mine);
  const next = nextLessonOf(S.lessons, s.id, now), last = lastLessonOf(S.lessons, s.id);
  const hwOpen = S.homework.filter(h => h.studentId === s.id && (h.status === 'atribuida' || h.status === 'em_andamento')).length;
  const hwFix = S.homework.filter(h => h.studentId === s.id && needsCorrection(h)).length;
  const plan = S.plans.filter(p => p.studentId === s.id && planIsCurrent(p, today))[0];
  const fin = studentFinance(s, S.charges, S.payments, today);
  const goals = S.goals.filter(g => g.studentId === s.id).sort((a, b) => (a.status === 'concluido') - (b.status === 'concluido') || cmpStr(a.deadline, b.deadline));
  const lastRep = S.reports.filter(r => r.studentId === s.id).sort((a, b) => cmpStr(b.date, a.date))[0];
  const pkgs = S.packages.filter(p => p.studentId === s.id), activePkg = pkgs.sort((a, b) => cmpStr(b.startDate, a.startDate))[0];
  const pk = activePkg ? packageSummary(activePkg, pkgs, S.lessons, S.settings.absenceCountsPackage, today) : null;
  const goalsAvg = goals.length ? Math.round(sum(goals, goalPct) / goals.length) : null;
  const n = last && last.notes;
  const mats = S.materials.filter(m => (m.studentIds || []).includes(s.id));
  return html`
  <div class="stats" style="margin-bottom:var(--gap)">
    ${stat('Aulas realizadas', att.done, { tone: 't-mint' })}
    ${stat('Frequência', att.pct == null ? '—' : att.pct + '%', { tone: 't-sky', note: att.pct == null ? 'sem aulas registradas' : `${att.abs} falta(s)` })}
    ${stat('Homework pendente', hwOpen, { tone: 't-peach', note: hwFix ? `${hwFix} a corrigir` : '' })}
    ${stat('Progresso geral', goalsAvg == null ? '—' : goalsAvg + '%', { tone: 't-lav', note: goalsAvg == null ? 'cadastre objetivos' : `média de ${goals.length} objetivo(s)`, })}
  </div>
  <div class="cols c2">
    <div class="stack">
      <div class="card"><div class="card-h"><h2>Informações principais</h2></div><dl class="kv">
        <dt>E-mail</dt><dd>${s.email || '—'}</dd><dt>Telefone</dt><dd>${s.phone || '—'}</dd>
        <dt>Nascimento</dt><dd>${s.birth ? fmtDate(s.birth) + ` (${ageOf(s.birth)} anos)` : '—'}</dd>
        <dt>Início das aulas</dt><dd>${fmtDate(s.startDate)}</dd><dt>Tipo de curso</dt><dd>${s.courseType || '—'}</dd>
        <dt>Frequência</dt><dd>${s.frequency || '—'} · ${s.duration || 60} min</dd><dt>Dias e horários</dt><dd>${scheduleText(s)}</dd>
        <dt>Mensalidade</dt><dd>${s.monthly ? money(s.monthly) + ` · vence dia ${s.dueDay} · ${s.payMethod || 'forma não definida'}` : '—'}</dd>
        ${s.observations ? html`<dt>Observações</dt><dd class="pre">${s.observations}</dd>` : ''}</dl></div>
      <div class="card"><div class="card-h"><h2>Objetivos</h2>${btn('Novo objetivo', 'goal-new', { cls: 'sm', icon: 'plus', data: { id: s.id } })}</div>
        ${s.goals ? html`<p class="pre" style="margin:0 0 12px">${s.goals}</p>` : ''}
        <div class="list">${goals.length ? goals.map(g => html`<button type="button" class="item" data-act="goal-edit" data-id="${g.id}"><div class="grow"><div class="t">${g.name}</div>${bar(goalPct(g))}</div>${g.skill ? skillTag(g.skill) : ''}<span class="small num">${goalPct(g)}%</span></button>`) : html`<p class="muted small" style="margin:0">Nenhum objetivo individual cadastrado.</p>`}</div></div>
      ${mats.length ? html`<div class="card"><div class="card-h"><h2>Materiais associados</h2></div><div class="list">${mats.slice(0, 6).map(m => html`<button type="button" class="item" data-act="material-edit" data-id="${m.id}">${ico('file')}<div class="grow"><div class="t">${m.title}</div></div>${m.skill ? skillTag(m.skill) : ''}</button>`)}</div></div>` : ''}
    </div>
    <div class="stack">
      <div class="card"><div class="card-h"><h2>Aulas</h2></div>
        <dl class="kv"><dt>Próxima aula</dt><dd>${next ? html`<button type="button" class="link" data-act="lesson" data-id="${next.id}">${fmtDateShort(next.date)} às ${next.time}${next.topic ? ' · ' + next.topic : ''}</button>` : html`Nenhuma agendada ${btn('Agendar', 'st-new-lesson', { cls: 'sm', data: { id: s.id } })}`}</dd>
        <dt>Última aula</dt><dd>${last ? html`<button type="button" class="link" data-act="lesson" data-id="${last.id}">${fmtDate(last.date)}${last.topic ? ' · ' + last.topic : ''}</button>` : 'Ainda não há aulas realizadas'}</dd></dl>
        ${n && (n.nextClass || n.difficulties) ? html`<div class="hl" style="margin-top:12px"><b class="small">Para retomar na próxima aula</b>${n.nextClass ? html`<p class="pre" style="margin:4px 0 0">${n.nextClass}</p>` : ''}${n.difficulties ? html`<p class="pre small muted" style="margin:6px 0 0">Dificuldades: ${n.difficulties}</p>` : ''}</div>` : ''}</div>
      <div class="card"><div class="card-h"><h2>Weekly Study Plan atual</h2></div>
        ${plan ? html`<button type="button" class="item" data-act="open-plan" data-id="${plan.id}" style="padding:4px 0"><div class="grow"><div class="t">${fmtDateShort(plan.weekStart)} a ${fmtDateShort(plan.weekEnd)}</div>${bar(planProgress(plan).pct)}</div><span class="small num">${planProgress(plan).done}/${planProgress(plan).total}</span></button>` : html`<p class="muted small" style="margin:0 0 10px">Nenhum plano para esta semana.</p>${btn('Criar plano da semana', 'plan-new-for', { cls: 'sm', data: { id: s.id } })}`}</div>
      <div class="card"><div class="card-h"><h2>Situação financeira</h2></div>
        <div class="row">${payBadge(fin.status)}${fin.overdue > 0 ? html`<span class="small">Em atraso: <b>${money(fin.overdue)}</b></span>` : ''}${fin.pending > 0 ? html`<span class="small muted">A vencer: ${money(fin.pending)}</span>` : ''}</div>
        ${pk ? html`<div style="margin-top:12px"><div class="row small"><b>Pacote de aulas</b><span class="spacer"></span><span class="num">${pk.used} de ${pk.total} usadas</span></div>${bar(pk.pct, pk.remaining < 0 ? 'bad' : pk.remaining <= 2 ? 'warn' : '')}<p class="tiny muted" style="margin:6px 0 0">${pk.remaining >= 0 ? pk.remaining + ' restantes' : 'excedeu em ' + -pk.remaining} · ${pk.canceled} cancelada(s) · ${pk.makeups} reposição(ões)</p></div>` : ''}</div>
      <div class="card"><div class="card-h"><h2>Último relatório</h2></div>${lastRep ? html`<button type="button" class="item" data-act="open-report" data-id="${lastRep.id}" style="padding:4px 0"><div class="grow"><div class="t">${fmtDate(lastRep.periodStart)} a ${fmtDate(lastRep.periodEnd)}</div><div class="muted small">${lastRep.level || ''}</div></div>${skillAvg(lastRep) != null ? badge('média ' + skillAvg(lastRep), 'acc') : ''}</button>` : html`<p class="muted small" style="margin:0 0 10px">Nenhum relatório ainda.</p>${btn('Criar relatório', 'new-report-for', { cls: 'sm', data: { id: s.id } })}`}</div>
    </div>
  </div>`;
}
ACTIONS['goal-new'] = d => openGoalForm(null, { studentId: d.id });
ACTIONS['goal-edit'] = d => openGoalForm(d.id);
ACTIONS['material-edit'] = d => openMaterialForm(d.id);
ACTIONS['plan-new-for'] = d => openPlanForm(null, { studentId: d.id });

function stTabLessons(s) {
  const mine = S.lessons.filter(l => l.studentId === s.id).sort((a, b) => cmpStr(lessonKey(b), lessonKey(a))), a = attendance(mine);
  return html`
  <div class="stats" style="margin-bottom:var(--gap)">${stat('Realizadas', a.done, { tone: 't-mint' })}${stat('Faltas', a.abs, { tone: a.abs ? 't-rose' : '' })}${stat('Canceladas', a.canc)}${stat('Reagendadas', a.resch)}${stat('Frequência', a.pct == null ? '—' : a.pct + '%', { tone: 't-sky', note: 'canceladas não contam como falta' })}</div>
  <div class="card"><div class="card-h"><h2>Todas as aulas (${mine.length})</h2>${btn('Agendar aula', 'st-new-lesson', { cls: 'sm primary', icon: 'plus', data: { id: s.id } })}</div>
  ${mine.length ? lessonsTable(mine, false) : empty('Nenhuma aula registrada', 'As aulas agendadas e realizadas deste aluno aparecem aqui automaticamente.', '')}</div>`;
}
function stTabHomework(s) {
  const list = S.homework.filter(h => h.studentId === s.id);
  const c = st => list.filter(h => (Array.isArray(st) ? st : [st]).includes(h.status)).length;
  const scores = list.map(hwPct).filter(x => x != null);
  return html`
  <div class="stats" style="margin-bottom:var(--gap)">${stat('Atribuídas', list.length)}${stat('Pendentes', c(['atribuida', 'em_andamento']), { tone: 't-peach' })}${stat('Entregues', c(['entregue', 'pendente_correcao']), { tone: 't-sky' })}${stat('Corrigidas', c(['corrigida', 'concluida']), { tone: 't-mint' })}${stat('Nota média', scores.length ? Math.round(sum(scores) / scores.length) + '%' : '—', { tone: 't-lav' })}</div>
  <div class="card"><div class="card-h"><h2>Atividades do aluno</h2>${btn('Atribuir homework', 'hw-new-for', { cls: 'sm primary', icon: 'plus', data: { id: s.id } })}</div>
  ${list.length ? hwTable(list.sort((a, b) => cmpStr(b.assignedDate, a.assignedDate)), false) : empty('Nenhuma atividade atribuída', 'Atribua um exercício da biblioteca ou crie um homework avulso.', '')}</div>`;
}
ACTIONS['hw-new-for'] = d => openHomeworkForm(null, { studentId: d.id });
function stTabPlans(s) {
  const list = S.plans.filter(p => p.studentId === s.id).sort((a, b) => cmpStr(b.weekStart, a.weekStart)), today = todayISO();
  return html`<div class="card"><div class="card-h"><h2>Planos semanais (${list.length})</h2>${btn('Novo plano', 'plan-new-for', { cls: 'sm primary', icon: 'plus', data: { id: s.id } })}</div>
  ${list.length ? html`<div class="list">${list.map(p => { const pr = planProgress(p); return html`<button type="button" class="item" data-act="open-plan" data-id="${p.id}"><div class="grow"><div class="t">${fmtDate(p.weekStart)} a ${fmtDate(p.weekEnd)} ${planIsCurrent(p, today) ? badge('Semana atual', 'acc') : ''}</div><div class="muted small">${p.goals ? String(p.goals).slice(0, 90) : 'Sem objetivos descritos'}</div>${bar(pr.pct)}</div><span class="small num nowrap">${pr.done}/${pr.total} (${pr.pct}%)</span></button>`; })}</div>` : empty('Nenhum plano criado', 'Crie o primeiro Weekly Study Plan deste aluno. Os planos antigos ficam sempre guardados.', '')}</div>`;
}
function stTabReports(s) {
  const list = S.reports.filter(r => r.studentId === s.id).sort((a, b) => cmpStr(b.date, a.date));
  return html`<div class="stack">${list.length >= 2 ? html`<div class="card"><div class="card-h"><h2>Evolução das notas</h2></div>${evolutionChart(s.id)}</div>` : ''}
  <div class="card"><div class="card-h"><h2>Relatórios de desempenho (${list.length})</h2>${btn('Novo relatório', 'new-report-for', { cls: 'sm primary', icon: 'plus', data: { id: s.id } })}</div>
  ${list.length ? reportsTable(list, false) : empty('Nenhum relatório ainda', 'Registre uma avaliação por habilidade e o sistema monta o relatório com a frequência e o homework do período.', '')}</div></div>`;
}
function stTabFinance(s) {
  const today = todayISO(), fin = studentFinance(s, S.charges, S.payments, today);
  const pays = S.payments.filter(p => p.studentId === s.id).sort((a, b) => cmpStr(b.date, a.date));
  const charges = S.charges.filter(c => c.studentId === s.id).sort((a, b) => cmpStr(b.refMonth, a.refMonth));
  const pkgs = S.packages.filter(p => p.studentId === s.id).sort((a, b) => cmpStr(b.startDate, a.startDate));
  return html`<div class="stack">
  <div class="stats">${stat('Mensalidade', s.monthly ? money(s.monthly) : '—', { tone: 't-mint', note: s.monthly ? `vence dia ${s.dueDay} · ${s.payMethod || ''}` : '' })}${stat('Situação', labelOf(PAY_STATUS, fin.status) || '—')}${stat('Em atraso', money(fin.overdue), { tone: fin.overdue > 0 ? 't-rose' : '' })}${stat('A vencer', money(fin.pending), { tone: 't-sky' })}</div>
  <div class="card"><div class="card-h"><h2>Aulas contratadas</h2>${btn('Novo pacote', 'pkg-new', { cls: 'sm', icon: 'plus', data: { id: s.id } })}</div>
    ${pkgs.length ? html`<div class="stack-s">${pkgs.map(p => packageCard(p, pkgs))}</div>` : html`<p class="muted small" style="margin:0">Nenhum pacote cadastrado. Cadastre a quantidade de aulas contratadas e o sistema desconta automaticamente cada aula marcada como realizada. Aulas apenas agendadas não são descontadas.</p>`}</div>
  <div class="card"><div class="card-h"><h2>Histórico de pagamentos</h2>${btn('Registrar pagamento', 'pay-new-for', { cls: 'sm primary', icon: 'plus', data: { id: s.id } })}</div>
    ${pays.length ? paymentsTable(pays, false) : html`<p class="muted small" style="margin:0">Nenhum pagamento registrado.</p>`}
    ${charges.length ? html`<h3 class="small muted" style="margin:18px 0 8px;font-weight:700">COBRANÇAS POR MÊS</h3><div class="tablewrap"><table class="tbl" style="min-width:520px"><thead><tr><th>Mês</th><th>Vencimento</th><th class="num">Valor</th><th class="num">Pago</th><th class="num">Saldo</th><th>Situação</th></tr></thead><tbody>${charges.map(c => { const r = settleCharge(c, S.payments, today); return html`<tr><td>${fmtMonth(c.refMonth)}</td><td>${fmtDate(c.dueDate)}</td><td class="num">${money(r.amount)}</td><td class="num">${money(r.paid + r.discount)}</td><td class="num">${money(r.balance)}</td><td>${payBadge(r.status)}</td></tr>`; })}</tbody></table></div>` : ''}</div></div>`;
}
ACTIONS['pay-new-for'] = d => openPaymentForm(null, { studentId: d.id });
ACTIONS['pkg-new'] = d => openPackageForm(null, d.id);

function stTabNotes(s) {
  const notes = S.notes.filter(n => n.studentId === s.id).sort((a, b) => cmpStr(b.date, a.date));
  return html`<div class="stack">
  <div class="card"><div class="card-h"><h2>Anotações privadas</h2></div>
    <form class="form" data-form="note" data-student="${s.id}">${fld('Nova anotação', textarea('text', '', { id: 'note-text', rows: 3, a: { required: true, placeholder: 'Algo importante sobre este aluno: preferências, contexto, combinados…' } }))}<div><button type="submit" class="btn primary">${ico('plus')} Salvar anotação</button></div></form></div>
  ${s.observations ? html`<div class="card"><div class="card-h"><h2>Observações do cadastro</h2></div><p class="pre" style="margin:0">${s.observations}</p></div>` : ''}
  <div class="card"><div class="card-h"><h2>Histórico de anotações (${notes.length})</h2></div>
    ${notes.length ? html`<div class="list">${notes.map(n => html`<div class="item" style="align-items:flex-start"><div class="grow"><div class="tiny muted">${fmtDT(n.date)}</div><div class="pre">${n.text}</div></div>${iconBtn('edit', 'note-edit', 'Editar', { id: n.id })}${iconBtn('trash', 'note-del', 'Excluir', { id: n.id }, 'danger')}</div>`)}</div>` : html`<p class="muted small" style="margin:0">Nenhuma anotação ainda.</p>`}</div></div>`;
}
FORMS.note = async (v, form, ds) => {
  const text = v.text.trim(); if (!text) return;
  if (ds.id) { const n = M.notes.get(ds.id); await put('notes', { ...n, text }); closeModal(); toast('Anotação atualizada.', 'ok'); return; }
  await put('notes', { studentId: ds.student, text, date: nowKey() });
  form.reset(); toast('Anotação salva.', 'ok');
};
ACTIONS['note-edit'] = d => { const n = M.notes.get(d.id); if (n) openModal({ title: 'Editar anotação', form: { name: 'note', id: n.id }, body: fld('Anotação', textarea('text', n.text, { rows: 5, a: { required: true } })) }); };
ACTIONS['note-del'] = async d => { if (await confirmBox({ title: 'Excluir anotação?', message: 'Esta anotação será removida.', danger: true, ok: 'Excluir' })) { await del('notes', d.id); toast('Anotação excluída.', 'ok'); } };

const TL_KINDS = [['', 'Tudo'], ['aula', 'Aulas'], ['nota-aula', 'Lesson notes'], ['homework', 'Homework'], ['plano', 'Planos'], ['relatorio', 'Relatórios'], ['pagamento', 'Pagamentos'], ['objetivo', 'Objetivos'], ['nivel', 'Níveis'], ['observacao', 'Observações'], ['cadastro', 'Cadastro']];
function stTabTimeline(s) {
  const f = getF('timeline', { kind: '' });
  const all = buildTimeline(s.id, D()), ev = all.filter(e => !f.kind || e.kind === f.kind);
  return html`<div class="card"><div class="card-h"><h2>Linha do tempo (${ev.length})</h2>${select('kind', TL_KINDS, f.kind, { id: 'tl-kind', a: { 'data-change': 'filter', 'data-page': 'timeline', 'data-key': 'kind', 'aria-label': 'Filtrar a linha do tempo' } })}</div>
  ${ev.length ? html`<ol class="tl">${ev.slice(0, 200).map(e => html`<li class="k-${e.kind}"><div class="when">${fmtDT(e.ts)}</div>${e.ref && e.ref.type !== 'student' ? html`<button type="button" data-act="open-ref-tl" data-type="${e.ref.type}" data-id="${e.ref.id}">${e.title}</button>` : html`<b style="font-size:14.5px">${e.title}</b>`}${e.sub ? html`<div class="muted small">${e.sub}</div>` : ''}</li>`)}</ol>${ev.length > 200 ? html`<p class="muted small">Mostrando os 200 registros mais recentes.</p>` : ''}` : empty('Nada por aqui ainda', 'Aulas, homework, pagamentos e relatórios deste aluno aparecem em ordem cronológica.', '')}</div>`;
}
