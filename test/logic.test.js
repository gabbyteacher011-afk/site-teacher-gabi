const assert = require('node:assert/strict');
const L = require('../src/logic.js');

let passed = 0;
const t = (name, fn) => { try { fn(); passed++; console.log('  ok  -', name); } catch (e) { console.error('FAIL  -', name, '\n', e.message); process.exitCode = 1; } };

/* ---------- datas ---------- */
t('mondayOf devolve a segunda-feira da semana', () => {
  assert.equal(L.mondayOf('2026-11-07'), '2026-11-02'); // sábado
  assert.equal(L.mondayOf('2026-11-02'), '2026-11-02'); // segunda
  assert.equal(L.mondayOf('2026-11-08'), '2026-11-02'); // domingo
});
t('addMonths / daysInMonth', () => {
  assert.equal(L.addMonths('2026-01', -1), '2025-12');
  assert.equal(L.addMonths('2026-11', 3), '2027-02');
  assert.equal(L.daysInMonth('2028-02'), 29);
  assert.equal(L.daysInMonth('2026-02'), 28);
});
t('dueDateFor limita o dia ao fim do mês', () => {
  assert.equal(L.dueDateFor('2026-02', 31), '2026-02-28');
  assert.equal(L.dueDateFor('2026-11', 10), '2026-11-10');
});

/* ---------- conflito de horário ---------- */
t('findConflicts detecta sobreposição e ignora canceladas e a própria aula', () => {
  const ls = [
    { id: 'a', date: '2026-11-10', time: '18:00', duration: 60, status: 'agendada' },
    { id: 'b', date: '2026-11-10', time: '20:00', duration: 60, status: 'cancelada' },
    { id: 'c', date: '2026-11-11', time: '18:00', duration: 60, status: 'agendada' }
  ];
  assert.equal(L.findConflicts(ls, { date: '2026-11-10', time: '18:30', duration: 60 }).length, 1);
  assert.equal(L.findConflicts(ls, { date: '2026-11-10', time: '19:00', duration: 60 }).length, 0); // encostado, sem sobrepor
  assert.equal(L.findConflicts(ls, { date: '2026-11-10', time: '20:00', duration: 60 }).length, 0); // só cancelada
  assert.equal(L.findConflicts(ls, { id: 'a', date: '2026-11-10', time: '18:00', duration: 60 }).length, 0); // editando a mesma
});

/* ---------- frequência ---------- */
t('frequência: canceladas e reagendadas não contam como falta', () => {
  const a = L.attendance([
    { status: 'realizada' }, { status: 'realizada' }, { status: 'realizada' },
    { status: 'ausente' }, { status: 'cancelada' }, { status: 'reagendada' }, { status: 'agendada' }
  ]);
  assert.equal(a.done, 3); assert.equal(a.abs, 1); assert.equal(a.canc, 1);
  assert.equal(a.pct, 75); // 3 / (3 + 1)
});
t('frequência sem registros é null (não inventa 100%)', () => {
  assert.equal(L.attendance([{ status: 'agendada' }, { status: 'cancelada' }]).pct, null);
});

/* ---------- pacotes ---------- */
t('pacote: agendada não desconta; realizada desconta; falta só se configurado', () => {
  const pkg = { id: 'p1', studentId: 's1', total: 10, startDate: '2026-10-01' };
  const ls = [
    { studentId: 's1', date: '2026-10-05', status: 'realizada' },
    { studentId: 's1', date: '2026-10-12', status: 'realizada', type: 'reposicao' },
    { studentId: 's1', date: '2026-10-19', status: 'ausente' },
    { studentId: 's1', date: '2026-10-26', status: 'cancelada' },
    { studentId: 's1', date: '2026-11-20', status: 'agendada' },
    { studentId: 's2', date: '2026-10-06', status: 'realizada' }
  ];
  let r = L.packageSummary(pkg, [pkg], ls, false, '2026-11-07');
  assert.equal(r.used, 2); assert.equal(r.remaining, 8); assert.equal(r.makeups, 1); assert.equal(r.canceled, 1); assert.equal(r.scheduled, 1);
  r = L.packageSummary(pkg, [pkg], ls, true, '2026-11-07');
  assert.equal(r.used, 3); assert.equal(r.remaining, 7);
});
t('pacote: aulas depois do próximo pacote e depois da validade não entram', () => {
  const p1 = { id: 'p1', studentId: 's1', total: 4, startDate: '2026-09-01', validUntil: '2026-09-30' };
  const p2 = { id: 'p2', studentId: 's1', total: 4, startDate: '2026-10-01' };
  const ls = [
    { studentId: 's1', date: '2026-09-10', status: 'realizada' },
    { studentId: 's1', date: '2026-10-10', status: 'realizada' },
    { studentId: 's1', date: '2026-10-17', status: 'realizada' }
  ];
  assert.equal(L.packageSummary(p1, [p1, p2], ls, false, '2026-11-07').used, 1);
  assert.equal(L.packageSummary(p2, [p1, p2], ls, false, '2026-11-07').used, 2);
  assert.equal(L.packageSummary(p1, [p1, p2], ls, false, '2026-11-07').expired, true);
});

