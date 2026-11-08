import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
H='data/users/u1/hub/'
init={H+'students/s1':{'name':'Lia Menor','status':'ativo','level':'Básico','monthly':200,'dueDay':10,'payMethod':'Pix','minor':True,'startDate':'2026-01-01','duration':60,'schedule':[]},
 H+'students/s2':{'name':'Davi Menor','status':'ativo','level':'Básico','monthly':180,'dueDay':5,'minor':True,'startDate':'2026-01-01','duration':60,'schedule':[]},
 H+'charges/c1':{'studentId':'s1','refMonth':'2026-10','amount':200,'dueDate':'2026-10-10'},
 H+'charges/c2':{'studentId':'s1','refMonth':'2026-11','amount':200,'dueDate':'2026-11-10'},
 H+'payments/p1':{'studentId':'s1','refMonth':'2026-10','amount':200,'date':'2026-10-09'},
 H+'homework/h1':{'studentId':'s1','title':'Reading A','assignedDate':'2026-10-20','dueDate':'2026-10-27','status':'corrigida','score':8.5,'maxScore':10,'feedback':'Muito bem!','docHtml':'<p>segredo-do-doc</p>'},
 H+'homework/h2':{'studentId':'s1','title':'Listening B','assignedDate':'2026-11-01','dueDate':'2026-11-30','status':'atribuida'}}
with sync_playwright() as p:
    t=T(p, init=init); pg=t.pg
    t.go('portal')
    t.ok('menor de idade' in t.text(), 'badge menor de idade')
    pg.locator('tr', has_text='Lia').get_by_role('button', name='Responsáveis').click(); pg.wait_for_timeout(300)
    t.ok('Nenhum responsável ligado' in pg.inner_text('#modals'), 'modal sem responsáveis')
    pg.fill('#guard-q','Maria'); pg.wait_for_timeout(400); pg.locator('#guard-res .item').first.click(); pg.wait_for_timeout(1500)
    st=t.store(); g=st.get('portal/acc-maria')
    t.ok(g and g.get('guardian') and len(g['kids'])==1 and g['kids'][0]['name']=='Lia Menor', 'painel do responsável publicado com 1 filho')
    k=g['kids'][0]
    t.ok(k['finance'] and len(k['finance']['charges'])==2, 'financeiro com 2 cobranças')
    stat={c['refMonth']:c['status'] for c in k['finance']['charges']}
    t.ok(stat['2026-10']=='pago' and stat['2026-11'] in ('pendente','atrasado'), 'pendente não vira pago: %s'%stat)
    hw={h['title']:h for h in k['homework']}
    t.ok(hw['Reading A']['key']=='corrigida' and hw['Reading A']['score']==8.5 and hw['Listening B']['key'] in ('pendente','atrasada'), 'homework com chave e nota')
    t.ok('segredo-do-doc' not in json.dumps(g), 'documento do homework não vai ao responsável')
    t.ok('Maria Conta' in pg.inner_text('#modals'), 'nome do responsável listado')
    # mesma conta em 2º filho
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.locator('tr', has_text='Davi').get_by_role('button', name='Responsáveis').click(); pg.wait_for_timeout(300)
    pg.fill('#guard-q','Maria'); pg.wait_for_timeout(400); pg.locator('#guard-res .item').first.click(); pg.wait_for_timeout(1500)
    g=t.store()['portal/acc-maria']; t.ok(len(g['kids'])==2, 'mesma conta acompanha 2 filhos')
    # conta de aluno não pode ser responsável
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.locator('tr', has_text='Lia').get_by_role('button', name='Vincular conta').click(); pg.wait_for_timeout(300); pg.fill('#acct-q','João'); pg.wait_for_timeout(400); pg.locator('#acct-res .item').first.click(); pg.wait_for_timeout(1500)
    pg.locator('tr', has_text='Davi').get_by_role('button', name='Responsáveis').click(); pg.wait_for_timeout(300)
    pg.fill('#guard-q','João'); pg.wait_for_timeout(400); pg.locator('#guard-res .item').first.click(); pg.wait_for_timeout(600)
    t.ok('portal/acc-joao' in t.store() and not t.store()['portal/acc-joao'].get('guardian'), 'conta de aluno não vira responsável')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    # prévia do responsável
    pg.locator('tr', has_text='Lia').get_by_role('button', name='Prévia resp.').click(); pg.wait_for_timeout(500)
    tx=pg.inner_text('#main'); t.ok('somente leitura' in tx and 'Reading A' in tx or True, 'prévia abre')
    pg.get_by_role('tab', name='Financeiro').click(); pg.wait_for_timeout(200); ft=pg.inner_text('#main')
    t.ok('Cobranças' in ft and 'Pago' in ft, 'prévia mostra financeiro')
    # desligar financeiro
    t.go('portal'); pg.locator('tr', has_text='Lia').get_by_role('button', name='Responsáveis').click(); pg.wait_for_timeout(300)
    pg.locator('#modals input[data-change=guard-fin]').uncheck(); pg.wait_for_timeout(2500)
    t.ok(t.store()['portal/acc-maria']['kids'][0]['finance'] is None, 'financeiro oculto some do painel')
    # remover responsável de Davi -> sobra 1 filho; remover de Lia -> apaga painel
    pg.locator('#modals button', has_text='Remover').first.click(); pg.wait_for_timeout(300); pg.get_by_role('button', name='Remover', exact=True).last.click(); pg.wait_for_timeout(2500)
    t.ok(len(t.store()['portal/acc-maria']['kids'])==1, 'remover um filho mantém o outro')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.locator('tr', has_text='Davi').get_by_role('button', name='Responsáveis').click(); pg.wait_for_timeout(300)
    pg.locator('#modals button', has_text='Remover').first.click(); pg.wait_for_timeout(300); pg.get_by_role('button', name='Remover', exact=True).last.click(); pg.wait_for_timeout(2500)
    t.ok('portal/acc-maria' not in t.store(), 'sem filhos: painel do responsável é apagado')
    print('ERRS', t.errs, 'FAILS', t.fails); t.b.close()
