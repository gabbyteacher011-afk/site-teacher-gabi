import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
doc={'v':1,'studentId':'s1','name':'Ana Beatriz Lima','level':'Intermediário','updatedAt':'2026-11-07T10:00','zoom':{'url':'https://zoom.us/j/1','note':'Senha 123'},
 'next':[{'date':'2027-01-10','time':'18:00','duration':60,'topic':'Past simple'}],'lessonsDone':12,'lessonsTotal':96,
 'contract':{'type':'anual','typeName':'Anual','startDate':'2026-07-01','endDate':'2027-06-30','totalLessons':96,'signedDate':'2026-07-01','assetId':'abc123','fileName':'contrato.pdf'},
 'stages':[{'order':1,'title':'Fundamentos','startDate':'2026-07-01','endDate':'2026-07-31','status':'concluida','completedDate':'2026-07-30','skill':'grammar'},{'order':2,'title':'Conversação','startDate':'2026-08-01','endDate':'2026-08-31','status':'em_andamento','note':'Foque em speaking'},{'order':3,'title':'Leitura','startDate':'2027-01-01','endDate':'2027-01-31','status':'nao_iniciada'}],
 'lessonReports':[{'date':'2026-11-02','topic':'Present perfect','summary':'Vimos present perfect','vocabulary':'already, yet'}],
 'homework':[{'title':'Áudio sobre viagem','status':'atribuida','dueDate':'2026-11-20'}],'reports':[],'plan':None}
with sync_playwright() as p:
    for uid,init,label in [('acc1',{'portal/acc1':doc},'com painel'),('acc2',{'portal/acc1':doc},'sem painel')]:
        t=T.__new__(T)
        b=p.chromium.launch(); pg=b.new_page(viewport={'width':400,'height':900}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script('window.__UID=%s;window.__INIT_STORE=%s;'%(json.dumps(uid), json.dumps(json.dumps(init)))); pg.add_init_script(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock.js')).read())
        pg.goto(URL); pg.wait_for_timeout(1500); tx=pg.inner_text('body')
        print('==',label, len(tx))
        if uid=='acc1':
            def tab(n): pg.get_by_role('tab', name=n).click(); pg.wait_for_timeout(150); return pg.inner_text('body')
            allt=tx+tab('Progresso')+tab('Aulas')+tab('Meus dados')+tab('Homework')
            for s in ['Olá, Ana','Entrar na aula','Minha evolução','Cronograma do ano','Meu contrato','Relatórios das aulas','Homework','Foque em speaking']: print('PASS' if s in allt else 'FAIL', s)
            tab('Início'); print('PASS' if pg.locator('a.pt-zoom').get_attribute('href')=='https://zoom.us/j/1' else 'FAIL','zoom href')
            print('PASS' if not any(x in tx for x in ['Financeiro','Dashboard','Alunos','Configurações']) else 'FAIL','sem menu da professora')
            print('PASS' if pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1') else 'FAIL','sem scroll horizontal')
            pg.screenshot(path='/tmp/s9.png', full_page=True)
        else:
            print('PASS' if 'ainda não foi' in tx and 'Entrar na aula' not in tx else 'FAIL','aluno sem painel vê aviso')
        print('ERRS',errs); b.close()
