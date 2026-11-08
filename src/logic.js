/* ============================================================
   logic.js — regras de negócio puras (sem DOM e sem banco).
   Tudo aqui é testável em Node (test/logic.test.js).
   ============================================================ */

/* ---------- Constantes de domínio ---------- */
const LEVELS = ['Iniciante', 'Básico', 'Pré-intermediário', 'Intermediário', 'Intermediário avançado', 'Avançado', 'Proficiente'];
const SKILLS = [['grammar', 'Grammar'], ['vocabulary', 'Vocabulary'], ['reading', 'Reading'], ['writing', 'Writing'], ['listening', 'Listening'], ['speaking', 'Speaking'], ['pronunciation', 'Pronunciation']];
const STUDENT_STATUS = [['ativo', 'Ativo'], ['pausado', 'Pausado'], ['inativo', 'Inativo']];
const LESSON_STATUS = [['agendada', 'Agendada'], ['realizada', 'Realizada (presente)'], ['ausente', 'Ausente (falta)'], ['cancelada', 'Cancelada'], ['reagendada', 'Reagendada']];
const LESSON_TYPE = [['regular', 'Aula regular'], ['reposicao', 'Reposição'], ['experimental', 'Aula experimental']];
const HW_STATUS = [['atribuida', 'Atribuída'], ['em_andamento', 'Em andamento'], ['entregue', 'Entregue'], ['pendente_correcao', 'Pendente de correção'], ['corrigida', 'Corrigida'], ['concluida', 'Concluída'], ['refazer', 'Refazer']];
const EX_TYPES = [['multipla_escolha', 'Múltipla escolha'], ['lacunas', 'Complete as lacunas'], ['verdadeiro_falso', 'Verdadeiro ou falso'], ['associacao', 'Associação de palavras'], ['resposta_curta', 'Respostas curtas'], ['producao_escrita', 'Produção escrita'], ['interpretacao', 'Interpretação de texto'], ['listening', 'Atividade de listening'], ['speaking', 'Atividade de speaking']];
const ACT_STATUS = [['nao_iniciada', 'Não iniciada'], ['em_andamento', 'Em andamento'], ['concluida', 'Concluída']];
const GOAL_STATUS = [['nao_iniciado', 'Não iniciado'], ['em_andamento', 'Em andamento'], ['concluido', 'Concluído']];
const TASK_PRIORITY = [['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']];
const TASK_CAT = ['Preparar aula', 'Corrigir exercícios', 'Criar material', 'Atualizar Weekly Study Plan', 'Preparar relatório', 'Revisar objetivos', 'Organizar pagamentos', 'Entrar em contato com aluno', 'Outro'];
const MAT_CAT = [['modelo', 'Modelo de documento'], ['pdf', 'PDF'], ['worksheet', 'Worksheet'], ['documento', 'Documento'], ['link', 'Link'], ['video', 'Vídeo'], ['apresentacao', 'Apresentação'], ['listening', 'Material de listening'], ['reading', 'Material de reading'], ['writing', 'Material de writing'], ['speaking', 'Material de speaking']];
const PAY_STATUS = [['pago', 'Pago'], ['pendente', 'Pendente'], ['atrasado', 'Atrasado'], ['parcial', 'Parcialmente pago'], ['sem_cobranca', 'Sem cobrança gerada']];
const WEEKDAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
const WD_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const FREQ = ['1x por semana', '2x por semana', '3x por semana', 'Quinzenal', 'Mensal', 'Sob demanda'];
const COURSE_TYPES = ['Conversação', 'Inglês geral', 'Business English', 'Preparação para exames', 'Inglês para viagens', 'Inglês para crianças', 'Inglês acadêmico', 'Outro'];
const HW_DELIVERED = ['entregue', 'pendente_correcao', 'corrigida', 'concluida'];

const labelOf = (list, key) => { const f = list.find(x => x[0] === key); return f ? f[1] : (key || ''); };

function defaultSettings() {
  return {
    teacherName: '', platformName: 'Teacher Gabriela Campos', businessName: '', businessEmail: '', businessPhone: '',
    locale: 'pt-BR', currency: 'BRL',
    paymentMethods: ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'Boleto'],
    defaultDuration: 60, defaultMonthly: 0, defaultDueDay: 10,
    absenceCountsPackage: false, reportIntervalDays: 60,
    theme: 'auto', density: 'comfortable', weekStart: 1, demoLoaded: false
  };
}

