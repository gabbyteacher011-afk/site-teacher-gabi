import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
with sync_playwright() as p:
    t = T(p); pg = t.pg
    t.btn('Carregar dados de demonstração'); t.btn('Carregar', exact=True)
    pg.wait_for_function("document.querySelector('#main').innerText.includes('Ana Beatriz')", timeout=30000)
    pg.wait_for_timeout(1500)
    t.ok(t.count('contracts')==2, 'demo: 2 contratos'); t.ok(t.count('stages')>=18, 'demo: etapas %d'%t.count('stages'))
    for r in ['contratos','relaula','portal']:
        t.go(r); tx=t.text(); t.ok('Não foi possível montar' not in tx and len(tx)>120, 'rota '+r)
    t.go('contratos'); tx=t.text()
    t.ok('Linha de evolução' in tx and 'Cronograma do ano' in tx and 'Etapas concluídas' in tx, 'contrato mostra evolução e cronograma')
    t.ok(pg.locator('#main svg').count()>0, 'gráfico de evolução renderiza')
    # mudar status de etapa
    sel = pg.locator('select[data-change="stage-status"]').nth(4); sel.select_option('concluida'); pg.wait_for_timeout(400)
    st=[v for k,v in t.store().items() if '/stages/' in k and v.get('status')=='concluida' and v.get('completedDate')]
    t.ok(len(st)>=1, 'etapa concluída grava data')
    # zoom inválido
    sid=[k.split('/')[-1] for k,v in t.store().items() if '/students/' in k and v['name'].startswith('Mariana')][0]
    t.go('aluno-'+sid); pg.get_by_role('tab', name='Contrato e evolução').click(); pg.wait_for_timeout(200)
    t.ok('Nenhum contrato cadastrado' in t.text(), 'aba sem contrato mostra vazio com ação')
    t.btn('Adicionar link'); pg.fill('input[name=zoomUrl]','javascript:alert(1)'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(200)
    t.ok(not any(v.get('zoomUrl','').startswith('javascript') for k,v in t.store().items() if '/students/' in k), 'zoom inválido rejeitado')
    pg.fill('input[name=zoomUrl]','https://zoom.us/j/123456'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(300)
    t.ok(any(v.get('zoomUrl')=='https://zoom.us/j/123456' for k,v in t.store().items() if '/students/' in k), 'zoom válido salvo')
    # novo contrato com cronograma gerado
    t.btn('Cadastrar contrato'); pg.select_option('select[name=type]','trimestral'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(900)
    t.ok(any(v.get('studentId')==sid for k,v in t.store().items() if '/stages/' in k), 'contrato criou etapas')
    # relatório da aula
    t.go('relaula'); t.ok('Publicados' in t.text(), 'relatório da aula lista')
    pg.get_by_role('button', name='Escrever').first.click(); pg.wait_for_timeout(300)
    pg.fill('textarea[name=summary]','Vimos greetings'); pg.check('input[name=published]'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(400)
    t.ok(sum(1 for k,v in t.store().items() if '/lessons/' in k and v.get('lr',{}).get('published'))>=2, 'relatório publicado')
    # vincular conta e espelho
    t.go('portal'); row=pg.locator('tr', has_text='Ana Beatriz')
    row.get_by_role('button', name='Vincular conta').click(); pg.wait_for_timeout(300)
    pg.locator('#acct-res .item').first.click(); pg.wait_for_timeout(1800)
    pd=[v for k,v in t.store().items() if k.startswith('portal/')]
    t.ok(len(pd)==1, 'espelho portal/<conta> criado')
    if pd:
        d=pd[0]; js=json.dumps(d)
        t.ok(d['zoom']['url']=='https://example.com/zoom-demo','espelho tem zoom'); t.ok(len(d['stages'])>0 and len(d['lessonReports'])>=1,'espelho tem etapas e relatórios')
        t.ok('monthly' not in js and 'charges' not in js and 'teacherNotes' not in js and 'observations' not in js, 'espelho sem financeiro/notas internas')
    # prévia
    row=pg.locator('tr', has_text='Ana Beatriz'); row.get_by_role('button', name='Prévia').click(); pg.wait_for_timeout(300)
    tx=t.text(); pg.get_by_role('tab', name='Aulas').click(); pg.wait_for_timeout(200); tx2=t.text(); t.ok('Entrar na aula' in tx and 'Minha evolução' in tx and 'Relatórios das aulas' in tx2, 'prévia do aluno completa')
    t.ok('Financeiro' not in tx and 'mensalidade' not in tx.lower(), 'prévia sem financeiro')
    pg.screenshot(path='/tmp/s8_prev.png', full_page=True)
    # mobile da prévia
    pg.set_viewport_size({'width':400,'height':800}); pg.wait_for_timeout(200)
    t.ok(pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), 'sem scroll horizontal em 400px')
    # remover demo
    pg.set_viewport_size({'width':1280,'height':900}); t.go('configuracoes')
    print('ERRS', t.errs[:8]); print('FAILS', t.fails); t.b.close()
