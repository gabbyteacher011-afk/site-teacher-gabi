/* ============================================================
   pages2.js — Calendário, Aulas, Lesson notes, Pacotes de aulas
   ============================================================ */
const NOTE_FIELDS = [['worked', 'O que foi trabalhado'], ['learned', 'O que o aluno aprendeu'], ['difficulties', 'O que apresentou dificuldade'], ['errors', 'Erros que precisam ser revisados'], ['practice', 'Habilidades que precisam de mais prática'], ['nextClass', 'O que deve ser retomado na próxima aula'], ['important', 'Observações importantes']];

function lessonsTable(list, showStudent) {
  return html`<div class="tablewrap"><table class="tbl"><thead><tr><th>Data e hora</th>${showStudent ? html`<th>Aluno</th>` : ''}<th>Tema</th><th>Conteúdo trabalhado</th><th>Duração</th><th>Status</th><th>Notas</th></tr></thead><tbody>
  ${list.map(l => html`<tr data-act="lesson" data-id="${l.id}"><td class="nowrap"><b>${fmtDate(l.date)}</b> <span class="muted">${l.time}</span></td>
    ${showStudent ? html`<td><div class="who">${avatar(M.students.get(l.studentId), 28)}<span>${stName(l.studentId)}</span></div></td>` : ''}
    <td>${l.topic || html`<span class="muted">—</span>`} ${l.type === 'reposicao' ? badge('Reposição', 'warn') : l.type === 'experimental' ? badge('Experimental', 'info') : ''}</td>
    <td class="muted small" style="max-width:280px">${String(l.content || '').slice(0, 90)}${String(l.content || '').length > 90 ? '…' : ''}</td>
    <td class="nowrap">${l.duration || 60} min</td><td>${lessonBadge(l.status)}</td><td>${hasLessonNotes(l) ? badge('com notas', 'acc') : html`<span class="muted">—</span>`}</td></tr>`)}
  </tbody></table></div>`;
}

/* ---------- pacotes de aulas ---------- */
function pkgNote(studentId, date) {
  const pkgs = S.packages.filter(p => p.studentId === studentId).sort((a, b) => cmpStr(a.startDate, b.startDate));
  const p = [...pkgs].reverse().find(x => x.startDate <= date);
  if (!p) return '';
  const r = packageSummary(p, pkgs, S.lessons, S.settings.absenceCountsPackage, todayISO());
  return r.remaining >= 0 ? ` Restam ${r.remaining} de ${r.total} aulas do pacote.` : ` O pacote foi excedido em ${-r.remaining} aula(s).`;
}
function packageCard(p, siblings) {
  const r = packageSummary(p, siblings, S.lessons, S.settings.absenceCountsPackage, todayISO());
  const tone = r.remaining < 0 ? 'bad' : r.remaining <= 2 ? 'warn' : '';
  return html`<div class="card" style="box-shadow:none;padding:14px"><div class="row"><b>${p.total} aulas</b><span class="muted small">desde ${fmtDate(p.startDate)}${p.validUntil ? ' · válido até ' + fmtDate(p.validUntil) : ''}</span>${r.expired ? badge(r.remaining > 0 ? 'Vencido com ' + r.remaining + ' restantes' : 'Vencido', 'bad') : ''}<span class="spacer"></span>${iconBtn('edit', 'pkg-edit', 'Editar pacote', { id: p.id })}${iconBtn('trash', 'pkg-del', 'Excluir pacote', { id: p.id }, 'danger')}</div>
  <div style="margin:8px 0">${bar(r.pct, tone)}</div>
  <div class="row small"><span><b>${r.used}</b> realizadas</span><span><b>${r.remaining >= 0 ? r.remaining : 0}</b> restantes${r.remaining < 0 ? html` <span style="color:var(--bad)">(excedeu em ${-r.remaining})</span>` : ''}</span><span class="muted">${r.canceled} canceladas</span><span class="muted">${r.makeups} reposições</span><span class="muted">${r.scheduled} agendadas (ainda não descontadas)</span></div>${p.notes ? html`<p class="small muted pre" style="margin:8px 0 0">${p.notes}</p>` : ''}</div>`;
}
function openPackageForm(id, studentId) {
  const p = id ? M.packages.get(id) : { studentId, total: 10, startDate: todayISO() };
  openModal({
    title: id ? 'Editar pacote de aulas' : 'Novo pacote de aulas', narrow: true, form: { name: 'package', id: id || '' }, body: html`
    ${fld('Aluno', select('studentId', studentOptions({ keep: p.studentId, includeInactive: true }), p.studentId, { a: { required: true } }))}
    <div class="g2">${fld('Aulas contratadas', input('total', p.total, { type: 'number', a: { min: 1, max: 500, required: true } }))}${fld('Início do pacote', input('startDate', p.startDate, { type: 'date', a: { required: true } }))}</div>
    ${fld('Validade (opcional)', input('validUntil', p.validUntil, { type: 'date' }), { hint: 'Aulas depois dessa data não são descontadas deste pacote.' })}
    ${fld('Observações', textarea('notes', p.notes, { rows: 2 }))}
    <p class="hint">Só aulas marcadas como <b>realizadas</b> são descontadas${S.settings.absenceCountsPackage ? ' (e faltas, conforme sua configuração)' : ''}. Aulas agendadas, canceladas ou reagendadas não descontam.</p>`
  });
}
FORMS.package = async (v, f, ds) => {
  if (!v.studentId) { toast('Escolha o aluno.', 'err'); return; }
  const old = ds.id ? M.packages.get(ds.id) : null;
  await put('packages', { ...(old || {}), studentId: v.studentId, total: Math.max(1, parseInt(v.total, 10) || 1), startDate: v.startDate, validUntil: v.validUntil || '', notes: v.notes });
  closeModal(); toast('Pacote salvo.', 'ok');
};
ACTIONS['pkg-edit'] = d => openPackageForm(d.id);
ACTIONS['pkg-del'] = async d => { if (await confirmBox({ title: 'Excluir pacote?', message: 'O pacote será removido. As aulas continuam no histórico do aluno.', danger: true, ok: 'Excluir' })) { await del('packages', d.id); toast('Pacote excluído.', 'ok'); } };

