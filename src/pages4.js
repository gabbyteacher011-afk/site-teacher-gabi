/* ============================================================
   pages4.js — Relatórios de Desempenho, Financeiro
   ============================================================ */

/* =================== RELATÓRIOS =================== */
const SK_COLOR = { grammar: '#6C8CF0', vocabulary: '#E8A25C', reading: '#5FB38C', writing: '#C77DB8', listening: '#4FB3C8', speaking: '#E27D7D', pronunciation: '#8C8CD0' };
const skColorVar = k => `var(--h-${k})`;
const REP_TEXT = [['strengths', 'Pontos fortes'], ['improve', 'Pontos a melhorar'], ['nextSteps', 'Próximos passos'], ['teacherNotes', 'Observações da professora']];

function reportsOf(studentId) { return S.reports.filter(r => r.studentId === studentId).sort((a, b) => cmpStr(a.periodEnd || a.date, b.periodEnd || b.date)); }
function prevReport(r) { return reportsOf(r.studentId).filter(x => x.id !== r.id && (x.periodEnd || x.date) < (r.periodEnd || r.date)).pop(); }
const scoreOf = (r, k) => { const s = r && r.scores && r.scores[k]; return s && typeof s.score === 'number' ? s.score : null; };

function evolutionChart(studentId) {
  const rs = reportsOf(studentId);
  if (rs.length < 2) return html`<p class="muted small" style="margin:0">São necessários pelo menos 2 relatórios para mostrar a evolução.</p>`;
  const series = SKILLS.map(([k, l]) => ({ name: l, color: skColorVar(k), values: rs.map(r => scoreOf(r, k)) })).filter(s => s.values.some(v => v != null));
  return lineChart({ labels: rs.map(r => fmtDateShort(r.periodEnd || r.date)), series, max: 10, aria: 'Evolução das notas por habilidade' });
}
function reportsTable(list, showStudent) {
  return html`<div class="tablewrap"><table class="tbl"><thead><tr><th>Período</th>${showStudent ? html`<th>Aluno</th>` : ''}<th class="num">Média</th><th>Habilidades avaliadas</th><th>Emitido em</th><th></th></tr></thead><tbody>
  ${list.map(r => { const avg = skillAvg(r); return html`<tr data-act="open-report" data-id="${r.id}">
    <td class="nowrap"><b>${fmtDate(r.periodStart)}</b> a ${fmtDate(r.periodEnd)} ${demoTag(r)}</td>${showStudent ? html`<td><div class="who">${avatar(M.students.get(r.studentId), 28)}<span>${stName(r.studentId)}</span></div></td>` : ''}
    <td class="num"><b>${avg == null ? '—' : String(avg).replace('.', ',')}</b></td><td>${SKILLS.filter(([k]) => scoreOf(r, k) != null).map(([k]) => skillTag(k))}</td><td class="nowrap">${fmtDate(String(r.date).slice(0, 10))}</td>
    <td class="acts"><button type="button" class="btn sm" data-act="rep-pdf" data-id="${r.id}">${ico('download')}PDF</button></td></tr>`; })}</tbody></table></div>`;
}

