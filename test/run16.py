import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
def kid(i,n,fin):
    return {'v':1,'studentId':i,'name':n,'level':'Básico','updatedAt':'2026-11-07T10:00','zoom':{'url':'https://zoom.us/j/'+i,'note':''},'next':[{'date':'2027-01-10','time':'18:00','duration':60,'topic':'Past'}],'lessonsDone':3,'lessonsTotal':0,'contract':{'type':'anual','typeName':'Anual','startDate':'2026-07-01','endDate':'2027-06-30','totalLessons':96,'assetId':'abc','fileName':'c.pdf'},'stages':[],
     'lessonReports':[{'date':'2026-11-02','topic':'T '+n,'summary':'Resumo '+n}],'homework':[{'id':'h1','title':'Reading '+n,'dueDate':'2026-10-27','key':'corrigida','score':8.5,'maxScore':10,'feedback':'Muito bem!'},{'id':'h2','title':'Listening '+n,'dueDate':'2027-12-01','key':'pendente','score':None,'maxScore':10,'feedback':''}],
     'reports':[],'profile':{'name':n,'email':'','phone':'','level':'Básico','schedule':[]},'banner':{'title':'English Class - '+n,'sub':'','theme':'lavanda','imageId':''},'calendar':{'url':'https://cal.example/'+i,'note':''},'guide':None,'materials':[],'recordings':[],'planFiles':[],'plan':None,
     'finance':({'monthly':200,'dueDay':10,'payMethod':'Pix','payInfo':'Pix 123','charges':[{'refMonth':'2026-10','dueDate':'2026-10-10','amount':200,'paid':200,'discount':0,'balance':0,'status':'pago'},{'refMonth':'2026-11','dueDate':'2026-11-10','amount':200,'paid':0,'discount':0,'balance':200,'status':'pendente'}]} if fin else None)}
doc={'v':1,'guardian':True,'updatedAt':'2026-11-07T10:00','kids':[kid('s1','Lia',True),kid('s2','Davi',False)]}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':400,'height':900}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script('window.__UID="acc-maria";window.__INIT_STORE=%s;'%json.dumps(json.dumps({'portal/acc-maria':doc}))); pg.add_init_script(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock.js')).read())
    pg.goto(URL); pg.wait_for_timeout(1500)
    f=[]
    def ck(c,m): print(('PASS ' if c else 'FAIL ')+m); (not c) and f.append(m)
    def tab(n): pg.get_by_role('tab', name=__import__('re').compile('^'+n)).click(); pg.wait_for_timeout(150); return pg.inner_text('body')
    tx=pg.inner_text('body')
    ck('Painel dos responsáveis' in tx and 'Lia' in tx and 'Davi' in tx, 'cabeçalho e seletor de filhos')
    ck('Próxima aula' in tx and 'Sua próxima aula' not in tx, 'texto no feminino/terceira pessoa')
    ck(not any(x in tx for x in ['Dashboard','Configurações','Alunos']), 'sem menu da professora')
    allt=tab('Homework')+tab('Aulas')+tab('Dados')+tab('Financeiro')
    for s in ['Reading Lia','8,5/10','Muito bem!','Resumo Lia','Contrato','Cadastro do aluno','Calendar','R$','Pix 123','Pendente','Pago']: ck(s in allt, s)
    ck(pg.locator('button[data-act=pt-hw], [data-act=hw-open], [data-act=pt-hw]').count()==0, 'homework não é abrível/entregável')
    pg.get_by_role('tab', name='Davi', exact=True).click(); pg.wait_for_timeout(200)
    ck('Davi' in pg.inner_text('body'), 'troca de filho')
    ck(pg.get_by_role('tab', name='Financeiro').count()==0, 'filho sem financeiro liberado: aba some')
    t2=tab('Aulas'); ck('Resumo Davi' in t2 and 'Resumo Lia' not in t2, 'dados do filho selecionado')
    tab('Resumo'); ck(pg.locator('a.pt-zoom').get_attribute('href')=='https://zoom.us/j/s2', 'Zoom do filho certo')
    ck(pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), 'sem scroll horizontal em 400px')
    pg.get_by_role('tab', name='Lia', exact=True).click(); tab('Financeiro'); pg.screenshot(path='/tmp/s16.png', full_page=True)
    print('ERRS', errs, 'FAILS', f); b.close()
