import os
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
with sync_playwright() as p:
    t = T(p); pg = t.pg
    t.btn('Carregar dados de demonstração'); t.btn('Carregar', exact=True)
    pg.wait_for_function("document.querySelector('#main').innerText.includes('Ana Beatriz')", timeout=30000)
    t.ok(t.count('students')==4, 'demo: 4 alunos'); print({c:t.count(c) for c in ['lessons','homework','plans','reports','charges','payments','goals','tasks','materials','exercises','packages']})
    pages=['dashboard','alunos','calendario','aulas','exercicios','planos','relatorios','financeiro','materiais','objetivos','tarefas','configuracoes']
    for r in pages:
        t.go(r); tx=t.text(); bad='Não foi possível montar' in tx or len(tx)<80
        t.ok(not bad, 'rota '+r+' (%d chars)'%len(tx))
    sid=[k.split('/')[-1] for k in t.store() if '/students/' in k][0]
    t.go('aluno-'+sid)
    for tab in ['Visão geral','Histórico de aulas','Exercícios e Homework','Weekly Study Plans','Relatórios','Financeiro','Observações','Linha do tempo']:
        try:
            pg.get_by_role('tab', name=tab).first.click(); pg.wait_for_timeout(150); tx=t.text()
            t.ok('Não foi possível' not in tx and len(tx)>100, 'aba '+tab)
        except Exception as e: t.ok(False,'aba '+tab+' '+str(e)[:80])
    pid=[k.split('/')[-1] for k in t.store() if '/plans/' in k][0]; t.go('plano-'+pid); t.ok('Weekly Study Plan' in t.text(),'plano detalhe')
    pg.screenshot(path='/tmp/s2.png', full_page=False)
    print('ERRS', t.errs[:10]); print('FAILS', t.fails)
    t.b.close()