function openReportForm(id, opts) {
  opts = opts || {};
  const old = id ? M.reports.get(id) : null, today = todayISO();
  const sid = old ? old.studentId : opts.studentId || '';
  const last = sid ? reportsOf(sid).pop() : null;
  const r = old || { studentId: sid, periodStart: last ? addDays(last.periodEnd, 1) : addDays(today, -60), periodEnd: today, scores: {} };
  openModal({
    title: old ? 'Editar relatório' : 'Novo relatório de desempenho', wide: true, form: { name: 'report', id: id || '' }, body: html`
    <div class="g3">${fld('Aluno *', select('studentId', studentOptions({ keep: r.studentId, blank: 'Escolha o aluno…' }), r.studentId, { a: { required: true } }))}${fld('Início do período *', input('periodStart', r.periodStart, { type: 'date', a: { required: true } }))}${fld('Fim do período *', input('periodEnd', r.periodEnd, { type: 'date', a: { required: true } }))}</div>
    <div class="stack-s"><b>Avaliação por habilidade <span class="muted small">(nota de 1 a 10; deixe vazio se não avaliou)</span></b>
    ${SKILLS.map(([k, l]) => { const s = (r.scores || {})[k] || {}; return html`<div class="g2" style="grid-template-columns:minmax(120px,170px) 90px minmax(0,1fr)"><div style="padding-top:26px">${skillTag(k)}</div>${fld('Nota', input('score_' + k, s.score, { type: 'number', a: { min: 1, max: 10, step: '0.5', inputmode: 'decimal' } }))}${fld('Comentário', input('comment_' + k, s.comment, { a: { maxlength: 300 } }))}</div>`; })}</div>
    ${REP_TEXT.map(([k, l]) => fld(l, textarea(k, r[k], { rows: 2 })))}
    <label class="chk"><input type="checkbox" name="shared" value="1"${r.shared ? raw(' checked') : ''}> Mostrar na área do aluno (notas, pontos fortes e o que melhorar; suas notas internas ficam só com você)</label>
    <p class="hint">Frequência, aulas realizadas e homework do período são calculados automaticamente a partir dos seus registros e gravados no relatório.</p>`
  });
}
FORMS.report = async (v, f, ds) => {
  const old = ds.id ? M.reports.get(ds.id) : null;
  if (!v.studentId) { toast('Escolha o aluno.', 'err'); return; }
  if (v.periodEnd < v.periodStart) { toast('O fim do período não pode ser antes do início.', 'err'); return; }
  const scores = {}; let any = false;
  for (const [k] of SKILLS) {
    const raw_ = String(v['score_' + k] || '').trim();
    if (raw_ === '') { if ((v['comment_' + k] || '').trim()) scores[k] = { score: null, comment: v['comment_' + k] }; continue; }
    const n = num(raw_, NaN);
    if (!(n >= 1 && n <= 10)) { toast(`A nota de ${labelOf(SKILLS, k)} deve estar entre 1 e 10.`, 'err'); return; }
    scores[k] = { score: n, comment: v['comment_' + k] || '' }; any = true;
  }
  if (!any) { toast('Dê nota a pelo menos uma habilidade.', 'err'); return; }
  const same = old && old.studentId === v.studentId && old.periodStart === v.periodStart && old.periodEnd === v.periodEnd;
  const snapshot = same && old.snapshot ? old.snapshot : reportSnapshot(v.studentId, v.periodStart, v.periodEnd, D());
  const id = await put('reports', { ...(old || { date: nowKey() }), studentId: v.studentId, periodStart: v.periodStart, periodEnd: v.periodEnd, scores, strengths: v.strengths, improve: v.improve, nextSteps: v.nextSteps, teacherNotes: v.teacherNotes, shared: v.shared === '1', snapshot });
  closeModal(); toast(old ? 'Relatório atualizado.' : 'Relatório salvo no histórico do aluno.', 'ok');
  if (!old) openReportView(id);
};
const fmtAvg = n => n == null ? '—' : String(n).replace('.', ',');
function reportBody(r) {
  const s = M.students.get(r.studentId), sn = r.snapshot || {}, prev = prevReport(r), avg = skillAvg(r);
  const evaluated = SKILLS.filter(([k]) => scoreOf(r, k) != null);
  const ym = monthOf(r.periodEnd), ser = monthlySeries(r.studentId, D(), ym, 6), labels = ser.map(x => fmtMonthShort(x.ym));
  return html`
  <div class="row" style="gap:14px">${avatar(s, 52)}<div><div style="font:400 26px/1.1 var(--f-display)">${s ? s.name : '(aluno removido)'}</div><div class="muted small">Relatório de desempenho · ${fmtDate(r.periodStart)} a ${fmtDate(r.periodEnd)}${s ? ' · nível ' + s.level : ''}</div></div><span class="spacer"></span><div style="text-align:right"><div class="tiny muted">MÉDIA GERAL</div><b style="font-size:28px">${fmtAvg(avg)}</b><span class="muted">/10</span></div></div>
  <h3>Frequência e atividades no período</h3>
  <div class="stats">${stat('Aulas realizadas', sn.lessonsDone ?? 0)}${stat('Faltas', sn.absences ?? 0)}${stat('Canceladas', sn.canceled ?? 0)}${stat('Frequência', sn.attendancePct == null ? '—' : sn.attendancePct + '%')}${stat('Homework entregue', `${sn.hwDelivered ?? 0}/${sn.hwAssigned ?? 0}`)}${stat('Média do homework', sn.hwAvgPct == null ? '—' : sn.hwAvgPct + '%')}</div>
  <h3>Avaliação por habilidade</h3>
  ${evaluated.map(([k, l]) => { const sc = scoreOf(r, k), c = (r.scores[k] || {}).comment, pv = scoreOf(prev, k); return html`<div class="skrow"><span>${skillTag(k)}</span>${bar(sc * 10)}<b>${String(sc).replace('.', ',')}</b></div>${c || pv != null ? html`<div class="skc">${c || ''}${pv != null ? html` <em>(anterior: ${String(pv).replace('.', ',')}${sc > pv ? ' ▲' : sc < pv ? ' ▼' : ' ='})</em>` : ''}</div>` : ''}`; })}
  ${prev && evaluated.length ? html`<h3>Anterior × atual</h3>${barChart({ labels: evaluated.map(([, l]) => l.slice(0, 5)), series: [{ name: 'Anterior (' + fmtDateShort(prev.periodEnd) + ')', color: 'var(--c2)', values: evaluated.map(([k]) => scoreOf(prev, k)) }, { name: 'Atual', color: 'var(--c1)', values: evaluated.map(([k]) => scoreOf(r, k)) }], max: 10, aria: 'Comparação com o relatório anterior' })}` : ''}
  ${reportsOf(r.studentId).length >= 2 ? html`<h3>Evolução ao longo dos relatórios</h3>${evolutionChart(r.studentId)}` : ''}
  <div class="cols c2"><div><h3>Frequência por mês</h3>${barChart({ labels, series: [{ name: 'Frequência %', color: 'var(--c3)', values: ser.map(x => x.pct) }], max: 100, fmt: v => Math.round(v) + '%', aria: 'Frequência por mês' })}</div>
  <div><h3>Homework por mês</h3>${barChart({ labels, series: [{ name: 'Atribuídos', color: 'var(--c2)', values: ser.map(x => x.hwAssigned) }, { name: 'Entregues', color: 'var(--c1)', values: ser.map(x => x.hwDelivered) }], aria: 'Homework por mês' })}</div></div>
  ${(sn.goals || []).length ? html`<h3>Objetivos de aprendizagem (no momento do relatório)</h3>${sn.goals.map(g => html`<div class="skrow" style="grid-template-columns:minmax(120px,1fr) minmax(0,1fr) 44px"><span>${g.name}</span>${bar(g.progress)}<b>${g.progress}%</b></div>`)}` : ''}
  ${REP_TEXT.filter(([k]) => r[k]).map(([k, l]) => html`<h3>${l}</h3><div class="pre">${r[k]}</div>`)}`;
}
function openReportView(id) {
  const r = M.reports.get(id); if (!r) return;
  openModal({
    title: 'Relatório de desempenho', wide: true, body: html`<div class="sheet" style="border:0;padding:0">${reportBody(r)}</div>`,
    footer: html`${iconBtn('trash', 'rep-del', 'Excluir relatório', { id }, 'danger')}<span class="spacer"></span>${btn('Editar', 'rep-edit', { data: { id }, icon: 'edit' })}${btn('Baixar HTML (imprimível)', 'rep-html', { data: { id }, icon: 'file' })}${btn('Baixar PDF', 'rep-pdf', { cls: 'primary', data: { id }, icon: 'download' })}`
  });
}
ACTIONS['rep-edit'] = d => { closeAllModals(); openReportForm(d.id); };
ACTIONS['rep-del'] = async d => {
  if (!await confirmBox({ title: 'Excluir relatório?', message: 'O relatório será removido do histórico do aluno.', danger: true, ok: 'Excluir' })) return;
  await del('reports', d.id); closeAllModals(); toast('Relatório excluído.', 'ok');
};
ACTIONS['rep-new'] = () => openReportForm();

