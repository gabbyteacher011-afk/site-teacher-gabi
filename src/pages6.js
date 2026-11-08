/* ============================================================
   pages6.js — Contrato, cronograma, evolução, relatório da aula,
   Área do Aluno (gestão) e o painel do aluno
   ============================================================ */

const lrState = l => !l.lr || !Object.values({ a: l.lr.summary, b: l.lr.vocabulary, c: l.lr.highlights, d: l.lr.homework, e: l.lr.nextSteps }).some(v => String(v || '').trim()) ? 'sem' : l.lr.published ? 'publicado' : 'rascunho';
const STATE_LR = { sem: ['Sem relatório', 'warn'], rascunho: ['Rascunho', 'info'], publicado: ['Publicado', 'ok'] };
const ctTypeName = c => c.typeName || labelOf(CONTRACT_TYPES, c.type);
const fileLink = id => id ? '/_blob/' + id : '';
const defaultEnd = (type, start) => ({ anual: 12, semestral: 6, trimestral: 3, mensal: 1 }[type] ? addDays(shiftMonth(start, { anual: 12, semestral: 6, trimestral: 3, mensal: 1 }[type]), -1) : '');

/* colegas de turma com a mesma aula (mesma data e horário, realizada) */
function groupMatesSameClass(l) {
  const s = M.students.get(l.studentId); if (!s || !s.groupId) return [];
  return S.lessons.filter(o => o.id !== l.id && o.date === l.date && o.time === l.time && o.status === 'realizada' && (M.students.get(o.studentId) || {}).groupId === s.groupId);
}
/* =================== CONTRATO =================== */
function openContractForm(id, opts) {
  opts = opts || {};
  const old = id ? M.contracts.get(id) : null;
  const c = old || { studentId: opts.studentId || '', type: 'anual', typeName: '', status: 'vigente', startDate: todayISO(), endDate: '', totalLessons: '', signedDate: '', notes: '', showContract: true, showSchedule: true, showNotes: false };
  const chk = (name, label, v) => html`<label class="chk"><input type="checkbox" name="${name}" value="1"${v ? raw(' checked') : ''}> ${label}</label>`;
  openModal({
    title: old ? 'Editar contrato' : 'Novo contrato', wide: true, form: { name: 'contract', id: id || '' }, body: html`
    <div class="g2">${fld('Aluno *', select('studentId', studentOptions({ keep: c.studentId, blank: 'Escolha o aluno…', includeInactive: true }), c.studentId, { a: { required: true } }))}${fld('Situação', select('status', CONTRACT_STATUS, c.status))}</div>
    <div class="g2">${fld('Contrato escolhido', select('type', CONTRACT_TYPES, c.type))}${fld('Nome do plano (opcional)', input('typeName', c.typeName, { a: { maxlength: 80, placeholder: 'Ex.: Anual de Conversação' } }))}</div>
    <div class="g4">${fld('Início *', input('startDate', c.startDate, { type: 'date', a: { required: true } }))}${fld('Fim', input('endDate', c.endDate, { type: 'date' }), { hint: 'Vazio = calculado pelo tipo.' })}${fld('Total de aulas', input('totalLessons', c.totalLessons, { type: 'number', a: { min: 0, max: 1000 } }))}${fld('Assinado em', input('signedDate', c.signedDate, { type: 'date' }))}</div>
    ${NS.assets ? fld('Arquivo do contrato (PDF, imagem ou documento · até 20 MB)', html`<input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/*">`, { hint: c.assetId ? 'Arquivo atual: ' + (c.fileName || 'anexo') + '. Escolher outro substitui o atual.' : 'Opcional: você pode anexar depois.' }) : html`<p class="hint">O envio de arquivos exige permissão de edição nesta página.</p>`}
    ${fld('Observações internas (só você vê, a menos que marque abaixo)', textarea('notes', c.notes, { rows: 2 }))}
    <div class="fld"><span>O que o aluno pode ver na área dele</span><div class="checks">${chk('showContract', 'Arquivo do contrato', c.showContract !== false)}${chk('showSchedule', 'Cronograma do ano e evolução', c.showSchedule !== false)}${chk('showNotes', 'Observações acima', c.showNotes)}</div></div>
    ${!old ? html`<label class="chk"><input type="checkbox" name="gen" value="1" checked> Criar o cronograma do ano a partir do modelo do contrato escolhido (você edita depois)</label>` : ''}`
  });
}
FORMS.contract = async (v, form, ds) => {
  const old = ds.id ? M.contracts.get(ds.id) : null;
  if (!v.studentId) { toast('Escolha o aluno.', 'err'); return; }
  const file = form.elements.file && form.elements.file.files[0];
  let assetId = old ? old.assetId || '' : '', fileName = old ? old.fileName || '' : '';
  if (file) {
    if (file.size > 20 * 1024 * 1024) { toast('O arquivo passa de 20 MB.', 'err'); return; }
    if (!NS.assets) { toast('O envio de arquivos não está disponível aqui.', 'err'); return; }
    try { const up = await NS.assets.upload(file); assetId = up.id; fileName = file.name; } catch (e) { toast('Não foi possível enviar o arquivo: ' + errMsg(e), 'err'); return; }
  }
  const endDate = v.endDate || defaultEnd(v.type, v.startDate);
  if (endDate && endDate < v.startDate) { toast('O fim não pode ser antes do início.', 'err'); return; }
  const id = await put('contracts', { ...(old || { createdAt: nowKey() }), studentId: v.studentId, status: v.status, type: v.type, typeName: v.typeName.trim(), startDate: v.startDate, endDate, totalLessons: v.totalLessons === '' ? '' : Math.max(0, parseInt(v.totalLessons, 10) || 0), signedDate: v.signedDate, notes: v.notes, showContract: v.showContract === '1', showSchedule: v.showSchedule === '1', showNotes: v.showNotes === '1', assetId, fileName });
  let extra = '';
  if (!old && v.gen === '1') {
    const st = stageModel(v.type, v.startDate);
    for (const x of st) await put('stages', { ...x, contractId: id, studentId: v.studentId });
    if (st.length) extra = ` ${st.length} etapas criadas no cronograma.`;
  }
  closeModal(); toast((old ? 'Contrato atualizado.' : 'Contrato salvo.') + extra, 'ok');
  UI.f.ct = { ...(UI.f.ct || {}), student: v.studentId };
};
ACTIONS['ct-new'] = d => openContractForm(null, { studentId: d && d.student || '' });
ACTIONS['ct-edit'] = d => openContractForm(d.id);
ACTIONS['ct-del'] = async d => {
  const c = M.contracts.get(d.id); if (!c) return;
  const n = S.stages.filter(x => x.contractId === d.id).length;
  if (!await confirmBox({ title: 'Excluir contrato?', message: `O contrato${n ? ` e as ${n} etapas do cronograma` : ''} serão removidos. ${c.assetId ? 'O arquivo anexado também será apagado.' : ''}`, danger: true, ok: 'Excluir' })) return;
  for (const x of S.stages.filter(x => x.contractId === d.id)) await del('stages', x.id);
  if (c.assetId && NS.assets) { try { await NS.assets.delete(c.assetId); } catch (e) { /* já removido */ } }
  await del('contracts', d.id); toast('Contrato excluído.', 'ok');
};

