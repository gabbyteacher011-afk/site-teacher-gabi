/* ============================================================
   pages3.js — Exercícios, Homework, Weekly Study Plans
   ============================================================ */

/* =================== EXERCÍCIOS (biblioteca) =================== */
const HAS_OPTIONS = t => t === 'multipla_escolha' || t === 'associacao';
const Q_HINT = {
  multipla_escolha: 'Uma alternativa por linha. Resposta: texto da correta.',
  lacunas: 'Use ____ no enunciado. Resposta: a palavra que completa.',
  verdadeiro_falso: 'Resposta: Verdadeiro ou Falso.',
  associacao: 'Um par por linha no formato  palavra = correspondente.',
  resposta_curta: 'Resposta esperada (modelo).',
  producao_escrita: 'Critérios ou resposta-modelo.',
  interpretacao: 'Pergunta sobre o texto acima. Resposta esperada.',
  listening: 'Pergunta sobre o áudio. Resposta esperada.',
  speaking: 'Tópico ou pergunta a ser falada. Pontos esperados.'
};
function qBlock(q, type) {
  q = q || {};
  return html`<div class="qblock"><div class="row"><b class="small q-n">Questão</b><span class="spacer"></span><button type="button" class="icon-btn danger" data-act="q-del" title="Remover questão" aria-label="Remover questão">${ico('trash')}</button></div>
    ${fld('Enunciado', textarea('q_prompt[]', q.prompt, { rows: 2 }))}
    ${HAS_OPTIONS(type) ? fld(type === 'associacao' ? 'Pares (palavra = correspondente)' : 'Alternativas (uma por linha)', textarea('q_options[]', (q.options || []).join('\n'), { rows: 3 })) : html`<input type="hidden" name="q_options[]" value="">`}
    <div class="g2">${fld('Resposta correta / modelo', input('q_answer[]', q.answer))}${fld('Explicação (opcional)', input('q_expl[]', q.explanation))}</div></div>`;
}
function renumberQ(root) { root.querySelectorAll('.qblock .q-n').forEach((el, i) => { el.textContent = 'Questão ' + (i + 1); }); }
ACTIONS['q-add'] = (d, t) => {
  const form = t.closest('form'), box = form.querySelector('#qlist');
  box.insertAdjacentHTML('beforeend', String(qBlock({}, form.elements.type.value))); renumberQ(box);
  const ta = box.querySelectorAll('.qblock textarea[name="q_prompt[]"]'); ta[ta.length - 1].focus();
};
ACTIONS['q-del'] = (d, t) => { const box = t.closest('#qlist'); t.closest('.qblock').remove(); renumberQ(box); };
CHANGES['ex-type'] = (v, t) => {
  const form = t.closest('form'), box = form.querySelector('#qlist'), data = collectQuestions(form);
  box.innerHTML = String(raw(data.map(q => String(qBlock(q, v))).join(''))); renumberQ(box);
  form.querySelector('#qhint').textContent = Q_HINT[v] || '';
  form.querySelector('#textfld').hidden = !['interpretacao'].includes(v);
};
function collectQuestions(form) {
  const v = formData(form), arr = x => [].concat(v[x] || []);
  const P = arr('q_prompt'), O = arr('q_options'), A = arr('q_answer'), E = arr('q_expl');
  // q_prompt[] vem como 'q_prompt' após formData; textareas ocultas ficam alinhadas por índice
  return P.map((p, i) => ({ prompt: p, options: String(O[i] || '').split('\n').map(s => s.trim()).filter(Boolean), answer: A[i] || '', explanation: E[i] || '' }));
}
function openExerciseForm(id, opts) {
  opts = opts || {};
  const old = id ? M.exercises.get(id) : null;
  const e = old || { type: 'multipla_escolha', skills: [], level: '', estMinutes: 15, questions: [{}], ...(opts.seed || {}) };
  openModal({
    title: old ? 'Editar exercício' : 'Novo exercício', wide: true, form: { name: 'exercise', id: id || '' }, body: html`
    <div class="g2">${fld('Título *', input('title', e.title, { a: { required: true, maxlength: 140 } }))}${fld('Tipo de exercício', select('type', EX_TYPES, e.type, { a: { 'data-change': 'ex-type' } }))}</div>
    <div class="fld"><span>Habilidades</span>${checks('skills', SKILLS, e.skills)}</div>
    <div class="g3">${fld('Nível', select('level', [['', 'Qualquer'], ...LEVELS], e.level || ''))}${fld('Tempo estimado (min)', input('estMinutes', e.estMinutes, { type: 'number', a: { min: 1, max: 600 } }))}${fld('Link de áudio/vídeo (opcional)', input('mediaUrl', e.mediaUrl, { type: 'url', a: { placeholder: 'https://…' } }))}</div>
    ${fld('Instruções para o aluno', textarea('instructions', e.instructions, { rows: 2 }))}
    <label class="fld" id="textfld"${e.type === 'interpretacao' ? '' : raw(' hidden')}><span>Texto base</span>${textarea('baseText', e.baseText, { rows: 5 })}</label>
    <div><div class="row"><b>Questões</b><span class="spacer"></span><button type="button" class="btn sm" data-act="q-add">${ico('plus')}Adicionar questão</button></div><p class="hint" id="qhint" style="margin:4px 0 8px">${Q_HINT[e.type] || ''}</p>
      <div id="qlist" class="stack-s">${(e.questions && e.questions.length ? e.questions : [{}]).map(q => qBlock(q, e.type))}</div></div>
    ${fld('Observações da professora (privado)', textarea('notes', e.notes, { rows: 2 }))}`
  });
  const f = document.querySelector('#modals').lastElementChild.querySelector('form'); if (f) renumberQ(f);
}
FORMS.exercise = async (v, form, ds) => {
  const old = ds.id ? M.exercises.get(ds.id) : null;
  const title = v.title.trim(); if (!title) { toast('Informe o título.', 'err'); return; }
  const questions = collectQuestions(form).filter(q => q.prompt.trim());
  const id = await put('exercises', { ...(old || {}), title, type: v.type, skills: v.skills || [], level: v.level, estMinutes: num(v.estMinutes, 15), mediaUrl: v.mediaUrl, instructions: v.instructions, baseText: v.type === 'interpretacao' ? v.baseText : '', questions, notes: v.notes, updatedAt: nowKey() });
  closeModal(); toast(old ? 'Exercício atualizado.' : 'Exercício salvo na biblioteca.', 'ok');
};
function openExerciseView(id) {
  const e = M.exercises.get(id); if (!e) return;
  const used = S.homework.filter(h => h.exerciseId === id);
  openModal({
    title: e.title, wide: true, body: html`<div class="stack">
    <div class="row">${badge(labelOf(EX_TYPES, e.type), 'acc')}${(e.skills || []).map(skillTag)}${e.level ? badge(e.level) : ''}<span class="muted small">${e.estMinutes || '—'} min</span>${demoTag(e)}</div>
    ${e.instructions ? html`<div class="pre">${e.instructions}</div>` : ''}
    ${e.baseText ? html`<div class="hl pre">${e.baseText}</div>` : ''}
    ${e.mediaUrl ? html`<p class="small"><a href="${e.mediaUrl}" target="_blank" rel="noopener">Abrir áudio/vídeo</a></p>` : ''}
    ${(e.questions || []).length ? html`<ol class="qview">${e.questions.map(q => html`<li><div class="pre">${q.prompt}</div>${(q.options || []).length ? html`<ul class="small muted">${q.options.map(o => html`<li>${o}</li>`)}</ul>` : ''}${q.answer ? html`<div class="small"><b>Resposta:</b> ${q.answer}</div>` : ''}${q.explanation ? html`<div class="small muted">${q.explanation}</div>` : ''}</li>`)}</ol>` : html`<p class="muted small">Sem questões cadastradas.</p>`}
    ${e.notes ? html`<p class="small muted pre"><b>Notas:</b> ${e.notes}</p>` : ''}
    <p class="small muted">Atribuído ${used.length} vez(es).</p></div>`,
    footer: html`${iconBtn('trash', 'ex-del', 'Excluir exercício', { id }, 'danger')}<span class="spacer"></span>${btn('Duplicar', 'ex-dup', { data: { id }, icon: 'copy' })}${btn('Editar', 'ex-edit', { data: { id }, icon: 'edit' })}${btn('Atribuir a aluno', 'ex-assign', { cls: 'primary', data: { id }, icon: 'plus' })}`
  });
}
ACTIONS['ex-open'] = d => openExerciseView(d.id);
ACTIONS['ex-new'] = () => openExerciseForm();
ACTIONS['ex-edit'] = d => { closeAllModals(); openExerciseForm(d.id); };
ACTIONS['ex-assign'] = d => { closeAllModals(); openHomeworkForm(null, { exerciseId: d.id }); };
ACTIONS['ex-dup'] = async d => {
  const e = M.exercises.get(d.id); if (!e) return;
  const nid = await put('exercises', { ...e, id: undefined, title: e.title + ' (cópia)', demo: false, createdAt: nowKey() });
  closeAllModals(); toast('Exercício duplicado.', 'ok'); openExerciseForm(nid);
};
ACTIONS['ex-del'] = async d => {
  const used = S.homework.filter(h => h.exerciseId === d.id).length;
  if (!await confirmBox({ title: 'Excluir exercício?', message: used ? `Este exercício já foi atribuído ${used} vez(es). Os homeworks continuam existindo com o título copiado.` : 'Ele será removido da biblioteca.', danger: true, ok: 'Excluir' })) return;
  await del('exercises', d.id); closeAllModals(); toast('Exercício excluído.', 'ok');
};

