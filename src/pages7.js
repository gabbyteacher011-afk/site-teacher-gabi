/* ============================================================
   pages7.js — homework estilo Google Classroom (entrega, correção, devolução),
   painel do aluno em abas, banner, Student's Guide, PDFs e modelos
   ============================================================ */

/* só apaga o arquivo se nenhum outro registro (outro aluno da turma, por exemplo) ainda o usa */
const assetUses = id => [['materials', 'assetId'], ['recordings', 'assetId'], ['plans', 'pdfAssetId'], ['homework', 'attachId'], ['contracts', 'assetId'], ['students', 'bannerImageId']].reduce((n, [c, k]) => n + S[c].filter(x => x[k] === id).length, 0);
async function releaseAsset(id) { if (!id || !NS.assets || assetUses(id) > 1) return; try { await NS.assets.delete(id); } catch (e) { /* já removido */ } }
const APP_URL = 'https://claude.ai/artifact/1ZCTaRFEXJiKuhQTJw2kFJ';
const stamp = () => new Date().toISOString();
const fmtStamp = s => { try { return s ? new Date(s).toLocaleString(loc(), { dateStyle: 'short', timeStyle: 'short' }) : ''; } catch (e) { return ''; } };
const blobUrl = id => id ? '/_blob/' + id : '';
async function uploadFile(file) {
  if (!NS.assets) throw new Error('O envio de arquivos não está disponível para esta conta.');
  if (file.size > 20 * 1024 * 1024) throw new Error('O arquivo passa de 20 MB.');
  const up = await NS.assets.upload(file); return up.id;
}
const HW_KEY_OF_STATUS = { atribuida: 'pendente', em_andamento: 'pendente', entregue: 'entregue', pendente_correcao: 'entregue', corrigida: 'corrigida', concluida: 'corrigida', refazer: 'refazer' };

/* ---------- editor de documento (contenteditable com marcas permitidas) ---------- */
const docToolbar = (full) => html`<div class="doc-tb" role="toolbar" aria-label="Formatação do texto">
  <button type="button" data-act="doc-fmt" data-cmd="bold" title="Negrito" aria-label="Negrito"><b>B</b></button><button type="button" data-act="doc-fmt" data-cmd="italic" title="Itálico" aria-label="Itálico"><i>I</i></button><button type="button" data-act="doc-fmt" data-cmd="underline" title="Sublinhado" aria-label="Sublinhado"><u>U</u></button><button type="button" data-act="doc-fmt" data-cmd="insertUnorderedList" title="Lista" aria-label="Lista com marcadores">• Lista</button>
  ${full ? html`<span class="sep"></span><span class="tiny muted">Marcar:</span><button type="button" data-act="doc-mark" data-cls="hl-y" class="sw y" title="Marca-texto amarelo" aria-label="Marca-texto amarelo"></button><button type="button" data-act="doc-mark" data-cls="hl-r" class="sw r" title="Marca-texto rosa (erro)" aria-label="Marca-texto rosa para erros"></button><button type="button" data-act="doc-mark" data-cls="hl-g" class="sw g" title="Marca-texto verde (acerto)" aria-label="Marca-texto verde para acertos"></button><button type="button" data-act="doc-mark" data-cls="tc-r" title="Texto vermelho" aria-label="Texto vermelho" style="color:var(--bad)"><b>A</b></button><button type="button" data-act="doc-mark" data-cls="tc-b" title="Texto azul" aria-label="Texto azul" style="color:var(--navy)"><b>A</b></button><button type="button" data-act="doc-clear" title="Limpar marcações da seleção" aria-label="Limpar marcações">Limpar</button>` : ''}</div>`;
const docEditor = (id, h, label) => html`<div class="doc-ed" id="${id}" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${label || 'Documento'}" data-ph="Escreva aqui…">${raw(cleanDoc(h))}</div>`;
const docView = h => docEmpty(h) ? html`<p class="muted small" style="margin:0">(vazio)</p>` : html`<div class="doc-view">${raw(cleanDoc(h))}</div>`;
document.addEventListener('mousedown', e => { if (e.target.closest('.doc-tb button')) e.preventDefault(); });
document.addEventListener('paste', e => {
  const ed = e.target.closest && e.target.closest('.doc-ed'); if (!ed) return;
  e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, t);
});
const edOfSelection = () => { const sel = getSelection(); if (!sel || !sel.rangeCount) return null; let n = sel.getRangeAt(0).commonAncestorContainer; if (n.nodeType === 3) n = n.parentElement; return n && n.closest ? n.closest('.doc-ed') : null; };
ACTIONS['doc-fmt'] = d => { if (!edOfSelection()) { toast('Clique dentro do texto antes.', 'err'); return; } document.execCommand(d.cmd, false, null); };
ACTIONS['doc-mark'] = d => {
  const ed = edOfSelection(), sel = getSelection();
  if (!ed || sel.isCollapsed) { toast('Selecione um trecho do texto primeiro.', 'err'); return; }
  const r = sel.getRangeAt(0), el = document.createElement(d.cls.startsWith('hl') ? 'mark' : 'span'); el.className = d.cls;
  el.appendChild(r.extractContents()); r.insertNode(el); sel.removeAllRanges();
};
ACTIONS['doc-clear'] = () => {
  const ed = edOfSelection(), sel = getSelection(); if (!ed) return;
  ed.querySelectorAll('mark,span[class]').forEach(el => { if (sel.containsNode(el, true)) { while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el); el.remove(); } });
};

/* ---------- chip de status ---------- */
const hwChipT = h => { const k = hwKey(h, todayISO()); return hwChip(k); };

/* =================== PROFESSORA: entregas dos alunos =================== */
S.subs = {}; S.subsDirty = false; S.subsReady = false;
function startSubsSync() {
  if (!NS.db || !NS.db.collection) return;
  S.unsubs.push(NS.db.collection('hwsub').onSnapshot(snap => {
    S.subs = {}; snap.docs.forEach(d => { S.subs[d.id] = d.data(); }); S.subsDirty = true; scheduleRender();
    if (!S.subsReady) setTimeout(() => { S.subsReady = true; }, 6000);
  }, e => console.error('hwsub', e)));
}
const subOf = h => { const st = M.students.get(h.studentId); const d = st && st.accountId && S.subs[st.accountId]; return d && d.items ? d.items[h.id] || null : null; };
let syncingSubs = false;
async function syncSubmissions() {
  if (syncingSubs || S.mode !== 'professora') return; syncingSubs = true;
  try {
    for (const st of S.students) {
      const doc = st.accountId && S.subs[st.accountId]; if (!doc || !doc.items) continue;
      for (const [hid, it] of Object.entries(doc.items)) {
        const h = M.homework.get(hid); if (!h || h.studentId !== st.id) continue;
        if (it.status === 'entregue' && it.submittedAt && h.subAt !== it.submittedAt && h.status !== 'concluida') { await put('homework', { ...h, status: 'pendente_correcao', subAt: it.submittedAt, deliveredDate: todayISO() }); if (S.subsReady) { toast(`${st.name.split(' ')[0]} entregou: ${h.title}`, 'ok'); try { if (window.Notification && Notification.permission === 'granted') new Notification('Nova entrega', { body: `${st.name}: ${h.title}` }); } catch (e) { /* sem notificação do navegador */ } } }
        else if (it.status === 'rascunho' && h.status === 'pendente_correcao' && h.subAt) await put('homework', { ...h, status: 'atribuida', subAt: '', deliveredDate: '' });
      }
    }
  } catch (e) { console.error(e); } finally { syncingSubs = false; }
}
function openCorrection(hid) {
  const h = M.homework.get(hid); if (!h) return;
  const st = M.students.get(h.studentId), it = subOf(h);
  if (!it) { toast('Este aluno ainda não entregou pelo painel.', 'err'); return; }
  closeAllModals();
  if (h.subAt && (!h.seenAt || h.seenAt < h.subAt)) put('homework', { ...h, seenAt: stamp() });
  openModal({
    title: 'Corrigir: ' + h.title, wide: true, body: html`<div class="stack">
    <div class="row"><div class="who">${avatar(st, 36)}<div><b>${stName(h.studentId)}</b><div class="muted small">Entregue em ${fmtStamp(it.submittedAt)}${h.dueDate ? ' · prazo ' + fmtDate(h.dueDate) : ''}</div></div></div><span class="spacer"></span>${hwChip(hwKey(h, todayISO()))}</div>
    ${h.description ? html`<div class="hl pre small">${h.description}</div>` : ''}
    <div><b class="small">Documento do aluno</b><span class="muted small"> · selecione trechos e use as marcas para corrigir; você também pode escrever direto no texto.</span></div>
    ${docToolbar(true)}${docEditor('cor_doc', it.html, 'Documento do aluno para correção')}
    ${(it.files || []).length ? html`<div class="row"><span class="small muted">Anexos:</span>${it.files.map(f => html`<a class="btn sm" href="${blobUrl(f.id)}" target="_blank" rel="noopener">${ico('paperclip')}${String(f.name || 'arquivo').slice(0, 30)}</a>`)}</div>` : ''}
    <div class="g2">${fld('Nota', input('score', h.score, { id: 'cor_score', type: 'number', a: { min: 0, step: '0.1' } }))}${fld('Nota máxima', input('maxScore', h.maxScore || 10, { id: 'cor_max', type: 'number', a: { min: 1, step: '0.1' } }))}</div>
    ${fld('Feedback para o aluno', textarea('feedback', h.feedback, { id: 'cor_fb', rows: 4 }))}
    ${st && st.accountId ? '' : html`<p class="hint" style="color:var(--bad)">A conta deste aluno não está vinculada: a devolução não chegaria até ele.</p>`}</div>`,
    footer: html`<span class="spacer"></span>${btn('Pedir para refazer', 'cor-redo', { data: { id: hid }, icon: 'redo' })}${btn('Devolver corrigido', 'cor-send', { cls: 'primary', data: { id: hid }, icon: 'send' })}`
  });
}
async function sendReturn(hid, mode) {
  const h = M.homework.get(hid), st = h && M.students.get(h.studentId); if (!h || !st) return;
  if (!st.accountId) { toast('Vincule a conta do aluno em "Área do Aluno" antes de devolver.', 'err'); return; }
  const docHtml = cleanDoc($('#cor_doc').innerHTML, 40000), fb = $('#cor_fb').value.trim().slice(0, 2000), max = num($('#cor_max').value, 10), score = num($('#cor_score').value, NaN);
  if (mode === 'corrigida' && !(score >= 0 && score <= max)) { toast('Informe uma nota entre 0 e a nota máxima.', 'err'); return; }
  if (mode === 'refazer' && !fb) { toast('Explique no feedback o que o aluno deve refazer.', 'err'); return; }
  try {
    const ref = NS.db.doc('hwret/' + st.accountId), cur = await ref.get(); const items = { ...((cur.exists && cur.data().items) || {}) };
    items[hid] = { html: docHtml, feedback: fb, score: mode === 'corrigida' ? score : null, maxScore: max, mode, returnedAt: stamp() };
    const doc = { v: 1, items, updatedAt: stamp() };
    if (JSON.stringify(doc).length > 220000) { toast('O espaço de devoluções deste aluno encheu. Remova homeworks antigos do painel.', 'err'); return; }
    await ref.set(doc);
    await put('homework', { ...h, status: mode === 'corrigida' ? 'corrigida' : 'refazer', score: mode === 'corrigida' ? score : h.score, maxScore: max, feedback: fb, correctedDate: todayISO(), deliveredDate: h.deliveredDate || todayISO() });
    closeAllModals(); toast(mode === 'corrigida' ? 'Correção devolvida ao aluno.' : 'Pedido de refazer enviado ao aluno.', 'ok');
  } catch (e) { toast('Não foi possível devolver: ' + errMsg(e), 'err'); }
}
ACTIONS['cor-open'] = d => openCorrection(d.id);
ACTIONS['cor-send'] = d => sendReturn(d.id, 'corrigida');
ACTIONS['cor-redo'] = d => sendReturn(d.id, 'refazer');