/* ----- PDF (jsPDF) ----- */
const pdfSafe = s => String(s == null ? '' : s).replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/[·•]/g, '-').replace(/[▲▼]/g, '').replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, '?');
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function buildReportPDF(r) {
  const J = window.jspdf && window.jspdf.jsPDF; if (!J) return null;
  const doc = new J({ unit: 'pt', format: 'a4' }), W = 595, M_ = 48, CW = W - 2 * M_, s = M.students.get(r.studentId), sn = r.snapshot || {}, prev = prevReport(r);
  doc.setFillColor(180, 92, 100); doc.rect(0, 0, W, 26, 'F'); doc.setFillColor(196, 192, 214); doc.rect(0, 26, W, 5, 'F');
  try { doc.addImage(LOGO, 'PNG', W - M_ - 40, 34, 40, 40); } catch (e) { /* logo é opcional */ }
  let y = M_ + 18;
  const need = h => { if (y + h > 800) { doc.addPage(); y = M_; } };
  const text = (t, size, bold, color, x) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...(color || [30, 30, 40]));
    const lines = doc.splitTextToSize(pdfSafe(t), CW - ((x || M_) - M_));
    for (const ln of lines) { need(size * 1.35); doc.text(ln, x || M_, y + size); y += size * 1.35; }
  };
  const head = t => { y += 10; need(30); doc.setDrawColor(213, 164, 168); doc.line(M_, y, W - M_, y); y += 4; text(t.toUpperCase(), 9, true, [42, 80, 109]); y += 2; };
  text(s ? s.name : 'Aluno', 22, true); text('Relatório de desempenho · ' + fmtDate(r.periodStart) + ' a ' + fmtDate(r.periodEnd) + (s ? ' · Nível ' + s.level : ''), 10, false, [100, 100, 115]);
  text((S.settings.businessName || S.settings.platformName || '') + (S.settings.teacherName ? ' - ' + S.settings.teacherName : ''), 9, false, [130, 130, 145]);
  const avg = skillAvg(r); text('Média geral: ' + (avg == null ? '-' : String(avg).replace('.', ',')) + ' / 10', 13, true, [159, 81, 83]);
  head('Frequência e atividades');
  text(`Aulas realizadas: ${sn.lessonsDone ?? 0}   Faltas: ${sn.absences ?? 0}   Canceladas: ${sn.canceled ?? 0}   Frequência: ${sn.attendancePct == null ? '-' : sn.attendancePct + '%'}`, 10);
  text(`Homework entregue: ${sn.hwDelivered ?? 0}/${sn.hwAssigned ?? 0}   Média do homework: ${sn.hwAvgPct == null ? '-' : sn.hwAvgPct + '%'}`, 10);
  head('Avaliação por habilidade');
  for (const [k, l] of SKILLS) {
    const sc = scoreOf(r, k); if (sc == null) continue; const c = (r.scores[k] || {}).comment, pv = scoreOf(prev, k);
    need(34); const top = y;
    text(l, 10, true, hexRGB(SK_COLOR[k]).map(v => Math.round(v * .7)));
    doc.setFillColor(235, 235, 242); doc.roundedRect(M_ + 110, top + 2, 300, 8, 4, 4, 'F'); doc.setFillColor(...hexRGB(SK_COLOR[k])); doc.roundedRect(M_ + 110, top + 2, Math.max(6, 300 * sc / 10), 8, 4, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 40); doc.text(String(sc).replace('.', ',') + (pv != null ? `  (anterior ${String(pv).replace('.', ',')})` : ''), M_ + 420, top + 10);
    if (c) text(c, 9, false, [90, 90, 105], M_ + 110);
    y += 3;
  }
  for (const [k, l] of REP_TEXT) if (r[k]) { head(l); text(r[k], 10); }
  if ((sn.goals || []).length) { head('Objetivos de aprendizagem'); sn.goals.forEach(g => text(`${g.name} - ${g.progress}%`, 10)); }
  const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 160); doc.text(pdfSafe(`Gerado em ${fmtDate(todayISO())} - página ${i}/${n}`), M_, 820); }
  return doc;
}
ACTIONS['rep-pdf'] = async d => {
  const r = M.reports.get(d.id); if (!r) return;
  const doc = buildReportPDF(r);
  if (!doc) { toast('A biblioteca de PDF não carregou. Use "Baixar HTML" e imprima pelo navegador.', 'err'); return; }
  await saveFile(`relatorio-${slug(stName(r.studentId))}-${r.periodEnd}.pdf`, doc.output('blob'));
};
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'aluno';
ACTIONS['rep-html'] = async d => {
  const r = M.reports.get(d.id); if (!r) return;
  const css = 'body{font:15px/1.5 system-ui,sans-serif;max-width:820px;margin:24px auto;padding:0 20px;color:#222}h3{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#777;margin:22px 0 8px}.stats{display:flex;flex-wrap:wrap;gap:10px}.stat{border:1px solid #ddd;border-radius:10px;padding:8px 12px}.stat small{display:block;color:#777}.stat b{font-size:20px}.skrow{display:grid;grid-template-columns:130px 1fr 36px;gap:10px;align-items:center;margin:6px 0}.bar{height:8px;background:#eee;border-radius:9px}.bar i{display:block;height:100%;background:#6C8CF0;border-radius:9px}.skc{margin:-2px 0 6px 140px;color:#666;font-size:13px}.sk{font-weight:700}.pre{white-space:pre-wrap}.chart,.av,.empty{display:none}@media print{body{margin:0}}';
  const body = String(reportBody(r)).replace(/<svg[\s\S]*?<\/svg>/g, '');
  await saveFile(`relatorio-${slug(stName(r.studentId))}-${r.periodEnd}.html`, `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Relatório de desempenho</title><style>${css}</style><body>${body}<p style="color:#999;font-size:12px;margin-top:30px">Abra este arquivo no navegador e use Imprimir para gerar PDF.</p></body></html>`);
};

