import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
def modal(pg): return pg.locator('#modals .modal-bg').last
with sync_playwright() as p:
    t=T(p,w=400,h=860); pg=t.pg
    t.go('configuracoes'); t.btn('Carregar dados de demonstração'); t.btn('Carregar', exact=True); pg.wait_for_function("S.students.length==4", timeout=30000); pg.wait_for_timeout(600)
    sid=[s for s in pg.evaluate('S.students.map(s=>s.id)')][0]; pid=pg.evaluate('S.plans[0].id')
    routes=['dashboard','alunos','calendario','aulas','exercicios','planos','relatorios','financeiro','materiais','objetivos','tarefas','configuracoes','aluno-'+sid,'plano-'+pid]
    for r in routes:
        t.go(r); pg.wait_for_timeout(150)
        ov=pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        t.ok(ov<=1, f'sem rolagem horizontal em 400px: {r} (overflow {ov})')
        if r in('dashboard','calendario','financeiro','aluno-'+sid,'plano-'+pid): pg.screenshot(path=f'/tmp/m_{r[:7]}.png')
    # modais em mobile
    t.go('aulas'); t.btn('Agendar aula'); ov=pg.evaluate("(()=>{const m=document.querySelector('#modals .modal');return m.scrollWidth-m.clientWidth})()"); t.ok(ov<=1,'modal sem overflow no celular'); pg.keyboard.press('Escape')
    # status atrasado/parcial na demo
    t.go('financeiro'); tx=t.text(); t.ok('Atrasado' in tx and 'Parcialmente pago' in tx or 'Atrasado' in tx, 'demo mostra atrasado')
    t.go('financeiro'); pg.locator('[data-act="fin-month"][data-dir="-1"]').click(); pg.wait_for_timeout(200); t.ok('Parcialmente pago' in t.text() or 'Atrasado' in t.text(), 'mês anterior mostra parcial/atrasado')
    # remover demo
    t.go('configuracoes'); t.btn('Remover dados de demonstração'); modal(pg).get_by_role('button', name='Remover demonstração').click(); pg.wait_for_timeout(300)
    pg.wait_for_function("S.students.length==0 && S.lessons.length==0", timeout=40000); t.ok(True,'demo removida'); 
    cnt={c:t.count(c) for c in ['students','lessons','homework','plans','reports','charges','payments','goals','tasks','materials','exercises','packages']}; t.ok(sum(cnt.values())==0, 'nenhum resíduo após remover demo '+str(cnt))
    # configurações
    t.go('configuracoes'); pg.fill('#f_platformName','Meu Hub'); pg.fill('#f_teacherName','Gabi'); pg.locator('form[data-form=settings] button[type=submit]').click(); pg.wait_for_timeout(500)
    t.ok(pg.evaluate("S.settings.platformName")=='Meu Hub' and 'Meu Hub' in pg.inner_text('#brand-name'), 'configurações salvam e refletem')
    # falha de gravação
    pg.evaluate('window.__failWrites.on=true'); t.go('tarefas'); t.btn('Nova tarefa'); m=modal(pg); m.locator('#f_title').fill('Falha'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(2500)
    t.ok(t.count('tasks')==0 and ('banco' in pg.inner_text('#toasts') or 'Sem conexão' in pg.inner_text('#toasts')), 'falha de gravação mostra erro e não finge salvar: '+pg.inner_text('#toasts')[:80]); pg.evaluate('window.__failWrites.on=false')
    # tarefa
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200); t.btn('Nova tarefa'); m=modal(pg); m.locator('#f_title').fill('Corrigir testes'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(400); t.ok(t.count('tasks')==1,'tarefa criada')
    pg.locator('[data-act="task-toggle"]').first.click(); pg.wait_for_timeout(300); t.ok(any(v.get('done') for k,v in t.store().items() if '/tasks/' in k),'tarefa concluída')
    # objetivos e materiais
    t.go('materiais'); t.btn('Novo material'); m=modal(pg); m.locator('#f_title').fill('Link teste'); m.locator('#f_link').fill('https://example.com'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(400); t.ok(t.count('materials')==1,'material criado')
    # apagar tudo
    t.go('configuracoes'); t.btn('Apagar todos os dados'); m=modal(pg); m.locator('#f_word').fill('NAO'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(300); t.ok(t.count('tasks')==1,'apagar tudo exige digitar APAGAR'); m.locator('#f_word').fill('APAGAR'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(800); t.ok(t.count('tasks')==0 and t.count('materials')==0,'apagar tudo funciona')
    print('ERRS', t.errs[:8]); print('FAILS', t.fails); t.b.close()