/* ---------- financeiro ---------- */
const TODAY = '2026-11-07';
const students = [
  { id: 's1', name: 'Ana', status: 'ativo', monthly: 300, dueDay: 5, startDate: '2026-01-01' },
  { id: 's2', name: 'Bruno', status: 'ativo', monthly: 200, dueDay: 20, startDate: '2026-01-01' },
  { id: 's3', name: 'Carla', status: 'ativo', monthly: 150, dueDay: 10, startDate: '2026-01-01' },
  { id: 's4', name: 'Diego', status: 'pausado', monthly: 400, dueDay: 10, startDate: '2026-01-01' },
  { id: 's5', name: 'Eva', status: 'ativo', monthly: 100, dueDay: 10, startDate: '2026-12-15' } // começa depois
];
const charges = [
  { id: 'c1', studentId: 's1', refMonth: '2026-11', amount: 300, dueDate: '2026-11-05' },
  { id: 'c2', studentId: 's2', refMonth: '2026-11', amount: 200, dueDate: '2026-11-20' },
  { id: 'c3', studentId: 's3', refMonth: '2026-11', amount: 150, dueDate: '2026-11-10' }
];
const payments = [
  { id: 'p1', studentId: 's1', refMonth: '2026-11', amount: 100, discount: 0, date: '2026-11-03' },   // Ana: parcial, vencida -> atrasada
  { id: 'p2', studentId: 's2', refMonth: '2026-11', amount: 50.1, discount: 0, date: '2026-11-04' },   // Bruno: parcial dentro do prazo
  { id: 'p3', studentId: 's3', refMonth: '2026-11', amount: 140, discount: 10, date: '2026-11-06' },   // Carla: paga com desconto
  { id: 'p4', studentId: 's3', refMonth: '2026-10', amount: 150, discount: 0, date: '2026-11-02' }     // pagamento de outro mês (caixa de nov)
];
const D = { students, charges, payments };

t('status da cobrança: pago, parcial, atrasado, pendente', () => {
  assert.equal(L.settleCharge(charges[2], payments, TODAY).status, 'pago');
  assert.equal(L.settleCharge(charges[1], payments, TODAY).status, 'parcial');
  const ana = L.settleCharge(charges[0], payments, TODAY);
  assert.equal(ana.status, 'atrasado'); assert.equal(ana.partial, true); assert.equal(ana.balance, 200);
  assert.equal(L.settleCharge({ studentId: 's9', refMonth: '2026-11', amount: 80, dueDate: '2026-11-30' }, [], TODAY).status, 'pendente');
});
t('pendente NUNCA entra em receita recebida', () => {
  const { totals } = L.monthFinance('2026-11', D, TODAY);
  assert.equal(totals.recebido, 100 + 50.1 + 140); // só o que foi pago de fato
});
t('totais do mês fecham: previsto = recebido + descontos + pendente + atrasado + sem cobrança', () => {
  const { totals: T, rows } = L.monthFinance('2026-11', D, TODAY);
  assert.equal(rows.length, 3); // Diego (pausado) e Eva (começa em dezembro) ficam de fora
  assert.equal(T.previsto, 650);
  assert.equal(T.previstoGerado, 650);
  assert.equal(T.descontos, 10);
  assert.equal(T.atrasado, 200);
  assert.equal(Math.round(T.pendente * 100), 14990); // 149,90
  assert.equal(Math.round((T.recebido + T.descontos + T.pendente + T.atrasado + T.semCobranca) * 100), 65000);
});
t('dinheiro sem erro de ponto flutuante (0,1 + 0,2)', () => {
  const r = L.settleCharge({ studentId: 'x', refMonth: '2026-11', amount: 0.3, dueDate: '2026-11-30' },
    [{ studentId: 'x', refMonth: '2026-11', amount: 0.1, discount: 0 }, { studentId: 'x', refMonth: '2026-11', amount: 0.2, discount: 0 }], TODAY);
  assert.equal(r.status, 'pago'); assert.equal(r.balance, 0);
});
t('aluno ativo sem cobrança aparece como projeção e não vira "pendente" sozinho', () => {
  const only = { students, charges: [], payments: [] };
  const { rows, totals } = L.monthFinance('2026-11', only, TODAY);
  assert.equal(rows.length, 3);
  assert.ok(rows.every(r => r.projected && r.status === 'sem_cobranca'));
  assert.equal(totals.previsto, 650); assert.equal(totals.previstoGerado, 0); assert.equal(totals.pendente, 0); assert.equal(totals.semCobranca, 650);
});
t('caixa do mês e do ano contam pela data do pagamento', () => {
  assert.equal(L.cashReceived(payments, '2026-11'), 440.1); // 100 + 50,10 + 140 + 150
  assert.equal(L.cashReceived(payments, '2026'), 440.1);
  assert.equal(L.cashReceived(payments, '2025'), 0);
  const ys = L.yearSeries(2026, charges, payments);
  assert.equal(ys.length, 12); assert.equal(ys[10].cash, 440.1); assert.equal(ys[10].gerado, 650); assert.equal(ys[9].cash, 0);
});
t('situação financeira do aluno: atraso em qualquer mês prevalece', () => {
  assert.equal(L.studentFinance(students[0], charges, payments, TODAY).status, 'atrasado');
  assert.equal(L.studentFinance(students[2], charges, payments, TODAY).status, 'pago');
  assert.equal(L.studentFinance(students[1], charges, payments, TODAY).status, 'parcial');
  assert.equal(L.studentFinance(students[3], charges, payments, TODAY).status, '-'); // pausado, sem cobranças
});
t('próximos vencimentos só trazem saldo em aberto sem atraso', () => {
  const up = L.upcomingDues(D, TODAY, 5);
  assert.deepEqual(up.map(u => u.student.id), ['s2']);
});