/* =================== ETAPAS =================== */
function openStageForm(id, opts) {
  opts = opts || {};
  const old = id ? M.stages.get(id) : null, ct = M.contracts.get(old ? old.contractId : opts.contractId); if (!ct) return;
  const max = Math.max(0, ...S.stages.filter(x => x.contractId === ct.id).map(x => x.order || 0));
  const s = old || { order: max + 1, title: '', description: '', skill: '', startDate: ct.startDate, endDate: '', status: 'nao_iniciada', completedDate: '', note: '' };
  openModal({
    title: old ? 'Editar etapa' : 'Nova etapa do cronograma', form: { name: 'stage', id: id || '', data: { 'data-contract': ct.id } }, body: html`
    <div class="g2" style="grid-template-columns:90px minmax(0,1fr)">${fld('Ordem', input('order', s.order, { type: 'number', a: { min: 1 } }))}${fld('Etapa *', input('title', s.title, { a: { required: true, maxlength: 120 } }))}</div>
    ${fld('Descrição', textarea('description', s.description, { rows: 2 }))}
    <div class="g3">${fld('Início', input('startDate', s.startDate, { type: 'date' }))}${fld('Fim previsto', input('endDate', s.endDate, { type: 'date' }))}${fld('Habilidade', select('skill', [['', '—'], ...SKILLS], s.skill || ''))}</div>
    <div class="g2">${fld('Situação', select('status', STAGE_STATUS, s.status))}${fld('Concluída em', input('completedDate', s.completedDate, { type: 'date' }), { hint: 'Vazio = hoje, ao marcar concluída.' })}</div>
    ${fld('Recado para o aluno (aparece na área dele)', textarea('note', s.note, { rows: 2 }))}`
  });
}
FORMS.stage = async (v, f, ds) => {
  const old = ds.id ? M.stages.get(ds.id) : null, ct = M.contracts.get(ds.contract || (old && old.contractId)); if (!ct) return;
  const title = v.title.trim(); if (!title) { toast('Informe o nome da etapa.', 'err'); return; }
  if (v.endDate && v.startDate && v.endDate < v.startDate) { toast('O fim previsto não pode ser antes do início.', 'err'); return; }
  await put('stages', { ...(old || {}), contractId: ct.id, studentId: ct.studentId, order: parseInt(v.order, 10) || 1, title, description: v.description, skill: v.skill, startDate: v.startDate, endDate: v.endDate, status: v.status, completedDate: v.status === 'concluida' ? (v.completedDate || todayISO()) : '', note: v.note });
  closeModal(); toast('Etapa salva.', 'ok');
};
ACTIONS['stage-new'] = d => openStageForm(null, { contractId: d.contract });
ACTIONS['stage-edit'] = d => openStageForm(d.id);
ACTIONS['stage-del'] = async d => {
  if (!await confirmBox({ title: 'Remover etapa?', message: 'A etapa sai do cronograma e da linha de evolução.', danger: true, ok: 'Remover' })) return;
  await del('stages', d.id); toast('Etapa removida.', 'ok');
};
CHANGES['stage-status'] = (v, t) => { const x = M.stages.get(t.dataset.id); if (x) put('stages', { ...x, status: v, completedDate: v === 'concluida' ? (x.completedDate || todayISO()) : '' }); };
ACTIONS['stage-gen'] = async d => {
  const ct = M.contracts.get(d.contract); if (!ct) return;
  const have = S.stages.filter(x => x.contractId === ct.id);
  const st = stageModel(ct.type, ct.startDate);
  if (!st.length) { toast('O contrato "Personalizado" não tem modelo. Adicione as etapas manualmente.', 'err'); return; }
  if (have.length && !await confirmBox({ title: 'Já existem etapas', message: `Este cronograma já tem ${have.length} etapas. Gerar do modelo vai ACRESCENTAR mais ${st.length}. Continuar?`, ok: 'Acrescentar' })) return;
  const base = Math.max(0, ...have.map(x => x.order || 0));
  for (const x of st) await put('stages', { ...x, order: base + x.order, contractId: ct.id, studentId: ct.studentId });
  toast(`${st.length} etapas criadas. Ajuste títulos e datas como quiser.`, 'ok');
};

