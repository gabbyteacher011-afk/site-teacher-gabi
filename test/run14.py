import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
with sync_playwright() as p:
    t=T(p); pg=t.pg
    for n in ['Ana Turma','Beto Turma']:
        t.go('alunos'); t.btn('Cadastrar aluno', exact=True); pg.fill('input[name=name]',n); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(500)
    t.go('portal')
    for n,i in [('Ana Turma',0),('Beto Turma',1)]:
        pg.locator('tr', has_text=n).get_by_role('button', name='Vincular conta').click(); pg.wait_for_timeout(300); pg.locator('#acct-res .item').nth(i).click(); pg.wait_for_timeout(1500)
    t.go('turmas'); t.ok('Nenhuma turma criada' in t.text(), 'turmas vazio com ação')
    t.btn('Criar turma'); pg.fill('input[name=name]','Turma Kids'); pg.fill('input[name=zoomUrl]','https://zoom.us/j/grupo'); pg.fill('input[name=calendarUrl]','https://cal.example/grupo'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(500)
    t.ok('Membros de Turma Kids' in pg.inner_text('#modals'), 'após criar abre Membros')
    pg.locator('#modals input[type=checkbox]').nth(0).check(); pg.locator('#modals input[type=checkbox]').nth(1).check(); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(2500)
    portals={v['name']:v for k,v in t.store().items() if k.startswith('portal/')}
    t.ok(all(portals[n]['zoom']['url']=='https://zoom.us/j/grupo' and portals[n]['calendar']['url']=='https://cal.example/grupo' for n in portals) and len(portals)==2, 'Zoom e Calendar da turma chegam aos 2 alunos')
    # zoom individual vale no lugar
    t.go('portal'); pg.locator('tr', has_text='Beto').get_by_role('button', name='Zoom').click(); pg.wait_for_timeout(300); pg.fill('input[name=zoomUrl]','https://zoom.us/j/beto'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(2000)
    portals={v['name']:v for k,v in t.store().items() if k.startswith('portal/')}
    t.ok(portals['Beto Turma']['zoom']['url']=='https://zoom.us/j/beto' and portals['Ana Turma']['zoom']['url']=='https://zoom.us/j/grupo', 'zoom individual prevalece; o outro segue o da turma')
    # fan-out gravação com arquivo
    t.go('turmas'); pg.get_by_role('button', name='Gravação').click(); pg.wait_for_timeout(300)
    pg.fill('input[name=title]','Aula grupo'); pg.set_input_files('input[name=rfile]','/tmp/t.pdf'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(1800)
    recs=[v for k,v in t.store().items() if '/recordings/' in k]; t.ok(len(recs)==2 and recs[0]['assetId']==recs[1]['assetId'], 'gravação criada para cada aluno (cópia individual)')
    # fan-out homework
    t.go('turmas'); pg.get_by_role('button', name='Homework').click(); pg.wait_for_timeout(300)
    pg.fill('input[name=title]','HW turma'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(1500)
    t.ok(len([k for k in t.store() if '/homework/' in k])==2, 'homework atribuído a cada aluno separadamente')
    # excluir 1 gravação NÃO apaga o arquivo compartilhado
    t.go('gravacoes'); pg.evaluate("document.querySelector('[data-act=rec-del]').click()"); pg.wait_for_timeout(300); pg.get_by_role('button', name='Excluir', exact=True).last.click(); pg.wait_for_timeout(500)
    t.ok(len([k for k in t.store() if '/recordings/' in k])==1 and not pg.evaluate('window.__deleted||[]'), 'arquivo compartilhado preservado ao excluir uma cópia')
    # desvincular Ana
    t.go('turmas'); pg.get_by_role('button', name='Membros').click(); pg.wait_for_timeout(300)
    pg.locator('#modals input[type=checkbox]').nth(0).uncheck(); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(2500)
    portals={v['name']:v for k,v in t.store().items() if k.startswith('portal/')}
    ana=portals['Ana Turma']; t.ok(ana['zoom']['url']=='' and ana['calendar']['url']=='', 'ao sair da turma perde Zoom e Calendar')
    t.ok(len([k for k in t.store() if '/homework/' in k])==2 and len(ana['homework'])==1, 'homework já enviado continua com ela')
    print('ERRS', t.errs, 'FAILS', t.fails); t.b.close()