/* ---------- planos, metas, relatórios ---------- */
t('progresso do plano: 5 de 7 atividades = 71%', () => {
  const mk = st => ({ status: st, minutes: 10 });
  const plan = { days: { d0: [mk('concluida'), mk('concluida')], d1: [mk('concluida')], d2: [], d3: [mk('concluida'), mk('concluida')], d4: [mk('em_andamento')], d5: [mk('nao_iniciada')], d6: [] } };
  const p = L.planProgress(plan);
  assert.equal(p.total, 7); assert.equal(p.done, 5); assert.equal(p.pct, 71); assert.equal(p.minutesDone, 50);
  assert.equal(L.planProgress({ days: {} }).pct, 0);
});
t('média das habilidades ignora as não avaliadas', () => {
  assert.equal(L.skillAvg({ scores: { grammar: { score: 8 }, speaking: { score: 6 }, writing: { score: null } } }), 7);
  assert.equal(L.skillAvg({ scores: {} }), null);
});
t('snapshot do relatório usa só registros do período', () => {
  const Dr = {
    lessons: [
      { studentId: 's1', date: '2026-10-05', status: 'realizada' }, { studentId: 's1', date: '2026-10-12', status: 'ausente' },
      { studentId: 's1', date: '2026-09-01', status: 'realizada' }, { studentId: 's2', date: '2026-10-05', status: 'realizada' }
    ],
    homework: [
      { studentId: 's1', assignedDate: '2026-10-06', status: 'corrigida', score: 8, maxScore: 10 },
      { studentId: 's1', assignedDate: '2026-10-13', status: 'atribuida' }
    ],
    goals: [{ studentId: 's1', name: 'Fluência', status: 'em_andamento', progress: 40 }]
  };
  const s = L.reportSnapshot('s1', '2026-10-01', '2026-10-31', Dr);
  assert.equal(s.lessonsDone, 1); assert.equal(s.absences, 1); assert.equal(s.attendancePct, 50);
  assert.equal(s.hwAssigned, 2); assert.equal(s.hwDelivered, 1); assert.equal(s.hwAvgPct, 80);
  assert.equal(s.goals[0].progress, 40);
});
t('precisa de relatório: sem relatório, desatualizado e em dia', () => {
  const st = { id: 's1', status: 'ativo' };
  const ls = [{ studentId: 's1', status: 'realizada' }];
  assert.equal(L.needsReport(st, [], ls, TODAY, 60), 'sem_relatorio');
  assert.equal(L.needsReport(st, [], [], TODAY, 60), null);
  assert.equal(L.needsReport(st, [{ studentId: 's1', periodEnd: '2026-08-01' }], ls, TODAY, 60), 'desatualizado');
  assert.equal(L.needsReport(st, [{ studentId: 's1', periodEnd: '2026-10-20' }], ls, TODAY, 60), null);
  assert.equal(L.needsReport({ id: 's1', status: 'pausado' }, [], ls, TODAY, 60), null);
});
t('homework: atrasado só se não entregue; % da nota', () => {
  assert.equal(L.isHwOverdue({ dueDate: '2026-11-01', status: 'atribuida' }, TODAY), true);
  assert.equal(L.isHwOverdue({ dueDate: '2026-11-01', status: 'entregue' }, TODAY), false);
  assert.equal(L.hwPct({ score: 7, maxScore: 8 }), 88);
  assert.equal(L.hwPct({ score: null, maxScore: 8 }), null);
});