/* =================== PAINEL DO CONTRATO / EVOLUÇÃO (professora) =================== */
function evolutionPanel(ev, opts) {
  opts = opts || {};
  const tone = { concluido: 'ok', adiantado: 'ok', no_ritmo: 'ok', atrasado: 'warn', sem_etapas: '' }[ev.state];
  const label = { concluido: 'Cronograma concluído', adiantado: 'Adiantado em relação ao previsto', no_ritmo: 'No ritmo previsto', atrasado: `${ev.behind} etapa(s) atrás do previsto`, sem_etapas: 'Sem etapas' }[ev.state];
  return html`<div class="stats" style="margin-bottom:var(--gap)">${stat('Etapas concluídas', `${ev.done}/${ev.total}`, { tone: 't-mint', note: ev.doing ? ev.doing + ' em andamento' : '' })}${stat('Concluído', ev.pctDone + '%', { tone: 't-rose' })}${stat('Previsto até hoje', ev.pctPlanned + '%', { tone: 't-lav' })}<div class="stat"><small>Como estamos</small><div style="margin-top:8px">${badge(label, tone)}</div></div></div>
  ${ev.labels.length > 1 ? lineChart({ labels: ev.labels.map(m => fmtMonthShort(m)), series: [{ name: 'Previsto no cronograma', color: 'var(--c2)', values: ev.planned }, { name: 'Concluído', color: 'var(--c1)', values: ev.actual }], max: 100, fmt: v => Math.round(v) + '%', aria: 'Evolução do cronograma: previsto e concluído' }) : html`<p class="muted small" style="margin:0">Informe as datas das etapas para ver a linha de evolução.</p>`}`;
}
function contractPanel(sid) {
  const s = M.students.get(sid), today = todayISO();
  const ct = activeContract(S.contracts, sid), others = S.contracts.filter(c => c.studentId === sid && (!ct || c.id !== ct.id));
  const g0 = s.groupId && M.groups.get(s.groupId), ownZ = isHttpUrl(s.zoomUrl), zoomOk = ownZ || !!(g0 && isHttpUrl(g0.zoomUrl)), zUrl = ownZ ? s.zoomUrl : g0 && g0.zoomUrl, zNote = ownZ ? s.zoomNote : g0 && g0.zoomNote;
  const zoomCard = html`<div class="card"><div class="card-h"><h2>${ico('video')} Aula online (Zoom)</h2>${btn(zoomOk ? 'Editar link' : 'Adicionar link', 'zoom-edit', { cls: 'sm', icon: 'edit', data: { id: sid } })}</div>
    ${zoomOk ? html`<p style="margin:0 0 6px"><a href="${zUrl}" target="_blank" rel="noopener">${zUrl}</a>${!ownZ ? html` ${badge('da turma ' + g0.name, 'info')}` : ''}</p>${zNote ? html`<p class="small muted pre" style="margin:0">${zNote}</p>` : ''}` : html`<p class="muted small" style="margin:0">Nenhum link cadastrado. O aluno verá o botão "Entrar na aula" assim que você adicionar.</p>`}
    <p class="small muted" style="margin:10px 0 0">Acesso do aluno: ${s.accountId ? badge('conta vinculada', 'ok') : badge('conta não vinculada', 'warn')} ${btn('Gerenciar', 'go', { cls: 'sm', data: { to: 'portal' } })}</p></div>`;
  if (!ct) return html`<div class="stack">${zoomCard}<div class="card">${empty('Nenhum contrato cadastrado', 'Cadastre o contrato escolhido pelo aluno para montar o cronograma do ano e acompanhar a evolução.', btn('Cadastrar contrato', 'ct-new', { cls: 'primary', icon: 'plus', data: { student: sid } }))}</div></div>`;
  const stages = S.stages.filter(x => x.contractId === ct.id).sort((a, b) => (a.order || 0) - (b.order || 0));
  const ev = stageEvolution(stages, today);
  const used = S.lessons.filter(l => l.studentId === sid && l.status === 'realizada' && l.date >= ct.startDate && (!ct.endDate || l.date <= ct.endDate)).length, tot = Number(ct.totalLessons) || 0;
  const reportsN = reportsOf(sid).length;
  return html`<div class="stack">
  <div class="cols c2">
    <div class="card"><div class="card-h"><h2>${ico('contract')} Contrato</h2><div class="row">${btn('Editar', 'ct-edit', { cls: 'sm', icon: 'edit', data: { id: ct.id } })}${iconBtn('trash', 'ct-del', 'Excluir contrato', { id: ct.id }, 'danger')}</div></div>
      <div class="row" style="margin-bottom:8px"><b style="font-size:17px">${ctTypeName(ct)}</b>${badge(labelOf(CONTRACT_STATUS, ct.status), ct.status === 'vigente' ? 'ok' : '')}${demoTag(ct)}</div>
      <dl class="kv"><dt>Período</dt><dd>${fmtDate(ct.startDate)}${ct.endDate ? ' a ' + fmtDate(ct.endDate) : ''}</dd><dt>Assinado em</dt><dd>${ct.signedDate ? fmtDate(ct.signedDate) : '—'}</dd><dt>Aulas</dt><dd>${tot ? `${used} de ${tot} realizadas` : `${used} realizadas`}</dd>${ct.notes ? html`<dt>Observações</dt><dd class="pre">${ct.notes}</dd>` : ''}</dl>
      ${tot ? html`<div style="margin:8px 0">${bar(Math.min(100, used / tot * 100))}</div>` : ''}
      <div class="row" style="margin-top:8px">${ct.assetId ? html`<a class="btn sm primary" href="${fileLink(ct.assetId)}" target="_blank" rel="noopener">${ico('contract')}Abrir contrato${ct.fileName ? ' (' + ct.fileName.slice(0, 24) + ')' : ''}</a>${btn('Remover arquivo', 'ct-file-rm', { cls: 'sm', data: { id: ct.id } })}` : ''}${NS.assets ? html`<label class="btn sm ${ct.assetId ? '' : 'primary'}" style="cursor:pointer">${ico('upload')} ${ct.assetId ? 'Trocar PDF' : 'Anexar PDF do contrato'}<input type="file" accept="application/pdf,image/*,.doc,.docx" data-change="ct-upload" data-id="${ct.id}" style="display:none" aria-label="Anexar arquivo do contrato"></label>` : html`<span class="small muted">Envio de arquivos exige permissão de edição.</span>`}</div>
      <p class="small muted" style="margin:10px 0 0">O aluno vê: ${[ct.showContract !== false ? 'arquivo do contrato' : '', ct.showSchedule !== false ? 'cronograma e evolução' : '', ct.showNotes ? 'observações' : ''].filter(Boolean).join(', ') || 'nada deste contrato'}.</p>
      ${others.length ? html`<p class="small muted" style="margin:6px 0 0">Outros contratos: ${others.map(c => html`<button type="button" class="link" data-act="ct-edit" data-id="${c.id}">${ctTypeName(c)} (${labelOf(CONTRACT_STATUS, c.status).toLowerCase()})</button> `)}</p>` : ''}</div>
    ${zoomCard}</div>
  <div class="card"><div class="card-h"><h2>${ico('route')} Linha de evolução</h2></div>${evolutionPanel(ev)}
    ${reportsN >= 2 ? html`<h3 class="small muted" style="margin:18px 0 8px;font-weight:700">NOTAS POR HABILIDADE AO LONGO DOS RELATÓRIOS</h3>${evolutionChart(sid)}` : ''}</div>
  <div class="card"><div class="card-h"><h2>Cronograma do ano</h2><div class="row">${btn('Gerar do modelo', 'stage-gen', { cls: 'sm', data: { contract: ct.id } })}${btn('Adicionar etapa', 'stage-new', { cls: 'sm primary', icon: 'plus', data: { contract: ct.id } })}</div></div>
    ${stages.length ? html`<div class="tablewrap"><table class="tbl" style="min-width:680px"><thead><tr><th class="num">#</th><th>Etapa</th><th>Período</th><th>Habilidade</th><th>Situação</th><th></th></tr></thead><tbody>
    ${stages.map(x => html`<tr><td class="num">${x.order}</td><td><b>${x.title}</b>${x.description ? html`<div class="small muted">${String(x.description).slice(0, 90)}</div>` : ''}</td><td class="nowrap small">${x.startDate ? fmtDateShort(x.startDate) : '—'} a ${x.endDate ? fmtDateShort(x.endDate) : '—'}${x.status !== 'concluida' && x.endDate && x.endDate < today ? html` ${badge('prazo passou', 'warn')}` : ''}</td><td>${x.skill ? skillTag(x.skill) : '—'}</td>
      <td><select aria-label="Situação da etapa ${x.title}" data-change="stage-status" data-id="${x.id}" style="width:auto">${STAGE_STATUS.map(([k, l]) => html`<option value="${k}"${x.status === k ? raw(' selected') : ''}>${l}</option>`)}</select>${x.completedDate ? html`<div class="tiny muted">em ${fmtDate(x.completedDate)}</div>` : ''}</td>
      <td class="acts">${iconBtn('edit', 'stage-edit', 'Editar etapa', { id: x.id })}${iconBtn('trash', 'stage-del', 'Remover etapa', { id: x.id }, 'danger')}</td></tr>`)}</tbody></table></div>`
      : html`<p class="muted small" style="margin:0">Nenhuma etapa ainda. Use "Gerar do modelo" para começar pelo modelo do contrato ${ctTypeName(ct).toLowerCase()} ou adicione etapas manualmente.</p>`}</div></div>`;
}
function stTabContract(s) { return contractPanel(s.id); }
VIEWS.contratos = () => {
  const f = getF('ct', { student: '' });
  const list = S.students.filter(s => !s.archived).sort((a, b) => cmpStr(a.name, b.name));
  if (!f.student || !M.students.get(f.student)) f.student = (list[0] || {}).id || '';
  return html`${pageHead('Contrato e Cronograma', 'Contrato escolhido, cronograma do ano e linha de evolução de cada aluno.', btn('Novo contrato', 'ct-new', { cls: 'primary', icon: 'plus', data: { student: f.student } }))}
  ${list.length ? html`<div class="filters">${select('student', studentOptions({ keep: f.student }), f.student, { id: 'ct-student', a: { 'data-change': 'filter', 'data-page': 'ct', 'data-key': 'student', 'aria-label': 'Aluno' } })}</div>${contractPanel(f.student)}`
    : empty('Cadastre um aluno primeiro', 'Os contratos e cronogramas ficam ligados a cada aluno.', btn('Cadastrar aluno', 'q-student', { cls: 'primary' }))}`;
};