/* ---------- formulário de aula ---------- */
const makeupOptions = (studentId, keep, selfId) => [['', '— Nenhuma —'], ...S.lessons
  .filter(l => l.studentId === studentId && l.id !== selfId && ['ausente', 'cancelada', 'reagendada'].includes(l.status) && (l.id === keep || !S.lessons.some(x => x.makeupFor === l.id && x.id !== selfId)))
  .sort((a, b) => cmpStr(lessonKey(b), lessonKey(a))).map(l => [l.id, `${fmtDate(l.date)} · ${LS_SHORT[l.status]}${l.topic ? ' · ' + l.topic : ''}`])];

function openLessonForm(id, opts) {
  opts = opts || {};
  const old = id ? M.lessons.get(id) : null;
  const st0 = opts.studentId ? M.students.get(opts.studentId) : null;
  const l = old || {
    studentId: opts.studentId || '', date: opts.date || todayISO(), time: opts.time || (st0 && (st0.schedule || [])[0] ? st0.schedule[0].time : '18:00'),
    duration: st0 ? st0.duration : S.settings.defaultDuration, type: 'regular', status: opts.register ? 'realizada' : 'agendada', skills: [], materials: [], exercises: [], notes: {}
  };
  if (opts.finish) l.status = 'realizada';
  const n = l.notes || {};
  openModal({
    title: old ? (opts.finish ? 'Registrar aula' : 'Editar aula') : (opts.register ? 'Registrar aula realizada' : 'Agendar aula'), wide: true, form: { name: 'lesson', id: id || '' }, body: html`
    <div class="g3">${fld('Aluno *', select('studentId', studentOptions({ keep: l.studentId, blank: 'Escolha o aluno…' }), l.studentId, { a: { required: true, 'data-change': 'lesson-student' } }))}
      ${fld('Data *', input('date', l.date, { type: 'date', a: { required: true, 'data-change': 'lesson-date' } }))}${fld('Horário *', input('time', l.time, { type: 'time', a: { required: true } }))}</div>
    <div class="g4">${fld('Duração (min)', input('duration', l.duration, { type: 'number', a: { min: 5, max: 480, step: 5 } }))}${fld('Tipo', select('type', LESSON_TYPE, l.type))}${fld('Status / presença', select('status', LESSON_STATUS.filter(x => old || x[0] !== 'reagendada'), l.status))}
      ${fld('Reposição de', select('makeupFor', makeupOptions(l.studentId, l.makeupFor, id), l.makeupFor || ''), { hint: 'Só para reposições' })}</div>
    ${!old ? fld('Repetir semanalmente por quantas semanas?', input('repeat', 1, { type: 'number', a: { min: 1, max: 26 } }), { hint: '1 = só esta aula. Cada repetição é checada contra conflitos de horário.' }) : ''}
    <div class="g2">${fld('Tema da aula', input('topic', l.topic, { a: { maxlength: 140, placeholder: 'Ex.: Present perfect in daily conversation' } }))}${fld('Objetivos', input('objectives', l.objectives, { a: { maxlength: 300 } }))}</div>
    ${fld('Conteúdo trabalhado', textarea('content', l.content, { rows: 3 }))}
    <div class="fld"><span>Habilidades desenvolvidas</span>${checks('skills', SKILLS, l.skills)}</div>
    <div class="g2">
      <div class="fld"><span>Materiais utilizados</span>${S.materials.length ? checks('materials', [...S.materials].sort((a, b) => cmpStr(a.title, b.title)).map(m => [m.id, m.title]), l.materials, 'scrollbox') : html`<div class="hint">Nenhum material cadastrado na Biblioteca.</div>`}</div>
      <div class="fld"><span>Exercícios realizados</span>${S.exercises.length ? checks('exercises', [...S.exercises].sort((a, b) => cmpStr(a.title, b.title)).map(e => [e.id, e.title]), l.exercises, 'scrollbox') : html`<div class="hint">Nenhum exercício na biblioteca.</div>`}</div></div>
    ${fld('Homework atribuído (texto livre)', textarea('homeworkText', l.homeworkText, { rows: 2 }), { hint: 'Para criar uma atividade com prazo e correção, use Exercícios e Homework.' })}
    ${fld('Observações da aula', textarea('observations', l.observations, { rows: 2 }))}
    <details class="fold"${(opts.finish || opts.register || hasLessonNotes(l)) ? raw(' open') : ''}><summary>Lesson notes (pós-aula)</summary><div class="form" style="margin-top:10px">
      ${NOTE_FIELDS.map(([k, label]) => fld(label, textarea('n_' + k, n[k], { rows: 2 })))}</div></details>`
  });
}
CHANGES['lesson-student'] = (v, t) => {
  const form = t.closest('form'), s = M.students.get(v); if (!form) return;
  if (!form.dataset.id && s) {
    form.elements.duration.value = s.duration || S.settings.defaultDuration;
    const sc = (s.schedule || []).find(x => x.day === weekdayIdx(form.elements.date.value || todayISO())); if (sc) form.elements.time.value = sc.time;
  }
  const mk = form.elements.makeupFor;
  if (mk) mk.innerHTML = makeupOptions(v, '', form.dataset.id).map(([k, lb]) => `<option value="${esc(k)}">${esc(lb)}</option>`).join('');
};
CHANGES['lesson-date'] = (v, t) => {
  const form = t.closest('form'), s = M.students.get(form.elements.studentId.value);
  if (!form.dataset.id && s && v) { const sc = (s.schedule || []).find(x => x.day === weekdayIdx(v)); if (sc) form.elements.time.value = sc.time; }
};
const conflictMessage = list => html`<p style="margin:0 0 10px">Já existe aula neste horário:</p><ul style="margin:0 0 10px;padding-left:20px">${list.slice(0, 8).map(x => html`<li><b>${fmtDate(x.d)}</b> ${x.c.time}–${minToTime(timeToMin(x.c.time) + (Number(x.c.duration) || 60))} com ${stName(x.c.studentId)}</li>`)}${list.length > 8 ? html`<li>e mais ${list.length - 8}…</li>` : ''}</ul><p class="muted small" style="margin:0">Você pode agendar mesmo assim, se for intencional.</p>`;
FORMS.lesson = async (v, form, ds) => {
  const old = ds.id ? M.lessons.get(ds.id) : null;
  if (!v.studentId) { toast('Escolha o aluno da aula.', 'err'); return; }
  if (!v.date || !v.time) { toast('Informe data e horário.', 'err'); return; }
  const base = {
    ...(old || {}), studentId: v.studentId, date: v.date, time: v.time, duration: clamp(num(v.duration, 60), 5, 480), type: v.type, status: v.status,
    topic: v.topic.trim(), objectives: v.objectives, content: v.content, skills: v.skills || [], materials: v.materials || [], exercises: v.exercises || [],
    homeworkText: v.homeworkText, observations: v.observations, makeupFor: v.type === 'reposicao' ? (v.makeupFor || '') : '',
    notes: Object.fromEntries(NOTE_FIELDS.map(([k]) => [k, v['n_' + k] || '']))
  };
  const weeks = old ? 1 : clamp(parseInt(v.repeat, 10) || 1, 1, 26);
  const dates = Array.from({ length: weeks }, (_, i) => addDays(v.date, 7 * i));
  if (base.status === 'realizada' && v.date > todayISO()) {
    if (!await confirmBox({ title: 'Aula no futuro', message: `A data (${fmtDate(v.date)}) ainda não chegou. Marcar como realizada mesmo assim?`, ok: 'Marcar como realizada' })) return;
  }
  if (SLOT_STATUS.has(base.status)) {
    const conflicts = [];
    dates.forEach(d => findConflicts(S.lessons, { ...base, id: old ? old.id : undefined, date: d }).forEach(c => conflicts.push({ d, c })));
    if (conflicts.length && !await confirmBox({ title: 'Conflito de horário', message: conflictMessage(conflicts), ok: 'Agendar mesmo assim' })) return;
  }
  const wasDone = old && old.status === 'realizada';
  for (let i = 0; i < dates.length; i++) await put('lessons', i === 0 ? { ...base, date: dates[0] } : { ...base, id: undefined, date: dates[i] });
  closeModal();
  toast(old ? 'Aula atualizada.' + (base.status === 'realizada' && !wasDone ? pkgNote(base.studentId, base.date) : '') : weeks > 1 ? `${weeks} aulas agendadas.` : base.status === 'realizada' ? 'Aula registrada no histórico do aluno.' + pkgNote(base.studentId, base.date) : 'Aula agendada.', 'ok');
};