/* ---------- linha do tempo, busca, csv, agenda ---------- */
t('linha do tempo vem com o mais recente primeiro e cobre todos os tipos', () => {
  const Dt = {
    students: [{ id: 's1', name: 'Ana', createdAt: Date.parse('2026-09-01T10:00:00'), startDate: '2026-09-02', levelHistory: [{ date: '2026-10-01', from: 'Básico', to: 'Pré-intermediário' }] }],
    lessons: [{ id: 'l1', studentId: 's1', date: '2026-10-05', time: '18:00', status: 'realizada', topic: 'Past simple', notes: { worked: 'verbos' } }],
    homework: [{ id: 'h1', studentId: 's1', title: 'HW 1', assignedDate: '2026-10-05', dueDate: '2026-10-12', deliveredDate: '2026-10-10', correctedDate: '2026-10-11', score: 9, maxScore: 10 }],
    plans: [{ id: 'pl1', studentId: 's1', weekStart: '2026-10-05', weekEnd: '2026-10-11', days: {} }],
    reports: [{ id: 'r1', studentId: 's1', date: '2026-10-30', periodStart: '2026-10-01', periodEnd: '2026-10-30', scores: { grammar: { score: 8 } } }],
    payments: [{ id: 'pay1', studentId: 's1', date: '2026-10-08', refMonth: '2026-10' }],
    goals: [{ id: 'g1', studentId: 's1', name: 'Fluência', createdAt: '2026-09-02', status: 'em_andamento' }],
    notes: [{ id: 'n1', studentId: 's1', date: '2026-10-15T09:30', text: 'Prefere conversa' }]
  };
  const tl = L.buildTimeline('s1', Dt);
  const kinds = new Set(tl.map(e => e.kind));
  for (const k of ['cadastro', 'aula', 'nota-aula', 'homework', 'plano', 'relatorio', 'pagamento', 'objetivo', 'observacao', 'nivel']) assert.ok(kinds.has(k), 'falta ' + k);
  assert.equal(tl[0].kind, 'relatorio');
  assert.deepEqual([...tl].map(e => e.ts), [...tl].map(e => e.ts).sort().reverse());
});
t('busca ignora acento e maiúscula e agrupa por tipo', () => {
  const Ds = {
    students: [{ id: 's1', name: 'José Conceição', level: 'Básico' }], lessons: [{ id: 'l1', studentId: 's1', topic: 'Conversação em viagens', date: '2026-10-01', time: '10:00' }],
    exercises: [], homework: [], plans: [], materials: [{ id: 'm1', title: 'Viagens worksheet', tags: ['travel'] }], payments: [], reports: []
  };
  const r = L.searchAll('jose conceicao', Ds);
  assert.equal(r[0].key, 'students'); // o aluno vem primeiro
  assert.deepEqual(r.map(g => g.key), ['students', 'lessons']); // e as aulas dele também aparecem
  const r2 = L.searchAll('VIAGENS', Ds);
  assert.deepEqual(r2.map(g => g.key).sort(), ['lessons', 'materials']);
  assert.equal(L.searchAll('a', Ds).length, 0); // curto demais
});
t('CSV: separador ;, aspas, BOM e proteção contra fórmula', () => {
  const csv = L.toCSV([{ n: 'Ana; "A"', v: 10.5 }, { n: '=SOMA(A1)', v: -3 }], [['Nome', r => r.n], ['Valor', r => r.v]]);
  const lines = csv.slice(1).split('\r\n');
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.equal(lines[0], 'Nome;Valor');
  assert.equal(lines[1], '"Ana; ""A""";10.5');
  assert.equal(lines[2], "'=SOMA(A1);-3");
});
t('layoutDay coloca aulas sobrepostas em colunas separadas', () => {
  const out = L.layoutDay([
    { id: 'a', time: '10:00', duration: 60 }, { id: 'b', time: '10:30', duration: 60 }, { id: 'c', time: '12:00', duration: 60 }
  ]);
  const by = Object.fromEntries(out.map(o => [o.l.id, o]));
  assert.equal(by.a.lanes, 2); assert.equal(by.b.lanes, 2); assert.notEqual(by.a.lane, by.b.lane);
  assert.equal(by.c.lanes, 1);
});