VIEWS.relatorios = () => {
  const f = getF('rel', { student: '' }), today = todayISO();
  const list = S.reports.filter(r => !f.student || r.studentId === f.student).sort((a, b) => cmpStr(b.periodEnd || b.date, a.periodEnd || a.date));
  const due = S.students.map(s => ({ s, why: needsReport(s, S.reports, S.lessons, today, S.settings.reportIntervalDays) })).filter(x => x.why);
  return html`${pageHead('Relatórios de Desempenho', 'Avaliação por habilidade, frequência e homework do período. Cada relatório fica salvo no histórico do aluno.', btn('Novo relatório', 'rep-new', { cls: 'primary', icon: 'plus' }))}
  ${due.length ? html`<div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h2>Relatórios a fazer (${due.length})</h2></div><div class="list">${due.map(({ s, why }) => html`<div class="item"><div class="who">${avatar(s, 32)}<div><b>${s.name}</b><div class="muted small">${why === 'sem_relatorio' ? 'Ainda sem relatório' : 'Último relatório há mais de ' + S.settings.reportIntervalDays + ' dias'}</div></div></div><span class="spacer"></span>${btn('Criar', 'new-report-for', { cls: 'sm primary', data: { id: s.id } })}</div>`)}</div></div>` : ''}
  <div class="filters">${select('student', studentOptions({ blank: 'Todos os alunos', includeInactive: true }), f.student, { id: 'rel-st', a: { 'data-change': 'filter', 'data-page': 'rel', 'data-key': 'student', 'aria-label': 'Aluno' } })}</div>
  ${f.student ? html`<div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h2>Evolução de ${stName(f.student)}</h2></div>${evolutionChart(f.student)}</div>` : ''}
  <div class="card">${list.length ? html`${reportsTable(limited('rel', list), true)}${moreBtn('rel', list)}` : empty('Nenhum relatório', 'Crie o primeiro relatório de desempenho de um aluno.', btn('Novo relatório', 'rep-new', { cls: 'primary' }))}</div>`;
};