/* =================== HOMEWORK =================== */
function hwTable(list, showStudent) {
  const today = todayISO();
  return html`<div class="tablewrap"><table class="tbl"><thead><tr>${showStudent ? html`<th>Aluno</th>` : ''}<th>Atividade</th><th>Atribuída</th><th>Prazo</th><th>Status</th><th>Nota</th></tr></thead><tbody>
  ${list.map(h => { const p = hwPct(h), od = isHwOverdue(h, today); return html`<tr data-act="hw-open" data-id="${h.id}">${showStudent ? html`<td><div class="who">${avatar(M.students.get(h.studentId), 28)}<span>${stName(h.studentId)}</span></div></td>` : ''}
    <td><b>${h.title}</b> ${demoTag(h)}</td><td class="nowrap">${fmtDate(h.assignedDate)}</td><td class="nowrap">${h.dueDate ? fmtDate(h.dueDate) : '—'} ${od ? badge('Atrasada', 'bad') : ''}</td><td>${hwBadge(h.status)}</td>
    <td class="nowrap">${p != null ? html`<b>${h.score}</b>/${h.maxScore} <span class="muted small">(${p}%)</span>` : html`<span class="muted">—</span>`}</td></tr>`; })}</tbody></table></div>`;
}
function openHomeworkForm(id, opts) {
  opts = opts || {};
  const old = id ? M.homework.get(id) : null;
  const ex = M.exercises.get(opts.exerciseId || (old && old.exerciseId));
  const h = old || { title: ex ? ex.title : '', exerciseId: ex ? ex.id : '', assignedDate: todayISO(), dueDate: addDays(todayISO(), 7), status: 'atribuida', maxScore: 10, estMinutes: ex ? ex.estMinutes : '', description: ex ? ex.instructions : '', ...(opts.seed || {}) };
  const act = students => students.filter(s => !s.archived && s.status === 'ativo');
  openModal({
    title: old ? 'Editar homework' : 'Atribuir homework', wide: true, form: { name: 'homework', id: id || '' }, body: html`
    ${old ? fld('Aluno', input('studentFixed', stName(h.studentId), { a: { disabled: true } })) : html`<div class="fld"><span>Alunos * <small class="muted">(marque um ou mais)</small></span>${checks('studentIds', act(S.students).sort((a, b) => cmpStr(a.name, b.name)).map(s => [s.id, s.name]), opts.studentIds ? opts.studentIds : opts.studentId ? [opts.studentId] : [], 'checks scrollbox')}</div>`}
    ${fld('Exercício da biblioteca (opcional)', select('exerciseId', [['', '— Atividade avulsa —'], ...[...S.exercises].sort((a, b) => cmpStr(a.title, b.title)).map(e => [e.id, e.title])], h.exerciseId || '', { a: { 'data-change': 'hw-exercise' } }))}
    ${fld('Título *', input('title', h.title, { a: { required: true, maxlength: 160 } }))}
    ${fld('Instruções / descrição', textarea('description', h.description, { rows: 3 }))}
    <div class="fld"><span>Documento para o aluno preencher no painel (opcional, estilo Google Classroom)</span>${docToolbar(false)}${docEditor('hw_doc', h.docHtml, 'Documento do homework')}<small class="hint">O aluno recebe uma cópia editável, faz a lição, entrega e você corrige e devolve. Sem documento, ele escreve do zero.</small></div>
    ${fld('Link do documento da atividade (Google Docs, Drive, site…)', input('attachUrl', h.attachUrl, { type: 'url', a: { placeholder: 'https://…' } }), { hint: 'O aluno abre o link, faz a atividade e clica em Entregar no painel.' })}
    ${NS.assets ? fld('Ou anexe um PDF/arquivo seu (PDF, slides…)', html`<input type="file" name="hfile">`, { hint: h.attachId ? 'Anexo atual: ' + (h.attachName || 'arquivo') + '. Enviar outro substitui.' : 'Opcional.' }) : ''}
    <div class="g4">${fld('Data de atribuição', input('assignedDate', h.assignedDate, { type: 'date', a: { required: true } }))}${fld('Prazo', input('dueDate', h.dueDate, { type: 'date' }))}${fld('Tempo estimado (min)', input('estMinutes', h.estMinutes, { type: 'number', a: { min: 0 } }))}${fld('Status', select('status', HW_STATUS, h.status))}</div>`
  });
}
CHANGES['hw-exercise'] = (v, t) => {
  const e = M.exercises.get(v), f = t.closest('form'); if (!e) return;
  if (!f.elements.title.value.trim()) f.elements.title.value = e.title;
  if (!f.elements.description.value.trim()) f.elements.description.value = e.instructions || '';
  if (!f.elements.estMinutes.value) f.elements.estMinutes.value = e.estMinutes || '';
};
FORMS.homework = async (v, form, ds) => {
  const old = ds.id ? M.homework.get(ds.id) : null;
  const title = v.title.trim(); if (!title) { toast('Informe o título.', 'err'); return; }
  const ed = form.querySelector('#hw_doc'), docHtml = ed ? cleanDoc(ed.innerHTML, 20000) : '';
  if (docEmpty(docHtml) && ed && ed.innerHTML.length > 20000) { toast('O documento ficou grande demais.', 'err'); return; }
  if (v.attachUrl.trim() && !isHttpUrl(v.attachUrl.trim())) { toast('O link do documento precisa começar com https://', 'err'); return; }
  let attachId = old ? old.attachId || '' : '', attachName = old ? old.attachName || '' : '';
  const hf = form.elements.hfile && form.elements.hfile.files[0];
  if (hf) { try { attachId = await uploadFile(hf); attachName = hf.name; } catch (e) { toast('Não foi possível enviar o anexo: ' + errMsg(e), 'err'); return; } }
  const base = { title, exerciseId: v.exerciseId, description: v.description, assignedDate: v.assignedDate, dueDate: v.dueDate, estMinutes: v.estMinutes, status: v.status, docHtml: docEmpty(docHtml) ? '' : docHtml, attachId, attachName, attachUrl: v.attachUrl.trim() };
  if (v.dueDate && v.dueDate < v.assignedDate) { toast('O prazo não pode ser antes da atribuição.', 'err'); return; }
  if (old) {
    const patch = { ...old, ...base };
    if (isDelivered(patch) && !patch.deliveredDate) patch.deliveredDate = todayISO();
    await put('homework', patch); closeModal(); toast('Homework atualizado.', 'ok'); return;
  }
  const ids = v.studentIds || [];
  if (!ids.length) { toast('Marque pelo menos um aluno.', 'err'); return; }
  for (const sid of ids) await put('homework', { ...base, studentId: sid, maxScore: 10, createdAt: nowKey() });
  closeModal(); toast(ids.length > 1 ? `Homework atribuído a ${ids.length} alunos.` : 'Homework atribuído.', 'ok');
};
function openHomeworkView(id) {
  const h = M.homework.get(id); if (!h) return;
  const p = hwPct(h), ex = M.exercises.get(h.exerciseId), od = isHwOverdue(h, todayISO());
  const canDeliver = ['atribuida', 'em_andamento'].includes(h.status), canCorrect = needsCorrection(h) || h.status === 'corrigida';
  openModal({
    title: h.title, wide: true, body: html`<div class="stack">
    <div class="row"><div class="who">${avatar(M.students.get(h.studentId), 36)}<b>${stName(h.studentId)}</b></div><span class="spacer"></span>${od ? badge('Atrasada', 'bad') : ''}${hwBadge(h.status)}${demoTag(h)}</div>
    <dl class="kv"><dt>Atribuída</dt><dd>${fmtDate(h.assignedDate)}</dd><dt>Prazo</dt><dd>${h.dueDate ? fmtDate(h.dueDate) : '—'}</dd>${h.deliveredDate ? html`<dt>Entregue em</dt><dd>${fmtDate(h.deliveredDate)}</dd>` : ''}${h.correctedDate ? html`<dt>Corrigida em</dt><dd>${fmtDate(h.correctedDate)}</dd>` : ''}${h.estMinutes ? html`<dt>Tempo estimado</dt><dd>${h.estMinutes} min</dd>` : ''}</dl>
    ${h.description ? html`<div class="pre">${h.description}</div>` : ''}
    ${ex ? html`<p class="small">Exercício: <button type="button" class="link" data-act="ex-open" data-id="${ex.id}">${ex.title}</button></p>` : ''}
    ${(() => { const it = subOf(h); return it ? html`<div class="hl"><div class="row"><b class="small">Entrega pelo painel do aluno</b><span class="small muted">${it.status === 'entregue' ? 'entregue em ' + fmtStamp(it.submittedAt) : 'em andamento (rascunho)'}</span></div>${it.status === 'entregue' ? html`<div style="margin-top:8px">${btn('Abrir e corrigir o documento', 'cor-open', { cls: 'primary sm', icon: 'edit', data: { id: h.id } })}</div>` : ''}</div>` : ''; })()}
    ${h.studentNotes ? html`<div class="hl"><b class="small">Observação do aluno</b><div class="pre small">${h.studentNotes}</div></div>` : ''}
    ${p != null ? html`<div class="card" style="box-shadow:none"><div class="row"><b style="font-size:22px">${h.score}/${h.maxScore}</b><span class="muted">${p}%</span></div>${h.feedback ? html`<div class="pre" style="margin-top:8px"><b class="small">Feedback</b><br>${h.feedback}</div>` : ''}</div>` : (h.feedback ? html`<div class="pre">${h.feedback}</div>` : '')}</div>`,
    footer: html`${iconBtn('trash', 'hw-del', 'Excluir', { id }, 'danger')}<span class="spacer"></span>${btn('Avisar por WhatsApp', 'ntf-open', { data: { id: h.studentId, kind: (h.status === 'corrigida' || h.status === 'concluida') ? 'corrigido' : 'hw', hid: id }, icon: 'send' })}${btn('Editar', 'hw-edit', { data: { id }, icon: 'edit' })}${canDeliver ? btn('Registrar entrega', 'hw-deliver', { data: { id }, icon: 'check' }) : ''}${canCorrect ? btn(h.status === 'corrigida' || h.status === 'concluida' ? 'Editar correção' : 'Corrigir', 'hw-correct', { cls: 'primary', data: { id } }) : ''}${h.status === 'corrigida' ? btn('Marcar concluída', 'hw-finish', { data: { id } }) : ''}`
  });
}
ACTIONS['hw-open'] = d => openHomeworkView(d.id);
ACTIONS['hw-new'] = d => openHomeworkForm(null, d && d.ids ? { studentIds: d.ids.split(',') } : {});
ACTIONS['hw-edit'] = d => { closeAllModals(); openHomeworkForm(d.id); };
ACTIONS['hw-del'] = async d => {
  if (!await confirmBox({ title: 'Excluir homework?', message: 'Notas e feedback deste homework também serão apagados.', danger: true, ok: 'Excluir' })) return;
  await del('homework', d.id); closeAllModals(); toast('Homework excluído.', 'ok');
};
ACTIONS['hw-finish'] = async d => { const h = M.homework.get(d.id); await put('homework', { ...h, status: 'concluida' }); closeAllModals(); toast('Homework concluído.', 'ok'); };
ACTIONS['hw-deliver'] = d => {
  const h = M.homework.get(d.id); closeAllModals();
  openModal({ title: 'Registrar entrega', narrow: true, form: { name: 'hwdeliver', id: d.id, submit: 'Registrar entrega' }, body: html`<p class="muted small" style="margin:0">${h.title} · ${stName(h.studentId)}</p>
    ${fld('Data da entrega', input('deliveredDate', todayISO(), { type: 'date', a: { required: true } }))}${fld('Observação do aluno (opcional)', textarea('studentNotes', h.studentNotes, { rows: 3 }))}
    <p class="hint">O homework passa para "Pendente de correção".</p>` });
};
FORMS.hwdeliver = async (v, f, ds) => { const h = M.homework.get(ds.id); await put('homework', { ...h, status: 'pendente_correcao', deliveredDate: v.deliveredDate, studentNotes: v.studentNotes }); closeModal(); toast('Entrega registrada.', 'ok'); };
ACTIONS['hw-correct'] = d => {
  const h = M.homework.get(d.id); closeAllModals();
  openModal({ title: 'Corrigir homework', narrow: true, form: { name: 'hwcorrect', id: d.id, submit: 'Salvar correção' }, body: html`<p class="muted small" style="margin:0">${h.title} · ${stName(h.studentId)}</p>
    <div class="g2">${fld('Nota', input('score', h.score, { type: 'number', a: { min: 0, step: '0.1', required: true } }))}${fld('Nota máxima', input('maxScore', h.maxScore || 10, { type: 'number', a: { min: 1, step: '0.1', required: true } }))}</div>
    ${fld('Feedback para o aluno', textarea('feedback', h.feedback, { rows: 4 }))}
    ${fld('Situação após corrigir', select('status', [['corrigida', 'Corrigida'], ['concluida', 'Concluída']], h.status === 'concluida' ? 'concluida' : 'corrigida'))}` });
};
FORMS.hwcorrect = async (v, f, ds) => {
  const h = M.homework.get(ds.id), score = num(v.score, NaN), max = num(v.maxScore, 10);
  if (!(score >= 0) || !(max > 0) || score > max) { toast('A nota deve estar entre 0 e a nota máxima.', 'err'); return; }
  await put('homework', { ...h, score, maxScore: max, feedback: v.feedback, status: v.status, correctedDate: todayISO(), deliveredDate: h.deliveredDate || todayISO() });
  closeModal(); toast('Correção salva.', 'ok');
};