/* =================== ZOOM =================== */
ACTIONS['zoom-edit'] = d => {
  const s = M.students.get(d.id); if (!s) return;
  openModal({ title: 'Link da aula no Zoom', narrow: true, form: { name: 'zoom', id: d.id }, body: html`<p class="muted small" style="margin:0">${s.name}</p>
    ${fld('Link da reunião', input('zoomUrl', s.zoomUrl, { type: 'url', a: { placeholder: 'https://zoom.us/j/…' } }), { hint: 'Deixe vazio para remover o link.' })}
    ${fld('Recado para o aluno (ID, senha, orientações)', textarea('zoomNote', s.zoomNote, { rows: 2 }))}
    <p class="hint">Quem tiver acesso ao painel deste aluno vê o link. Use uma sala só dele, e não um link público de uso geral.</p>` });
};
FORMS.zoom = async (v, f, ds) => {
  const s = M.students.get(ds.id); if (!s) return;
  const url = v.zoomUrl.trim();
  if (url && !isHttpUrl(url)) { toast('O link precisa começar com https://', 'err'); return; }
  await put('students', { ...s, zoomUrl: url, zoomNote: v.zoomNote });
  closeModal(); toast(url ? 'Link do Zoom salvo.' + (s.accountId ? ' O painel do aluno será atualizado.' : ' Vincule a conta do aluno para ele ver.') : 'Link do Zoom removido.', 'ok');
};

