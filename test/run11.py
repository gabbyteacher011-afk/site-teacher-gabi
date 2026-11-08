import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script('window.__NOSEED=false;'); pg.add_init_script(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock.js')).read()); pg.goto(URL); pg.wait_for_selector('#shell'); pg.wait_for_timeout(2500)
    st=lambda: json.loads(pg.evaluate('window.__store()'))
    def ok(c,m): print(('PASS ' if c else 'FAIL ')+m)
    mats=[v for k,v in st().items() if '/materials/' in k]
    ok(len(mats)==8 and all(m['category']=='modelo' for m in mats), 'modelos semeados na biblioteca (%d)'%len(mats))
    ok(st()['data/users/u1/hub'].get('settings',{}).get('modelsSeeded') is True, 'flag modelsSeeded gravada')
    pg.evaluate("location.hash='materiais'"); pg.wait_for_timeout(400); ok('Weekly Study Plan (modelo)' in pg.inner_text('#main') and 'Modelo de documento' in pg.inner_text('#main'), 'biblioteca mostra os modelos')
    pg.evaluate("location.hash='dashboard'"); pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Carregar dados de demonstração').first.click(); pg.wait_for_timeout(300); pg.get_by_role('button', name='Carregar', exact=True).click()
    pg.wait_for_function("document.querySelector('#main').innerText.includes('Ana Beatriz')", timeout=30000); pg.wait_for_timeout(1500)
    pg.evaluate("location.hash='portal'"); pg.wait_for_timeout(300)
    ok('claude.ai/artifact' in pg.inner_input_value('#share-url') if False else 'claude.ai/artifact' in pg.eval_on_selector('#share-url','e=>e.value'), 'link compartilhável exibido')
    row=pg.locator('tr', has_text='Ana Beatriz'); row.get_by_role('button', name='Vincular conta').click(); pg.wait_for_timeout(300); pg.locator('#acct-res .item').first.click(); pg.wait_for_timeout(1800)
    # banner
    pg.locator('tr', has_text='Ana Beatriz').get_by_role('button', name='Banner').click(); pg.wait_for_timeout(300)
    pg.fill('input[name=bannerTitle]','Power Up 1 - Ana'); ok('Power Up 1 - Ana' in pg.inner_text('#bn-prev'), 'banner: prévia ao vivo')
    pg.click('#modals button[type=submit]'); pg.wait_for_timeout(1800)
    acc=[k for k in st() if k.startswith('portal/')][0]; d=st()[acc]
    ok(d['banner']['title']=='Power Up 1 - Ana', 'banner publicado no espelho')
    # guia padrão e do aluno
    pg.get_by_role('button', name='Guia padrão').click(); pg.wait_for_timeout(300)
    pg.fill('textarea[name=g_welcome]','Hello! Bem-vinda.'); pg.fill('input[name=g_cambridgeKey]','zp3c-8w3h'); pg.fill('textarea[name=g_tutorials]','Tutorial HW | https://example.com/t | Abc123')
    pg.click('#modals button[type=submit]'); pg.wait_for_timeout(1800)
    pg.locator('tr', has_text='Ana Beatriz').get_by_role('button', name='Guia', exact=True).click(); pg.wait_for_timeout(300)
    pg.fill('input[name=g_zoomId]','815 1297 7770'); pg.fill('textarea[name=g_payInfo]','Pix: teste@exemplo.com'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(1800)
    g=st()[acc]['guide']
    ok(g['welcome']=='Hello! Bem-vinda.' and g['cambridgeKey']=='zp3c-8w3h' and g['zoomId']=='815 1297 7770' and g['payInfo'].startswith('Pix') and g['tutorials'][0]['pass']=='Abc123' and len(g['tips'])==8, 'guia: padrão + ajustes do aluno + dicas padrão')
    pg.locator('tr', has_text='Ana Beatriz').get_by_role('button', name='Prévia').click(); pg.wait_for_timeout(300)
    pg.get_by_role('tab', name="Student's Guide").click(); pg.wait_for_timeout(200); tx=pg.inner_text('#main')
    ok('Cambridge One' in tx and 'zp3c-8w3h' in tx and 'Para as aulas' in tx and 'Tutorial HW' in tx and 'Pix: teste' in tx, 'prévia do guia completa')
    pg.screenshot(path='/tmp/s11_guide.png', full_page=True)
    # material para aluno
    pg.evaluate("location.hash='materiais'"); pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Novo material').first.click(); pg.wait_for_timeout(300)
    pg.fill('input[name=title]','Slides Unit 1'); pg.check('input[name=showStudent]'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(1800)
    ok(any(m['title']=='Slides Unit 1' for m in st()[acc]['materials']), 'material marcado vai para o aluno')
    ok(not any(m['title'].startswith('Weekly Study Plan (modelo)') for m in st()[acc]['materials']), 'modelos pessoais NÃO vão para o aluno')
    # pdf do plano
    pid=[k.split('/')[-1] for k,v in st().items() if '/plans/' in k and v.get('studentId')==d['studentId']][0]
    pg.evaluate("location.hash='plano-%s'"%pid); pg.wait_for_timeout(400)
    pg.set_input_files('input[data-change=plan-pdf]','/tmp/t.pdf'); pg.wait_for_timeout(1800)
    ok(any(v.get('pdfAssetId') for k,v in st().items() if '/plans/' in k), 'PDF do plano anexado')
    ok(len(st()[acc]['planFiles'])>=1, 'PDF do plano chega ao aluno')
    # pdf do contrato
    pg.evaluate("location.hash='contratos'"); pg.wait_for_timeout(300)
    pg.select_option('#ct-student', index=0); pg.wait_for_timeout(300)
    pg.set_input_files('input[data-change=ct-upload]','/tmp/t.pdf'); pg.wait_for_timeout(1800)
    ok(any(v.get('assetId') and v.get('studentId')==d['studentId'] for k,v in st().items() if '/contracts/' in k), 'PDF do contrato anexado ao aluno')
    print('ERRS',errs); b.close()