/* ---------- Utilidades ---------- */
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const todayISO = () => toISO(new Date());
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return toISO(d); };
const monthOf = s => String(s || '').slice(0, 7);
const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const daysInMonth = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const weekdayIdx = s => (parseD(s).getDay() + 6) % 7; // 0 = segunda
const mondayOf = s => addDays(s, -weekdayIdx(s));
const timeToMin = t => { const [h, m] = String(t || '00:00').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const minToTime = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
const nowKey = () => { const d = new Date(); return `${toISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const msToLocalKey = ms => { const d = new Date(ms); return `${toISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const lessonKey = l => `${l.date || ''}T${l.time || '00:00'}`;

const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
const cents = n => Math.round((Number(n) || 0) * 100);
const units = c => c / 100;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const uniq = a => [...new Set(a)];
const cmpStr = (a, b) => String(a || '').localeCompare(String(b || ''), 'pt-BR');
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- Aulas ---------- */
const SLOT_STATUS = new Set(['agendada', 'realizada', 'ausente']);

function findConflicts(lessons, cand) {
  const s = timeToMin(cand.time), e = s + (Number(cand.duration) || 60);
  return lessons.filter(l => {
    if (l.id && l.id === cand.id) return false;
    if (l.date !== cand.date || !SLOT_STATUS.has(l.status)) return false;
    const ls = timeToMin(l.time), le = ls + (Number(l.duration) || 60);
    return s < le && ls < e;
  });
}

function attendance(lessons) {
  const c = st => lessons.filter(l => l.status === st).length;
  const done = c('realizada'), abs = c('ausente');
  const base = done + abs;
  return { done, abs, canc: c('cancelada'), resch: c('reagendada'), sched: c('agendada'), total: lessons.length, pct: base ? Math.round(done / base * 100) : null };
}

const nextLessonOf = (lessons, studentId, now) => lessons
  .filter(l => l.studentId === studentId && l.status === 'agendada' && lessonKey(l) >= now)
  .sort((a, b) => cmpStr(lessonKey(a), lessonKey(b)))[0] || null;

const lastLessonOf = (lessons, studentId) => lessons
  .filter(l => l.studentId === studentId && l.status === 'realizada')
  .sort((a, b) => cmpStr(lessonKey(b), lessonKey(a)))[0] || null;

const hasLessonNotes = l => !!l && !!l.notes && Object.values(l.notes).some(v => String(v || '').trim());

/* ---------- Pacotes de aulas ---------- */
function packageSummary(pkg, siblings, lessons, absenceCounts, today) {
  const sorted = [...siblings].sort((a, b) => cmpStr(a.startDate, b.startDate));
  const i = sorted.findIndex(p => p.id === pkg.id);
  const next = sorted[i + 1];
  const toExcl = next ? next.startDate : '9999-12-31';
  const inRange = lessons.filter(l => l.studentId === pkg.studentId && l.date >= pkg.startDate && l.date < toExcl && (!pkg.validUntil || l.date <= pkg.validUntil));
  const done = inRange.filter(l => l.status === 'realizada').length;
  const absCharged = absenceCounts ? inRange.filter(l => l.status === 'ausente').length : 0;
  const used = done + absCharged;
  const total = Number(pkg.total) || 0;
  return {
    total, done, absCharged, used, remaining: total - used,
    makeups: inRange.filter(l => l.type === 'reposicao' && l.status === 'realizada').length,
    canceled: inRange.filter(l => l.status === 'cancelada').length,
    scheduled: inRange.filter(l => l.status === 'agendada').length,
    expired: !!(pkg.validUntil && (today || todayISO()) > pkg.validUntil),
    pct: total ? clamp(Math.round(used / total * 100), 0, 100) : 0
  };
}

/* ---------- Homework ---------- */
const isDelivered = h => HW_DELIVERED.includes(h.status);
const isHwOverdue = (h, today) => !!h.dueDate && h.dueDate < today && (h.status === 'atribuida' || h.status === 'em_andamento');
const needsCorrection = h => h.status === 'entregue' || h.status === 'pendente_correcao';
const hwPct = h => (h.score != null && h.score !== '' && Number(h.maxScore) > 0) ? Math.round(Number(h.score) / Number(h.maxScore) * 100) : null;

/* ---------- Weekly Study Plans ---------- */
const DAY_KEYS = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'];
const planActivities = p => DAY_KEYS.flatMap(k => ((p.days || {})[k] || []));
function planProgress(p) {
  const acts = planActivities(p);
  const done = acts.filter(a => a.status === 'concluida');
  return {
    total: acts.length, done: done.length, doing: acts.filter(a => a.status === 'em_andamento').length,
    pct: acts.length ? Math.round(done.length / acts.length * 100) : 0,
    minutes: sum(acts, a => Number(a.minutes) || 0), minutesDone: sum(done, a => Number(a.minutes) || 0)
  };
}
const planIsCurrent = (p, today) => p.weekStart <= today && today <= p.weekEnd;

/* ---------- Objetivos ---------- */
const goalPct = g => g.status === 'concluido' ? 100 : g.status === 'nao_iniciado' ? 0 : clamp(Number(g.progress) || 0, 0, 99);

/* ---------- Relatórios ---------- */
function skillAvg(report) {
  const v = SKILLS.map(([k]) => report.scores && report.scores[k] ? report.scores[k].score : null).filter(x => typeof x === 'number' && x >= 1 && x <= 10);
  return v.length ? Math.round(sum(v) / v.length * 10) / 10 : null;
}

function reportSnapshot(studentId, start, end, D) {
  const ls = D.lessons.filter(l => l.studentId === studentId && l.date >= start && l.date <= end);
  const att = attendance(ls);
  const hw = D.homework.filter(h => h.studentId === studentId && h.assignedDate >= start && h.assignedDate <= end);
  const pcts = hw.map(hwPct).filter(x => x != null);
  return {
    lessonsDone: att.done, absences: att.abs, canceled: att.canc, attendancePct: att.pct,
    hwAssigned: hw.length, hwDelivered: hw.filter(isDelivered).length,
    hwAvgPct: pcts.length ? Math.round(sum(pcts) / pcts.length) : null,
    goals: D.goals.filter(g => g.studentId === studentId).map(g => ({ name: g.name, status: g.status, progress: goalPct(g) }))
  };
}

function monthlySeries(studentId, D, endYm, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const ym = addMonths(endYm, -i);
    const a = attendance(D.lessons.filter(l => l.studentId === studentId && monthOf(l.date) === ym));
    const hw = D.homework.filter(h => h.studentId === studentId && monthOf(h.assignedDate) === ym);
    out.push({ ym, pct: a.pct, done: a.done, abs: a.abs, hwAssigned: hw.length, hwDelivered: hw.filter(isDelivered).length });
  }
  return out;
}

function needsReport(student, reports, lessons, today, intervalDays) {
  if (student.status !== 'ativo' || student.archived) return null;
  const mine = reports.filter(r => r.studentId === student.id);
  if (!mine.length) return lessons.some(l => l.studentId === student.id && l.status === 'realizada') ? 'sem_relatorio' : null;
  const last = mine.map(r => r.periodEnd || r.date).sort().pop();
  return daysBetween(last, today) > (Number(intervalDays) || 60) ? 'desatualizado' : null;
}

/* ---------- Financeiro ---------- */
function settleCharge(charge, payments, today) {
  const ps = payments.filter(p => p.studentId === charge.studentId && p.refMonth === charge.refMonth);
  const amount = cents(charge.amount), paid = sum(ps, p => cents(p.amount)), disc = sum(ps, p => cents(p.discount));
  const balance = Math.max(0, amount - paid - disc);
  let status;
  if (balance === 0) status = 'pago';
  else if (charge.dueDate && today > charge.dueDate) status = 'atrasado';
  else if (paid + disc > 0) status = 'parcial';
  else status = 'pendente';
  return { amount: units(amount), paid: units(paid), discount: units(disc), balance: units(balance), status, partial: paid + disc > 0, payments: ps };
}

function dueDateFor(ym, dueDay) {
  return `${ym}-${pad(Math.min(Math.max(Number(dueDay) || 10, 1), daysInMonth(ym)))}`;
}

function monthFinance(ym, D, today) {
  const rows = [], seen = new Set();
  const stById = new Map(D.students.map(s => [s.id, s]));
  for (const c of D.charges.filter(c => c.refMonth === ym)) {
    const st = stById.get(c.studentId); if (!st) continue;
    rows.push({ student: st, charge: c, projected: false, dueDate: c.dueDate, ...settleCharge(c, D.payments, today) });
    seen.add(c.studentId);
  }
  const lastDay = `${ym}-${pad(daysInMonth(ym))}`;
  for (const st of D.students) {
    if (seen.has(st.id) || st.archived || st.status !== 'ativo' || cents(st.monthly) <= 0) continue;
    if (st.startDate && st.startDate > lastDay) continue;
    const fake = { studentId: st.id, refMonth: ym, amount: st.monthly, dueDate: dueDateFor(ym, st.dueDay) };
    const r = settleCharge(fake, D.payments, today);
    rows.push({ student: st, charge: null, projected: true, dueDate: fake.dueDate, ...r, status: r.status === 'pago' ? 'pago' : 'sem_cobranca' });
  }
  const T = { previsto: 0, previstoGerado: 0, recebido: 0, descontos: 0, pendente: 0, atrasado: 0, semCobranca: 0 };
  for (const r of rows) {
    T.previsto += cents(r.amount);
    if (!r.projected) T.previstoGerado += cents(r.amount);
    T.recebido += cents(r.paid); T.descontos += cents(r.discount);
    const b = cents(r.balance);
    if (r.status === 'pendente' || r.status === 'parcial') T.pendente += b;
    else if (r.status === 'atrasado') T.atrasado += b;
    else if (r.status === 'sem_cobranca') T.semCobranca += b;
  }
  for (const k in T) T[k] = units(T[k]);
  rows.sort((a, b) => cmpStr(a.student.name, b.student.name));
  return { rows, totals: T };
}

const cashReceived = (payments, prefix) => units(sum(payments.filter(p => String(p.date || '').startsWith(prefix)), p => cents(p.amount)));

function yearSeries(year, charges, payments) {
  return Array.from({ length: 12 }, (_, i) => {
    const ym = `${year}-${pad(i + 1)}`;
    return { ym, cash: cashReceived(payments, ym), gerado: units(sum(charges.filter(c => c.refMonth === ym), c => cents(c.amount))) };
  });
}

function studentFinance(student, charges, payments, today) {
  const cs = charges.filter(c => c.studentId === student.id);
  let overdue = 0, pending = 0, anyOverdue = false;
  for (const c of cs) {
    const r = settleCharge(c, payments, today);
    if (r.status === 'atrasado') { overdue += cents(r.balance); anyOverdue = true; }
    else if (r.status === 'pendente' || r.status === 'parcial') pending += cents(r.balance);
  }
  const cur = cs.find(c => c.refMonth === monthOf(today));
  let status = '-';
  if (anyOverdue) status = 'atrasado';
  else if (cur) status = settleCharge(cur, payments, today).status;
  else if (student.status === 'ativo' && cents(student.monthly) > 0) status = 'sem_cobranca';
  return { status, overdue: units(overdue), pending: units(pending) };
}

function upcomingDues(D, today, limit) {
  const out = [];
  for (const c of D.charges) {
    const st = D.students.find(s => s.id === c.studentId); if (!st) continue;
    const r = settleCharge(c, D.payments, today);
    if (r.status === 'pendente' || r.status === 'parcial') out.push({ student: st, charge: c, ...r });
  }
  return out.sort((a, b) => cmpStr(a.charge.dueDate, b.charge.dueDate)).slice(0, limit || 8);
}

/* ---------- Linha do tempo ---------- */
function buildTimeline(sid, D) {
  const st = D.students.find(s => s.id === sid);
  if (!st) return [];
  const ev = [];
  const add = (ts, kind, title, sub, ref) => { if (ts) ev.push({ ts: String(ts), kind, title, sub: sub || '', ref }); };
  if (st.createdAt) add(msToLocalKey(st.createdAt), 'cadastro', 'Cadastro no sistema', st.name, { type: 'student', id: sid });
  if (st.startDate) add(st.startDate + 'T00:00', 'cadastro', 'Início das aulas', st.courseType || '', { type: 'student', id: sid });
  for (const ch of (st.levelHistory || [])) if (ch.from) add(ch.date + 'T23:00', 'nivel', `Mudança de nível: ${ch.from} → ${ch.to}`, '', { type: 'student', id: sid });
  for (const l of D.lessons.filter(x => x.studentId === sid)) {
    add(lessonKey(l), 'aula', `Aula: ${l.topic || 'sem tema'}`, labelOf(LESSON_STATUS, l.status), { type: 'lesson', id: l.id });
    if (hasLessonNotes(l)) add(lessonKey(l) + ':1', 'nota-aula', 'Lesson notes registradas', String(l.notes.worked || l.notes.nextClass || '').slice(0, 110), { type: 'lesson', id: l.id });
  }
  for (const h of D.homework.filter(x => x.studentId === sid)) {
    add(h.assignedDate + 'T00:00', 'homework', `Homework atribuído: ${h.title}`, h.dueDate ? 'prazo ' + h.dueDate : '', { type: 'homework', id: h.id });
    if (h.deliveredDate) add(h.deliveredDate + 'T12:00', 'homework', `Homework entregue: ${h.title}`, '', { type: 'homework', id: h.id });
    if (h.correctedDate) add(h.correctedDate + 'T13:00', 'homework', `Homework corrigido: ${h.title}`, hwPct(h) != null ? hwPct(h) + '%' : '', { type: 'homework', id: h.id });
  }
  for (const p of D.plans.filter(x => x.studentId === sid)) add((p.weekStart || '') + 'T00:00', 'plano', `Weekly Study Plan: ${p.weekStart} a ${p.weekEnd}`, `${planProgress(p).pct}% concluído`, { type: 'plan', id: p.id });
  for (const r of D.reports.filter(x => x.studentId === sid)) add(String(r.date || r.periodEnd).slice(0, 10) + 'T12:00', 'relatorio', `Relatório de desempenho (${r.periodStart} a ${r.periodEnd})`, skillAvg(r) != null ? 'média ' + skillAvg(r) : '', { type: 'report', id: r.id });
  for (const p of D.payments.filter(x => x.studentId === sid)) add((p.date || '') + 'T12:00', 'pagamento', `Pagamento registrado (ref. ${p.refMonth})`, '', { type: 'payment', id: p.id });
  for (const g of D.goals.filter(x => x.studentId === sid)) add(g.createdAt ? String(g.createdAt).slice(0, 10) + 'T09:00' : '', 'objetivo', `Objetivo: ${g.name}`, labelOf(GOAL_STATUS, g.status), { type: 'goal', id: g.id });
  for (const n of D.notes.filter(x => x.studentId === sid)) add(n.date, 'observacao', 'Observação', String(n.text || '').slice(0, 110), { type: 'note', id: n.id });
  return ev.sort((a, b) => cmpStr(b.ts, a.ts));
}

/* ---------- Busca global ---------- */
function searchAll(q, D, limit) {
  const n = norm(String(q || '').trim());
  if (n.length < 2) return [];
  const lim = limit || 6;
  const stName = id => (D.students.find(s => s.id === id) || {}).name || '';
  const has = (...f) => f.some(x => norm(x).includes(n));
  const out = [];
  const add = (key, label, items) => { if (items.length) out.push({ key, label, total: items.length, items: items.slice(0, lim) }); };
  add('students', 'Alunos', D.students.filter(s => has(s.name, s.email, s.phone, s.goals, s.courseType)).map(s => ({ type: 'student', id: s.id, title: s.name, sub: s.level })));
  add('lessons', 'Aulas', D.lessons.filter(l => has(l.topic, l.content, l.objectives, l.observations, stName(l.studentId))).sort((a, b) => cmpStr(lessonKey(b), lessonKey(a))).map(l => ({ type: 'lesson', id: l.id, title: l.topic || 'Aula', studentId: l.studentId, date: l.date })));
  add('exercises', 'Exercícios', D.exercises.filter(e => has(e.title, e.instructions, e.objective)).map(e => ({ type: 'exercise', id: e.id, title: e.title, sub: (e.skills || []).map(k => labelOf(SKILLS, k)).join(', ') })));
  add('homework', 'Homework', D.homework.filter(h => has(h.title, h.description, stName(h.studentId))).map(h => ({ type: 'homework', id: h.id, title: h.title, studentId: h.studentId, date: h.dueDate })));
  add('plans', 'Weekly Study Plans', D.plans.filter(p => has(p.goal, p.notes, stName(p.studentId))).map(p => ({ type: 'plan', id: p.id, title: `Semana de ${p.weekStart}`, studentId: p.studentId })));
  add('materials', 'Materiais', D.materials.filter(m => has(m.title, m.description, (m.tags || []).join(' '))).map(m => ({ type: 'material', id: m.id, title: m.title, sub: labelOf(MAT_CAT, m.category) })));
  add('payments', 'Pagamentos', D.payments.filter(p => has(stName(p.studentId), p.notes, p.method, p.refMonth)).map(p => ({ type: 'payment', id: p.id, title: `Pagamento ref. ${p.refMonth}`, studentId: p.studentId, date: p.date })));
  add('reports', 'Relatórios', D.reports.filter(r => has(stName(r.studentId), r.strengths, r.improve, r.nextSteps, r.teacherNotes)).map(r => ({ type: 'report', id: r.id, title: `Relatório ${r.periodStart} a ${r.periodEnd}`, studentId: r.studentId })));
  return out;
}

/* ---------- CSV ---------- */
function toCSV(rows, cols) {
  const q = v => {
    if (v == null) return '';
    let s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return '﻿' + [cols.map(c => q(c[0])).join(';'), ...rows.map(r => cols.map(c => q(c[1](r))).join(';'))].join('\r\n');
}

/* ---------- Agenda: disposição de blocos que se sobrepõem ---------- */
function layoutDay(items) {
  const s = [...items].sort((a, b) => timeToMin(a.time) - timeToMin(b.time) || (Number(b.duration) || 60) - (Number(a.duration) || 60));
  const out = []; let cluster = [], clusterEnd = -1;
  const flush = () => { const lanes = Math.max(1, ...cluster.map(c => c.lane + 1)); cluster.forEach(c => c.lanes = lanes); out.push(...cluster); cluster = []; };
  for (const l of s) {
    const st = timeToMin(l.time), en = st + (Number(l.duration) || 60);
    if (cluster.length && st >= clusterEnd) { flush(); clusterEnd = -1; }
    const used = new Set(cluster.filter(c => timeToMin(c.l.time) + (Number(c.l.duration) || 60) > st).map(c => c.lane));
    let lane = 0; while (used.has(lane)) lane++;
    cluster.push({ l, lane, lanes: 1 }); clusterEnd = Math.max(clusterEnd, en);
  }
  if (cluster.length) flush();
  return out;
}


/* ---------- Contrato, cronograma e evolução ---------- */
const CONTRACT_TYPES = [['anual', 'Plano anual'], ['semestral', 'Plano semestral'], ['trimestral', 'Plano trimestral'], ['mensal', 'Plano mensal'], ['personalizado', 'Personalizado']];
const CONTRACT_STATUS = [['vigente', 'Vigente'], ['encerrado', 'Encerrado'], ['rascunho', 'Rascunho']];
const STAGE_STATUS = [['nao_iniciada', 'Não iniciada'], ['em_andamento', 'Em andamento'], ['concluida', 'Concluída']];
const STAGE_MODELS = {
  anual: ['Diagnóstico e base', 'Rotina e verbos do dia a dia', 'Vocabulário essencial', 'Conversação guiada', 'Passado e experiências', 'Revisão do semestre', 'Futuro e planos', 'Listening ativo', 'Reading e interpretação', 'Writing prático', 'Fluência e pronúncia', 'Revisão final e avaliação'],
  semestral: ['Diagnóstico e base', 'Rotina e verbos do dia a dia', 'Vocabulário essencial', 'Conversação guiada', 'Passado e experiências', 'Revisão e avaliação'],
  trimestral: ['Diagnóstico e base', 'Conversação guiada', 'Revisão e avaliação'],
  mensal: ['Foco do mês'],
  personalizado: []
};
function stageModel(type, startDate) {
  const titles = STAGE_MODELS[type] || [];
  return titles.map((title, i) => ({ order: i + 1, title, description: '', skill: '', startDate: shiftMonth(startDate, i), endDate: addDays(shiftMonth(startDate, i + 1), -1), status: 'nao_iniciada', completedDate: '' }));
}
function shiftMonth(iso, n) {
  const ym = addMonths(monthOf(iso), n), day = Math.min(parseD(iso).getDate(), daysInMonth(ym));
  return `${ym}-${pad(day)}`;
}
function activeContract(contracts, studentId) {
  const mine = contracts.filter(c => c.studentId === studentId);
  const vig = mine.filter(c => c.status === 'vigente').sort((a, b) => cmpStr(b.startDate, a.startDate));
  return vig[0] || [...mine].sort((a, b) => cmpStr(b.startDate, a.startDate))[0] || null;
}
function stageEvolution(stages, today) {
  const st = [...stages].sort((a, b) => (a.order || 0) - (b.order || 0));
  const total = st.length, done = st.filter(s => s.status === 'concluida').length, doing = st.filter(s => s.status === 'em_andamento').length;
  const plannedNow = st.filter(s => s.endDate && s.endDate <= today).length;
  const pctDone = total ? Math.round(done / total * 100) : 0, pctPlanned = total ? Math.round(plannedNow / total * 100) : 0;
  const dated = st.filter(s => s.startDate || s.endDate);
  const labels = [], planned = [], actual = [];
  if (total && dated.length) {
    const first = monthOf(dated.map(s => s.startDate || s.endDate).sort()[0]), last = monthOf(dated.map(s => s.endDate || s.startDate).sort().pop());
    const nowYm = monthOf(today);
    for (let ym = first; ym <= last; ym = addMonths(ym, 1)) {
      const end = `${ym}-${pad(daysInMonth(ym))}`;
      labels.push(ym);
      planned.push(Math.round(st.filter(s => s.endDate && s.endDate <= end).length / total * 100));
      actual.push(ym > nowYm ? null : Math.round(st.filter(s => s.status === 'concluida' && (s.completedDate || '0000') <= (ym === nowYm ? today : end)).length / total * 100));
    }
  }
  const behind = Math.max(0, plannedNow - done);
  const state = !total ? 'sem_etapas' : done === total ? 'concluido' : behind > 0 ? 'atrasado' : done > plannedNow ? 'adiantado' : 'no_ritmo';
  return { total, done, doing, pctDone, pctPlanned, behind, state, labels, planned, actual };
}
/* ----- homework estilo Google Classroom ----- */
const HW_UI = { pendente: ['Pendente', 'clock', 'info'], atrasada: ['Atrasada', 'alert', 'bad'], rascunho: ['Em andamento', 'edit', 'info'], entregue: ['Entregue', 'send', 'warn'], corrigida: ['Corrigida', 'check', 'ok'], refazer: ['Refazer', 'redo', 'warn'] };
/* visão da professora: só depende do status gravado no cadastro do homework */
function hwKey(h, today) {
  if (h.status === 'corrigida' || h.status === 'concluida') return 'corrigida';
  if (h.status === 'refazer') return 'refazer';
  if (h.status === 'entregue' || h.status === 'pendente_correcao') return 'entregue';
  return h.dueDate && h.dueDate < today ? 'atrasada' : 'pendente';
}
/* visão do aluno: combina o que a professora publicou, a entrega do aluno (sub) e a devolução (ret) */
function hwKeyStudent(h, sub, ret, today) {
  const s = sub && sub[h.id], r = ret && ret[h.id];
  if (r && (!s || !s.submittedAt || String(r.returnedAt) >= String(s.submittedAt))) return r.mode === 'refazer' ? 'refazer' : 'corrigida';
  if (s && s.status === 'entregue') return 'entregue';
  if (h.status === 'corrigida' || h.status === 'concluida') return 'corrigida';
  if (h.status === 'refazer') return 'refazer';
  if (s && s.status === 'rascunho' && s.html) return h.dueDate && h.dueDate < today ? 'atrasada' : 'rascunho';
  return h.dueDate && h.dueDate < today ? 'atrasada' : 'pendente';
}
const DEFAULT_TIPS = [
  ['Seja pontual', 'Entre na aula no horário combinado, já preparado. Isso mostra respeito pelo tempo da aula e ajuda você a aproveitar cada minuto.'],
  ['Escolha um bom ambiente', 'Procure um lugar silencioso, bem iluminado e sem distrações. Evite estudar com TV ligada, celular tirando sua atenção ou pessoas conversando ao redor.'],
  ['Verifique seus equipamentos', 'Antes da aula, garanta internet estável, fone de ouvido com microfone (de preferência), câmera funcionando (quando necessário) e dispositivo carregado ou na tomada.'],
  ['Participe ativamente', 'Você aprende inglês praticando: participe das atividades, faça perguntas sempre que tiver dúvidas e tente falar em inglês o máximo possível, mesmo com erros. Não tenha medo de errar, isso faz parte do processo!'],
  ['Mantenha seu material organizado', 'Tenha sempre um caderno ou arquivo para anotações, caneta e os materiais enviados pela professora. Depois da aula, revise suas anotações para reforçar o aprendizado.'],
  ['Faça as tarefas', 'As atividades fora da aula são essenciais para o seu progresso. Faça as tarefas no prazo, revise conteúdos anteriores e pratique sempre que puder (escutar, ler, escrever e falar).'],
  ['Tenha uma atitude positiva', 'Aprender inglês leva tempo. Seja paciente consigo mesmo, mantenha uma mentalidade aberta e continue tentando, mesmo quando parecer difícil.'],
  ['Comunique-se com a professora', 'Se tiver dificuldades, precisar remarcar uma aula ou avisar sobre atrasos, comunique com antecedência. Isso ajuda a manter tudo organizado e produtivo.']
];
const DEFAULT_GUIDE = {
  welcome: 'Hello, my dear student!\n\nQue ótimo estar com você nessa nova jornada de aprendizagem.\n\nAqui estão todos os links e tutoriais importantes para você acompanhar o curso, além dos documentos das aulas, como "Classroom Agreements", expressões em inglês e as informações para o pagamento da mensalidade.\n\nSe tiver qualquer dúvida ou dificuldade, não hesite em me chamar. See you!',
  zoomId: '', zoomPass: '', zoomTutorials: '', classroomUrl: '', classroomTutorials: '', cambridgeUrl: '', cambridgeKey: '', cambridgeTutorials: '',
  tips: DEFAULT_TIPS.map(t => t[0] + '\n' + t[1]).join('\n\n'), tutorials: '', docs: '', payInfo: ''
};
/* "Título | https://link | senha" por linha */
function parseLinkLines(txt, withPass) {
  return String(txt || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 20).map(l => {
    const p = l.split('|').map(x => x.trim()); const url = p.find(x => /^https?:\/\//i.test(x)) || '';
    const title = p[0] && !/^https?:\/\//i.test(p[0]) ? p[0] : (url || 'Link');
    const pass = withPass ? (p.find((x, i) => i > 0 && x && x !== url) || '') : '';
    return { title: title.slice(0, 120), url: isHttpUrl(url) ? url : '', pass: pass.slice(0, 60) };
  });
}
const parseTips = txt => String(txt || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).slice(0, 20).map(b => { const i = b.indexOf('\n'); return i < 0 ? { title: b.slice(0, 120), text: '' } : { title: b.slice(0, i).slice(0, 120), text: b.slice(i + 1).trim().slice(0, 600) }; });
function guideFor(student, base) {
  const g = { ...DEFAULT_GUIDE, ...(base || {}) }, o = student.guide || {};
  const pick = k => (o[k] !== undefined && o[k] !== '' ? o[k] : g[k]) || '';
  return {
    welcome: String(pick('welcome')).slice(0, 1500), zoomId: String(pick('zoomId')).slice(0, 60), zoomPass: String(pick('zoomPass')).slice(0, 60), zoomUrl: isHttpUrl(student.zoomUrl) ? String(student.zoomUrl).trim() : '',
    zoomTutorials: parseLinkLines(pick('zoomTutorials')), classroomUrl: isHttpUrl(pick('classroomUrl')) ? String(pick('classroomUrl')).trim() : '', classroomTutorials: parseLinkLines(pick('classroomTutorials')),
    cambridgeUrl: isHttpUrl(pick('cambridgeUrl')) ? String(pick('cambridgeUrl')).trim() : '', cambridgeKey: String(pick('cambridgeKey')).slice(0, 60), cambridgeTutorials: parseLinkLines(pick('cambridgeTutorials')),
    tips: parseTips(pick('tips')), tutorials: parseLinkLines(pick('tutorials'), true), docs: parseLinkLines(pick('docs')), payInfo: String(o.payInfo || '').slice(0, 800)
  };
}
const isHttpUrl = u => { try { const x = new URL(String(u).trim()); return x.protocol === 'https:' || x.protocol === 'http:'; } catch (e) { return false; } };

/* Resumo que a professora publica para o painel de UM aluno (nada de financeiro, notas privadas ou dados de outros alunos). */
function portalDoc(studentId, D, today, nowK, opts) {
  opts = opts || {};
  const s = D.students.find(x => x.id === studentId); if (!s) return null;
  const ct = activeContract(D.contracts || [], studentId);
  const stages = ct ? (D.stages || []).filter(x => x.contractId === ct.id).sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
  const lessons = D.lessons.filter(l => l.studentId === studentId);
  const next = lessons.filter(l => l.status === 'agendada' && lessonKey(l) >= nowK).sort((a, b) => cmpStr(lessonKey(a), lessonKey(b))).slice(0, 6).map(l => ({ date: l.date, time: l.time, duration: l.duration || 60, topic: l.topic || '' }));
  const lr = lessons.filter(l => l.lr && l.lr.published).sort((a, b) => cmpStr(lessonKey(b), lessonKey(a))).slice(0, 40)
    .map(l => ({ date: l.date, topic: l.topic || '', summary: l.lr.summary || '', vocabulary: l.lr.vocabulary || '', homework: l.lr.homework || '', highlights: l.lr.highlights || '', nextSteps: l.lr.nextSteps || '' }));
  const hw = D.homework.filter(h => h.studentId === studentId).sort((a, b) => cmpStr(b.assignedDate, a.assignedDate)).slice(0, 25).map(h => {
    const closed = h.status === 'corrigida' || h.status === 'concluida';
    const open = !closed;
    return { id: h.id, title: h.title, description: String(h.description || '').slice(0, 1200), assignedDate: h.assignedDate, dueDate: h.dueDate || '', status: h.status, score: closed && h.score != null ? h.score : null, maxScore: h.maxScore || 10, feedback: closed ? String(h.feedback || '').slice(0, 600) : '', docHtml: open && h.docHtml ? String(h.docHtml).slice(0, 9000) : '', attachId: h.attachId || '', attachName: h.attachName || '', attachUrl: isHttpUrl(h.attachUrl) ? String(h.attachUrl).trim() : '' };
  });
  const rp = D.reports.filter(r => r.studentId === studentId && r.shared).sort((a, b) => cmpStr(b.periodEnd, a.periodEnd)).slice(0, 8)
    .map(r => ({ periodStart: r.periodStart, periodEnd: r.periodEnd, scores: Object.fromEntries(Object.entries(r.scores || {}).map(([k, v]) => [k, { score: v.score, comment: v.comment || '' }])), strengths: r.strengths || '', improve: r.improve || '', nextSteps: r.nextSteps || '' }));
  const pl = D.plans.filter(p => p.studentId === studentId && p.weekEnd >= today).sort((a, b) => cmpStr(a.weekStart, b.weekStart))[0];
  const plan = pl ? { weekStart: pl.weekStart, weekEnd: pl.weekEnd, goal: pl.goal || '', days: Object.fromEntries(DAY_KEYS.map(k => [k, ((pl.days || {})[k] || []).map(a => ({ title: a.title, skill: a.skill || '', minutes: a.minutes || 0, status: a.status }))])) } : null;
  const grp = s.groupId ? (D.groups || []).find(g => g.id === s.groupId) : null;
  const zu = isHttpUrl(s.zoomUrl) ? s : (grp && isHttpUrl(grp.zoomUrl) ? grp : null), cu = isHttpUrl(s.calendarUrl) ? s : (grp && isHttpUrl(grp.calendarUrl) ? grp : null);
  const doneN = lessons.filter(l => l.status === 'realizada').length;
  return {
    v: 1, studentId, name: s.name, level: s.level, updatedAt: nowK,
    zoom: { url: zu ? String(zu.zoomUrl).trim() : '', note: zu ? String(zu.zoomNote || '').slice(0, 300) : '' },
    next, lessonsDone: doneN, lessonsTotal: ct ? Number(ct.totalLessons) || 0 : 0,
    contract: ct ? { type: ct.type, typeName: ct.typeName || '', startDate: ct.startDate, endDate: ct.endDate || '', totalLessons: Number(ct.totalLessons) || 0, signedDate: ct.signedDate || '', status: ct.status, notes: ct.showNotes ? String(ct.notes || '').slice(0, 800) : '', assetId: ct.showContract !== false ? ct.assetId || '' : '', fileName: ct.showContract !== false ? ct.fileName || '' : '', showContract: ct.showContract !== false } : null,
    stages: ct && ct.showSchedule !== false ? stages.map(x => ({ order: x.order, title: x.title, description: x.description || '', skill: x.skill || '', startDate: x.startDate || '', endDate: x.endDate || '', status: x.status, completedDate: x.completedDate || '', note: x.note || '' })) : [],
    lessonReports: lr, homework: hw, reports: rp, plan,
    planFiles: D.plans.filter(p => p.studentId === studentId && (p.pdfAssetId || isHttpUrl(p.pdfUrl))).sort((a, b) => cmpStr(b.weekStart, a.weekStart)).slice(0, 10).map(p => ({ weekStart: p.weekStart, weekEnd: p.weekEnd, goal: p.goal || '', assetId: p.pdfAssetId || '', fileName: p.pdfName || '', url: isHttpUrl(p.pdfUrl) ? String(p.pdfUrl).trim() : '' })),
    materials: (D.materials || []).filter(m => m.showStudent && (!(m.studentIds || []).length || m.studentIds.includes(studentId))).sort((a, b) => cmpStr(a.title, b.title)).slice(0, 40).map(m => ({ title: m.title, category: m.category, description: String(m.description || '').slice(0, 300), url: isHttpUrl(m.link) ? String(m.link).trim() : '', assetId: m.assetId || '', fileName: m.fileName || '' })),
    profile: { name: s.name, email: s.email || '', phone: s.phone || '', birth: s.birth || '', startDate: s.startDate || '', level: s.level || '', courseType: s.courseType || '', frequency: s.frequency || '', duration: s.duration || 60, schedule: (s.schedule || []).map(x => ({ day: x.day, time: x.time })), goals: String(s.goals || '').slice(0, 600) },
    banner: { title: String(s.bannerTitle || '').trim() || (grp && String(grp.bannerTitle || '').trim()) || (s.courseType ? s.courseType + ' - ' : 'English Class - ') + String(s.name || '').split(' ')[0], sub: String(s.bannerSub || '').slice(0, 80), theme: (opts.banner && opts.banner.theme) || 'lavanda', imageId: (opts.banner && opts.banner.imageId) || '' },
    calendar: { url: cu ? String(cu.calendarUrl).trim() : '', note: cu ? String(cu.calendarNote || '').slice(0, 300) : '' },
    recordings: (D.recordings || []).filter(r => r.studentId === studentId && r.shared !== false).sort((a, b) => cmpStr(b.date || '', a.date || '')).slice(0, 60).map(r => ({ title: r.title, date: r.date || '', url: isHttpUrl(r.url) ? String(r.url).trim() : '', assetId: r.assetId || '', fileName: r.fileName || '', note: String(r.note || '').slice(0, 300) })),
    guide: guideFor(s, { ...(opts.guide || {}), ...((grp && grp.guide) || {}) }),
    group: grp ? { name: grp.name } : null
  };
}

/* Exporta para os testes em Node; no navegador `module` não existe. */

/* ---------- painel dos responsáveis (somente leitura) ---------- */
function guardianKid(studentId, D, today, nowK, opts) {
  const d = portalDoc(studentId, D, today, nowK, opts); if (!d) return null;
  const s = D.students.find(x => x.id === studentId);
  d.homework = d.homework.map(h => ({ id: h.id, title: h.title, description: h.description, dueDate: h.dueDate, assignedDate: h.assignedDate, key: hwKey(h, today), score: h.score, maxScore: h.maxScore, feedback: h.feedback }));
  let finance = null;
  if (s.guardFin !== false) {
    const charges = (D.charges || []).filter(c => c.studentId === studentId).sort((a, b) => cmpStr(b.refMonth, a.refMonth)).slice(0, 12).map(c => { const r = settleCharge(c, D.payments || [], today); return { refMonth: c.refMonth, dueDate: c.dueDate || '', amount: r.amount, paid: r.paid, discount: r.discount, balance: r.balance, status: r.status }; });
    finance = { monthly: Number(s.monthly) || 0, dueDay: Number(s.dueDay) || 0, payMethod: s.payMethod || '', payInfo: String((d.guide && d.guide.payInfo) || '').slice(0, 800), charges };
  }
  d.finance = finance; d.guide = null; d.materials = []; d.recordings = []; d.planFiles = []; d.plan = null;
  d.studentId = studentId;
  return d;
}
function guardianDoc(kidIds, D, today, nowK, opts) {
  const kids = kidIds.map(id => guardianKid(id, D, today, nowK, opts)).filter(Boolean);
  return { v: 1, guardian: true, updatedAt: nowK, kids };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    guardianDoc, guardianKid, HW_UI, hwKey, hwKeyStudent, guideFor, parseLinkLines, parseTips, DEFAULT_GUIDE,
    LEVELS, SKILLS, defaultSettings, toISO, parseD, todayISO, addDays, monthOf, addMonths, daysInMonth, weekdayIdx, mondayOf,
    timeToMin, minToTime, daysBetween, lessonKey, norm, cents, units, findConflicts, attendance, nextLessonOf, lastLessonOf,
    packageSummary, isDelivered, isHwOverdue, needsCorrection, hwPct, planProgress, planIsCurrent, goalPct, skillAvg,
    reportSnapshot, monthlySeries, needsReport, settleCharge, dueDateFor, monthFinance, cashReceived, yearSeries,
    studentFinance, upcomingDues, buildTimeline, searchAll, toCSV, layoutDay, hasLessonNotes,
    stageModel, shiftMonth, activeContract, stageEvolution, isHttpUrl, portalDoc
  };
}