/* =================== RELATÓRIO DA AULA =================== */
function openLessonReportForm(id) {
  const l = M.lessons.get(id); if (!l) return;
  const r = l.lr || {};
  openModal({
    title: 'Relatório da aula', wide: true, form: { name: 'lreport', id }, body: html`
    <div class="row"><div class="who">${avatar(M.students.get(l.studentId), 36)}<div><b>${stName(l.studentId)}</b><div class="muted small">${fmtDateLong(l.date)} · ${l.time}${l.topic ? ' · ' + l.topic : ''}</div></div></div></div>
    ${fld('O que estudamos hoje', textarea('summary', r.summary || (r.summary === undefined ? l.content : ''), { rows: 3 }))}
    <div class="g2">${fld('Vocabulário e expressões', textarea('vocabulary', r.vocabulary, { rows: 3 }))}${fld('Pontos positivos', textarea('highlights', r.highlights, { rows: 3 }))}</div>
    <div class="g2">${fld('Tarefa de casa', textarea('homework', r.homework || (r.homework === undefined ? l.homeworkText : ''), { rows: 2 }))}${fld('Para a próxima aula', textarea('nextSteps', r.nextSteps, { rows: 2 }))}</div>
    <label class="chk"><input type="checkbox" name="published" value="1"${r.published ? raw(' checked') : ''}> Publicar na área do aluno</label>
    ${(() => { const others = groupMatesSameClass(l); return others.length ? html`<label class="chk"><input type="checkbox" name="toGroup" value="1"> Aplicar também a ${others.map(o => stName(o.studentId).split(' ')[0]).join(', ')} (mesma aula da turma)</label>` : ''; })()}
    <p class="hint">As lesson notes internas (dificuldades, erros) continuam só com você. Aqui vai apenas o que você quer mostrar ao aluno.</p>`
  });
}
FORMS.lreport = async (v, f, ds) => {
  const l = M.lessons.get(ds.id); if (!l) return;
  const lr = { summary: v.summary.trim(), vocabulary: v.vocabulary.trim(), highlights: v.highlights.trim(), homework: v.homework.trim(), nextSteps: v.nextSteps.trim(), published: v.published === '1', publishedAt: v.published === '1' ? ((l.lr && l.lr.publishedAt) || nowKey()) : '' };
  if (lr.published && !(lr.summary || lr.vocabulary || lr.highlights || lr.homework || lr.nextSteps)) { toast('Escreva pelo menos um campo antes de publicar.', 'err'); return; }
  await put('lessons', { ...l, lr });
  if (v.toGroup === '1') for (const o of groupMatesSameClass(l)) await put('lessons', { ...o, lr: { ...lr, publishedAt: lr.published ? nowKey() : '' } });
  const s = M.students.get(l.studentId);
  closeModal(); toast(lr.published ? (s && s.accountId ? 'Relatório publicado na área do aluno.' : 'Relatório salvo. Vincule a conta do aluno para ele enxergar.') : 'Rascunho salvo.', 'ok');
};
ACTIONS['lr-open'] = d => { closeAllModals(); openLessonReportForm(d.id); };
ACTIONS['lr-toggle'] = async d => {
  const l = M.lessons.get(d.id); if (!l || !l.lr) return;
  await put('lessons', { ...l, lr: { ...l.lr, published: !l.lr.published, publishedAt: !l.lr.published ? nowKey() : '' } });
  toast(l.lr.published ? 'Relatório despublicado.' : 'Relatório publicado.', 'ok');
};
ACTIONS['lr-copy'] = async d => {
  const l = M.lessons.get(d.id); if (!l || !l.lr) return; const r = l.lr;
  const txt = [`Relatório da aula - ${fmtDate(l.date)}${l.topic ? ' - ' + l.topic : ''}`, r.summary && 'O que estudamos:\n' + r.summary, r.vocabulary && 'Vocabulário:\n' + r.vocabulary, r.highlights && 'Pontos positivos:\n' + r.highlights, r.homework && 'Tarefa de casa:\n' + r.homework, r.nextSteps && 'Próxima aula:\n' + r.nextSteps].filter(Boolean).join('\n\n');
  try { await navigator.clipboard.writeText(txt); toast('Texto copiado.', 'ok'); } catch (e) { toast('Não foi possível copiar automaticamente.', 'err'); }
};
VIEWS.relaula = () => {
  const f = getF('rl', { student: '', state: '', month: '' }), today = todayISO();
  const done = S.lessons.filter(l => l.status === 'realizada');
  const rows = done.filter(l => (!f.student || l.studentId === f.student) && (!f.month || monthOf(l.date) === f.month) && (!f.state || lrState(l) === f.state)).sort((a, b) => cmpStr(lessonKey(b), lessonKey(a)));
  const c = { sem: done.filter(l => lrState(l) === 'sem').length, rascunho: done.filter(l => lrState(l) === 'rascunho').length, publicado: done.filter(l => lrState(l) === 'publicado').length };
  const months = [...new Set(done.map(l => monthOf(l.date)))].sort().reverse();
  return html`${pageHead('Relatório da Aula', 'Registre o que foi visto em cada aula e escolha o que o aluno poderá ler na área dele.', btn('Ver área do aluno', 'go', { icon: 'eye', data: { to: 'portal' } }))}
  <div class="stats" style="margin-bottom:var(--gap)">${stat('Aulas sem relatório', c.sem, { tone: c.sem ? 't-peach' : '' })}${stat('Rascunhos', c.rascunho, { tone: 't-sky' })}${stat('Publicados', c.publicado, { tone: 't-mint' })}</div>
  <div class="filters">${select('student', studentOptions({ blank: 'Todos os alunos', includeInactive: true }), f.student, { id: 'rl-st', a: { 'data-change': 'filter', 'data-page': 'rl', 'data-key': 'student', 'aria-label': 'Aluno' } })}
    ${select('state', [['', 'Todas as situações'], ['sem', 'Sem relatório'], ['rascunho', 'Rascunho'], ['publicado', 'Publicado']], f.state, { id: 'rl-state', a: { 'data-change': 'filter', 'data-page': 'rl', 'data-key': 'state', 'aria-label': 'Situação' } })}
    ${select('month', [['', 'Todos os meses'], ...months.map(m => [m, fmtMonth(m)])], f.month, { id: 'rl-month', a: { 'data-change': 'filter', 'data-page': 'rl', 'data-key': 'month', 'aria-label': 'Mês' } })}</div>
  ${rows.length ? html`<div class="tablewrap"><table class="tbl"><thead><tr><th>Aula</th><th>Aluno</th><th>Tema</th><th>Relatório</th><th></th></tr></thead><tbody>
    ${limited('rl', rows).map(l => { const st = lrState(l), s = M.students.get(l.studentId); return html`<tr><td class="nowrap"><b>${fmtDate(l.date)}</b> <span class="muted">${l.time}</span></td><td>${stName(l.studentId)}</td><td>${l.topic || html`<span class="muted">—</span>`}</td>
      <td>${badge(STATE_LR[st][0], STATE_LR[st][1])}${st === 'publicado' && s && !s.accountId ? html` <span class="small muted" title="O aluno só enxerga depois que a conta dele for vinculada">sem conta vinculada</span>` : ''}</td>
      <td class="acts">${btn(st === 'sem' ? 'Escrever' : 'Editar', 'lr-open', { cls: 'sm ' + (st === 'sem' ? 'primary' : ''), icon: 'edit', data: { id: l.id } })}${st !== 'sem' ? html`${btn(st === 'publicado' ? 'Despublicar' : 'Publicar', 'lr-toggle', { cls: 'sm', data: { id: l.id } })}${iconBtn('copy', 'lr-copy', 'Copiar texto', { id: l.id })}` : ''}</td></tr>`; })}</tbody></table></div>${moreBtn('rl', rows)}`
    : empty(done.length ? 'Nenhuma aula neste filtro' : 'Ainda não há aulas realizadas', done.length ? 'Mude os filtros.' : 'Depois que você registrar uma aula como realizada, ela aparece aqui para você escrever o relatório.')}`;
};