/* =================== PÁGINA EXERCÍCIOS E HOMEWORK =================== */
ACTIONS['ex-tab'] = d => { UI.exTab = d.tab; render(); };
VIEWS.exercicios = () => {
  const tab = UI.exTab, today = todayISO();
  const tabs = html`<div class="tabs" role="tablist">${[['lib', 'Biblioteca de exercícios (' + S.exercises.length + ')'], ['hw', 'Homework (' + S.homework.length + ')']].map(([k, l]) => html`<button type="button" role="tab" aria-selected="${tab === k}" data-act="ex-tab" data-tab="${k}">${l}</button>`)}</div>`;
  if (tab === 'lib') {
    const f = getF('ex', { q: '', type: '', skill: '', level: '' }), q = norm(f.q);
    const list = S.exercises.filter(e => (!f.type || e.type === f.type) && (!f.skill || (e.skills || []).includes(f.skill)) && (!f.level || e.level === f.level) && (!q || norm(e.title + ' ' + (e.instructions || '')).includes(q))).sort((a, b) => cmpStr(a.title, b.title));
    return html`${pageHead('Exercícios e Homework', 'Crie exercícios reutilizáveis e atribua aos alunos.', btn('Novo exercício', 'ex-new', { cls: 'primary', icon: 'plus' }))}${tabs}
    <div class="filters"><div class="grow"><input type="search" id="ex-q" placeholder="Buscar exercício" value="${f.q}" data-input="filter" data-page="ex" data-key="q" aria-label="Buscar exercício"></div>
    ${select('type', [['', 'Todos os tipos'], ...EX_TYPES], f.type, { id: 'ex-type-f', a: { 'data-change': 'filter', 'data-page': 'ex', 'data-key': 'type', 'aria-label': 'Tipo' } })}
    ${select('skill', [['', 'Todas as habilidades'], ...SKILLS], f.skill, { id: 'ex-skill-f', a: { 'data-change': 'filter', 'data-page': 'ex', 'data-key': 'skill', 'aria-label': 'Habilidade' } })}
    ${select('level', [['', 'Todos os níveis'], ...LEVELS], f.level, { id: 'ex-level-f', a: { 'data-change': 'filter', 'data-page': 'ex', 'data-key': 'level', 'aria-label': 'Nível' } })}</div>
    ${list.length ? html`<div class="cards">${limited('ex', list).map(e => html`<div class="card excard"><button type="button" class="link" style="text-align:left;font-weight:700;font-size:15px" data-act="ex-open" data-id="${e.id}">${e.title}</button> ${demoTag(e)}
      <div class="row">${badge(labelOf(EX_TYPES, e.type), 'acc')}${e.level ? badge(e.level) : ''}</div><div class="row">${(e.skills || []).map(skillTag)}</div>
      <div class="muted small">${(e.questions || []).length} questões · ${e.estMinutes || '—'} min · atribuído ${S.homework.filter(h => h.exerciseId === e.id).length}×</div>
      <div class="row">${btn('Atribuir', 'ex-assign', { cls: 'sm primary', data: { id: e.id } })}${btn('Editar', 'ex-edit', { cls: 'sm', data: { id: e.id } })}${btn('Duplicar', 'ex-dup', { cls: 'sm', data: { id: e.id } })}</div></div>`)}</div>${moreBtn('ex', list)}`
      : empty(S.exercises.length ? 'Nenhum exercício encontrado' : 'Biblioteca vazia', S.exercises.length ? 'Ajuste os filtros.' : 'Crie o primeiro exercício para reutilizá-lo com vários alunos.', S.exercises.length ? '' : btn('Novo exercício', 'ex-new', { cls: 'primary' }))}`;
  }
  const f = getF('hw', { q: '', student: '', status: '', od: '' }), q = norm(f.q);
  const list = S.homework.filter(h => (!f.student || h.studentId === f.student) && (!f.status || h.status === f.status) && (!f.od || isHwOverdue(h, today)) && (!q || norm(h.title + ' ' + stName(h.studentId)).includes(q)))
    .sort((a, b) => cmpStr(b.assignedDate, a.assignedDate));
  const open = S.homework.filter(h => ['atribuida', 'em_andamento'].includes(h.status)), scored = S.homework.map(hwPct).filter(x => x != null);
  return html`${pageHead('Exercícios e Homework', 'Acompanhe entregas, correções e notas.', btn('Atribuir homework', 'hw-new', { cls: 'primary', icon: 'plus' }))}${tabs}
  <div class="stats" style="margin-bottom:var(--gap)">${stat('Em aberto', open.length, { tone: 't-sky' })}${stat('Atrasados', S.homework.filter(h => isHwOverdue(h, today)).length, { tone: 't-rose' })}${stat('Para corrigir', S.homework.filter(needsCorrection).length, { tone: 't-peach' })}${stat('Nota média', scored.length ? Math.round(sum(scored, x => x) / scored.length) + '%' : '—', { tone: 't-mint' })}</div>
  <div class="filters"><div class="grow"><input type="search" id="hw-q" placeholder="Buscar homework ou aluno" value="${f.q}" data-input="filter" data-page="hw" data-key="q" aria-label="Buscar homework"></div>
  ${select('student', studentOptions({ blank: 'Todos os alunos', includeInactive: true }), f.student, { id: 'hw-st-f', a: { 'data-change': 'filter', 'data-page': 'hw', 'data-key': 'student', 'aria-label': 'Aluno' } })}
  ${select('status', [['', 'Todos os status'], ...HW_STATUS], f.status, { id: 'hw-status-f', a: { 'data-change': 'filter', 'data-page': 'hw', 'data-key': 'status', 'aria-label': 'Status' } })}
  ${select('od', [['', 'Todos os prazos'], ['1', 'Somente atrasados']], f.od, { id: 'hw-od-f', a: { 'data-change': 'filter', 'data-page': 'hw', 'data-key': 'od', 'aria-label': 'Prazo' } })}</div>
  ${list.length ? html`${hwTable(limited('hw', list), true)}${moreBtn('hw', list)}` : empty(S.homework.length ? 'Nenhum homework encontrado' : 'Nenhum homework atribuído', S.homework.length ? 'Ajuste os filtros.' : 'Atribua um exercício da biblioteca ou crie uma atividade avulsa.', S.homework.length ? '' : btn('Atribuir homework', 'hw-new', { cls: 'primary' }))}`;
};