/* =================== ALUNO: entregar homework =================== */
S.sub = null; S.ret = null;
function startStudentExtraSync() {
  S.unsubs.push(NS.db.doc('hwsub/' + UID).onSnapshot(snap => { S.sub = snap.exists ? snap.data() : null; scheduleRender(); }, e => console.error('hwsub', e)));
  S.unsubs.push(NS.db.doc('hwret/' + UID).onSnapshot(snap => { S.ret = snap.exists ? snap.data() : null; scheduleRender(); }, e => console.error('hwret', e)));
}
const subItems = () => (S.sub && S.sub.items) || {}, retItems = () => (S.ret && S.ret.items) || {};
function openStudentHw(hid) {
  if (S.mode !== 'aluno') { toast('Prévia: aqui o aluno abriria o documento para fazer e entregar.', 'info'); return; }
  const d = S.portal, h = d && (d.homework || []).find(x => x.id === hid); if (!h) return;
  const key = hwKeyStudent(h, subItems(), retItems(), todayISO()), s = subItems()[hid] || {}, r = retItems()[hid];
  const editable = ['pendente', 'atrasada', 'rascunho', 'refazer'].includes(key);
  const startHtml = s.html != null && s.html !== '' ? s.html : (key === 'refazer' && r ? r.html : h.docHtml || '');
  openModal({
    title: h.title, wide: true, body: html`<div class="stack">
    <div class="row">${hwChip(key)}${h.dueDate ? html`<span class="small muted">Prazo: ${fmtDate(h.dueDate)}</span>` : ''}${key === 'corrigida' && (r ? r.score != null : h.score != null) ? html`<b class="pt-score">${award(r ? r.score : h.score)}/${r ? r.maxScore : h.maxScore}</b>` : ''}</div>
    ${h.description ? html`<div class="pre">${h.description}</div>` : ''}
    ${h.attachUrl ? html`<p style="margin:0"><a class="btn primary" href="${h.attachUrl}" target="_blank" rel="noopener noreferrer">${ico('link')} Abrir o documento da atividade</a></p>` : ''}
    ${h.attachId ? html`<p style="margin:0"><a class="btn sm" href="${blobUrl(h.attachId)}" target="_blank" rel="noopener">${ico('paperclip')} Material da professora${h.attachName ? ' (' + String(h.attachName).slice(0, 28) + ')' : ''}</a></p>` : ''}
    ${key === 'refazer' && r ? html`<div class="pt-note pre"><b>Pedido da professora:</b><br>${r.feedback}</div>` : ''}
    ${key === 'corrigida' ? html`
      ${r ? html`<div><b class="small">Seu documento corrigido</b>${docView(r.html)}</div>` : (s.html ? html`<div><b class="small">Sua entrega</b>${docView(s.html)}</div>` : '')}
      ${(r ? r.feedback : h.feedback) ? html`<div class="pt-note pre"><b>Feedback da professora:</b><br>${r ? r.feedback : h.feedback}</div>` : ''}`
      : key === 'entregue' ? html`<div><b class="small">Sua entrega</b>${docView(s.html)}</div>${(s.files || []).length ? html`<div class="row">${s.files.map(f => html`<a class="btn sm" href="${blobUrl(f.id)}" target="_blank" rel="noopener">${ico('paperclip')}${String(f.name || 'arquivo').slice(0, 30)}</a>`)}</div>` : ''}<p class="hint">Entregue em ${fmtStamp(s.submittedAt)}. Aguardando a correção da professora.</p>`
        : html`<div><b class="small">Seu documento</b> <span class="muted small">(escreva suas respostas aqui; salve quantas vezes quiser)</span></div>${docToolbar(false)}${docEditor('stu_doc', startHtml, 'Seu documento')}
          <div class="row" id="stu_files">${(s.files || []).map(f => html`<span class="badge">${ico('paperclip')}${String(f.name || 'arquivo').slice(0, 26)}</span>`)}</div>
          ${NS.assets ? fld('Anexar arquivo (foto do caderno, PDF, áudio… até 20 MB)', html`<input type="file" id="stu_file">`) : ''}`}</div>`,
    footer: editable ? html`<span class="spacer"></span>${btn('Salvar rascunho', 'stu-save', { data: { id: hid } })}${btn('Entregar', 'stu-submit', { cls: 'primary', data: { id: hid }, icon: 'send' })}` : (key === 'entregue' ? html`<span class="spacer"></span>${btn('Cancelar entrega', 'stu-unsubmit', { data: { id: hid } })}` : '')
  });
}
const award = n => String(n).replace('.', ',');
async function writeSub(hid, patch) {
  const items = { ...subItems() }; items[hid] = { ...(items[hid] || {}), ...patch };
  const doc = { v: 1, items, updatedAt: stamp() };
  if (JSON.stringify(doc).length > 220000) throw new Error('Seu espaço de entregas encheu. Fale com a professora.');
  await NS.db.doc('hwsub/' + UID).set(clean(doc)); S.sub = doc;
}
async function stuSave(hid, submit) {
  const ed = $('#stu_doc'); if (!ed) return;
  const cur = subItems()[hid] || {}, htmlV = cleanDoc(ed.innerHTML, 40000), fi = $('#stu_file'), file = fi && fi.files && fi.files[0];
  let files = [...(cur.files || [])];
  try {
    if (file) { const id = await uploadFile(file); files.push({ id, name: file.name }); }
    const hh = S.portal && (S.portal.homework || []).find(x => x.id === hid), hasMaterial = hh && (hh.attachUrl || hh.attachId);
    if (submit && docEmpty(htmlV) && !files.length && !hasMaterial) { toast('Escreva a sua resposta ou anexe um arquivo antes de entregar.', 'err'); return; }
    if (submit && !await confirmBox({ title: 'Entregar homework?', message: 'A professora vai receber o seu documento para corrigir. Até ela corrigir, você pode cancelar a entrega.', ok: 'Entregar' })) return;
    await writeSub(hid, { html: htmlV, files, status: submit ? 'entregue' : 'rascunho', updatedAt: stamp(), submittedAt: submit ? stamp() : (cur.submittedAt || '') });
    closeAllModals(); toast(submit ? 'Homework entregue! 🎉' : 'Rascunho salvo.', 'ok');
  } catch (e) { toast('Não foi possível salvar: ' + errMsg(e), 'err'); }
}
ACTIONS['stu-save'] = d => stuSave(d.id, false);
ACTIONS['stu-submit'] = d => stuSave(d.id, true);
ACTIONS['stu-unsubmit'] = async d => { try { await writeSub(d.id, { status: 'rascunho', updatedAt: stamp() }); closeAllModals(); toast('Entrega cancelada. Você pode editar e entregar de novo.', 'ok'); } catch (e) { toast('Não foi possível cancelar: ' + errMsg(e), 'err'); } };
ACTIONS['pt-hw'] = d => openStudentHw(d.id);
ACTIONS['pt-tab'] = d => { UI.ptTab = d.tab; render(); window.scrollTo && window.scrollTo(0, 0); };