/* =================== ÁREA DO ALUNO (gestão) =================== */
VIEWS.portal = () => {
  const list = S.students.filter(s => !s.archived).sort((a, b) => cmpStr(a.name, b.name));
  return html`${pageHead('Área do Aluno', 'Cada aluno tem um painel próprio: aula com Zoom, homework estilo Classroom, cronograma, contrato, materiais, plano da semana e Student\'s Guide. A área da professora é só sua.', btn("Guia padrão", 'guide-edit', { icon: 'key', data: { id: '' } }))}
  ${shareCard()}
  <div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h2>Como liberar o acesso de um aluno</h2></div>
    <ol class="small" style="margin:0;padding-left:20px;display:grid;gap:6px"><li>No menu <b>Compartilhar</b> desta página, convide o e-mail do aluno (a mesma conta de e-mail com que ele entra no Claude). Dê a permissão de <b>Contribuidor</b> ou equivalente, que permite entregar homework; só &quot;ver&quot; deixa o aluno sem poder entregar. Nunca dê permissão de edição. <b>O aluno precisa ter conta no Claude</b> para abrir o link.</li><li>Depois que ele aceitar, clique em <b>Vincular conta</b> na linha dele, abaixo, e escolha o nome dele na busca.</li><li>Cole o <b>link do Zoom</b> e confira com <b>Prévia</b>. Pronto: o aluno abre o mesmo link e cai direto no painel dele.</li><li><b>Aluno menor de idade:</b> marque "menor de idade" no cadastro dele, convide o responsável do mesmo jeito e use <b>Responsáveis</b> na linha do aluno. O responsável abre o mesmo link e vê, só para leitura, o painel dos filhos ligados à conta dele.</li></ol>
    <p class="small muted" style="margin:10px 0 0">Cada aluno só consegue ler o próprio painel, e o painel do aluno mostra apenas o que você publica: nunca financeiro, notas internas ou dados de outros alunos. O painel dos responsáveis é igual, mas inclui o financeiro informativo (você pode desmarcar por aluno). O arquivo do contrato é um anexo com endereço longo e não adivinhável: quem receber esse endereço consegue abri-lo, então não o repasse.</p>
    ${S.portalError ? html`<p class="small" style="color:var(--bad);margin:8px 0 0">Última publicação falhou: ${S.portalError}</p>` : ''}</div>
  ${list.length ? html`<div class="card"><div class="tablewrap"><table class="tbl" style="min-width:1100px"><thead><tr><th>Aluno</th><th>Conta do aluno</th><th>Zoom</th><th>Publicado</th><th></th></tr></thead><tbody>
    ${list.map(s => html`<tr><td><b>${s.name}</b> ${demoTag(s)}${s.minor ? badge('menor de idade', 'acc') : ''}${s.groupId && M.groups.get(s.groupId) ? html`<div class="small muted">Turma ${M.groups.get(s.groupId).name}</div>` : ''}</td><td>${s.accountId ? badge('Vinculada', 'ok') : badge('Não vinculada', 'warn')}</td><td>${isHttpUrl(s.zoomUrl) ? badge('Configurado', 'ok') : html`<span class="muted">—</span>`}</td><td class="small nowrap">${s.accountId ? (S.portalAt[s.id] ? fmtDT(S.portalAt[s.id]) : html`<span class="muted">nesta sessão: ainda não</span>`) : '—'}</td>
      <td class="acts">${btn('Zoom', 'zoom-edit', { cls: 'sm', icon: 'video', data: { id: s.id } })}${btn(s.accountId ? 'Trocar conta' : 'Vincular conta', 'acct-link', { cls: 'sm ' + (s.accountId ? '' : 'primary'), icon: 'key', data: { id: s.id } })}${s.accountId ? html`${btn('Atualizar', 'acct-push', { cls: 'sm', data: { id: s.id } })}${btn('Desvincular', 'acct-unlink', { cls: 'sm', data: { id: s.id } })}` : ''}${btn('Calendar', 'cal-edit', { cls: 'sm', icon: 'calendar', data: { id: s.id } })}${btn('Banner', 'banner-edit', { cls: 'sm', icon: 'image', data: { id: s.id } })}${btn('Guia', 'guide-edit', { cls: 'sm', icon: 'key', data: { id: s.id } })}${btn('Prévia', 'preview', { cls: 'sm', icon: 'eye', data: { id: s.id } })}${btn('Avisar', 'ntf-open', { cls: 'sm', icon: 'send', data: { id: s.id, kind: 'painel' } })}${s.minor || (s.guardians || []).length ? html`${btn('Responsáveis' + ((s.guardians || []).length ? ' (' + s.guardians.length + ')' : ''), 'guard-open', { cls: 'sm' + ((s.guardians || []).length ? '' : ' primary'), icon: 'users', data: { id: s.id } })}${btn('Prévia resp.', 'previaresp', { cls: 'sm', icon: 'eye', data: { id: s.id } })}` : ''}</td></tr>`)}</tbody></table></div></div>`
    : empty('Nenhum aluno cadastrado', 'Cadastre os alunos para liberar o acesso.', btn('Cadastrar aluno', 'q-student', { cls: 'primary' }))}`;
};
ACTIONS.preview = d => go('previa-' + d.id);
VIEWS.previa = id => {
  const s = M.students.get(id);
  if (!s) return html`<div class="card">${empty('Aluno não encontrado', '', btn('Voltar', 'go', { data: { to: 'portal' } }))}</div>`;
  PT_PREVIEW.sub = (s.accountId && S.subs[s.accountId] && S.subs[s.accountId].items) || {};
  return html`<div class="banner"><span>${ico('eye')} Prévia: é assim que ${s.name} vê o painel dele.${s.accountId ? '' : ' (a conta dele ainda não está vinculada)'}</span><span class="spacer"></span>${btn('Voltar', 'go', { cls: 'sm', data: { to: 'portal' } })}</div>
  <div class="preview-frame">${portalView(portalDoc(id, D(), todayISO(), nowKey(), { banner: S.settings.banner, guide: S.settings.guide }))}</div>`;
};
ACTIONS['acct-push'] = async d => { try { const ok = await publishPortal(d.id); toast(ok ? 'Painel do aluno atualizado.' : 'Vincule a conta do aluno primeiro.', ok ? 'ok' : 'err'); } catch (e) { toast('Não foi possível publicar: ' + errMsg(e), 'err'); } };
ACTIONS['acct-unlink'] = async d => {
  const s = M.students.get(d.id); if (!s) return;
  if (!await confirmBox({ title: 'Desvincular conta?', message: `${s.name} deixa de ver o painel imediatamente. Os dados dele aqui continuam intactos.`, danger: true, ok: 'Desvincular' })) return;
  try { await NS.db.doc('portal/' + s.accountId).delete(); } catch (e) { toast('Não foi possível remover o painel publicado: ' + errMsg(e), 'err'); return; }
  await put('students', { ...s, accountId: '' }); delete S.portalAt[d.id]; toast('Conta desvinculada.', 'ok');
};
ACTIONS['acct-link'] = d => {
  const s = M.students.get(d.id); if (!s) return;
  openModal({ title: 'Vincular conta do aluno', narrow: true, body: html`<p class="muted small" style="margin:0">${s.name}</p>
    <label class="fld"><span>Buscar pelo nome da conta</span><input id="acct-q" type="search" autocomplete="off" placeholder="Digite o nome… (vazio mostra quem tem acesso)" data-input="acct-search" data-student="${d.id}"></label>
    <div id="acct-res" class="list" aria-live="polite"><p class="muted small" style="margin:0">Digite para buscar. A pessoa precisa já ter sido convidada em Compartilhar.</p></div>` });
  INPUTS['acct-search']('', $('#acct-q'));
};
let acctSeq = 0;
INPUTS['acct-search'] = async (v, t) => {
  const seq = ++acctSeq, box = $('#acct-res'); if (!box || !NS.user || !NS.user.search) return;
  let hits = []; try { hits = await NS.user.search(String(v || '')); } catch (e) { hits = []; }
  if (seq !== acctSeq || !$('#acct-res')) return;
  hits = hits.filter(h => h.id && h.id !== UID);
  const sid = t.dataset.student;
  box.innerHTML = hits.length ? hits.slice(0, 20).map(h => {
    const other = S.students.find(x => x.accountId === h.id && x.id !== sid);
    return `<button type="button" class="item" data-act="acct-pick" data-id="${esc(h.id)}" data-student="${esc(sid)}"><img src="${esc(h.avatarUrl)}" alt="" width="32" height="32" style="border-radius:50%"><div class="grow"><div class="t">${esc(h.name || 'Conta sem nome')}</div>${other ? `<div class="small muted">já vinculada a ${esc(other.name)}</div>` : ''}${h.guest ? '<div class="small muted">convidado</div>' : ''}</div></button>`;
  }).join('') : '<p class="muted small" style="margin:0">Ninguém encontrado. Confira se o aluno aceitou o convite em Compartilhar e tente o nome como aparece na conta dele.</p>';
};
ACTIONS['acct-pick'] = async d => {
  const s = M.students.get(d.student); if (!s) return;
  const other = S.students.find(x => x.accountId === d.id && x.id !== s.id);
  const gOf = S.students.find(x => (x.guardians || []).includes(d.id));
  if (gOf) { toast(`Essa conta já é responsável de ${gOf.name}. Use outra conta para o aluno.`, 'err'); return; }
  if (other && !await confirmBox({ title: 'Conta já vinculada', message: `Essa conta já está vinculada a ${other.name}. Uma conta só abre o painel de um aluno. Mover o vínculo para ${s.name}?`, ok: 'Mover vínculo' })) return;
  if (other) { try { await NS.db.doc('portal/' + d.id).delete(); } catch (e) { /* será sobrescrito */ } await put('students', { ...other, accountId: '' }); }
  if (s.accountId && s.accountId !== d.id) { try { await NS.db.doc('portal/' + s.accountId).delete(); } catch (e) { /* conta antiga */ } }
  await put('students', { ...s, accountId: d.id });
  closeAllModals(); toast('Conta vinculada. Publicando o painel…', 'ok');
  try { await publishPortal(s.id); toast('Painel do aluno publicado.', 'ok'); } catch (e) { toast('Vinculado, mas a publicação falhou: ' + errMsg(e), 'err'); }
};

