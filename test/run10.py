import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
URLX=URL
def page(p, init, uid=None, w=1100):
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':w,'height':900}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pre=('window.__UID=%s;'%json.dumps(uid) if uid else '')+'window.__INIT_STORE=%s;'%json.dumps(json.dumps(init))
    pg.add_init_script(pre); pg.add_init_script(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock.js')).read()); pg.goto(URLX); pg.wait_for_timeout(1500)
    return b,pg,errs
def store(pg): return json.loads(pg.evaluate('window.__store()'))
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); return c
with sync_playwright() as p:
    # 1) professora cria aluno, vincula conta, cria homework com documento
    t=T(p); pg=t.pg
    t.btn('Cadastrar primeiro aluno'); pg.fill('input[name=name]','Maria Teste'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(600)
    t.go('portal'); pg.get_by_role('button', name='Vincular conta').click(); pg.wait_for_timeout(300); pg.locator('#acct-res .item').first.click(); pg.wait_for_timeout(1800)
    t.go('exercicios'); 
    pg.get_by_role('tab', name='Homework').first.click() if pg.get_by_role('tab', name='Homework').count() else None
    pg.evaluate("document.querySelector('[data-act=hw-new]') && document.querySelector('[data-act=hw-new]').click()"); pg.wait_for_timeout(300)
    t.ok(pg.locator('#hw_doc').count()==1, 'form de homework tem documento editável')
    pg.locator('input[name="studentIds[]"]').first.check(); pg.fill('input[name=title]','Unit 1 worksheet')
    pg.evaluate("document.querySelector('#hw_doc').innerHTML='<p>1) I ____ a teacher.</p><script>alert(1)</script><p onclick=x>2) She ____ a doctor.</p>'")
    pg.click('#modals button[type=submit]'); pg.wait_for_timeout(2200)
    st=store(pg); hw=[v for k,v in st.items() if '/homework/' in k]
    t.ok(len(hw)==1 and 'I ____ a teacher' in hw[0].get('docHtml','') and '<script' not in hw[0]['docHtml'] and 'onclick' not in hw[0]['docHtml'], 'documento salvo e sanitizado')
    portal=[v for k,v in st.items() if k.startswith('portal/')]
    t.ok(len(portal)==1 and portal[0]['homework'][0].get('docHtml'), 'espelho do aluno tem o documento')
    # chip de status na lista
    t.go('exercicios'); t.ok('Pendente' in t.text() or 'Atribu' in t.text(), 'lista mostra status com selo')
    full=st; t.b.close()
    # 2) aluno abre, escreve e entrega
    only={k:v for k,v in full.items() if k.startswith('portal/')}
    acc=list(only.keys())[0].split('/')[1]
    b,pg,errs=page(p, only, uid=acc, w=420)
    pg.get_by_role('tab', name='Homework').first.click(); pg.wait_for_timeout(200)
    ok('Pendente' in pg.inner_text('body'), 'aluno vê status Pendente')
    pg.locator('.pt-hw').first.click(); pg.wait_for_timeout(300)
    ok(pg.locator('#stu_doc').count()==1 and 'I ____ a teacher' in pg.inner_text('#stu_doc'), 'aluno recebe cópia editável')
    pg.evaluate("document.querySelector('#stu_doc').innerHTML='<p>1) I am a teacher.</p><p>2) She is a doctor.</p><img src=x onerror=alert(1)>'")
    pg.get_by_role('button', name='Salvar rascunho').click(); pg.wait_for_timeout(500)
    s2=store(pg); ok(any(k=='hwsub/'+acc for k in s2) and s2['hwsub/'+acc]['items'][list(s2['hwsub/'+acc]['items'])[0]]['status']=='rascunho', 'rascunho gravado em hwsub/<conta>')
    pg.locator('.pt-hw').first.click(); pg.wait_for_timeout(300)
    ok('I am a teacher' in pg.inner_text('#stu_doc'), 'rascunho reaberto')
    pg.get_by_role('button', name='Entregar', exact=True).click(); pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Entregar', exact=True).last.click(); pg.wait_for_timeout(600)
    s2=store(pg); it=list(s2['hwsub/'+acc]['items'].values())[0]
    ok(it['status']=='entregue' and '<img' not in it['html'], 'entrega gravada e sem html perigoso')
    ok('Entregue' in pg.inner_text('body'), 'aluno vê status Entregue')
    pg.screenshot(path='/tmp/s10_student.png', full_page=True)
    ok(pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), 'aluno sem scroll horizontal (420px)')
    sub=s2['hwsub/'+acc]; b.close()
    # 3) professora vê a entrega, corrige e devolve
    init={k:v for k,v in full.items()}; init['hwsub/'+acc]=sub
    b,pg,errs=page(p, init)
    pg.wait_for_timeout(1500)
    hwd=[v for k,v in store(pg).items() if '/homework/' in k][0]
    ok(hwd['status']=='pendente_correcao' and hwd.get('subAt'), 'professora: homework virou pendente de correção sozinho')
    ok(pg.inner_text('#bell').strip()=='1' or '1' in pg.inner_text('#bell'), 'sino mostra 1 entrega nova')
    pg.click('#bell'); pg.wait_for_timeout(300); ok('Unit 1 worksheet' in pg.inner_text('#modals') and 'Nova' in pg.inner_text('#modals'), 'sino lista a entrega nova'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.evaluate("location.hash='exercicios'"); pg.wait_for_timeout(300); pg.evaluate("document.querySelector('[data-act=ex-tab][data-tab=hw]').click()"); pg.wait_for_timeout(200)
    pg.evaluate("document.querySelector('[data-act=hw-open]').click()"); pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Abrir e corrigir o documento').click(); pg.wait_for_timeout(300)
    ok('I am a teacher' in pg.inner_text('#cor_doc'), 'correção mostra o documento do aluno')
    pg.evaluate("""()=>{const ed=document.querySelector('#cor_doc'); const p=ed.querySelector('p'); const r=document.createRange(); r.selectNodeContents(p.firstChild); const s=getSelection(); s.removeAllRanges(); s.addRange(r);}""")
    pg.click('button[data-cls=hl-g]'); pg.wait_for_timeout(100)
    ok(pg.locator('#cor_doc mark.hl-g').count()==1, 'marca-texto aplicado')
    pg.fill('#cor_score','9'); pg.fill('#cor_fb','Muito bem!')
    pg.get_by_role('button', name='Devolver corrigido').click(); pg.wait_for_timeout(800)
    s3=store(pg); ret=s3['hwret/'+acc]; ri=list(ret['items'].values())[0]
    ok(ri['mode']=='corrigida' and ri['score']==9 and 'hl-g' in ri['html'], 'devolução gravada em hwret/<conta>')
    ok([v for k,v in s3.items() if '/homework/' in k][0]['status']=='corrigida', 'homework corrigido no cadastro')
    b.close()
    # 4) aluno vê devolvido
    b,pg,errs=page(p, {**only,'hwsub/'+acc:sub,'hwret/'+acc:ret}, uid=acc, w=420)
    pg.get_by_role('tab', name='Homework').first.click(); pg.wait_for_timeout(200)
    ok('Corrigida' in pg.inner_text('body'), 'aluno vê Corrigida')
    pg.locator('.pt-hw').first.click(); pg.wait_for_timeout(300)
    tx=pg.inner_text('#modals'); ok('Muito bem!' in tx and '9/10' in tx and pg.locator('#modals mark.hl-g').count()==1, 'aluno vê nota, feedback e marcações')
    pg.screenshot(path='/tmp/s10_ret.png'); b.close()
    # 5) pedir para refazer
    init={**full,'hwsub/'+acc:sub}
    b,pg,errs=page(p, init); pg.wait_for_timeout(1200)
    pg.evaluate("location.hash='exercicios'"); pg.wait_for_timeout(300); pg.evaluate("document.querySelector('[data-act=ex-tab][data-tab=hw]').click()"); pg.wait_for_timeout(200)
    pg.evaluate("document.querySelector('[data-act=hw-open]').click()"); pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Abrir e corrigir o documento').click(); pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Pedir para refazer').click(); pg.wait_for_timeout(300)
    ok('hwret/'+acc not in store(pg), 'refazer sem feedback é recusado')
    pg.fill('#cor_fb','Refaça a 2.'); pg.get_by_role('button', name='Pedir para refazer').click(); pg.wait_for_timeout(700)
    s5=store(pg); ok(list(s5['hwret/'+acc]['items'].values())[0]['mode']=='refazer' and [v for k,v in s5.items() if '/homework/' in k][0]['status']=='refazer','refazer gravado')
    print('ERRS',errs); b.close()
print('done')