/* =================== FINANCEIRO =================== */
const MONTH_OPTS = base => Array.from({ length: 25 }, (_, i) => { const ym = addMonths(base, i - 12); return [ym, fmtMonth(ym)]; });
const PAY_METHODS = () => S.settings.paymentMethods && S.settings.paymentMethods.length ? S.settings.paymentMethods : ['Pix', 'Dinheiro'];
function paymentsTable(list, showStudent) {
  return html`<div class="tablewrap"><table class="tbl"><thead><tr><th>Data</th>${showStudent ? html`<th>Aluno</th>` : ''}<th>Referente a</th><th class="num">Valor</th><th class="num">Desconto</th><th>Forma</th><th>Obs.</th><th></th></tr></thead><tbody>
  ${list.map(p => html`<tr><td class="nowrap">${fmtDate(p.date)} ${demoTag(p)}</td>${showStudent ? html`<td>${stName(p.studentId)}</td>` : ''}<td class="nowrap">${fmtMonth(p.refMonth)}</td><td class="num"><b>${money(p.amount)}</b></td><td class="num">${cents(p.discount) ? money(p.discount) : '—'}</td><td>${p.method || '—'}</td><td class="muted small" style="max-width:200px">${p.notes || ''}</td><td class="acts">${iconBtn('edit', 'pay-edit', 'Editar pagamento', { id: p.id })}${iconBtn('trash', 'pay-del', 'Excluir pagamento', { id: p.id }, 'danger')}</td></tr>`)}</tbody></table></div>`;
}
function balanceFor(sid, ym, ignorePayId) {
  const st = M.students.get(sid), ch = S.charges.find(c => c.studentId === sid && c.refMonth === ym);
  const amount = ch ? ch.amount : (st ? st.monthly : 0);
  const r = settleCharge({ studentId: sid, refMonth: ym, amount, dueDate: '' }, S.payments.filter(p => p.id !== ignorePayId), todayISO());
  return { charge: ch, amount, balance: r.balance, hasCharge: !!ch };
}
function openPaymentForm(id, opts) {
  opts = opts || {};
  const old = id ? M.payments.get(id) : null;
  const ym = opts.refMonth || monthOf(todayISO()), sid = opts.studentId || '';
  const b = sid ? balanceFor(sid, ym) : null;
  const p = old || { studentId: sid, refMonth: ym, amount: b && b.balance > 0 ? b.balance : '', discount: '', date: todayISO(), method: PAY_METHODS()[0], notes: '' };
  openModal({
    title: old ? 'Editar pagamento' : 'Registrar pagamento', form: { name: 'payment', id: id || '' }, body: html`
    <div class="g2">${fld('Aluno *', select('studentId', studentOptions({ keep: p.studentId, blank: 'Escolha o aluno…' }), p.studentId, { a: { required: true, 'data-change': 'pay-ctx' } }))}${fld('Mês de referência *', select('refMonth', MONTH_OPTS(p.refMonth), p.refMonth, { a: { 'data-change': 'pay-ctx' } }))}</div>
    <div id="pay-info" class="hl small">${payInfo(p.studentId, p.refMonth, id)}</div>
    <div class="g3">${fld('Valor pago *', input('amount', p.amount, { type: 'number', a: { min: 0, step: '0.01', inputmode: 'decimal' } }))}${fld('Desconto concedido', input('discount', p.discount, { type: 'number', a: { min: 0, step: '0.01', inputmode: 'decimal' } }))}${fld('Data do pagamento *', input('date', p.date, { type: 'date', a: { required: true } }))}</div>
    ${fld('Forma de pagamento', select('method', [...new Set([...PAY_METHODS(), p.method].filter(Boolean))], p.method))}${fld('Observações', textarea('notes', p.notes, { rows: 2 }))}
    <p class="hint">Pagamento parcial é permitido: o saldo continua pendente. Só o que é registrado aqui conta como recebido.</p>`
  });
}
function payInfo(sid, ym, ignoreId) {
  if (!sid) return 'Escolha o aluno para ver o valor devido no mês.';
  const b = balanceFor(sid, ym, ignoreId);
  if (!b.amount) return 'Este aluno não tem mensalidade definida. Informe o valor pago manualmente.';
  return `${fmtMonth(ym)}: ${b.hasCharge ? 'cobrança de' : 'mensalidade padrão de'} ${money(b.amount)}${b.hasCharge ? '' : ' (ainda sem cobrança gerada)'} · saldo em aberto ${money(b.balance)}.`;
}
CHANGES['pay-ctx'] = (v, t) => {
  const f = t.closest('form'), sid = f.elements.studentId.value, ym = f.elements.refMonth.value;
  f.querySelector('#pay-info').textContent = payInfo(sid, ym, f.dataset.id);
  if (!f.dataset.id && sid) { const b = balanceFor(sid, ym); f.elements.amount.value = b.balance > 0 ? b.balance : ''; }
};
FORMS.payment = async (v, form, ds) => {
  const old = ds.id ? M.payments.get(ds.id) : null;
  if (!v.studentId) { toast('Escolha o aluno.', 'err'); return; }
  const amount = num(v.amount, 0), discount = num(v.discount, 0);
  if (amount < 0 || discount < 0 || (amount === 0 && discount === 0)) { toast('Informe um valor pago ou um desconto maior que zero.', 'err'); return; }
  const b = balanceFor(v.studentId, v.refMonth, old && old.id);
  const dup = S.payments.find(p => (!old || p.id !== old.id) && p.studentId === v.studentId && p.refMonth === v.refMonth && p.date === v.date && cents(p.amount) === cents(amount) && cents(p.discount) === cents(discount));
  if (dup && !await confirmBox({ title: 'Possível pagamento duplicado', message: `Já existe um pagamento de ${money(amount)} deste aluno, no mesmo dia e mês de referência. Registrar de novo?`, ok: 'Registrar mesmo assim' })) return;
  if (b.amount && cents(amount) + cents(discount) > cents(b.balance) && !await confirmBox({ title: 'Valor maior que o saldo', message: `O saldo em aberto de ${fmtMonth(v.refMonth)} é ${money(b.balance)}, e você está registrando ${money(amount + discount)}. O excedente não será usado em outros meses automaticamente.`, ok: 'Registrar mesmo assim' })) return;
  if (!b.hasCharge) {
    const st = M.students.get(v.studentId), val = b.amount || amount + discount;
    if (!await confirmBox({ title: 'Criar a cobrança deste mês?', message: `Não existe cobrança de ${fmtMonth(v.refMonth)} para ${st ? st.name : 'este aluno'}. Para registrar o pagamento, vou criar a cobrança de ${money(val)} (vencimento dia ${pad(Math.min(Math.max(Number(st && st.dueDay) || S.settings.defaultDueDay || 10, 1), 28))}) junto com ele.`, ok: 'Criar e registrar' })) return;
    await put('charges', { studentId: v.studentId, refMonth: v.refMonth, amount: val, dueDate: dueDateFor(v.refMonth, (st && st.dueDay) || S.settings.defaultDueDay), createdAt: nowKey() });
  }
  await put('payments', { ...(old || {}), studentId: v.studentId, refMonth: v.refMonth, amount, discount, date: v.date, method: v.method, notes: v.notes });
  closeModal(); toast(old ? 'Pagamento atualizado.' : 'Pagamento registrado.', 'ok');
};
ACTIONS['pay-new'] = () => openPaymentForm();
ACTIONS['pay-edit'] = d => openPaymentForm(d.id);
ACTIONS['pay-for'] = d => openPaymentForm(null, { studentId: d.student, refMonth: d.month });
ACTIONS['pay-del'] = async d => {
  const p = M.payments.get(d.id); if (!p) return;
  if (!await confirmBox({ title: 'Excluir pagamento?', message: `O pagamento de ${money(p.amount)} (${fmtMonth(p.refMonth)}) será removido e o saldo do mês volta a ficar em aberto.`, danger: true, ok: 'Excluir' })) return;
  await del('payments', d.id); toast('Pagamento excluído.', 'ok');
};