/* =================== BANNER =================== */
const BANNER_THEMES = [['lavanda', 'Lavanda'], ['rose', 'Rosé'], ['azul', 'Azul'], ['creme', 'Creme']];
const FLAG = '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" rx="3" fill="#fff"/>' + [0, 1, 2, 3, 4, 5, 6].map(i => `<rect y="${i * 5.7}" width="60" height="2.9" fill="#B45C64"/>`).join('') + '<rect width="26" height="22" rx="2" fill="#2A506D"/>' + [[5, 5], [11, 5], [17, 5], [8, 10], [14, 10], [20, 10], [5, 15], [11, 15], [17, 15]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="1.1" fill="#fff"/>`).join('') + '</svg>';
function bannerHtml(b) {
  b = b || {};
  if (b.imageId) return html`<div class="pt-banner img"><img src="${blobUrl(b.imageId)}" alt="${b.title || 'Banner'}"></div>`;
  return html`<div class="pt-banner th-${b.theme || 'lavanda'}" role="img" aria-label="${b.title || 'Banner'}"><div class="pill"><span class="flag">${raw(FLAG)}</span><div class="bt"><b>${b.title || 'English Class'}</b>${b.sub ? html`<small>${b.sub}</small>` : ''}</div><img class="bl" src="${LOGO}" alt=""></div></div>`;
}
ACTIONS['banner-edit'] = d => {
  const s = M.students.get(d.id); if (!s) return;
  const b = S.settings.banner || {}, ex = portalDoc(d.id, D(), todayISO(), nowKey(), { banner: b, guide: S.settings.guide }).banner;
  openModal({
    title: 'Banner de ' + s.name.split(' ')[0], wide: true, form: { name: 'banner', id: d.id }, body: html`
    <div id="bn-prev">${bannerHtml({ ...ex, imageId: s.bannerImageId })}</div>
    <div class="g2">${fld('Título do banner', input('bannerTitle', s.bannerTitle, { a: { maxlength: 60, placeholder: ex.title, 'data-input': 'bn-live' } }))}${fld('Subtítulo (opcional)', input('bannerSub', s.bannerSub, { a: { maxlength: 80, 'data-input': 'bn-live' } }))}</div>
    <div class="g2">${fld('Cor do fundo (vale para todos os alunos)', select('theme', BANNER_THEMES, b.theme || 'lavanda', { a: { 'data-change': 'bn-live' } }))}
    ${NS.assets ? fld('Ou use uma imagem sua (feita no Canva, por exemplo)', html`<input type="file" name="bfile" accept="image/*">`, { hint: s.bannerImageId ? 'Há uma imagem enviada. Enviar outra substitui; marque abaixo para voltar ao banner automático.' : 'Formato horizontal. A imagem substitui o banner automático deste aluno.' }) : ''}</div>
    ${s.bannerImageId ? html`<label class="chk"><input type="checkbox" name="bclear" value="1"> Remover a imagem e voltar ao banner automático</label>` : ''}
    <p class="hint">Deixe o título vazio para usar "${ex.title}" (curso e primeiro nome).</p>`
  });
};
function bannerLive() {
  const f = $('#modals form'); if (!f) return; const sid = f.dataset.id, s = M.students.get(sid); if (!s) return;
  const ex = portalDoc(sid, D(), todayISO(), nowKey(), { banner: { theme: f.elements.theme.value }, guide: {} }).banner;
  const t = f.elements.bannerTitle.value.trim();
  $('#bn-prev').innerHTML = bannerHtml({ ...ex, title: t || ex.title, sub: f.elements.bannerSub.value.trim(), imageId: s.bannerImageId }).s;
}
INPUTS['bn-live'] = bannerLive; CHANGES['bn-live'] = bannerLive;
FORMS.banner = async (v, f, ds) => {
  const s = M.students.get(ds.id); if (!s) return;
  let img = s.bannerImageId || '';
  try {
    const file = f.elements.bfile && f.elements.bfile.files[0];
    if (v.bclear === '1' && img) { if (NS.assets) { try { await NS.assets.delete(img); } catch (e) { /* já removida */ } } img = ''; }
    if (file) { const id = await uploadFile(file); if (img && NS.assets) { try { await NS.assets.delete(img); } catch (e) { /* ignora */ } } img = id; }
  } catch (e) { toast('Não foi possível enviar a imagem: ' + errMsg(e), 'err'); return; }
  if (v.theme !== ((S.settings.banner || {}).theme || 'lavanda')) await saveSettings({ banner: { ...(S.settings.banner || {}), theme: v.theme } });
  await put('students', { ...s, bannerTitle: v.bannerTitle.trim(), bannerSub: v.bannerSub.trim(), bannerImageId: img });
  closeModal(); toast('Banner salvo.' + (s.accountId ? ' O painel do aluno será atualizado.' : ''), 'ok');
  if (v.theme !== 'lavanda' || (S.settings.banner || {}).theme) for (const x of S.students) if (x.accountId && x.id !== s.id) schedulePortal(x.id);
};

/* =================== STUDENT'S GUIDE (editor) =================== */
const GUIDE_FIELDS = [
  ['welcome', 'Mensagem de boas-vindas', 'ta', 5], ['zoomId', 'Zoom: ID da reunião', 'in'], ['zoomPass', 'Zoom: senha', 'in'], ['zoomTutorials', 'Zoom: tutoriais (um por linha: Título | https://link)', 'ta', 2],
  ['classroomUrl', 'Google Classroom: link do convite', 'url'], ['classroomTutorials', 'Google Classroom: tutoriais (Título | https://link)', 'ta', 2],
  ['cambridgeUrl', 'Cambridge One: site', 'url'], ['cambridgeKey', 'Cambridge One: class key', 'in'], ['cambridgeTutorials', 'Cambridge One: tutoriais (Título | https://link)', 'ta', 2],
  ['tips', 'Dicas "Para as aulas" (separe cada dica por uma linha em branco; a 1ª linha é o título)', 'ta', 10],
  ['tutorials', 'Tutoriais de lição de casa (Título | https://link | senha)', 'ta', 3], ['docs', 'Documentos (Título | https://link): Classroom Agreements, English expressions…', 'ta', 3]
];
ACTIONS['guide-edit'] = d => {
  const sid = d.id || '', gid = d.group || '', grp = gid ? M.groups.get(gid) : null, s = sid ? M.students.get(sid) : null, base = { ...DEFAULT_GUIDE, ...(S.settings.guide || {}), ...(s && s.groupId && M.groups.get(s.groupId) ? M.groups.get(s.groupId).guide || {} : {}) }, o = grp ? (grp.guide || {}) : s ? (s.guide || {}) : (S.settings.guide || {});
  openModal({
    title: grp ? "Student's Guide da turma " + grp.name : s ? "Student's Guide de " + s.name.split(' ')[0] : "Student's Guide: padrão para todos", wide: true, form: { name: 'guide', id: sid, data: { 'data-group': gid } }, body: html`
    <p class="muted small" style="margin:0">${grp ? 'Vale para todos da turma. Cada aluno ainda pode ter ajustes próprios; o que ficar vazio usa o guia padrão.' : s ? 'Preencha só o que é diferente neste aluno; o que ficar vazio usa o guia padrão. O link do Zoom vem do cadastro do aluno.' : 'Este é o texto padrão que todos os alunos veem. Cada aluno pode ter ajustes próprios.'}</p>
    ${GUIDE_FIELDS.map(([k, l, t, r]) => fld(l, t === 'ta' ? textarea('g_' + k, o[k] !== undefined ? o[k] : (s || grp ? '' : base[k]), { rows: r }) : input('g_' + k, o[k] !== undefined ? o[k] : (s || grp ? '' : base[k]), { type: t === 'url' ? 'url' : 'text' }), (s || grp) && base[k] ? { hint: 'Padrão: ' + String(base[k]).replace(/\s+/g, ' ').slice(0, 60) + (String(base[k]).length > 60 ? '…' : '') } : undefined))}
    ${s ? fld('Informações de conta para pagamento (só este aluno vê)', textarea('g_payInfo', o.payInfo || '', { rows: 3 }), { hint: 'Texto livre (ex.: chave Pix e dia do vencimento). Não gera cobrança nem mensagem automática.' }) : ''}`
  });
};
FORMS.guide = async (v, f, ds) => {
  const g = {}; for (const [k] of GUIDE_FIELDS) g[k] = String(v['g_' + k] || '').trim();
  for (const k of ['classroomUrl', 'cambridgeUrl']) if (g[k] && !isHttpUrl(g[k])) { toast('O link precisa começar com https://', 'err'); return; }
  if (ds.group) { const gr = M.groups.get(ds.group); const out = {}; for (const k of Object.keys(g)) if (g[k]) out[k] = g[k]; await put('groups', { ...gr, guide: out }); }
  else if (ds.id) { const s = M.students.get(ds.id); const out = {}; for (const k of Object.keys(g)) if (g[k]) out[k] = g[k]; const pay = String(v.g_payInfo || '').trim(); if (pay) out.payInfo = pay; await put('students', { ...s, guide: out }); }
  else { await saveSettings({ guide: g }); for (const x of S.students) if (x.accountId) schedulePortal(x.id); }
  closeModal(); toast("Student's Guide salvo.", 'ok');
};

/* =================== PAINEL DO ALUNO (abas) =================== */
const PT_TABS = [['inicio', 'Início', 'home'], ['homework', 'Homework', 'pencil'], ['aulas', 'Aulas', 'book'], ['gravacoes', 'Gravações', 'video'], ['progresso', 'Progresso', 'route'], ['materiais', 'Materiais', 'folder'], ['plano', 'Plano da semana', 'plan'], ['guia', "Student's Guide", 'key'], ['dados', 'Meus dados', 'contract']];
const linkBtn = (url, label, ic) => html`<a class="btn sm" href="${url}" target="_blank" rel="noopener noreferrer">${ico(ic || 'link')} ${label}</a>`;
const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
function ptNext(d) {
  const nowK = nowKey(), nx = (d.next || []).filter(n => `${n.date}T${n.time}` >= nowK), n0 = nx[0], zoom = d.zoom && d.zoom.url;
  return html`<section class="pt-card pt-next"><h2>${ico('video')} ${G() ? 'Próxima aula' : 'Sua próxima aula'}</h2>
    ${n0 ? html`<div class="pt-when"><b>${fmtDateLong(n0.date)}</b><span>${n0.time} · ${n0.duration} min${n0.topic ? ' · ' + n0.topic : ''}</span></div>` : html`<p class="muted" style="margin:0">Nenhuma aula agendada no momento.</p>`}
    ${zoom ? html`<p style="margin:14px 0 0"><a class="pt-zoom" href="${d.zoom.url}" target="_blank" rel="noopener noreferrer">${ico('video')} Entrar na aula (Zoom)</a></p>${d.zoom.note ? html`<p class="small pre" style="margin:10px 0 0">${d.zoom.note}</p>` : ''}` : html`<p class="small muted" style="margin:12px 0 0">O link do Zoom ainda não foi cadastrado pela professora.</p>`}
    ${nx.length > 1 ? html`<div class="pt-more"><span class="tiny muted">DEPOIS</span>${nx.slice(1, 4).map(n => html`<span>${fmtDateShort(n.date)} · ${n.time}</span>`)}</div>` : ''}</section>`;
}
function ptHwList(d, limit) {
  const today = todayISO(), sub = S.mode === 'aluno' ? subItems() : (PT_PREVIEW.sub || {}), ret = S.mode === 'aluno' ? retItems() : {};
  const rows = (d.homework || []).map(h => ({ h, k: hwKeyStudent(h, sub, ret, today) }));
  const order = { refazer: 0, atrasada: 1, pendente: 2, rascunho: 3, entregue: 4, corrigida: 5 };
  rows.sort((a, b) => order[a.k] - order[b.k] || cmpStr(a.h.dueDate || '9999', b.h.dueDate || '9999'));
  const item = ({ h, k }) => html`<button type="button" class="pt-hw ${k}" data-act="pt-hw" data-id="${h.id}"><span class="ic">${ico(HW_UI[k][1])}</span><span class="grow"><b>${h.title}</b><small>${h.dueDate ? 'Prazo ' + fmtDateShort(h.dueDate) : 'Sem prazo'}${h.attachId || !docEmpty(h.docHtml) ? ' · tem documento' : ''}</small></span>${hwChip(k)}</button>`;
  return { rows, html: rows.length ? html`<div class="pt-hws">${(limit ? rows.slice(0, limit) : rows).map(item)}</div>` : html`<p class="muted small" style="margin:0">Nenhuma atividade por enquanto.</p>` };
}
const PT_PREVIEW = { sub: null };
function ptHome(d) {
  const today = todayISO(), ev = stageEvolution(d.stages || [], today), hw = ptHwList(d, 4), pend = hw.rows.filter(r => ['pendente', 'atrasada', 'rascunho', 'refazer'].includes(r.k)).length;
  return html`${ptNext(d)}
  <section class="pt-card"><h2>${ico('pencil')} Homework</h2>${pend ? html`<p class="small" style="margin:0 0 10px"><b>${pend}</b> ${pend === 1 ? 'atividade espera' : 'atividades esperam'} por você.</p>` : html`<p class="small muted" style="margin:0 0 10px">Tudo em dia por aqui. 🎉</p>`}${hw.html}${hw.rows.length > 4 ? html`<p style="margin:12px 0 0">${btn('Ver todas', 'pt-tab', { cls: 'sm', data: { tab: 'homework' } })}</p>` : ''}</section>
  ${ev.total ? html`<section class="pt-card"><h2>${ico('route')} Minha evolução</h2><div class="pt-tiles"><div><b>${ev.pctDone}%</b><small>do cronograma concluído</small></div><div><b>${ev.done}/${ev.total}</b><small>etapas concluídas</small></div><div><b>${d.lessonsDone}${d.lessonsTotal ? '/' + d.lessonsTotal : ''}</b><small>aulas realizadas</small></div></div><p style="margin:12px 0 0">${btn('Ver progresso', 'pt-tab', { cls: 'sm', data: { tab: 'progresso' } })}</p></section>` : ''}`;
}
function ptProgress(d) {
  const today = todayISO(), ev = stageEvolution(d.stages || [], today);
  const state = { concluido: ['Cronograma concluído', 'ok'], adiantado: [G() ? 'Está adiantado(a)' : 'Você está adiantado', 'ok'], no_ritmo: [G() ? 'Está no ritmo' : 'Você está no ritmo', 'ok'], atrasado: ['Algumas etapas pedem atenção', 'warn'], sem_etapas: ['', ''] }[ev.state];
  const last = (d.reports || [])[0];
  return html`${ev.total ? html`<section class="pt-card"><h2>${ico('route')} ${G() ? 'Evolução' : 'Minha evolução'}</h2>
    <div class="pt-tiles"><div><b>${ev.pctDone}%</b><small>do cronograma concluído</small></div><div><b>${ev.done}/${ev.total}</b><small>etapas concluídas</small></div>${d.lessonsTotal ? html`<div><b>${d.lessonsDone}/${d.lessonsTotal}</b><small>aulas realizadas</small></div>` : html`<div><b>${d.lessonsDone}</b><small>aulas realizadas</small></div>`}</div>
    ${state[0] ? html`<p style="margin:12px 0">${badge(state[0], state[1])}</p>` : ''}
    ${ev.labels.length > 1 ? lineChart({ labels: ev.labels.map(m => fmtMonthShort(m)), series: [{ name: 'Previsto no cronograma', color: 'var(--c2)', values: ev.planned }, { name: G() ? 'Concluído' : 'Concluído por você', color: 'var(--c1)', values: ev.actual }], max: 100, fmt: v => Math.round(v) + '%', aria: 'Evolução: previsto e concluído' }) : ''}</section>
  <section class="pt-card"><h2>Cronograma do ano</h2><ol class="pt-stages">${d.stages.map(x => { const st = x.status; return html`<li class="${st}"><span class="dot" aria-hidden="true">${st === 'concluida' ? ico('check') : ''}</span><div><b>${x.order}. ${x.title}</b> ${x.skill ? skillTag(x.skill) : ''}<div class="small muted">${x.startDate ? fmtDateShort(x.startDate) : ''}${x.endDate ? ' a ' + fmtDateShort(x.endDate) : ''} · ${labelOf(STAGE_STATUS, st)}${x.completedDate ? ' em ' + fmtDateShort(x.completedDate) : ''}</div>${x.description ? html`<div class="small pre">${x.description}</div>` : ''}${x.note ? html`<div class="small pt-note pre">${x.note}</div>` : ''}</div></li>`; })}</ol></section>` : html`<section class="pt-card"><h2>${ico('route')} Minha evolução</h2><p class="muted small" style="margin:0">O cronograma do seu curso ainda não foi publicado pela professora.</p></section>`}
  ${last ? html`<section class="pt-card"><h2>${ico('chart')} ${G() ? 'Notas por habilidade' : 'Minhas notas por habilidade'}</h2><p class="small muted" style="margin:0 0 8px">Período ${fmtDate(last.periodStart)} a ${fmtDate(last.periodEnd)}</p>${SKILLS.filter(([k]) => last.scores[k] && typeof last.scores[k].score === 'number').map(([k]) => html`<div class="skrow"><span>${skillTag(k)}</span>${bar(last.scores[k].score * 10)}<b>${String(last.scores[k].score).replace('.', ',')}</b></div>${last.scores[k].comment ? html`<div class="skc">${last.scores[k].comment}</div>` : ''}`)}${last.strengths ? html`<h3 class="small muted" style="margin:14px 0 4px;font-weight:700">PONTOS FORTES</h3><div class="pre">${last.strengths}</div>` : ''}${last.improve ? html`<h3 class="small muted" style="margin:14px 0 4px;font-weight:700">PARA MELHORAR</h3><div class="pre">${last.improve}</div>` : ''}</section>` : ''}`;
}
function ptClasses(d) {
  return html`<section class="pt-card"><h2>${ico('book')} Relatórios das aulas</h2>${(d.lessonReports || []).length ? html`<div class="pt-acc">${d.lessonReports.map((r, i) => html`<details${i === 0 ? raw(' open') : ''}><summary><b>${fmtDate(r.date)}</b>${r.topic ? ' · ' + r.topic : ''}</summary><div class="pt-rep">${[['O que estudamos', r.summary], ['Vocabulário e expressões', r.vocabulary], ['Pontos positivos', r.highlights], ['Tarefa de casa', r.homework], ['Para a próxima aula', r.nextSteps]].filter(x => x[1]).map(([l, v]) => html`<div><div class="tiny muted" style="font-weight:700;letter-spacing:.05em;text-transform:uppercase">${l}</div><div class="pre">${v}</div></div>`)}</div></details>`)}</div>` : html`<p class="muted small" style="margin:0">Os relatórios das suas aulas aparecem aqui depois que sua professora publicar.</p>`}</section>`;
}
function ptMaterials(d) {
  const ms = d.materials || [];
  return html`<section class="pt-card"><h2>${ico('folder')} Materiais das aulas</h2>${ms.length ? html`<div class="list">${ms.map(m => { const u = m.assetId ? blobUrl(m.assetId) : m.url; return html`<div class="item"><span class="pt-ic">${ico(m.category === 'video' ? 'video' : 'file')}</span><div class="grow"><div class="t">${m.title}</div><div class="small muted">${labelOf(MAT_CAT, m.category)}${m.description ? ' · ' + m.description : ''}</div></div>${u ? linkBtn(u, 'Abrir', m.assetId ? 'file' : 'link') : ''}</div>`; })}</div>` : html`<p class="muted small" style="margin:0">Slides e materiais das aulas aparecem aqui quando sua professora os liberar.</p>`}</section>`;
}
function ptPlan(d) {
  const p0 = d.plan, files = d.planFiles || [], p = p0 && Object.values(p0.days || {}).some(a => a.length) ? p0 : null;
  return html`<section class="pt-card pt-next"><h2>${ico('file')} Weekly Study Plan</h2>${files.length ? html`<div class="list">${files.map(f => html`<div class="item"><span class="pt-ic">${ico('file')}</span><div class="grow"><div class="t">Semana de ${fmtDateShort(f.weekStart)} a ${fmtDateShort(f.weekEnd)}</div></div>${linkBtn(f.assetId ? blobUrl(f.assetId) : f.url, 'Abrir PDF', 'file')}</div>`)}</div>` : html`<p class="muted small" style="margin:0">O PDF do seu plano semanal aparece aqui quando sua professora publicar.</p>`}</section>
  ${p ? html`<section class="pt-card"><h2>${ico('plan')} Atividades da semana</h2><p class="small muted" style="margin:0 0 8px">${fmtDateShort(p.weekStart)} a ${fmtDateShort(p.weekEnd)}</p><div class="pt-days">${DAY_KEYS.map((k, i) => { const as = (p.days || {})[k] || []; return as.length ? html`<div><b class="small">${dayNames[i]} ${fmtDateShort(addDays(p.weekStart, i))}</b>${as.map(a => html`<div class="small ${a.status === 'concluida' ? 'muted' : ''}" style="${a.status === 'concluida' ? 'text-decoration:line-through' : ''}">${a.title}${a.minutes ? ' · ' + a.minutes + ' min' : ''}</div>`)}</div>` : ''; })}</div></section>` : ''}`;
}
function ptGuide(d) {
  const g = d.guide || {}, tl = list => (list || []).filter(x => x.url).map(x => html`<li><a href="${x.url}" target="_blank" rel="noopener noreferrer">${x.title}</a>${x.pass ? html` <span class="small muted">· senha: <code>${x.pass}</code></span>` : ''}</li>`);
  const plat = (title, ic, bodyHtml) => html`<section class="pt-card"><h2>${ico(ic)} ${title}</h2>${bodyHtml}</section>`;
  const zoomOn = g.zoomUrl || g.zoomId || g.zoomPass || (g.zoomTutorials || []).length, clsOn = g.classroomUrl || (g.classroomTutorials || []).length, camOn = g.cambridgeUrl || g.cambridgeKey || (g.cambridgeTutorials || []).length;
  return html`<section class="pt-card pt-guide-h"><h2>Student’s Guide</h2><p class="small muted" style="margin:0 0 10px">Tudo o que você precisa saber para começar as aulas de inglês!</p><div class="pre">${g.welcome}</div></section>
  ${zoomOn ? plat('Zoom', 'video', html`<p class="small" style="margin:0 0 8px">Aqui acontecem as nossas aulas ao vivo. Baixe o Zoom no computador, celular ou tablet e crie uma conta. Sugestão: use o computador.</p>${g.zoomUrl ? html`<p style="margin:0 0 8px">${linkBtn(g.zoomUrl, 'Link da sala', 'video')}</p>` : ''}<dl class="kv">${g.zoomId ? html`<dt>ID da reunião</dt><dd>${g.zoomId}</dd>` : ''}${g.zoomPass ? html`<dt>Senha</dt><dd>${g.zoomPass}</dd>` : ''}</dl>${(g.zoomTutorials || []).length ? html`<ul class="pt-links">${tl(g.zoomTutorials)}</ul>` : ''}`) : ''}
  ${clsOn ? plat('Google Classroom', 'book', html`<p class="small" style="margin:0 0 8px">É a nossa sala de aula: slides, áudios, vídeos, weekly planner e outros documentos. Use o e-mail que você mais acessa, pois é nele que chegam as notificações.</p>${g.classroomUrl ? html`<p style="margin:0 0 8px">${linkBtn(g.classroomUrl, 'Link do convite', 'link')}</p>` : ''}${(g.classroomTutorials || []).length ? html`<ul class="pt-links">${tl(g.classroomTutorials)}</ul>` : ''}`) : ''}
  ${camOn ? plat('Cambridge One', 'check', html`<p class="small" style="margin:0 0 8px">Site oficial da Cambridge para as atividades online de cada aula.</p>${g.cambridgeUrl ? html`<p style="margin:0 0 8px">${linkBtn(g.cambridgeUrl, 'Abrir o site', 'link')}</p>` : ''}${g.cambridgeKey ? html`<dl class="kv"><dt>Class key</dt><dd>${g.cambridgeKey}</dd></dl>` : ''}${(g.cambridgeTutorials || []).length ? html`<ul class="pt-links">${tl(g.cambridgeTutorials)}</ul>` : ''}`) : ''}
  ${(g.tips || []).length ? html`<section class="pt-card"><h2>${ico('target')} Para as aulas</h2><div class="pt-acc">${g.tips.map((t, i) => html`<details><summary><b>${i + 1}. ${t.title}</b></summary><div class="pt-rep"><div class="pre">${t.text}</div></div></details>`)}</div></section>` : ''}
  ${(g.tutorials || []).length ? plat('Tutoriais', 'pencil', html`<ul class="pt-links">${tl(g.tutorials)}</ul>`) : ''}
  ${(g.docs || []).length || g.payInfo ? plat('Documentos', 'contract', html`${(g.docs || []).length ? html`<ul class="pt-links">${tl(g.docs)}</ul>` : ''}${g.payInfo ? html`<h3 class="small muted" style="margin:14px 0 4px;font-weight:700">INFORMAÇÕES DE CONTA</h3><div class="pre">${g.payInfo}</div>` : ''}`) : ''}`;
}
function ptData(d) {
  const p = d.profile || {}, ct = d.contract, cal = d.calendar || {};
  return html`<section class="pt-card"><h2>${ico('calendar')} Calendar</h2>${cal.url ? html`<p style="margin:0 0 8px">${linkBtn(cal.url, 'Abrir calendário', 'calendar')}</p>${cal.note ? html`<p class="small pre" style="margin:0">${cal.note}</p>` : ''}` : html`<p class="muted small" style="margin:0">O link do seu calendário de aulas aparece aqui quando sua professora publicar.</p>`}</section>
  <section class="pt-card"><h2>${ico('contract')} ${G() ? 'Contrato' : 'Meu contrato'}</h2>${ct ? html`<dl class="kv"><dt>Plano</dt><dd>${ct.typeName || labelOf(CONTRACT_TYPES, ct.type)}</dd><dt>Período</dt><dd>${fmtDate(ct.startDate)}${ct.endDate ? ' a ' + fmtDate(ct.endDate) : ''}</dd>${ct.totalLessons ? html`<dt>Aulas contratadas</dt><dd>${ct.totalLessons}</dd>` : ''}${ct.signedDate ? html`<dt>Assinado em</dt><dd>${fmtDate(ct.signedDate)}</dd>` : ''}${ct.notes ? html`<dt>Observações</dt><dd class="pre">${ct.notes}</dd>` : ''}</dl>${ct.assetId ? html`<p style="margin:12px 0 0">${linkBtn(blobUrl(ct.assetId), 'Abrir contrato' + (ct.fileName ? ' (' + ct.fileName.slice(0, 26) + ')' : ''), 'contract')}</p>` : html`<p class="small muted" style="margin:10px 0 0">O arquivo do contrato ainda não foi anexado.</p>`}` : html`<p class="muted small" style="margin:0">Nenhum contrato publicado ainda.</p>`}</section>
  <section class="pt-card"><h2>${ico('users')} ${G() ? 'Cadastro do aluno' : 'Meu cadastro'}</h2><dl class="kv"><dt>Nome</dt><dd>${p.name}</dd>${p.email ? html`<dt>E-mail</dt><dd>${p.email}</dd>` : ''}${p.phone ? html`<dt>Telefone</dt><dd>${p.phone}</dd>` : ''}${p.birth ? html`<dt>Nascimento</dt><dd>${fmtDate(p.birth)}</dd>` : ''}${p.level ? html`<dt>Nível</dt><dd>${p.level}</dd>` : ''}${p.courseType ? html`<dt>Curso</dt><dd>${p.courseType}</dd>` : ''}${p.frequency ? html`<dt>Frequência</dt><dd>${p.frequency}, ${p.duration} min</dd>` : ''}${(p.schedule || []).length ? html`<dt>Horários</dt><dd>${p.schedule.map(x => dayNames[x.day] + ' ' + x.time).join(' · ')}</dd>` : ''}${p.goals ? html`<dt>Objetivos</dt><dd class="pre">${p.goals}</dd>` : ''}</dl><p class="tiny muted" style="margin:10px 0 0">Algum dado errado? Fale com a sua professora.</p></section>`;
}
function portalView(d) {
  if (!d) return html`<div class="card">${empty('Seu painel ainda não foi liberado', 'Sua professora ainda não publicou o seu painel. Assim que ela concluir a liberação, tudo aparece aqui.')}</div>`;
  const tab = PT_TABS.some(t => t[0] === UI.ptTab) ? UI.ptTab : 'inicio';
  const pend = (() => { const sub = S.mode === 'aluno' ? subItems() : (PT_PREVIEW.sub || {}), ret = S.mode === 'aluno' ? retItems() : {}; return (d.homework || []).filter(h => ['pendente', 'atrasada', 'refazer'].includes(hwKeyStudent(h, sub, ret, todayISO()))).length; })();
  const body = { inicio: ptHome, homework: dd => html`<section class="pt-card"><h2>${ico('pencil')} Homework</h2><p class="small muted" style="margin:0 0 10px">Abra uma atividade para fazer o documento, salvar e entregar. A professora corrige e devolve aqui.</p>${ptHwList(dd).html}</section>`, aulas: ptClasses, gravacoes: ptRecordings, progresso: ptProgress, materiais: ptMaterials, plano: ptPlan, guia: ptGuide, dados: ptData }[tab](d);
  return html`${bannerHtml(d.banner)}<nav class="pt-tabs" role="tablist" aria-label="Seções do painel">${PT_TABS.map(([k, l, ic]) => html`<button type="button" role="tab" aria-selected="${tab === k}" data-act="pt-tab" data-tab="${k}">${ico(ic)}<span>${l}</span>${k === 'homework' && pend ? html`<i class="cnt">${pend}</i>` : ''}</button>`)}</nav><div class="pt-stack">${body}</div>`;
}
function portalPage() {
  if (S.portal && S.portal.guardian) return guardianPage();
  const d = S.portal, first = d && d.name ? d.name.split(' ')[0] : '';
  const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  return html`<div class="pt-wrap"><header class="pt-head"><img src="${LOGO}" alt="Logo Teacher Gabriela Campos"><div class="grow"><div class="pt-brand">${BRAND.name}</div><small>${BRAND.sub}</small></div><button type="button" class="icon-btn" data-act="toggle-theme" aria-label="Alternar tema claro e escuro">${ico(dark ? 'sun' : 'moon')}</button></header>
  <div class="pt-hello"><h1>${d ? `Olá, ${first}!` : 'Bem-vindo(a)!'}</h1>${d && d.level ? html`<p>Seu nível: ${badge(d.level, 'acc')}</p>` : ''}${S.syncError ? html`<p class="small" style="color:var(--bad)">Sem conexão com o servidor. Os dados abaixo podem estar desatualizados.</p>` : ''}${d && d.updatedAt ? html`<p class="tiny muted">Atualizado em ${fmtDT(d.updatedAt)}</p>` : ''}</div>
  ${portalView(d)}<footer class="pt-foot">${BRAND.name} · ${BRAND.sub}</footer></div>`;
}

/* =================== PDF DO PLANO E DO CONTRATO =================== */
CHANGES['plan-pdf'] = async (v, t) => {
  const p = M.plans.get(t.dataset.id), file = t.files && t.files[0]; if (!p || !file) return;
  try {
    const id = await uploadFile(file);
    await releaseAsset(p.pdfAssetId);
    await put('plans', { ...p, pdfAssetId: id, pdfName: file.name }); toast('PDF do plano anexado.' + (M.students.get(p.studentId) && M.students.get(p.studentId).accountId ? ' O aluno já pode abrir.' : ''), 'ok');
  } catch (e) { toast('Não foi possível anexar: ' + errMsg(e), 'err'); }
};
ACTIONS['plan-url-save'] = async d => {
  const p = M.plans.get(d.id), u = ($('#plan-url').value || '').trim(); if (!p) return;
  if (u && !isHttpUrl(u)) { toast('O link precisa começar com https://', 'err'); return; }
  await put('plans', { ...p, pdfUrl: u }); toast(u ? 'Link do plano salvo.' : 'Link removido.', 'ok');
};
ACTIONS['plan-pdf-rm'] = async d => {
  const p = M.plans.get(d.id); if (!p || !await confirmBox({ title: 'Remover o PDF do plano?', message: 'O aluno deixa de ver o arquivo.', danger: true, ok: 'Remover' })) return;
  await releaseAsset(p.pdfAssetId);
  await put('plans', { ...p, pdfAssetId: '', pdfName: '' }); toast('PDF removido.', 'ok');
};
const planPdfCard = p => html`<div class="card" style="margin-bottom:var(--gap)"><div class="row"><b>${ico('file')} PDF do plano (modelo Weekly Study Plan)</b><span class="spacer"></span>
  ${p.pdfAssetId ? html`<a class="btn sm" href="${blobUrl(p.pdfAssetId)}" target="_blank" rel="noopener">Abrir ${String(p.pdfName || 'PDF').slice(0, 24)}</a>${btn('Remover', 'plan-pdf-rm', { cls: 'sm', data: { id: p.id } })}` : ''}
  ${NS.assets ? html`<label class="btn sm primary" style="cursor:pointer">${ico('upload')} ${p.pdfAssetId ? 'Trocar PDF' : 'Anexar PDF'}<input type="file" accept="application/pdf" data-change="plan-pdf" data-id="${p.id}" style="display:none" aria-label="Anexar PDF do plano"></label>` : html`<span class="small muted">Envio de arquivos exige permissão de edição.</span>`}</div>
  <div class="row" style="margin-top:10px"><input id="plan-url" type="url" value="${p.pdfUrl || ''}" placeholder="Ou cole um link (Google Drive, Canva…) https://…" aria-label="Link do plano" style="flex:1;min-width:200px">${btn('Salvar link', 'plan-url-save', { cls: 'sm', data: { id: p.id } })}</div>
  <p class="small muted" style="margin:6px 0 0">Monte o plano no seu modelo (veja "Modelos" na Biblioteca), exporte em PDF e anexe aqui. O aluno abre o PDF na aba "Plano da semana".${(M.students.get(p.studentId) || {}).accountId ? '' : ' (A conta do aluno ainda não está vinculada.)'}</p></div>`;
CHANGES['ct-upload'] = async (v, t) => {
  const c = M.contracts.get(t.dataset.id), file = t.files && t.files[0]; if (!c || !file) return;
  try {
    const id = await uploadFile(file);
    if (c.assetId && NS.assets) { try { await NS.assets.delete(c.assetId); } catch (e) { /* já removido */ } }
    await put('contracts', { ...c, assetId: id, fileName: file.name }); toast('Arquivo do contrato anexado.', 'ok');
  } catch (e) { toast('Não foi possível anexar: ' + errMsg(e), 'err'); }
};
ACTIONS['ct-file-rm'] = async d => {
  const c = M.contracts.get(d.id); if (!c || !await confirmBox({ title: 'Remover o arquivo do contrato?', message: 'O contrato continua cadastrado, só o arquivo é apagado.', danger: true, ok: 'Remover' })) return;
  if (c.assetId && NS.assets) { try { await NS.assets.delete(c.assetId); } catch (e) { /* ignora */ } }
  await put('contracts', { ...c, assetId: '', fileName: '' }); toast('Arquivo removido.', 'ok');
};

/* =================== MODELOS NA BIBLIOTECA =================== */
const MODEL_DOCS = [
  { title: 'Weekly Study Plan (modelo)', desc: 'Modelo do plano semanal: cards por atividade e Daily Planner. Use para montar o PDF de cada aluno.', assetId: '1d7ebd62c3036f90fdbc80730654b42b', fileName: 'Modelo-Weekly-Study-Plan.pdf' },
  { title: 'Banner Google Classroom (modelo)', desc: 'Banner horizontal com nome do curso e do aluno, para o topo do Classroom.', assetId: '94b08642a3751265c84591c487b6d3ed', fileName: 'Modelo-Banner-Google-Classroom.pdf' },
  { title: "Student's Guide (exemplo: Gustavo)", desc: "Guia do aluno usado como base da aba Student\'s Guide. Contém dados de um aluno real: não compartilhe.", assetId: '18b9138963ee198b97eaf9c9964e249b', fileName: 'Students-Guide-Gustavo.pdf' },
  { title: 'Report Card (modelo Evolve Level 2)', desc: 'Student Progress Report em português, com blocos de evolução.', assetId: '3be3c9523186d7013b8c9bc66e303755', fileName: 'Report-Card-E2.pdf' },
  { title: 'Holidays Challenge (modelo)', desc: 'Desafio de férias com quatro semanas e tarefas de listening, reading, writing e speaking.', assetId: 'dafc556792787d8c5782d2915864652e', fileName: 'Modelo-Holidays-Challenge.pdf' },
  { title: 'Datas especiais (modelo)', desc: 'Cartões de Natal, Ano Novo, Thanksgiving e férias.', assetId: '898667e11c8750239d7c136abe65ee53', fileName: 'Modelo-Datas-especiais.pdf' },
  { title: 'Birthday (modelo)', desc: 'Cartão de aniversário para o aluno.', assetId: '125d1b9bd9c58ceaaeb5bae1aa36b35d', fileName: 'Modelo-Birthday.pdf' },
  { title: 'Back to school (modelo)', desc: 'Slides de volta às aulas, boas-vindas e despedida.', assetId: '3f32e94c2cce054bae4d1a6f017d13ae', fileName: 'Modelo-Back-to-school.pdf' }
];
async function seedModels() {
  if (window.__NOSEED || S.seeding || S.settings.modelsSeeded || !MODEL_DOCS.length || S.mode !== 'professora') return;
  S.seeding = true;
  try {
    for (const m of MODEL_DOCS) if (!S.materials.some(x => x.assetId === m.assetId)) await put('materials', { title: m.title, category: 'modelo', skill: '', level: '', description: m.desc, link: '', tags: ['modelo', 'minha identidade'], studentIds: [], assetId: m.assetId, fileName: m.fileName, showStudent: false, createdAt: nowKey() });
    await saveSettings({ modelsSeeded: true }); toast('Seus modelos de documentos foram adicionados à Biblioteca (categoria "Modelos").', 'ok');
  } catch (e) { console.error(e); } finally { S.seeding = false; }
}

/* =================== ÁREA DO ALUNO (gestão) — complemento =================== */
ACTIONS['copy-link'] = async () => { try { await navigator.clipboard.writeText(APP_URL); toast('Link copiado.', 'ok'); } catch (e) { toast('Não foi possível copiar sozinho. Selecione e copie o link na caixa.', 'err'); const i = $('#share-url'); if (i) { i.focus(); i.select(); } } };
const shareCard = () => html`<div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h2>${ico('link')} Link para o aluno</h2></div>
  <div class="row"><input id="share-url" type="text" readonly value="${APP_URL}" aria-label="Link do sistema" style="flex:1;min-width:200px">${btn('Copiar link', 'copy-link', { cls: 'primary', icon: 'copy' })}</div>
  <p class="small muted" style="margin:10px 0 0">É o mesmo link do sistema: quem entra com a conta vinculada cai direto no painel dele (slides e materiais, homework, plano semanal em PDF, contrato, cadastro e Student's Guide). Só o seu e-mail abre a área da professora. O aluno precisa ser convidado em <b>Compartilhar</b> com permissão de <b>colaborar</b> (para poder entregar homework), sem permissão de editar.</p></div>`;

/* =================== AVISO DE ENTREGAS (sino) =================== */
const unseenDeliveries = () => S.homework.filter(h => h.status === 'pendente_correcao' && h.subAt && (!h.seenAt || h.seenAt < h.subAt)).sort((a, b) => cmpStr(b.subAt, a.subAt));
const waitingCorrection = () => S.homework.filter(h => h.status === 'pendente_correcao').sort((a, b) => cmpStr(String(b.subAt || b.deliveredDate), String(a.subAt || a.deliveredDate)));
function updateBell() {
  const b = $('#bell'); if (!b) return; const n = unseenDeliveries().length, w = waitingCorrection().length;
  b.innerHTML = ico('send').s + (n ? `<i class="cnt">${n}</i>` : '');
  b.setAttribute('aria-label', n ? `${n} nova(s) entrega(s) de homework` : w ? `${w} homework(s) esperando correção` : 'Nenhuma entrega nova');
}
ACTIONS['bell-open'] = () => {
  const list = waitingCorrection(), un = new Set(unseenDeliveries().map(h => h.id));
  openModal({
    title: 'Entregas de homework', body: list.length ? html`<div class="list">${list.map(h => html`<div class="item"><div class="grow"><div class="t">${h.title} ${un.has(h.id) ? badge('Nova', 'acc') : ''}</div><div class="small muted">${stName(h.studentId)} · ${h.subAt ? fmtStamp(h.subAt) : fmtDate(h.deliveredDate)}</div></div>${btn('Corrigir', subOf(h) ? 'cor-open' : 'hw-open', { cls: 'sm primary', data: { id: h.id } })}</div>`)}</div>` : html`<p class="muted" style="margin:0">Nenhum homework esperando correção.</p>`,
    footer: un.size ? html`<span class="spacer"></span>${btn('Marcar todas como vistas', 'bell-seen')}` : ''
  });
};
ACTIONS['bell-seen'] = async () => { for (const h of unseenDeliveries()) await put('homework', { ...h, seenAt: stamp() }); closeAllModals(); };

/* =================== GRAVAÇÕES DAS AULAS =================== */
function ptRecordings(d) {
  const rs = d.recordings || [];
  return html`<section class="pt-card"><h2>${ico('video')} Gravações das aulas</h2>${rs.length ? html`<div class="list">${rs.map(r => { const u = r.assetId ? blobUrl(r.assetId) : r.url; return html`<div class="item"><span class="pt-ic">${ico('video')}</span><div class="grow"><div class="t">${r.title}</div><div class="small muted">${r.date ? fmtDate(r.date) : ''}${r.note ? ' · ' + r.note : ''}</div></div>${u ? html`<a class="btn sm primary" href="${u}" target="_blank" rel="noopener noreferrer">${ico('video')} Assistir</a>` : ''}</div>`; })}</div>` : html`<p class="muted small" style="margin:0">As gravações das suas aulas aparecem aqui quando sua professora as liberar.</p>`}</section>`;
}
function openRecordingForm(id, opts) {
  opts = opts || {};
  const old = id ? M.recordings.get(id) : null, l = M.lessons.get(old ? old.lessonId : opts.lesson);
  const r = old || { studentId: opts.student || (l && l.studentId) || '', lessonId: l ? l.id : '', title: l ? (l.topic || 'Aula') + ' - ' + fmtDate(l.date) : '', date: l ? l.date : todayISO(), url: '', note: '', shared: true };
  openModal({
    title: old ? 'Editar gravação' : 'Nova gravação', wide: true, form: { name: 'recording', id: id || '', data: { 'data-lesson': r.lessonId || '' } }, body: html`
    ${opts.studentIds ? html`<div class="fld"><span>Alunos da turma que recebem esta gravação</span>${checks('studentIds', opts.studentIds.map(i => [i, stName(i)]), opts.studentIds)}</div>${fld('Data da aula', input('date', r.date, { type: 'date' }))}` : html`<div class="g2">${fld('Aluno *', select('studentId', studentOptions({ keep: r.studentId, blank: 'Escolha o aluno…', includeInactive: true }), r.studentId, { a: { required: true } }))}${fld('Data da aula', input('date', r.date, { type: 'date' }))}</div>`}
    ${fld('Título *', input('title', r.title, { a: { required: true, maxlength: 140 } }))}
    ${fld('Link da gravação (Zoom, Google Drive, YouTube não listado…)', input('url', r.url, { type: 'url', a: { placeholder: 'https://…' } }), { hint: 'Gravações costumam ser grandes: o mais prático é colar o link da nuvem do Zoom ou do Drive.' })}
    ${NS.assets ? fld('Ou envie o arquivo (até 20 MB)', html`<input type="file" name="rfile" accept="video/*,audio/*">`, { hint: r.assetId ? 'Arquivo atual: ' + (r.fileName || 'anexo') + '. Enviar outro substitui.' : '' }) : ''}
    ${fld('Recado para o aluno (opcional)', textarea('note', r.note, { rows: 2 }))}
    <label class="chk"><input type="checkbox" name="shared" value="1"${r.shared !== false ? raw(' checked') : ''}> Mostrar na área do aluno</label>`
  });
}
FORMS.recording = async (v, f, ds) => {
  const old = ds.id ? M.recordings.get(ds.id) : null;
  const many = !old && Array.isArray(v.studentIds) ? v.studentIds : null;
  if (!many && !v.studentId) { toast('Escolha o aluno.', 'err'); return; }
  if (many && !many.length) { toast('Marque pelo menos um aluno da turma.', 'err'); return; }
  const url = v.url.trim(); if (url && !isHttpUrl(url)) { toast('O link precisa começar com https://', 'err'); return; }
  let assetId = old ? old.assetId || '' : '', fileName = old ? old.fileName || '' : '';
  const file = f.elements.rfile && f.elements.rfile.files[0];
  if (file) { try { assetId = await uploadFile(file); fileName = file.name; } catch (e) { toast('Não foi possível enviar o arquivo: ' + errMsg(e), 'err'); return; } }
  if (!url && !assetId) { toast('Cole o link da gravação ou envie um arquivo.', 'err'); return; }
  if (many) { for (const sid of many) await put('recordings', { studentId: sid, lessonId: '', title: v.title.trim(), date: v.date, url, assetId, fileName, note: v.note, shared: v.shared === '1', createdAt: nowKey() }); closeAllModals(); toast('Gravação enviada para ' + many.length + ' aluno(s) da turma.', 'ok'); return; }
  await put('recordings', { ...(old || { createdAt: nowKey() }), studentId: v.studentId, lessonId: ds.lesson || (old && old.lessonId) || '', title: v.title.trim(), date: v.date, url, assetId, fileName, note: v.note, shared: v.shared === '1' });
  closeAllModals(); toast('Gravação salva.' + (v.shared === '1' && (M.students.get(v.studentId) || {}).accountId ? ' O aluno já pode assistir.' : ''), 'ok');
};
ACTIONS['rec-new'] = d => { closeAllModals(); openRecordingForm(null, { student: d && d.student, lesson: d && d.lesson, studentIds: d && d.ids ? d.ids.split(',') : null }); };
ACTIONS['rec-edit'] = d => openRecordingForm(d.id);
ACTIONS['rec-del'] = async d => {
  const r = M.recordings.get(d.id); if (!r || !await confirmBox({ title: 'Excluir gravação?', message: r.assetId ? 'O arquivo enviado também será apagado.' : 'Só o registro é removido; o link original continua existindo.', danger: true, ok: 'Excluir' })) return;
  await releaseAsset(r.assetId);
  await del('recordings', d.id); toast('Gravação excluída.', 'ok');
};
ACTIONS['rec-toggle'] = async d => { const r = M.recordings.get(d.id); if (r) await put('recordings', { ...r, shared: r.shared === false }); };
VIEWS.gravacoes = () => {
  const f = getF('rec', { student: '' });
  const rows = S.recordings.filter(r => !f.student || r.studentId === f.student).sort((a, b) => cmpStr(b.date || '', a.date || ''));
  return html`${pageHead('Gravações das Aulas', 'Links ou arquivos das aulas gravadas. O aluno assiste na aba "Gravações" do painel dele.', btn('Nova gravação', 'rec-new', { cls: 'primary', icon: 'plus', data: { student: f.student } }))}
  <div class="filters">${select('student', studentOptions({ blank: 'Todos os alunos', includeInactive: true }), f.student, { id: 'rec-st', a: { 'data-change': 'filter', 'data-page': 'rec', 'data-key': 'student', 'aria-label': 'Aluno' } })}</div>
  ${rows.length ? html`<div class="tablewrap"><table class="tbl"><thead><tr><th>Data</th><th>Aluno</th><th>Gravação</th><th>Aluno vê</th><th></th></tr></thead><tbody>
  ${rows.map(r => { const u = r.assetId ? blobUrl(r.assetId) : r.url; return html`<tr><td class="nowrap">${r.date ? fmtDate(r.date) : '—'}</td><td>${stName(r.studentId)}</td><td><b>${r.title}</b> ${demoTag(r)}${u ? html`<div class="small"><a href="${u}" target="_blank" rel="noopener">Abrir gravação</a></div>` : ''}</td><td>${r.shared === false ? badge('Oculta', '') : badge('Visível', 'ok')}${r.shared !== false && !(M.students.get(r.studentId) || {}).accountId ? html` <span class="small muted">sem conta vinculada</span>` : ''}</td>
    <td class="acts">${btn(r.shared === false ? 'Mostrar' : 'Ocultar', 'rec-toggle', { cls: 'sm', data: { id: r.id } })}${iconBtn('edit', 'rec-edit', 'Editar', { id: r.id })}${iconBtn('trash', 'rec-del', 'Excluir', { id: r.id }, 'danger')}</td></tr>`; })}</tbody></table></div>`
    : empty('Nenhuma gravação ainda', 'Cole o link da gravação de uma aula (Zoom, Drive…) para o aluno rever o conteúdo.', btn('Adicionar gravação', 'rec-new', { cls: 'primary', icon: 'plus' }))}`;
};

/* =================== CALENDAR (link do documento) =================== */
ACTIONS['cal-edit'] = d => {
  const s = M.students.get(d.id); if (!s) return;
  openModal({ title: 'Calendar de ' + s.name.split(' ')[0], narrow: true, form: { name: 'calurl', id: d.id }, body: html`
    ${fld('Link do documento do calendário', input('calendarUrl', s.calendarUrl, { type: 'url', a: { placeholder: 'https://…' } }), { hint: 'Google Calendar, Google Docs/Sheets, Canva, Drive… Deixe vazio para remover.' })}
    ${fld('Recado para o aluno (opcional)', textarea('calendarNote', s.calendarNote, { rows: 2 }))}` });
};
FORMS.calurl = async (v, f, ds) => {
  const s = M.students.get(ds.id); if (!s) return; const u = v.calendarUrl.trim();
  if (u && !isHttpUrl(u)) { toast('O link precisa começar com https://', 'err'); return; }
  await put('students', { ...s, calendarUrl: u, calendarNote: v.calendarNote });
  closeModal(); toast(u ? 'Link do calendário salvo.' + (s.accountId ? ' O painel do aluno será atualizado.' : ' Vincule a conta do aluno para ele ver.') : 'Link do calendário removido.', 'ok');
};

/* =================== TURMAS =================== */
function openGroupForm(id) {
  const old = id ? M.groups.get(id) : null, g = old || { name: '', zoomUrl: '', zoomNote: '', calendarUrl: '', calendarNote: '', bannerTitle: '' };
  openModal({
    title: old ? 'Editar turma' : 'Nova turma', wide: true, form: { name: 'group', id: id || '' }, body: html`
    ${fld('Nome da turma *', input('name', g.name, { a: { required: true, maxlength: 80, placeholder: 'Ex.: Turma Kids quarta 17h' } }))}
    <div class="g2">${fld('Link do Zoom da turma', input('zoomUrl', g.zoomUrl, { type: 'url', a: { placeholder: 'https://zoom.us/j/…' } }))}${fld('Recado do Zoom (ID, senha…)', textarea('zoomNote', g.zoomNote, { rows: 2 }))}</div>
    <div class="g2">${fld('Link do documento do Calendar da turma', input('calendarUrl', g.calendarUrl, { type: 'url', a: { placeholder: 'https://…' } }))}${fld('Recado do Calendar', textarea('calendarNote', g.calendarNote, { rows: 2 }))}</div>
    ${fld('Título padrão do banner (para quem não tiver um próprio)', input('bannerTitle', g.bannerTitle, { a: { maxlength: 60, placeholder: 'Ex.: Kids Class' } }))}
    <p class="hint">Zoom e Calendar da turma só valem enquanto o aluno estiver nela. Se um aluno tiver link próprio de Zoom ou Calendar, o dele vale no lugar.</p>`
  });
}
FORMS.group = async (v, f, ds) => {
  const old = ds.id ? M.groups.get(ds.id) : null, name = v.name.trim(); if (!name) { toast('Dê um nome à turma.', 'err'); return; }
  for (const k of ['zoomUrl', 'calendarUrl']) if (v[k].trim() && !isHttpUrl(v[k].trim())) { toast('Os links precisam começar com https://', 'err'); return; }
  const id = await put('groups', { ...(old || { createdAt: nowKey(), guide: {} }), name, zoomUrl: v.zoomUrl.trim(), zoomNote: v.zoomNote, calendarUrl: v.calendarUrl.trim(), calendarNote: v.calendarNote, bannerTitle: v.bannerTitle.trim() });
  closeModal(); toast(old ? 'Turma atualizada.' : 'Turma criada. Agora escolha os alunos em "Membros".', 'ok');
  if (!old) openMembers(id);
};
ACTIONS['grp-new'] = () => openGroupForm();
ACTIONS['grp-edit'] = d => openGroupForm(d.id);
const membersOf = gid => S.students.filter(s => s.groupId === gid && !s.archived).sort((a, b) => cmpStr(a.name, b.name));
function openMembers(gid) {
  const g = M.groups.get(gid); if (!g) return;
  const all = S.students.filter(s => !s.archived && (s.status !== 'inativo' || s.groupId === gid)).sort((a, b) => cmpStr(a.name, b.name));
  openModal({
    title: 'Membros de ' + g.name, narrow: true, form: { name: 'members', id: gid }, body: html`
    <div class="fld"><span>Alunos da turma <small class="muted">(um aluno só pode estar em uma turma)</small></span>${checks('ids', all.map(s => [s.id, s.name + (s.groupId && s.groupId !== gid && M.groups.get(s.groupId) ? ' (hoje em ' + M.groups.get(s.groupId).name + ': será movido)' : '')]), all.filter(s => s.groupId === gid).map(s => s.id), 'checks scrollbox')}</div>
    <p class="hint">Quem você desmarcar sai da turma e perde só o Zoom e o Calendar dela. Materiais, gravações, homeworks, planos e relatórios já enviados continuam com o aluno.</p>`
  });
}
ACTIONS['grp-members'] = d => openMembers(d.id);
FORMS.members = async (v, f, ds) => {
  const sel = new Set(v.ids || []); let moved = 0, left = 0;
  for (const s of S.students) {
    if (sel.has(s.id) && s.groupId !== ds.id) { await put('students', { ...s, groupId: ds.id }); moved++; }
    else if (!sel.has(s.id) && s.groupId === ds.id) { await put('students', { ...s, groupId: '' }); left++; }
  }
  closeModal(); toast(`Turma atualizada: ${moved} entrou(entraram), ${left} saiu(saíram).`, 'ok');
};
ACTIONS['grp-del'] = async d => {
  const g = M.groups.get(d.id); if (!g) return; const mem = membersOf(d.id);
  if (!await confirmBox({ title: 'Excluir a turma?', message: `${mem.length} aluno(s) saem da turma e perdem o Zoom e o Calendar dela. Todo o resto continua com cada aluno.`, danger: true, ok: 'Excluir turma' })) return;
  for (const s of mem) await put('students', { ...s, groupId: '' });
  await del('groups', d.id); toast('Turma excluída.', 'ok');
};
VIEWS.turmas = () => {
  const list = [...S.groups].sort((a, b) => cmpStr(a.name, b.name));
  return html`${pageHead('Turmas', 'Agrupe alunos que têm aula juntos. Zoom e Calendar da turma valem para todos; o resto continua individual (entregas, notas, contrato, cadastro, financeiro).', btn('Nova turma', 'grp-new', { cls: 'primary', icon: 'plus' }))}
  ${list.length ? html`<div class="cards">${list.map(g => { const mem = membersOf(g.id), ids = mem.map(s => s.id).join(','); return html`<div class="card"><div class="row"><b style="font-size:17px">${g.name}</b><span class="spacer"></span>${badge(mem.length + ' aluno(s)', mem.length ? 'acc' : 'warn')}</div>
    <div class="small muted" style="margin:6px 0">${mem.length ? mem.map(s => s.name.split(' ')[0]).join(', ') : 'Nenhum aluno ainda'}</div>
    <div class="row" style="margin-bottom:10px">${isHttpUrl(g.zoomUrl) ? badge('Zoom da turma', 'ok') : badge('Sem Zoom', '')}${isHttpUrl(g.calendarUrl) ? badge('Calendar da turma', 'ok') : badge('Sem Calendar', '')}</div>
    <div class="row">${btn('Membros', 'grp-members', { cls: 'sm primary', icon: 'users', data: { id: g.id } })}${btn('Zoom e Calendar', 'grp-edit', { cls: 'sm', icon: 'edit', data: { id: g.id } })}${btn('Guia da turma', 'guide-edit', { cls: 'sm', icon: 'key', data: { group: g.id } })}${iconBtn('trash', 'grp-del', 'Excluir turma', { id: g.id }, 'danger')}</div>
    ${mem.length ? html`<h4 class="small muted" style="margin:14px 0 6px;font-weight:700">ENVIAR PARA TODOS DA TURMA</h4><div class="row">${btn('Homework', 'hw-new', { cls: 'sm', data: { ids } })}${btn('Material', 'mat-new-group', { cls: 'sm', data: { ids } })}${btn('Gravação', 'rec-new', { cls: 'sm', data: { ids } })}${btn('PDF do plano', 'plan-new', { cls: 'sm', data: { ids } })}</div><p class="tiny muted" style="margin:8px 0 0">Cada aluno recebe a sua própria cópia: entregas e notas são só dele.</p>` : ''}</div>`; })}</div>`
    : empty('Nenhuma turma criada', 'Crie uma turma para aulas em grupo: o Zoom e o Calendar valem para todos os alunos dela, e você pode enviar homework, material, gravação e PDF do plano para todos de uma vez.', btn('Criar turma', 'grp-new', { cls: 'primary', icon: 'plus' }))}`;
};