/* =================== WEEKLY STUDY PLANS =================== */
const planDayDate = (p, i) => addDays(p.weekStart, i);
const planLabel = p => `${stName(p.studentId)} · ${fmtDateShort(p.weekStart)} a ${fmtDateShort(p.weekEnd)}`;
function openPlanForm(id, opts) {
  opts = opts || {};
  const old = id ? M.plans.get(id) : null;
  const p = old || { studentId: opts.studentId || '', weekStart: mondayOf(todayISO()), goal: '', notes: '', goalIds: [] };
  const goals = S.goals.filter(g => g.studentId === p.studentId);
  openModal({
    title: old ? 'Editar plano semanal' : 'Novo Weekly Study Plan (PDF)', form: { name: 'plan', id: id || '' }, body: html`
    ${opts.studentIds ? html`<div class="fld"><span>Alunos da turma que recebem este plano</span>${checks('studentIds', opts.studentIds.map(i => [i, stName(i)]), opts.studentIds)}</div>` : fld('Aluno *', select('studentId', studentOptions({ keep: p.studentId, blank: 'Escolha o aluno…' }), p.studentId, { a: { required: true } }))}
    ${fld('Início da semana *', input('weekStart', p.weekStart, { type: 'date', a: { required: true } }), { hint: 'O plano cobre 7 dias a partir desta data.' })}
    <div class="fld"><span>PDF do Weekly Study Plan</span><input type="file" name="pfile" accept="application/pdf,image/*"><small class="hint">${p.pdfAssetId ? 'PDF atual: ' + (p.pdfName || 'arquivo') + '. Escolher outro substitui.' : 'Exporte o plano do seu modelo em PDF e anexe aqui. O aluno abre pelo painel dele.'}</small></div>
    ${fld('Ou cole um link do plano (Google Drive, Canva…)', input('pdfUrl', p.pdfUrl, { type: 'url', a: { placeholder: 'https://…' } }))}`
  });
}
FORMS.plan = async (v, f, ds) => {
  const old = ds.id ? M.plans.get(ds.id) : null;
  const many = !old && Array.isArray(v.studentIds) ? v.studentIds : null;
  if ((!many && !v.studentId) || !v.weekStart) { toast('Informe aluno e semana.', 'err'); return; }
  if (many && !many.length) { toast('Marque pelo menos um aluno da turma.', 'err'); return; }
  const dup = many ? null : S.plans.find(p => p.studentId === v.studentId && p.weekStart === v.weekStart && (!old || p.id !== old.id));
  if (dup && !await confirmBox({ title: 'Já existe um plano nesta semana', message: 'Este aluno já tem um plano começando nesta data. Criar outro mesmo assim?', ok: 'Criar mesmo assim' })) return;
  const url = (v.pdfUrl || '').trim(); if (url && !isHttpUrl(url)) { toast('O link precisa começar com https://', 'err'); return; }
  const file = f.elements.pfile && f.elements.pfile.files[0]; let pdfAssetId = old ? old.pdfAssetId || '' : '', pdfName = old ? old.pdfName || '' : '';
  if (file) { try { const nid = await uploadFile(file); await releaseAsset(pdfAssetId); pdfAssetId = nid; pdfName = file.name; } catch (e) { toast('Não foi possível enviar o PDF: ' + errMsg(e), 'err'); return; } }
  if (!old && !pdfAssetId && !url) { toast('Anexe o PDF do plano (ou cole um link).', 'err'); return; }
  if (many) { for (const sid of many) await put('plans', { days: {}, studentId: sid, weekStart: v.weekStart, weekEnd: addDays(v.weekStart, 6), pdfAssetId, pdfName, pdfUrl: url }); closeModal(); toast('Plano enviado para ' + many.length + ' aluno(s) da turma.', 'ok'); return; }
  const data = { ...(old || { days: {} }), studentId: v.studentId, weekStart: v.weekStart, weekEnd: addDays(v.weekStart, 6), pdfAssetId, pdfName, pdfUrl: url };
  await put('plans', data); closeModal(); toast(old ? 'Plano atualizado.' : 'Plano salvo.' + ((M.students.get(v.studentId) || {}).accountId ? ' O aluno já pode abrir o PDF.' : ' Vincule a conta do aluno para ele ver.'), 'ok');
};
ACTIONS['plan-new'] = d => openPlanForm(null, d && d.ids ? { studentIds: d.ids.split(',') } : {});
ACTIONS['plan-edit'] = d => openPlanForm(d.id);
ACTIONS['plan-del'] = async d => {
  if (!await confirmBox({ title: 'Excluir plano?', message: 'As atividades do plano serão apagadas. Exercícios e homeworks vinculados continuam existindo.', danger: true, ok: 'Excluir' })) return;
  await del('plans', d.id); toast('Plano excluído.', 'ok'); if (UI.route.startsWith('plano-')) go('planos');
};
ACTIONS['plan-dup'] = async d => {
  const p = M.plans.get(d.id); if (!p) return;
  const ws = addDays(p.weekStart, 7);
  if (S.plans.some(x => x.studentId === p.studentId && x.weekStart === ws) && !await confirmBox({ title: 'Semana já planejada', message: 'Já existe plano para a semana seguinte. Duplicar mesmo assim?', ok: 'Duplicar' })) return;
  const days = {}; DAY_KEYS.forEach(k => { days[k] = ((p.days || {})[k] || []).map(a => ({ ...a, id: newId(), status: 'nao_iniciada', homeworkId: '' })); });
  const id = await put('plans', { ...p, id: undefined, demo: false, weekStart: ws, weekEnd: addDays(ws, 6), days });
  toast('Plano duplicado para a semana seguinte (atividades reiniciadas).', 'ok'); go('plano-' + id);
};
function actForm(planId, actId, dayKey) {
  const p = M.plans.get(planId); if (!p) return;
  let a = { title: '', skill: '', minutes: 20, status: 'nao_iniciada', exerciseId: '', materialId: '', notes: '' };
  if (actId) a = ((p.days || {})[dayKey] || []).find(x => x.id === actId) || a;
  openModal({
    title: actId ? 'Editar atividade' : 'Nova atividade', form: { name: 'activity', id: actId || '', data: { 'data-plan': planId, 'data-day': dayKey } }, body: html`
    ${fld('Atividade *', input('title', a.title, { a: { required: true, maxlength: 160, placeholder: 'Ex.: Ler o texto e responder às perguntas' } }))}
    <div class="g3">${fld('Dia', select('day', DAY_KEYS.map((k, i) => [k, `${WEEKDAYS[weekdayIdx(planDayDate(p, i))]} ${fmtDateShort(planDayDate(p, i))}`]), dayKey))}${fld('Habilidade', select('skill', [['', '—'], ...SKILLS], a.skill || ''))}${fld('Minutos', input('minutes', a.minutes, { type: 'number', a: { min: 0, max: 600 } }))}</div>
    <div class="g2">${fld('Exercício vinculado', select('exerciseId', [['', '— Nenhum —'], ...S.exercises.map(e => [e.id, e.title])], a.exerciseId || ''))}${fld('Material vinculado', select('materialId', [['', '— Nenhum —'], ...S.materials.map(m => [m.id, m.title])], a.materialId || ''))}</div>
    ${fld('Status', select('status', ACT_STATUS, a.status))}${fld('Observações', textarea('notes', a.notes, { rows: 2 }))}`
  });
}
FORMS.activity = async (v, f, ds) => {
  const p = M.plans.get(ds.plan); if (!p) return;
  const title = v.title.trim(); if (!title) { toast('Informe a atividade.', 'err'); return; }
  const days = {}; DAY_KEYS.forEach(k => { days[k] = [...((p.days || {})[k] || [])]; });
  let hw = '';
  if (ds.id) { for (const k of DAY_KEYS) { const x = days[k].find(a => a.id === ds.id); if (x) hw = x.homeworkId || ''; days[k] = days[k].filter(a => a.id !== ds.id); } }
  days[v.day].push({ id: ds.id || newId(), title, skill: v.skill, minutes: num(v.minutes), status: v.status, exerciseId: v.exerciseId, materialId: v.materialId, notes: v.notes, homeworkId: hw });
  await put('plans', { ...p, days }); closeModal(); toast('Atividade salva.', 'ok');
};
function planUpdateAct(planId, actId, fn) {
  const p = M.plans.get(planId); if (!p) return null;
  const days = {}; DAY_KEYS.forEach(k => { days[k] = ((p.days || {})[k] || []).map(a => a.id === actId ? fn(a) : a); });
  return put('plans', { ...p, days });
}
ACTIONS['act-new'] = d => actForm(d.plan, '', d.day);
ACTIONS['act-edit'] = d => actForm(d.plan, d.act, d.day);
ACTIONS['act-del'] = async d => {
  const p = M.plans.get(d.plan); if (!p) return;
  if (!await confirmBox({ title: 'Remover atividade?', message: 'A atividade sai do plano.', danger: true, ok: 'Remover' })) return;
  const days = {}; DAY_KEYS.forEach(k => { days[k] = ((p.days || {})[k] || []).filter(a => a.id !== d.act); });
  await put('plans', { ...p, days }); toast('Atividade removida.', 'ok');
};
CHANGES['act-status'] = (v, t) => planUpdateAct(t.dataset.plan, t.dataset.act, a => ({ ...a, status: v }));
ACTIONS['act-hw'] = async d => {
  const p = M.plans.get(d.plan); if (!p) return;
  let act, idx;
  DAY_KEYS.forEach((k, i) => { const a = ((p.days || {})[k] || []).find(x => x.id === d.act); if (a) { act = a; idx = i; } });
  if (!act) return;
  if (act.homeworkId && M.homework.get(act.homeworkId)) { openHomeworkView(act.homeworkId); return; }
  const ex = M.exercises.get(act.exerciseId);
  const hid = await put('homework', { studentId: p.studentId, title: act.title, exerciseId: act.exerciseId || '', description: ex ? ex.instructions || '' : act.notes || '', assignedDate: todayISO(), dueDate: planDayDate(p, idx), status: 'atribuida', maxScore: 10, estMinutes: act.minutes, planId: p.id, createdAt: nowKey() });
  await planUpdateAct(d.plan, d.act, a => ({ ...a, homeworkId: hid }));
  toast('Homework criado a partir da atividade (prazo no dia do plano).', 'ok');
};
ACTIONS['plan-goals'] = d => {
  const p = M.plans.get(d.id), goals = S.goals.filter(g => g.studentId === p.studentId);
  openModal({ title: 'Objetivos do plano', narrow: true, form: { name: 'plangoals', id: d.id }, body: goals.length ? html`<div class="fld"><span>Vincular objetivos</span>${checks('goalIds', goals.map(g => [g.id, g.name]), p.goalIds || [])}</div>` : html`<p class="muted">Este aluno ainda não tem objetivos. Cadastre na página Objetivos de Aprendizagem.</p>` });
};
FORMS.plangoals = async (v, f, ds) => { const p = M.plans.get(ds.id); await put('plans', { ...p, goalIds: v.goalIds || [] }); closeModal(); toast('Objetivos vinculados.', 'ok'); };