/* ---------- detalhes da aula ---------- */
function openLessonDetail(id) {
  const l = M.lessons.get(id); if (!l) return;
  const s = M.students.get(l.studentId), n = l.notes || {};
  const prev = S.lessons.filter(x => x.studentId === l.studentId && x.id !== l.id && x.status === 'realizada' && lessonKey(x) < lessonKey(l)).sort((a, b) => cmpStr(lessonKey(b), lessonKey(a)))[0];
  const pn = prev && prev.notes;
  const mats = (l.materials || []).map(i => M.materials.get(i)).filter(Boolean), exs = (l.exercises || []).map(i => M.exercises.get(i)).filter(Boolean);
  const block = (label, v) => v ? html`<div><div class="tiny muted" style="font-weight:700;letter-spacing:.05em;text-transform:uppercase">${label}</div><div class="pre">${v}</div></div>` : '';
  const canFinish = l.status === 'agendada';
  openModal({
    title: l.topic || 'Aula', wide: true, body: html`
    <div class="stack">
      <div class="row"><div class="who">${avatar(s, 44)}<div><b style="font-size:16px">${s ? s.name : '(aluno removido)'}</b><div class="muted small">${fmtDateLong(l.date)} · ${l.time}–${minToTime(timeToMin(l.time) + (Number(l.duration) || 60))} (${l.duration || 60} min)</div></div></div><span class="spacer"></span>${lessonBadge(l.status)}${l.type === 'reposicao' ? badge('Reposição', 'warn') : l.type === 'experimental' ? badge('Experimental', 'info') : ''}</div>
      ${pn && Object.values(pn).some(Boolean) && l.status === 'agendada' ? html`<div class="hl"><b class="small">Notas da última aula (${fmtDate(prev.date)})</b>${pn.nextClass ? html`<p class="pre" style="margin:4px 0 0"><b>Retomar:</b> ${pn.nextClass}</p>` : ''}${pn.difficulties ? html`<p class="pre small" style="margin:4px 0 0"><b>Dificuldades:</b> ${pn.difficulties}</p>` : ''}${pn.errors ? html`<p class="pre small" style="margin:4px 0 0"><b>Revisar:</b> ${pn.errors}</p>` : ''}</div>` : ''}
      ${block('Objetivos', l.objectives)}${block('Conteúdo trabalhado', l.content)}
      ${(l.skills || []).length ? html`<div class="row">${l.skills.map(skillTag)}</div>` : ''}
      ${mats.length ? html`<div><div class="tiny muted" style="font-weight:700;letter-spacing:.05em;text-transform:uppercase">Materiais</div><div class="row">${mats.map(m => badge(m.title))}</div></div>` : ''}
      ${exs.length ? html`<div><div class="tiny muted" style="font-weight:700;letter-spacing:.05em;text-transform:uppercase">Exercícios realizados</div><div class="row">${exs.map(e => badge(e.title))}</div></div>` : ''}
      ${block('Homework atribuído', l.homeworkText)}${block('Observações', l.observations)}
      ${hasLessonNotes(l) ? html`<div class="card" style="box-shadow:none"><div class="card-h"><h3>Lesson notes</h3></div><div class="stack-s">${NOTE_FIELDS.map(([k, lb]) => block(lb, n[k]))}</div></div>` : ''}
      ${l.status === 'agendada' ? html`<p class="hint">Aulas agendadas não descontam do pacote. Registre a aula como realizada para contabilizar presença e pacote.</p>` : ''}
    </div>`,
    footer: html`${iconBtn('trash', 'lesson-del', 'Excluir aula', { id }, 'danger')}<span class="spacer"></span>
      ${canFinish ? html`${btn('Marcar falta', 'lesson-absent', { data: { id } })}${btn('Cancelar aula', 'lesson-cancel', { data: { id } })}` : ''}
      ${l.status === 'realizada' ? btn('Gravação', 'rec-new', { data: { student: l.studentId, lesson: id }, icon: 'video' }) : ''}${l.status === 'realizada' ? btn('Relatório da aula', 'lr-open', { data: { id }, icon: 'contract' }) : ''}${btn('Reagendar', 'lesson-resched', { data: { id }, icon: 'calendar' })}${btn('Editar', 'lesson-edit', { data: { id }, icon: 'edit' })}
      ${canFinish ? btn('Registrar aula realizada', 'lesson-finish', { cls: 'primary', data: { id }, icon: 'check' }) : (hasLessonNotes(l) || l.status === 'realizada' ? btn('Editar lesson notes', 'lesson-finish', { data: { id } }) : '')}`
  });
}
ACTIONS['lesson-edit'] = d => { closeAllModals(); openLessonForm(d.id); };
ACTIONS['lesson-finish'] = d => { closeAllModals(); openLessonForm(d.id, { finish: true }); };
ACTIONS['lesson-absent'] = async d => {
  const l = M.lessons.get(d.id);
  if (!await confirmBox({ title: 'Registrar falta?', message: `O aluno não compareceu. A falta entra no cálculo de frequência${S.settings.absenceCountsPackage ? ' e desconta do pacote' : ', mas não desconta do pacote'}.`, ok: 'Registrar falta' })) return;
  await put('lessons', { ...l, status: 'ausente' }); closeAllModals(); toast('Falta registrada.', 'ok');
};
ACTIONS['lesson-cancel'] = async d => {
  const l = M.lessons.get(d.id);
  if (!await confirmBox({ title: 'Cancelar aula?', message: 'A aula fica no histórico como cancelada. Cancelamentos não contam como falta nem descontam do pacote.', ok: 'Cancelar aula', danger: true })) return;
  await put('lessons', { ...l, status: 'cancelada' }); closeAllModals(); toast('Aula cancelada.', 'ok');
};
ACTIONS['lesson-del'] = async d => {
  if (!await confirmBox({ title: 'Excluir aula?', message: 'O registro será apagado do histórico do aluno. Para manter o histórico, prefira cancelar.', danger: true, ok: 'Excluir' })) return;
  await del('lessons', d.id); closeAllModals(); toast('Aula excluída.', 'ok');
};
ACTIONS['lesson-resched'] = d => {
  const l = M.lessons.get(d.id); if (!l) return;
  closeAllModals();
  openModal({ title: 'Reagendar aula', narrow: true, form: { name: 'resched', id: d.id, submit: 'Reagendar' }, body: html`<p class="muted small" style="margin:0">${stName(l.studentId)} · aula de ${fmtDate(l.date)} às ${l.time}. A aula original fica como "reagendada" e uma nova aula agendada é criada.</p>
    <div class="g2">${fld('Nova data', input('date', addDays(l.date, 7), { type: 'date', a: { required: true } }))}${fld('Novo horário', input('time', l.time, { type: 'time', a: { required: true } }))}</div>` });
};
FORMS.resched = async (v, f, ds) => {
  const l = M.lessons.get(ds.id); if (!l) return;
  const cand = { ...l, date: v.date, time: v.time, id: undefined, status: 'agendada' };
  const conflicts = findConflicts(S.lessons.filter(x => x.id !== l.id), cand).map(c => ({ d: v.date, c }));
  if (conflicts.length && !await confirmBox({ title: 'Conflito de horário', message: conflictMessage(conflicts), ok: 'Reagendar mesmo assim' })) return;
  const nid = await put('lessons', { ...l, id: undefined, date: v.date, time: v.time, status: 'agendada', notes: {}, rescheduledFrom: l.id, rescheduledTo: '', makeupFor: l.makeupFor || '' });
  await put('lessons', { ...l, status: 'reagendada', rescheduledTo: nid });
  closeModal(); toast(`Aula reagendada para ${fmtDate(v.date)} às ${v.time}.`, 'ok');
};