/* ----- cobranças ----- */
function openChargeForm(id, opts) {
  opts = opts || {};
  const old = id ? M.charges.get(id) : null, st0 = M.students.get(opts.studentId || (old && old.studentId));
  const ym = old ? old.refMonth : opts.refMonth || UI.finMonth;
  const c = old || { studentId: opts.studentId || '', refMonth: ym, amount: st0 ? st0.monthly : '', dueDate: dueDateFor(ym, st0 && st0.dueDay || S.settings.defaultDueDay) };
  openModal({
    title: old ? 'Editar cobrança' : 'Nova cobrança', narrow: true, form: { name: 'charge', id: id || '' }, body: html`
    ${fld('Aluno *', select('studentId', studentOptions({ keep: c.studentId, blank: 'Escolha o aluno…' }), c.studentId, { a: { required: true, disabled: !!old } }))}
    <div class="g2">${fld('Mês de referência', select('refMonth', MONTH_OPTS(c.refMonth), c.refMonth, { a: { disabled: !!old } }))}${fld('Valor *', input('amount', c.amount, { type: 'number', a: { min: 0.01, step: '0.01', required: true, inputmode: 'decimal' } }))}</div>
    ${fld('Vencimento *', input('dueDate', c.dueDate, { type: 'date', a: { required: true } }))}
    <p class="hint">A cobrança só registra o valor devido. Nenhuma mensagem é enviada ao aluno.</p>`
  });
}
FORMS.charge = async (v, f, ds) => {
  const old = ds.id ? M.charges.get(ds.id) : null;
  const sid = old ? old.studentId : v.studentId, ym = old ? old.refMonth : v.refMonth, amount = num(v.amount, 0);
  if (!sid) { toast('Escolha o aluno.', 'err'); return; }
  if (!(amount > 0)) { toast('Informe um valor maior que zero.', 'err'); return; }
  if (!old && S.charges.some(c => c.studentId === sid && c.refMonth === ym)) { toast('Este aluno já tem cobrança neste mês. Edite a existente.', 'err'); return; }
  await put('charges', { ...(old || { createdAt: nowKey() }), studentId: sid, refMonth: ym, amount, dueDate: v.dueDate });
  closeModal(); toast('Cobrança salva.', 'ok');
};
ACTIONS['charge-new'] = () => openChargeForm();
ACTIONS['charge-new-for'] = d => openChargeForm(null, { studentId: d.student, refMonth: d.month });
ACTIONS['charge-edit'] = d => openChargeForm(d.id);
ACTIONS['charge-del'] = async d => {
  const c = M.charges.get(d.id); if (!c) return;
  if (S.payments.some(p => p.studentId === c.studentId && p.refMonth === c.refMonth)) { toast('Há pagamentos neste mês. Exclua os pagamentos antes de excluir a cobrança.', 'err'); return; }
  if (!await confirmBox({ title: 'Excluir cobrança?', message: `A cobrança de ${money(c.amount)} (${fmtMonth(c.refMonth)}) será removida.`, danger: true, ok: 'Excluir' })) return;
  await del('charges', d.id); toast('Cobrança excluída.', 'ok');
};
ACTIONS['charges-gen'] = () => {
  const mf = monthFinance(UI.finMonth, D(), todayISO()), cand = mf.rows.filter(r => r.projected && r.status !== 'pago');
  if (!cand.length) { toast('Nenhum aluno ativo com mensalidade e sem cobrança neste mês.', 'ok'); return; }
  openModal({
    title: 'Gerar cobranças de ' + fmtMonth(UI.finMonth), form: { name: 'chargesgen', submit: 'Gerar cobranças selecionadas' }, body: html`
    <p class="muted small" style="margin:0">Marque os alunos para os quais deseja criar a cobrança. Nada é criado sem a sua confirmação e nenhuma mensagem é enviada.</p>
    <div class="scrollbox" style="max-height:340px">${cand.map(r => html`<label class="chk" style="display:flex;gap:10px;padding:6px 4px"><input type="checkbox" name="sel[]" value="${r.student.id}" checked><span class="grow">${r.student.name}</span><b>${money(r.amount)}</b><span class="muted small">vence ${fmtDateShort(r.dueDate)}</span></label>`)}</div>`
  });
};
FORMS.chargesgen = async v => {
  const ym = UI.finMonth, ids = v.sel || [];
  if (!ids.length) { toast('Marque pelo menos um aluno.', 'err'); return; }
  let n = 0;
  for (const sid of ids) {
    if (S.charges.some(c => c.studentId === sid && c.refMonth === ym)) continue;
    const st = M.students.get(sid); if (!st || !(cents(st.monthly) > 0)) continue;
    await put('charges', { studentId: sid, refMonth: ym, amount: st.monthly, dueDate: dueDateFor(ym, st.dueDay || S.settings.defaultDueDay), createdAt: nowKey() }); n++;
  }
  closeModal(); toast(n + ' cobrança(s) criada(s).', 'ok');
};