VIEWS.plano = id => {
  const p = M.plans.get(id);
  if (!p) return html`${pageHead('Plano não encontrado', '', btn('Voltar', 'go', { data: { to: 'planos' } }))}${empty('Este plano não existe mais', 'Ele pode ter sido excluído.')}`;
  const pr = planProgress(p), today = todayISO(), goals = (p.goalIds || []).map(g => M.goals.get(g)).filter(Boolean);
  return html`${pageHead('Weekly Study Plan', planLabel(p), html`${btn('Voltar', 'go', { data: { to: 'planos' } })}${btn('Duplicar p/ próxima semana', 'plan-dup', { data: { id }, icon: 'copy' })}${btn('Editar', 'plan-edit', { data: { id }, icon: 'edit' })}${iconBtn('trash', 'plan-del', 'Excluir plano', { id }, 'danger')}`)}
  <div class="card" style="margin-bottom:var(--gap)"><div class="row"><b style="font-size:20px">${pr.pct}%</b><span class="muted small">${pr.done} de ${pr.total} atividades concluídas · ${pr.minutesDone}/${pr.minutes} min</span>${demoTag(p)}</div><div style="margin:8px 0">${bar(pr.pct, pr.pct === 100 ? '' : '')}</div>
    ${p.goal ? html`<p style="margin:6px 0"><b>Meta:</b> ${p.goal}</p>` : ''}${p.notes ? html`<p class="pre muted small" style="margin:6px 0">${p.notes}</p>` : ''}
    <div class="row"><span class="small muted">Objetivos:</span>${goals.length ? goals.map(g => badge(g.name, 'acc')) : html`<span class="small muted">nenhum vinculado</span>`}${btn('Vincular', 'plan-goals', { cls: 'sm', data: { id } })}</div></div>
  ${planPdfCard(p)}
  <div class="plan-days">${DAY_KEYS.map((k, i) => { const d = planDayDate(p, i), acts = (p.days || {})[k] || []; return html`<section class="day ${d === today ? 'today' : ''}"><h4><span>${WEEKDAYS[weekdayIdx(d)]}</span><span class="muted small">${fmtDateShort(d)}</span></h4>
    ${acts.map(a => { const ex = M.exercises.get(a.exerciseId), mt = M.materials.get(a.materialId), hw = M.homework.get(a.homeworkId); return html`<div class="act ${a.status === 'concluida' ? 'done' : ''}"><div class="t">${a.title}</div>
      <div class="row">${a.skill ? skillTag(a.skill) : ''}${a.minutes ? html`<span class="small muted">${a.minutes} min</span>` : ''}</div>
      ${ex ? html`<button type="button" class="link small" data-act="ex-open" data-id="${ex.id}">${ex.title}</button>` : ''}${mt ? html`<span class="small muted">Material: ${mt.title}</span>` : ''}${hw ? html`<button type="button" class="link small" data-act="hw-open" data-id="${hw.id}">Homework: ${labelOf(HW_STATUS, hw.status)}</button>` : ''}
      ${a.notes ? html`<span class="small muted">${a.notes}</span>` : ''}
      <select aria-label="Status da atividade" data-change="act-status" data-plan="${id}" data-act-id="${a.id}" data-act="${'noop'}">${ACT_STATUS.map(([v, l]) => html`<option value="${v}"${a.status === v ? raw(' selected') : ''}>${l}</option>`)}</select>
      <div class="row">${iconBtn('edit', 'act-edit', 'Editar', { plan: id, act: a.id, day: k })}${hw ? '' : btn('Virar homework', 'act-hw', { cls: 'sm', data: { plan: id, act: a.id } })}${iconBtn('trash', 'act-del', 'Remover', { plan: id, act: a.id }, 'danger')}</div></div>`; })}
    ${btn('Adicionar', 'act-new', { cls: 'sm', icon: 'plus', data: { plan: id, day: k } })}</section>`; })}</div>`;
};
// act-status usa data-act-id; adapta o handler
CHANGES['act-status'] = (v, t) => planUpdateAct(t.dataset.plan, t.dataset.actId, a => ({ ...a, status: v }));
ACTIONS.noop = () => { };