/* =================== CALENDÁRIO =================== */
const HOUR_PX = 56;
const weekColOf = d => (d.getDay() - (S.settings.weekStart === 0 ? 0 : 1) + 7) % 7;
const startOfWeek = iso => addDays(iso, -weekColOf(parseD(iso)));
const WEEK_LABELS = () => S.settings.weekStart === 0 ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
ACTIONS['cal-view'] = d => { UI.cal.view = d.view; render(); };
ACTIONS['cal-nav'] = d => {
  const c = UI.cal, dir = +d.dir;
  if (!dir) c.date = todayISO();
  else if (c.view === 'month') c.date = addMonths(monthOf(c.date), dir) + '-01';
  else c.date = addDays(c.date, dir * (c.view === 'week' ? 7 : 1));
  render();
};
ACTIONS['cal-day'] = d => { UI.cal.view = 'day'; UI.cal.date = d.date; render(); };
ACTIONS.slot = (d, t, e) => {
  const y = e.clientY - t.getBoundingClientRect().top, start = +d.start;
  const min = clamp(start + Math.round(y / HOUR_PX * 2) * 30, 0, 23 * 60 + 30);
  openLessonForm(null, { date: d.date, time: minToTime(min) });
};
ACTIONS['cal-new'] = d => openLessonForm(null, { date: d.date });