/* ----- página ----- */
ACTIONS['fin-month'] = d => { UI.finMonth = d.dir ? addMonths(UI.finMonth, +d.dir) : monthOf(todayISO()); render(); };
CHANGES['fin-month-pick'] = v => { if (v) { UI.finMonth = v; render(); } };
ACTIONS['fin-tab'] = d => { UI.finTab = d.tab; render(); };
VIEWS.financeiro = () => {
  const ym = UI.finMonth, today = todayISO(), year = ym.slice(0, 4);
  const mf = monthFinance(ym, D(), today), T = mf.totals, tab = UI.finTab;
  const f = getF('fin', { status: '', q: '' }), q = norm(f.q);
  const rows = mf.rows.filter(r => (!f.status || r.status === f.status) && (!q || norm(r.student.name).includes(q)));
  const ys = yearSeries(year, S.charges, S.payments);
  const tabs = html`<div class="tabs" role="tablist">${[['mes', 'Mensalidades do mês'], ['pagamentos', 'Pagamentos (' + S.payments.length + ')'], ['vencimentos', 'Próximos vencimentos']].map(([k, l]) => html`<button type="button" role="tab" aria-selected="${tab === k}" data-act="fin-tab" data-tab="${k}">${l}</button>`)}</div>`;
  const head = pageHead('Financeiro', 'Mensalidades, pagamentos e saldos. Pendentes nunca entram como recebido.', html`${btn('Nova cobrança', 'charge-new', { icon: 'plus' })}${btn('Registrar pagamento', 'pay-new', { cls: 'primary', icon: 'plus' })}`);
  const nav = html`<div class="cal-bar"><div class="row"><button type="button" class="icon-btn" data-act="fin-month" data-dir="-1" aria-label="Mês anterior">${ico('left')}</button><button type="button" class="btn sm" data-act="fin-month" data-dir="0">Mês atual</button><button type="button" class="icon-btn" data-act="fin-month" data-dir="1" aria-label="Próximo mês">${ico('right')}</button><span class="cal-title">${fmtMonth(ym)}</span></div>
    <div class="row">${select('fm', MONTH_OPTS(ym), ym, { id: 'fin-month-pick', a: { 'data-change': 'fin-month-pick', 'aria-label': 'Escolher mês' } })}</div></div>`;
  if (tab === 'pagamentos') {
    const g = getF('finp', { student: '', month: '' });
    const list = S.payments.filter(p => (!g.student || p.studentId === g.student) && (!g.month || p.refMonth === g.month)).sort((a, b) => cmpStr(b.date, a.date));
    return html`${head}${tabs}<div class="filters">${select('student', studentOptions({ blank: 'Todos os alunos', includeInactive: true }), g.student, { id: 'finp-st', a: { 'data-change': 'filter', 'data-page': 'finp', 'data-key': 'student', 'aria-label': 'Aluno' } })}
      ${select('month', [['', 'Todos os meses'], ...[...new Set(S.payments.map(p => p.refMonth))].sort().reverse().map(m => [m, fmtMonth(m)])], g.month, { id: 'finp-m', a: { 'data-change': 'filter', 'data-page': 'finp', 'data-key': 'month', 'aria-label': 'Mês' } })}</div>
      <div class="card">${list.length ? html`${paymentsTable(limited('finp', list), true)}${moreBtn('finp', list)}<p class="small muted" style="margin:10px 0 0">Total listado: <b>${money(units(sum(list, p => cents(p.amount))))}</b> recebidos${sum(list, p => cents(p.discount)) ? ' + ' + money(units(sum(list, p => cents(p.discount)))) + ' em descontos' : ''}.</p>` : empty('Nenhum pagamento', 'Registre o primeiro pagamento.', btn('Registrar pagamento', 'pay-new', { cls: 'primary' }))}</div>`;
  }
  if (tab === 'vencimentos') {
    const ups = upcomingDues({ students: S.students, charges: S.charges, payments: S.payments }, today, 60);
    return html`${head}${tabs}<div class="card">${ups.length ? html`<div class="tablewrap"><table class="tbl"><thead><tr><th>Aluno</th><th>Mês</th><th>Vencimento</th><th class="num">Saldo</th><th></th></tr></thead><tbody>${ups.map(u => html`<tr><td>${u.student.name}</td><td>${fmtMonth(u.charge.refMonth)}</td><td>${fmtDate(u.charge.dueDate)}${u.charge.dueDate < today ? ' ' : ''}</td><td class="num"><b>${money(u.balance)}</b></td><td class="acts">${btn('Registrar pagamento', 'pay-for', { cls: 'sm', data: { student: u.student.id, month: u.charge.refMonth } })}</td></tr>`)}</tbody></table></div>` : empty('Nada a vencer', 'Não há cobranças pendentes dentro do prazo.')}</div>`;
  }
  return html`${head}${tabs}${nav}
  <div class="stats" style="margin:var(--gap) 0">${stat('Previsto no mês', money(T.previsto), { tone: 't-lav', note: T.semCobranca ? `inclui ${money(T.semCobranca)} sem cobrança gerada` : '' })}${stat('Recebido (ref. ao mês)', money(T.recebido), { tone: 't-mint' })}${stat('Pendente', money(T.pendente), { tone: 't-sky' })}${stat('Atrasado', money(T.atrasado), { tone: T.atrasado ? 't-rose' : '' })}${stat('Caixa do mês', money(cashReceived(S.payments, ym)), { tone: 't-peach', note: 'pagamentos feitos neste mês' })}</div>
  <div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h2>Recebido em ${year}</h2></div>${barChart({ labels: ys.map(x => fmtMonthShort(x.ym)), series: [{ name: 'Recebido (caixa)', color: 'var(--c1)', values: ys.map(x => x.cash) }, { name: 'Cobranças geradas', color: 'var(--c2)', values: ys.map(x => x.gerado) }], fmt: v => money(v).replace(/,00$/, ''), aria: 'Recebimentos por mês' })}</div>
  <div class="card"><div class="card-h"><h2>Mensalidades de ${fmtMonth(ym)}</h2>${btn('Gerar cobranças do mês', 'charges-gen', { cls: 'sm', icon: 'plus' })}</div>
  <div class="filters"><div class="grow"><input type="search" id="fin-q" placeholder="Buscar aluno" value="${f.q}" data-input="filter" data-page="fin" data-key="q" aria-label="Buscar aluno"></div>${select('status', [['', 'Todas as situações'], ...PAY_STATUS], f.status, { id: 'fin-st', a: { 'data-change': 'filter', 'data-page': 'fin', 'data-key': 'status', 'aria-label': 'Situação' } })}</div>
  ${rows.length ? html`<div class="tablewrap"><table class="tbl" style="min-width:760px"><thead><tr><th>Aluno</th><th>Vencimento</th><th class="num">Valor</th><th class="num">Pago</th><th class="num">Desconto</th><th class="num">Saldo</th><th>Situação</th><th></th></tr></thead><tbody>
    ${rows.map(r => html`<tr><td><button type="button" class="link" data-act="open-student" data-id="${r.student.id}">${r.student.name}</button></td><td class="nowrap">${fmtDate(r.dueDate)}</td><td class="num">${money(r.amount)}</td><td class="num">${money(r.paid)}</td><td class="num">${r.discount ? money(r.discount) : '—'}</td><td class="num"><b>${money(r.balance)}</b></td><td>${payBadge(r.status)}</td>
    <td class="acts">${r.status !== 'pago' ? btn('Pagamento', 'pay-for', { cls: 'sm', data: { student: r.student.id, month: ym } }) : ''}${r.projected ? btn('Gerar cobrança', 'charge-new-for', { cls: 'sm', data: { student: r.student.id, month: ym } }) : html`${iconBtn('edit', 'charge-edit', 'Editar cobrança', { id: r.charge.id })}${iconBtn('trash', 'charge-del', 'Excluir cobrança', { id: r.charge.id }, 'danger')}`}</td></tr>`)}</tbody></table></div>
    <p class="hint" style="margin:10px 0 0">"Sem cobrança gerada" é uma previsão a partir da mensalidade do aluno: o valor só vira cobrança quando você gerar. Pagamentos pendentes ou atrasados nunca contam como recebidos.</p>`
    : empty(mf.rows.length ? 'Nenhum resultado' : 'Sem mensalidades neste mês', mf.rows.length ? 'Ajuste os filtros.' : 'Cadastre a mensalidade dos alunos ativos ou crie uma cobrança manual.', mf.rows.length ? '' : btn('Nova cobrança', 'charge-new', { cls: 'primary' }))}</div>`;
};