VIEWS.planos = () => {
  const f = getF('planos', { student: '', when: 'atual' }), today = todayISO();
  let list = S.plans.filter(p => (!f.student || p.studentId === f.student) && (f.when === 'todos' || (f.when === 'atual' ? p.weekEnd >= today : p.weekEnd < today)));
  list.sort((a, b) => f.when === 'passados' ? cmpStr(b.weekStart, a.weekStart) : cmpStr(a.weekStart, b.weekStart) || cmpStr(stName(a.studentId), stName(b.studentId)));
  return html`${pageHead('Weekly Study Plans', 'Anexe o PDF do plano de cada aluno na semana. O aluno abre o arquivo no painel dele.', html`${btn('Novo plano', 'plan-new', { cls: 'primary', icon: 'plus' })}`)}
  <div class="filters">${select('student', studentOptions({ blank: 'Todos os alunos', includeInactive: true }), f.student, { id: 'pl-st', a: { 'data-change': 'filter', 'data-page': 'planos', 'data-key': 'student', 'aria-label': 'Aluno' } })}
    ${select('when', [['atual', 'Atuais e futuros'], ['passados', 'Semanas passadas'], ['todos', 'Todos']], f.when, { id: 'pl-when', a: { 'data-change': 'filter', 'data-page': 'planos', 'data-key': 'when', 'aria-label': 'Período' } })}</div>
  ${list.length ? html`<div class="cards">${limited('planos', list).map(p => { const u = p.pdfAssetId ? fileUrl(p.pdfAssetId) : (isHttpUrl(p.pdfUrl) ? p.pdfUrl : ''); return html`<div class="card"><div class="row"><b>${stName(p.studentId)}</b> ${demoTag(p)}<span class="spacer"></span>${u ? badge('PDF anexado', 'ok') : badge('Sem PDF', 'warn')}</div>
    <div class="muted small">Semana de ${fmtDate(p.weekStart)} a ${fmtDate(p.weekEnd)}</div>
    <div class="row" style="margin-top:12px">${u ? html`<a class="btn sm primary" href="${u}" target="_blank" rel="noopener">${ico('file')} Abrir PDF${p.pdfName ? ' (' + String(p.pdfName).slice(0, 20) + ')' : ''}</a>` : ''}${NS.assets ? html`<label class="btn sm ${u ? '' : 'primary'}" style="cursor:pointer">${ico('upload')} ${u ? 'Trocar PDF' : 'Anexar PDF'}<input type="file" accept="application/pdf,image/*" data-change="plan-pdf" data-id="${p.id}" style="display:none" aria-label="Anexar PDF do plano"></label>` : ''}${btn('Editar', 'plan-edit', { cls: 'sm', icon: 'edit', data: { id: p.id } })}${iconBtn('trash', 'plan-del', 'Excluir', { id: p.id }, 'danger')}</div></div>`; })}</div>${moreBtn('planos', list)}`
    : empty(S.plans.length ? 'Nenhum plano neste filtro' : 'Nenhum plano criado', S.plans.length ? 'Mude o filtro para ver outras semanas.' : 'Clique em "Novo plano", escolha o aluno e a semana e anexe o PDF.', S.plans.length ? '' : btn('Novo plano', 'plan-new', { cls: 'primary' }))}`;
};
ACTIONS['plan-compare'] = () => {
  if (S.plans.length < 2) { toast('Crie pelo menos dois planos para comparar.', 'err'); return; }
  const opts = [...S.plans].sort((a, b) => cmpStr(b.weekStart, a.weekStart)).map(p => [p.id, planLabel(p)]);
  openModal({ title: 'Comparar semanas', narrow: true, form: { name: 'compare', submit: 'Comparar' }, body: html`${fld('Plano A', select('a', opts, opts[1][0]))}${fld('Plano B', select('b', opts, opts[0][0]))}` });
};
FORMS.compare = async v => {
  const A = M.plans.get(v.a), B = M.plans.get(v.b);
  if (!A || !B || A.id === B.id) { toast('Escolha dois planos diferentes.', 'err'); return; }
  closeModal();
  const col = p => { const pr = planProgress(p), acts = planActivities(p); return { pr, bySkill: SKILLS.map(([k, l]) => [l, acts.filter(a => a.skill === k).length]).filter(x => x[1]) }; };
  const a = col(A), b = col(B), row = (l, x, y) => html`<tr><td>${l}</td><td class="num">${x}</td><td class="num">${y}</td></tr>`;
  const sk = [...new Set([...a.bySkill, ...b.bySkill].map(x => x[0]))];
  openModal({ title: 'Comparação de semanas', wide: true, body: html`<div class="tablewrap"><table class="tbl"><thead><tr><th></th><th>${planLabel(A)}</th><th>${planLabel(B)}</th></tr></thead><tbody>
    ${row('Progresso', a.pr.pct + '%', b.pr.pct + '%')}${row('Atividades concluídas', `${a.pr.done}/${a.pr.total}`, `${b.pr.done}/${b.pr.total}`)}${row('Minutos planejados', a.pr.minutes, b.pr.minutes)}${row('Minutos concluídos', a.pr.minutesDone, b.pr.minutesDone)}
    ${sk.map(l => row('Atividades de ' + l, (a.bySkill.find(x => x[0] === l) || [0, 0])[1], (b.bySkill.find(x => x[0] === l) || [0, 0])[1]))}</tbody></table></div>` });
};
