/* ============================================================
   demo.js — dados fictícios de demonstração (todos com demo:true)
   ============================================================ */
async function loadDemo() {
  const today = todayISO(), now = nowKey(), wk0 = mondayOf(today), ym = monthOf(today);
  const jobs = [], ids = {};
  const add = (col, obj) => { const id = obj.id || newId(); jobs.push([col, { ...obj, id, demo: true }]); return id; };
  const mk = (n) => { const id = newId(); ids[n] = id; return id; };

  const STU = [
    { k: 'ana', name: 'Ana Beatriz Lima (demo)', email: 'ana.demo@example.com', phone: '(00) 00000-0001', level: 'Intermediário', courseType: 'Conversação', frequency: '2x por semana', schedule: [{ day: 1, time: '18:00' }, { day: 3, time: '18:00' }], monthly: 480, dueDay: 10, payMethod: 'Pix', goals: 'Conversar com confiança em viagens e reuniões.', birth: '1994-03-12' },
    { k: 'carlos', name: 'Carlos Eduardo Souza (demo)', email: 'carlos.demo@example.com', phone: '(00) 00000-0002', level: 'Pré-intermediário', courseType: 'Business English', frequency: '1x por semana', schedule: [{ day: 0, time: '19:00' }], monthly: 380, dueDay: 5, payMethod: 'Transferência', goals: 'Apresentações e e-mails profissionais.', birth: '1988-09-03' },
    { k: 'mari', name: 'Mariana Alves (demo)', email: 'mariana.demo@example.com', phone: '(00) 00000-0003', level: 'Básico', courseType: 'Inglês geral', frequency: '1x por semana', schedule: [{ day: 2, time: '17:00' }], monthly: 320, dueDay: 10, payMethod: 'Pix', goals: 'Construir base de vocabulário e gramática.', birth: '2001-06-21' },
    { k: 'pedro', name: 'Pedro Henrique Costa (demo)', email: 'pedro.demo@example.com', phone: '(00) 00000-0004', level: 'Avançado', courseType: 'Preparação para exames', frequency: '1x por semana', schedule: [{ day: 5, time: '10:00' }], monthly: 400, dueDay: 15, payMethod: 'Cartão', goals: 'Preparar para exame de proficiência.', birth: '1999-12-30' }
  ];
  for (const s of STU) {
    const id = mk(s.k);
    add('students', { id, name: s.name, photo: '', email: s.email, phone: s.phone, birth: s.birth, startDate: addDays(today, -120), level: s.level, goals: s.goals, courseType: s.courseType, frequency: s.frequency, duration: 60, schedule: s.schedule, monthly: s.monthly, dueDay: s.dueDay, payMethod: s.payMethod, observations: 'Aluno fictício para demonstração.', status: 'ativo', archived: false, createdAt: Date.now(), levelHistory: [{ date: addDays(today, -120), from: null, to: s.level }] });
  }

  /* materiais */
  const m1 = add('materials', { title: 'Guia de Present Perfect (demo)', category: 'pdf', skill: 'grammar', level: 'Intermediário', description: 'Resumo com exemplos. Link fictício.', link: 'https://example.com/present-perfect', tags: ['grammar', 'tenses'], studentIds: [ids.ana], assetId: '', fileName: '' });
  const m2 = add('materials', { title: 'Vídeo: Business Small Talk (demo)', category: 'video', skill: 'speaking', level: 'Pré-intermediário', description: 'Expressões para começar reuniões.', link: 'https://example.com/small-talk', tags: ['business'], studentIds: [ids.carlos], assetId: '', fileName: '' });
  const m3 = add('materials', { title: 'Worksheet: Daily Routine Vocabulary (demo)', category: 'worksheet', skill: 'vocabulary', level: 'Básico', description: 'Vocabulário do dia a dia.', link: '', tags: ['vocabulary'], studentIds: [ids.mari], assetId: '', fileName: '' });

  /* exercícios */
  const e1 = add('exercises', { title: 'Present Perfect or Past Simple? (demo)', type: 'multipla_escolha', skills: ['grammar'], level: 'Intermediário', estMinutes: 15, instructions: 'Escolha a alternativa correta.', mediaUrl: '', baseText: '', notes: '', questions: [
    { prompt: 'I ____ to Paris three times.', options: ['went', 'have been', 'was going'], answer: 'have been', explanation: 'Experiência de vida: present perfect.' },
    { prompt: 'She ____ here in 2019.', options: ['has lived', 'lived', 'has been living'], answer: 'lived', explanation: 'Tempo passado definido: past simple.' }] });
  const e2 = add('exercises', { title: 'Business e-mail: complete as lacunas (demo)', type: 'lacunas', skills: ['writing', 'vocabulary'], level: 'Pré-intermediário', estMinutes: 20, instructions: 'Complete com a palavra adequada.', notes: '', questions: [
    { prompt: 'I am writing ____ confirm our meeting.', options: [], answer: 'to', explanation: '' }, { prompt: 'Please find the report ____.', options: [], answer: 'attached', explanation: '' }] });
  const e3 = add('exercises', { title: 'Reading: A Day in London (demo)', type: 'interpretacao', skills: ['reading'], level: 'Básico', estMinutes: 25, instructions: 'Leia o texto e responda.', baseText: 'Tom wakes up at seven. He takes the bus to work and has lunch with his friends.', notes: '', questions: [
    { prompt: 'What time does Tom wake up?', options: [], answer: 'At seven.', explanation: '' }, { prompt: 'How does he go to work?', options: [], answer: 'By bus.', explanation: '' }] });
  const e4 = add('exercises', { title: 'Speaking: Describe your weekend (demo)', type: 'speaking', skills: ['speaking', 'pronunciation'], level: 'Intermediário', estMinutes: 10, instructions: 'Grave ou fale por 2 minutos.', notes: '', questions: [{ prompt: 'Describe what you did last weekend.', options: [], answer: 'Uso de past simple, conectores, pronúncia clara.', explanation: '' }] });

  /* aulas */
  const TOPICS = ['Present perfect in conversation', 'Phrasal verbs for work', 'Describing past experiences', 'Listening: short podcasts', 'Vocabulary: travel and airports', 'Giving opinions politely', 'Email writing practice', 'Pronunciation: word stress'];
  const lessonsByStudent = {};
  let seq = 0;
  for (const s of STU) {
    lessonsByStudent[s.k] = [];
    for (let w = -8; w <= 2; w++) for (const sc of s.schedule) {
      const date = addDays(wk0, w * 7 + sc.day), key = date + 'T' + sc.time, past = key < now;
      let status = past ? 'realizada' : 'agendada', n = ++seq;
      if (past && n % 9 === 0) status = 'ausente'; else if (past && n % 13 === 0) status = 'cancelada';
      const topic = TOPICS[n % TOPICS.length], done = status === 'realizada';
      const id = add('lessons', {
        studentId: ids[s.k], date, time: sc.time, duration: 60, type: 'regular', status, topic, objectives: past ? 'Ganhar fluência no tema.' : '', content: done ? 'Prática guiada e conversação sobre ' + topic.toLowerCase() + '.' : '',
        skills: done ? ['speaking', n % 2 ? 'grammar' : 'vocabulary'] : [], materials: done && n % 4 === 0 ? [m1] : [], exercises: [], homeworkText: '', observations: '',
        notes: done ? { worked: topic, learned: 'Aplicou o conteúdo em frases próprias.', difficulties: n % 3 === 0 ? 'Hesitação ao conjugar verbos irregulares.' : '', errors: n % 3 === 0 ? 'went / gone, did / done' : '', practice: 'Speaking', nextClass: 'Retomar ' + TOPICS[(n + 1) % TOPICS.length].toLowerCase() + '.', important: '' } : {}
      });
      lessonsByStudent[s.k].push(id);
    }
  }

  /* pacotes */
  add('packages', { studentId: ids.ana, total: 20, startDate: addDays(wk0, -8 * 7), validUntil: '', notes: 'Pacote de 20 aulas (demo).' });
  add('packages', { studentId: ids.carlos, total: 10, startDate: addDays(wk0, -8 * 7), validUntil: '', notes: '' });

  /* homework */
  const hw = (k, title, st, assignedOff, dueOff, extra) => add('homework', { studentId: ids[k], title, exerciseId: '', description: '', assignedDate: addDays(today, assignedOff), dueDate: addDays(today, dueOff), status: st, maxScore: 10, estMinutes: 20, ...(extra || {}) });
  hw('ana', 'Present Perfect or Past Simple? (demo)', 'corrigida', -20, -14, { exerciseId: e1, score: 8.5, feedback: 'Ótimo! Revisar "have been" x "went".', deliveredDate: addDays(today, -15), correctedDate: addDays(today, -13) });
  hw('ana', 'Speaking: Describe your weekend (demo)', 'pendente_correcao', -6, 0, { exerciseId: e4, deliveredDate: addDays(today, -1), studentNotes: 'Gravei duas vezes.' });
  hw('ana', 'Vocabulary: travel phrases (demo)', 'atribuida', -1, 5);
  hw('carlos', 'Business e-mail: lacunas (demo)', 'corrigida', -25, -18, { exerciseId: e2, score: 7, feedback: 'Atenção às preposições.', deliveredDate: addDays(today, -19), correctedDate: addDays(today, -17) });
  hw('carlos', 'Escrever e-mail de apresentação (demo)', 'atribuida', -12, -5);
  hw('mari', 'Reading: A Day in London (demo)', 'entregue', -7, -1, { exerciseId: e3, deliveredDate: addDays(today, -2) });
  hw('mari', 'Worksheet: Daily Routine (demo)', 'em_andamento', -3, 4);
  hw('pedro', 'Essay: technology and society (demo)', 'concluida', -30, -23, { score: 9, feedback: 'Excelente estrutura.', deliveredDate: addDays(today, -24), correctedDate: addDays(today, -22) });

  /* planos semanais */
  const act = (title, skill, minutes, status, extra) => ({ id: newId(), title, skill, minutes, status, exerciseId: '', materialId: '', notes: '', homeworkId: '', ...(extra || {}) });
  const planDays = (acts) => { const d = {}; DAY_KEYS.forEach((k, i) => { d[k] = acts[i] || []; }); return d; };
  add('plans', { studentId: ids.ana, weekStart: wk0, weekEnd: addDays(wk0, 6), goal: 'Dominar present perfect em conversas', notes: '', goalIds: [], days: planDays([
    [act('Ler guia de Present Perfect', 'grammar', 20, 'concluida', { materialId: m1 })], [], [act('Exercício: Present Perfect or Past Simple?', 'grammar', 15, 'concluida', { exerciseId: e1 })], [act('Gravar áudio de 2 minutos', 'speaking', 15, 'em_andamento', { exerciseId: e4 })], [], [act('Assistir a um episódio curto com legenda', 'listening', 30, 'nao_iniciada')], []]) });
  add('plans', { studentId: ids.ana, weekStart: addDays(wk0, -7), weekEnd: addDays(wk0, -1), goal: 'Vocabulário de viagens', notes: '', goalIds: [], days: planDays([
    [act('Flashcards de aeroporto', 'vocabulary', 15, 'concluida')], [act('Listening: anúncios de aeroporto', 'listening', 20, 'concluida')], [], [act('Diálogo no check-in', 'speaking', 20, 'concluida')], [], [act('Revisão', 'vocabulary', 15, 'nao_iniciada')], []]) });
  add('plans', { studentId: ids.carlos, weekStart: wk0, weekEnd: addDays(wk0, 6), goal: 'E-mails profissionais', notes: '', goalIds: [], days: planDays([
    [act('Ler modelos de e-mail', 'reading', 20, 'concluida', { materialId: m2 })], [act('Escrever e-mail de apresentação', 'writing', 25, 'em_andamento')], [], [], [act('Revisar vocabulário de reuniões', 'vocabulary', 15, 'nao_iniciada')], [], []]) });

  /* objetivos */
  add('goals', { studentId: ids.ana, name: 'Conversar 10 minutos sem pausas longas', skill: 'speaking', status: 'em_andamento', progress: 60, deadline: addDays(today, 60), notes: '' });
  add('goals', { studentId: ids.carlos, name: 'Apresentar em reunião em inglês', skill: 'speaking', status: 'em_andamento', progress: 35, deadline: addDays(today, 90), notes: '' });
  add('goals', { studentId: ids.mari, name: 'Aprender 300 palavras do dia a dia', skill: 'vocabulary', status: 'em_andamento', progress: 45, deadline: '', notes: '' });
  add('goals', { studentId: ids.pedro, name: 'Concluir 3 redações modelo', skill: 'writing', status: 'concluido', progress: 100, deadline: '', notes: '' });

  /* tarefas */
  add('tasks', { title: 'Corrigir áudio da Ana (demo)', category: 'Corrigir exercícios', priority: 'alta', dueDate: today, studentId: ids.ana, notes: '', done: false });
  add('tasks', { title: 'Preparar aula de Business English (demo)', category: 'Preparar aula', priority: 'media', dueDate: addDays(today, 2), studentId: ids.carlos, notes: '', done: false });
  add('tasks', { title: 'Enviar relatório do mês (demo)', category: 'Preparar relatório', priority: 'baixa', dueDate: addDays(today, -2), studentId: '', notes: '', done: false });
  add('tasks', { title: 'Organizar materiais de listening (demo)', category: 'Criar material', priority: 'baixa', dueDate: addDays(today, -6), studentId: '', notes: '', done: true, doneDate: addDays(today, -5) });

  /* financeiro: cobranças e pagamentos */
  const ch = (k, off, amount, dueDay) => { const m = addMonths(ym, off); add('charges', { studentId: ids[k], refMonth: m, amount, dueDate: dueDateFor(m, dueDay), createdAt: now }); return m; };
  const pay = (k, m, amount, dayOffset, extra) => add('payments', { studentId: ids[k], refMonth: m, amount, discount: 0, date: addDays(`${m}-01`, dayOffset), method: 'Pix', notes: '', ...(extra || {}) });
  for (const off of [-3, -2, -1]) { const m = ch('ana', off, 480, 10); pay('ana', m, 480, 8); }
  ch('ana', 0, 480, 10);
  { const m3 = ch('carlos', -3, 380, 5); pay('carlos', m3, 380, 4); const m2 = ch('carlos', -2, 380, 5); pay('carlos', m2, 380, 6); const m1_ = ch('carlos', -1, 380, 5); pay('carlos', m1_, 200, 5, { notes: 'Pagamento parcial (demo)' }); ch('carlos', 0, 380, 5); }
  { const m2 = ch('mari', -2, 320, 10); pay('mari', m2, 320, 9); const m1_ = ch('mari', -1, 320, 10); pay('mari', m1_, 300, 10, { discount: 20, notes: 'Desconto promocional (demo)' }); }
  { const m1_ = ch('pedro', -1, 400, 15); pay('pedro', m1_, 400, 14); }

  await pool(jobs, ([c, o]) => put(c, o), 6);

  /* relatórios (dependem das aulas/homework já gravados) */
  const rjobs = [];
  const rep = (k, startOff, endOff, scores, texts) => {
    const periodStart = addDays(today, startOff), periodEnd = addDays(today, endOff);
    const sc = {}; for (const [sk, v] of Object.entries(scores)) sc[sk] = { score: v, comment: '' };
    rjobs.push(['reports', { id: newId(), demo: true, shared: k === 'ana', studentId: ids[k], date: now, periodStart, periodEnd, scores: sc, ...texts, snapshot: reportSnapshot(ids[k], periodStart, periodEnd, D()) }]);
  };
  rep('ana', -120, -61, { grammar: 6, vocabulary: 6.5, reading: 7, writing: 6, listening: 6, speaking: 5.5, pronunciation: 6 }, { strengths: 'Boa compreensão de leitura.', improve: 'Fluência oral e tempos verbais.', nextSteps: 'Mais prática de speaking.', teacherNotes: 'Relatório fictício (demo).' });
  rep('ana', -60, -1, { grammar: 7.5, vocabulary: 7.5, reading: 8, writing: 7, listening: 7, speaking: 7, pronunciation: 7 }, { strengths: 'Evolução clara na fluência.', improve: 'Present perfect ainda gera dúvidas.', nextSteps: 'Gravações semanais de áudio.', teacherNotes: 'Relatório fictício (demo).' });
  rep('carlos', -60, -1, { grammar: 5.5, vocabulary: 6, reading: 6.5, writing: 5.5, speaking: 5 }, { strengths: 'Vocabulário de trabalho.', improve: 'Confiança ao falar.', nextSteps: 'Simulações de reunião.', teacherNotes: 'Relatório fictício (demo).' });
  await pool(rjobs, ([c, o]) => put(c, o), 4);
  /* contratos, cronograma, Zoom e relatórios de aula (fictícios) */
  const cjobs = [];
  const ana = M.students.get(ids.ana), car = M.students.get(ids.carlos);
  if (ana) cjobs.push(['students', { ...ana, zoomUrl: 'https://example.com/zoom-demo', zoomNote: 'Link fictício de demonstração.' }]);
  const mkC = (k, type, startOff, name, total, doneN) => {
    const cid = newId(), start = addDays(today, startOff);
    cjobs.push(['contracts', { id: cid, demo: true, studentId: ids[k], type, typeName: name, status: 'vigente', startDate: start, endDate: defaultEnd(type, start), totalLessons: total, signedDate: start, notes: 'Contrato fictício de demonstração.', showContract: false, showSchedule: true, showNotes: false, assetId: '', fileName: '', createdAt: now }]);
    stageModel(type, start).forEach((x, i) => cjobs.push(['stages', { ...x, id: newId(), demo: true, contractId: cid, studentId: ids[k], status: i < doneN ? 'concluida' : i === doneN ? 'em_andamento' : 'nao_iniciada', completedDate: i < doneN ? (x.endDate < today ? x.endDate : today) : '' }]));
  };
  mkC('ana', 'anual', -120, 'Anual de Conversação (demo)', 96, 3);
  mkC('carlos', 'semestral', -60, 'Semestral Business (demo)', 24, 1);
  cjobs.push(['recordings', { id: newId(), demo: true, studentId: ids.ana, title: 'Aula de present perfect (demo)', date: addDays(today, -7), url: 'https://example.com/gravacao-demo', note: 'Gravação fictícia de demonstração.', shared: true, createdAt: now }]);
  await pool(cjobs, ([c, o]) => put(c, o), 6);
  const dl = S.lessons.filter(l => l.demo && l.studentId === ids.ana && l.status === 'realizada').sort((a, b) => cmpStr(b.date, a.date)).slice(0, 2);
  await pool(dl.map((l, i) => ['lessons', { ...l, lr: { summary: 'Praticamos present perfect em situações do dia a dia (relatório fictício).', vocabulary: 'already, yet, just, ever, never', highlights: 'Boa fluência ao contar experiências.', homework: 'Gravar um áudio de 1 minuto sobre uma viagem.', nextSteps: 'Revisar past simple x present perfect.', published: i === 0, publishedAt: i === 0 ? now : '' } }]), ([c, o]) => put(c, o), 2);
  await saveSettings({ demoLoaded: true });
}
async function removeDemo() {
  const jobs = [];
  const demoStudents = S.students.filter(s => s.demo).map(s => s.id);
  for (const id of demoStudents) jobs.push(() => deleteStudentCascade(id));
  for (const c of COLS) if (c !== 'students') for (const x of S[c]) if (x.demo) jobs.push(() => M[c].has(x.id) ? del(c, x.id) : null);
  await pool(jobs, j => j(), 4);
  await saveSettings({ demoLoaded: false });
}
ACTIONS['demo-load'] = async () => {
  if (S.students.some(s => s.demo)) { toast('Os dados de demonstração já estão carregados.', 'err'); return; }
  if (!await confirmBox({ title: 'Carregar dados de demonstração?', message: 'Serão criados 4 alunos fictícios com aulas, homework, planos, relatórios e pagamentos de exemplo, todos marcados DEMO. Você pode removê-los depois.', ok: 'Carregar' })) return;
  toast('Carregando dados de demonstração…', 'info');
  try { await loadDemo(); toast('Dados de demonstração carregados.', 'ok'); go('dashboard'); } catch (e) { toast('Não foi possível carregar tudo: ' + errMsg(e), 'err'); }
};
ACTIONS['demo-remove'] = async () => {
  const n = S.students.filter(s => s.demo).length + COLS.reduce((a, c) => a + S[c].filter(x => x.demo).length, 0);
  if (!n) { toast('Não há dados de demonstração para remover.', 'ok'); return; }
  if (!await confirmBox({ title: 'Remover dados de demonstração?', message: 'Apenas registros marcados DEMO (e o que for ligado aos alunos fictícios) serão apagados. Seus dados reais continuam.', danger: true, ok: 'Remover demonstração' })) return;
  try { await removeDemo(); toast('Dados de demonstração removidos.', 'ok'); } catch (e) { toast('A remoção falhou: ' + errMsg(e), 'err'); }
};