/* ---------- contrato, cronograma, portal ---------- */
t('stageModel gera etapas mensais contíguas', () => {
  const st = L.stageModel('semestral', '2026-02-10');
  assert.equal(st.length, 6); assert.equal(st[0].startDate, '2026-02-10'); assert.equal(st[0].endDate, '2026-03-09'); assert.equal(st[1].startDate, '2026-03-10');
  assert.equal(L.stageModel('personalizado', '2026-02-10').length, 0);
});
t('shiftMonth respeita meses curtos', () => { assert.equal(L.shiftMonth('2026-01-31', 1), '2026-02-28'); });
t('stageEvolution compara concluído com previsto', () => {
  const st = [1, 2, 3, 4].map(i => ({ order: i, title: 'E' + i, startDate: `2026-0${i}-01`, endDate: `2026-0${i}-28`, status: 'nao_iniciada', completedDate: '' }));
  st[0].status = 'concluida'; st[0].completedDate = '2026-01-25';
  const ev = L.stageEvolution(st, '2026-03-15');
  assert.equal(ev.total, 4); assert.equal(ev.done, 1); assert.equal(ev.pctDone, 25); assert.equal(ev.pctPlanned, 50); assert.equal(ev.behind, 1); assert.equal(ev.state, 'atrasado');
  assert.deepEqual(ev.labels, ['2026-01', '2026-02', '2026-03', '2026-04']);
  assert.deepEqual(ev.planned, [25, 50, 75, 100]); assert.deepEqual(ev.actual, [25, 25, 25, null]);
  assert.equal(L.stageEvolution([], '2026-03-15').state, 'sem_etapas');
});
t('portalDoc publica só o permitido e nada financeiro', () => {
  const D = { students: [{ id: 's1', name: 'A', level: 'Básico', zoomUrl: 'https://zoom.us/j/1', monthly: 400 }], lessons: [
    { id: 'l1', studentId: 's1', date: '2026-11-01', time: '10:00', status: 'realizada', notes: { worked: 'segredo' }, lr: { summary: 'oi', published: true } },
    { id: 'l2', studentId: 's1', date: '2026-11-02', time: '10:00', status: 'realizada', lr: { summary: 'rascunho', published: false } },
    { id: 'l3', studentId: 's1', date: '2026-11-20', time: '10:00', status: 'agendada' }],
    homework: [{ studentId: 's1', title: 'H', status: 'atribuida', assignedDate: '2026-11-01', feedback: 'oculto' }, { studentId: 's2', title: 'outro', status: 'atribuida', assignedDate: '2026-11-01' }],
    reports: [{ studentId: 's1', shared: false, periodEnd: '2026-10-01', scores: {} }, { studentId: 's1', shared: true, periodEnd: '2026-10-02', scores: { grammar: { score: 7 } } }],
    plans: [], contracts: [{ id: 'c1', studentId: 's1', type: 'anual', status: 'vigente', startDate: '2026-01-01', totalLessons: 48, assetId: 'abc', fileName: 'c.pdf', showContract: false, showSchedule: true }],
    stages: [{ contractId: 'c1', order: 1, title: 'E1', status: 'concluida' }], payments: [{ studentId: 's1', amount: 400 }] };
  const d = L.portalDoc('s1', D, '2026-11-07', '2026-11-07T10:00');
  assert.equal(d.lessonReports.length, 1); assert.equal(d.next.length, 1); assert.equal(d.reports.length, 1); assert.equal(d.homework.length, 1);
  assert.equal(d.homework[0].feedback, ''); assert.equal(d.contract.assetId, ''); assert.equal(d.stages.length, 1); assert.equal(d.lessonsDone, 2);
  const j = JSON.stringify(d); assert.ok(!j.includes('segredo') && !j.includes('monthly') && !j.includes('payments') && !j.includes('outro'));
  assert.equal(d.zoom.url, 'https://zoom.us/j/1');
  D.students[0].zoomUrl = 'javascript:alert(1)'; assert.equal(L.portalDoc('s1', D, '2026-11-07', '2026-11-07T10:00').zoom.url, '');
});

console.log(`\n${passed} testes passaram` + (process.exitCode ? ' — HÁ FALHAS' : ''));