function monthView(byDate, today) {
  const ym = monthOf(UI.cal.date), first = ym + '-01', gridStart = startOfWeek(first);
  const weeksN = Math.ceil((weekColOf(parseD(first)) + daysInMonth(ym)) / 7);
  const cells = Array.from({ length: weeksN * 7 }, (_, i) => addDays(gridStart, i));
  return html`<div class="mgrid" role="grid">${WEEK_LABELS().map(w => html`<div class="mh">${w}</div>`)}
    ${cells.map(d => { const ls = (byDate[d] || []).sort((a, b) => cmpStr(a.time, b.time)); return html`<div class="mc ${monthOf(d) !== ym ? 'out' : ''} ${d === today ? 'today' : ''}" data-act="cal-day" data-date="${d}"><span class="dn">${+d.slice(8)}</span>
      ${ls.slice(0, 3).map(l => html`<button type="button" class="ev s-${l.status}" data-act="lesson" data-id="${l.id}" title="${stName(l.studentId)} · ${l.topic || ''}">${l.time} ${(stName(l.studentId).split(' ')[0])}</button>`)}${ls.length > 3 ? html`<span class="more">+${ls.length - 3} mais</span>` : ''}</div>`; })}</div>`;
}
function gridView(days, byDate, today) {
  const all = days.flatMap(d => byDate[d] || []);
  let start = 7 * 60, end = 21 * 60;
  for (const l of all) { start = Math.min(start, Math.floor(timeToMin(l.time) / 60) * 60); end = Math.max(end, Math.ceil((timeToMin(l.time) + (Number(l.duration) || 60)) / 60) * 60); }
  const H = (end - start) / 60 * HOUR_PX, hours = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start / 60 + i);
  return html`<div class="tgwrap"><div class="tg" style="--cols:${days.length};--H:${H}px;--HH:${HOUR_PX}px">
    <div class="tg-h"></div>${days.map(d => html`<button type="button" class="tg-h ${d === today ? 'today' : ''}" style="border-top:0;border-right:0;cursor:pointer;font:inherit" data-act="cal-day" data-date="${d}">${WEEK_LABELS()[weekColOf(parseD(d))]} ${d.slice(8)}/${d.slice(5, 7)}</button>`)}
    <div class="tg-time">${hours.slice(0, -1).map((h, i) => html`<span style="top:${i * HOUR_PX}px">${pad(h)}:00</span>`)}</div>
    ${days.map(d => html`<div class="tg-col ${d === today ? 'today' : ''}" data-act="slot" data-date="${d}" data-start="${start}" aria-label="Agenda de ${fmtDate(d)}">${layoutDay(byDate[d] || []).map(({ l, lane, lanes }) => {
      const top = (timeToMin(l.time) - start) / 60 * HOUR_PX, h = Math.max(24, (Number(l.duration) || 60) / 60 * HOUR_PX - 2);
      return html`<button type="button" class="blk s-${l.status}" data-act="lesson" data-id="${l.id}" style="top:${top}px;height:${h}px;left:calc(${lane / lanes * 100}% + 2px);width:calc(${100 / lanes}% - 4px)"><b>${l.time} ${stName(l.studentId).split(' ')[0]}</b>${h > 40 ? html`<span>${l.topic || ''}</span>` : ''}</button>`;
    })}</div>`)}</div></div>`;
}
VIEWS.calendario = () => {
  const c = UI.cal, f = getF('calendario', { student: '' }), today = todayISO();
  const byDate = {};
  S.lessons.filter(l => !f.student || l.studentId === f.student).forEach(l => (byDate[l.date] ||= []).push(l));
  let body, title;
  if (c.view === 'month') { title = fmtMonth(monthOf(c.date)); body = monthView(byDate, today); }
  else if (c.view === 'week') { const s0 = startOfWeek(c.date), days = Array.from({ length: 7 }, (_, i) => addDays(s0, i)); title = `${fmtDateShort(days[0])} – ${fmtDateShort(days[6])}`; body = gridView(days, byDate, today); }
  else { title = fmtDateLong(c.date); body = gridView([c.date], byDate, today); }
  const dayList = c.view === 'day' ? (byDate[c.date] || []).sort((a, b) => cmpStr(a.time, b.time)) : null;
  return html`
  ${pageHead('Calendário', 'Mês, semana e dia. Clique em um horário vazio para agendar e em uma aula para ver os detalhes.', btn('Agendar aula', 'cal-new', { cls: 'primary', icon: 'plus', data: { date: c.view === 'day' ? c.date : today } }))}
  <div class="cal-bar"><div class="row"><button type="button" class="icon-btn" data-act="cal-nav" data-dir="-1" aria-label="Anterior">${ico('left')}</button><button type="button" class="btn sm" data-act="cal-nav" data-dir="0">Hoje</button><button type="button" class="icon-btn" data-act="cal-nav" data-dir="1" aria-label="Próximo">${ico('right')}</button><span class="cal-title">${title}</span></div>
    <div class="row">${select('student', studentOptions({ blank: 'Todos os alunos', includeInactive: true }), f.student, { id: 'cal-student', a: { 'data-change': 'filter', 'data-page': 'calendario', 'data-key': 'student', 'aria-label': 'Filtrar por aluno' } })}
    <div class="seg" role="group" aria-label="Visualização">${[['month', 'Mês'], ['week', 'Semana'], ['day', 'Dia']].map(([k, l]) => html`<button type="button" aria-pressed="${c.view === k}" data-act="cal-view" data-view="${k}">${l}</button>`)}</div></div></div>
  ${body}
  <div class="row small muted" style="margin-top:12px"><span class="ev s-agendada" style="width:auto">Agendada</span><span class="ev s-realizada" style="width:auto">Realizada</span><span class="ev s-ausente" style="width:auto">Ausente</span><span class="ev s-reagendada" style="width:auto">Reagendada</span><span class="ev s-cancelada" style="width:auto">Cancelada</span></div>
  ${dayList ? html`<div class="card" style="margin-top:var(--gap)"><div class="card-h"><h2>Aulas do dia</h2></div>${dayList.length ? html`<div class="list">${dayList.map(l => lessonItem(l))}</div>` : html`<p class="muted small" style="margin:0">Nenhuma aula neste dia.</p>`}</div>` : ''}`;
};

/* =================== AULAS =================== */
VIEWS.aulas = () => {
  const today = todayISO(), now = nowKey(), ym = monthOf(today);
  const f = getF('aulas', { q: '', student: '', status: '', period: '', prep: '' });
  const nextAny = S.lessons.filter(l => l.status === 'agendada' && lessonKey(l) >= now).sort((a, b) => cmpStr(lessonKey(a), lessonKey(b)))[0];
  const prepId = f.prep || (nextAny && nextAny.studentId) || (S.students.find(s => s.status === 'ativo' && !s.archived) || {}).id || '';
  const prep = M.students.get(prepId);
  const month = S.lessons.filter(l => monthOf(l.date) === ym), att = attendance(month);
  const q = norm(f.q);
  let list = S.lessons.filter(l => (!f.student || l.studentId === f.student) && (!f.status || l.status === f.status)
    && (!f.period || (f.period === 'proximas' ? l.date >= today && l.status === 'agendada' : f.period === 'passadas' ? l.date < today : monthOf(l.date) === ym))
    && (!q || norm([l.topic, l.content, l.objectives, l.observations, stName(l.studentId)].join(' ')).includes(q)));
  list.sort((a, b) => f.period === 'proximas' ? cmpStr(lessonKey(a), lessonKey(b)) : cmpStr(lessonKey(b), lessonKey(a)));
  const pkgs = S.packages.filter(p => M.students.get(p.studentId)).sort((a, b) => cmpStr(stName(a.studentId), stName(b.studentId)) || cmpStr(b.startDate, a.startDate));
  const lastN = prep && lastLessonOf(S.lessons, prepId), pn = lastN && lastN.notes;
  const prepNext = prep && nextLessonOf(S.lessons, prepId, now);
  const prepHw = prep ? S.homework.filter(h => h.studentId === prepId && !['concluida', 'corrigida'].includes(h.status)) : [];
  const prepPlan = prep && S.plans.find(p => p.studentId === prepId && planIsCurrent(p, today));
  return html`
  ${pageHead('Aulas', 'Registro de aulas, lesson notes e pacotes de aulas contratadas.', html`${btn('Registrar aula', 'q-register', { icon: 'book' })}${btn('Agendar aula', 'q-lesson', { cls: 'primary', icon: 'plus' })}`)}
  <div class="stats" style="margin-bottom:var(--gap)">${stat('Realizadas no mês', att.done, { tone: 't-mint' })}${stat('Agendadas à frente', S.lessons.filter(l => l.status === 'agendada' && lessonKey(l) >= now).length, { tone: 't-sky' })}${stat('Faltas no mês', att.abs, { tone: att.abs ? 't-rose' : '' })}${stat('Canceladas no mês', att.canc)}${stat('Frequência do mês', att.pct == null ? '—' : att.pct + '%', { tone: 't-peri' })}</div>

  <div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h2>Preparar aula</h2>${select('prep', studentOptions({ blank: 'Escolha um aluno…', includeInactive: true }), prepId, { id: 'prep-student', a: { 'data-change': 'filter', 'data-page': 'aulas', 'data-key': 'prep', 'aria-label': 'Aluno para preparar a aula' } })}</div>
    ${prep ? html`<div class="cols c2"><div class="stack-s">
      <div class="row">${avatar(prep, 40)}<div><b>${prep.name}</b><div class="muted small">${prep.level} · ${prep.courseType || ''}</div></div></div>
      <dl class="kv"><dt>Próxima aula</dt><dd>${prepNext ? html`<button type="button" class="link" data-act="lesson" data-id="${prepNext.id}">${fmtDateShort(prepNext.date)} às ${prepNext.time}</button>` : '—'}</dd>
      <dt>Plano da semana</dt><dd>${prepPlan ? html`<button type="button" class="link" data-act="open-plan" data-id="${prepPlan.id}">${planProgress(prepPlan).pct}% concluído</button>` : '—'}</dd>
      <dt>Homework em aberto</dt><dd>${prepHw.length ? prepHw.map(h => h.title).slice(0, 3).join(' · ') + (prepHw.length > 3 ? ` +${prepHw.length - 3}` : '') : 'Nenhum'}</dd></dl></div>
      <div>${lastN ? html`<div class="hl"><b class="small">Notas da última aula · ${fmtDate(lastN.date)}${lastN.topic ? ' · ' + lastN.topic : ''}</b>
        ${pn && Object.values(pn).some(Boolean) ? html`<div class="stack-s" style="margin-top:8px">${NOTE_FIELDS.filter(([k]) => pn[k]).map(([k, lb]) => html`<div><div class="tiny muted" style="font-weight:700">${lb}</div><div class="pre small">${pn[k]}</div></div>`)}</div>` : html`<p class="muted small" style="margin:6px 0 0">A última aula não tem lesson notes. ${btn('Adicionar notas', 'lesson-finish', { cls: 'sm', data: { id: lastN.id } })}</p>`}</div>` : html`<p class="muted small" style="margin:0">Este aluno ainda não tem aulas realizadas.</p>`}</div></div>`
      : html`<p class="muted small" style="margin:0">Escolha um aluno para ver as notas da última aula, o homework em aberto e o plano da semana antes de começar.</p>`}</div>

  <div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h2>Pacotes de aulas contratadas</h2>${btn('Novo pacote', 'pkg-pick', { cls: 'sm', icon: 'plus' })}</div>
    ${pkgs.length ? html`<div class="tablewrap"><table class="tbl" style="min-width:760px"><thead><tr><th>Aluno</th><th>Início</th><th>Validade</th><th style="min-width:150px">Uso</th><th class="num">Contratadas</th><th class="num">Realizadas</th><th class="num">Restantes</th><th class="num">Canceladas</th><th class="num">Reposições</th><th></th></tr></thead><tbody>
      ${pkgs.map(p => { const sib = S.packages.filter(x => x.studentId === p.studentId), r = packageSummary(p, sib, S.lessons, S.settings.absenceCountsPackage, today); return html`<tr><td><button type="button" class="link" data-act="open-student" data-id="${p.studentId}">${stName(p.studentId)}</button></td><td>${fmtDate(p.startDate)}</td><td>${p.validUntil ? fmtDate(p.validUntil) + (r.expired ? ' ⚠' : '') : '—'}</td><td>${bar(r.pct, r.remaining < 0 ? 'bad' : r.remaining <= 2 ? 'warn' : '')}</td><td class="num">${r.total}</td><td class="num">${r.used}</td><td class="num"><b>${r.remaining}</b></td><td class="num">${r.canceled}</td><td class="num">${r.makeups}</td><td class="acts">${iconBtn('edit', 'pkg-edit', 'Editar', { id: p.id })}${iconBtn('trash', 'pkg-del', 'Excluir', { id: p.id }, 'danger')}</td></tr>`; })}</tbody></table></div>`
      : html`<p class="muted small" style="margin:0">Nenhum pacote cadastrado ainda. Cadastre o pacote de um aluno para acompanhar aulas contratadas, realizadas e restantes.</p>`}</div>

  <div class="card"><div class="card-h"><h2>Todas as aulas (${list.length})</h2></div>
    <div class="filters"><div class="grow"><input id="fl-q" type="search" placeholder="Buscar por tema, conteúdo ou aluno" value="${f.q}" data-input="filter" data-page="aulas" data-key="q" aria-label="Buscar aulas"></div>
      ${select('student', studentOptions({ blank: 'Todos os alunos', includeInactive: true }), f.student, { id: 'fl-student', a: { 'data-change': 'filter', 'data-page': 'aulas', 'data-key': 'student', 'aria-label': 'Filtrar por aluno' } })}
      ${select('status', [['', 'Todos os status'], ...LESSON_STATUS], f.status, { id: 'fl-status', a: { 'data-change': 'filter', 'data-page': 'aulas', 'data-key': 'status', 'aria-label': 'Filtrar por status' } })}
      ${select('period', [['', 'Qualquer data'], ['proximas', 'Próximas'], ['passadas', 'Passadas'], ['mes', 'Este mês']], f.period, { id: 'fl-period', a: { 'data-change': 'filter', 'data-page': 'aulas', 'data-key': 'period', 'aria-label': 'Filtrar por período' } })}</div>
    ${list.length ? html`${lessonsTable(limited('aulas', list), true)}${moreBtn('aulas', list)}` : empty(S.lessons.length ? 'Nenhuma aula encontrada' : 'Nenhuma aula ainda', S.lessons.length ? 'Ajuste os filtros.' : 'Agende a primeira aula para começar o histórico.', S.lessons.length ? '' : btn('Agendar aula', 'q-lesson', { cls: 'primary' }))}</div>`;
};
ACTIONS['pkg-pick'] = () => openPackageForm(null, '');
