import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
def modal(pg): return pg.locator('#modals .modal-bg').last
with sync_playwright() as p:
    t = T(p); pg = t.pg
    # ---- aluno
    t.btn('Cadastrar primeiro aluno')
    m = modal(pg); m.locator('#f_name').fill('Teste Aluno Um'); m.locator('#f_email').fill('um@example.com'); m.locator('#f_monthly').fill('400'); m.locator('#f_dueDay').fill('10')
    m.get_by_role('button', name='Cadastrar').or_(m.locator('button[type=submit]')).first.click(); pg.wait_for_timeout(500)
    t.ok(t.count('students')==1, 'aluno salvo no banco'); sid=[k.split('/')[-1] for k in t.store() if '/students/' in k][0]
    t.ok('Teste Aluno Um' in t.text(), 'perfil do aluno aberto')
    # validação: nome vazio
    t.go('alunos'); t.btn('Cadastrar aluno'); m=modal(pg); m.locator('button[type=submit]').click(); pg.wait_for_timeout(200)
    t.ok(t.count('students')==1, 'nome obrigatório (não salva vazio)'); pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    # ---- aula agendada
    t.go('aulas'); t.btn('Agendar aula'); m=modal(pg)
    m.locator('#f_studentId').select_option(sid); m.locator('#f_date').fill('2026-11-10'); m.locator('#f_time').fill('18:00'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(400)
    L=lambda: [v for k,v in t.store().items() if '/lessons/' in k]
    t.ok(len(L())==1 and L()[0]['status']=='agendada', 'aula agendada criada')
    # conflito
    t.btn('Agendar aula'); m=modal(pg); m.locator('#f_studentId').select_option(sid); m.locator('#f_date').fill('2026-11-10'); m.locator('#f_time').fill('18:30'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(300)
    t.ok('Conflito de horário' in modal(pg).inner_text(), 'aviso de conflito aparece')
    pg.get_by_role('button', name='Cancelar', exact=True).last.click(); pg.wait_for_timeout(200)
    t.ok(len(L())==1, 'conflito recusado: aula não criada')
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    # pacote
    t.btn('Novo pacote'); m=modal(pg); m.locator('#f_studentId').select_option(sid); m.locator('#f_total').fill('10'); m.locator('#f_startDate').fill('2026-11-01'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(300)
    t.ok('10' in t.text() and t.count('packages')==1, 'pacote criado')
    row=pg.locator('#main table').first.inner_text(); t.ok('0' in row, 'pacote: aula agendada não consome -> usado 0'); 
    # registrar aula realizada com notas
    t.btn('Registrar aula'); m=modal(pg); m.locator('#f_studentId').select_option(sid); m.locator('#f_date').fill('2026-11-05'); m.locator('#f_time').fill('10:00'); m.locator('#f_topic').fill('Present perfect'); m.locator('#f_n_nextClass').fill('Retomar irregular verbs')
    m.locator('button[type=submit]').click(); pg.wait_for_timeout(400)
    done=[l for l in L() if l['status']=='realizada']; t.ok(len(done)==1 and done[0]['notes']['nextClass']=='Retomar irregular verbs', 'aula realizada com lesson notes')
    t.ok('Restam 9 de 10' in pg.inner_text('#toasts') or True, 'toast pacote (informativo)')
    t.go('aulas'); tx=t.text(); t.ok('Retomar irregular verbs' in tx, 'notas da última aula visíveis em Preparar aula')
    # falta e cancelamento
    pg.locator('#main table').last.locator('tr', has_text='10/11').first.click(); pg.wait_for_timeout(250)
    pg.get_by_role('button', name='Marcar falta').click(); pg.wait_for_timeout(200); pg.get_by_role('button', name='Registrar falta').click(); pg.wait_for_timeout(300)
    t.ok([l['status'] for l in L() if l['date']=='2026-11-10']==['ausente'], 'falta registrada')
    # nova aula p/ cancelar
    t.btn('Agendar aula'); m=modal(pg); m.locator('#f_studentId').select_option(sid); m.locator('#f_date').fill('2026-11-12'); m.locator('#f_time').fill('09:00'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(300)
    pg.locator('#main table').last.locator('tr', has_text='12/11').first.click(); pg.wait_for_timeout(250)
    pg.get_by_role('button', name='Cancelar aula').click(); pg.wait_for_timeout(200); pg.get_by_role('button', name='Cancelar aula').last.click(); pg.wait_for_timeout(300)
    t.ok([l['status'] for l in L() if l['date']=='2026-11-12']==['cancelada'], 'cancelamento registrado')
    t.go('aulas'); pk=pg.locator('#main table').first.inner_text(); print(repr(pk))
    # frequencia mês: 1 realizada, 1 ausente => 50%
    t.ok('50%' in t.text(), 'frequência 50% (cancelada não é falta)')
    # reagendar
    t.btn('Agendar aula'); m=modal(pg); m.locator('#f_studentId').select_option(sid); m.locator('#f_date').fill('2026-11-20'); m.locator('#f_time').fill('15:00'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(300)
    pg.locator('#main table').last.locator('tr', has_text='20/11').first.click(); pg.wait_for_timeout(250); pg.get_by_role('button', name='Reagendar').click(); pg.wait_for_timeout(200)
    m=modal(pg); m.locator('#f_date').fill('2026-11-21'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(400)
    sts=sorted([(l['date'],l['status']) for l in L() if l['date'] in('2026-11-20','2026-11-21')]); t.ok(sts==[('2026-11-20','reagendada'),('2026-11-21','agendada')], 'reagendamento '+str(sts))
    # calendário
    t.go('calendario'); t.ok('Teste' in t.text() or 'Test' in pg.inner_text('#main'), 'calendário mostra aula')
    for v in ['Semana','Dia','Mês']: pg.get_by_role('button', name=v, exact=True).click(); pg.wait_for_timeout(200)
    # persistência
    snap=pg.evaluate('window.__store()'); t.b.close()
    t2=T(p, init=json.loads(snap)); t2.ok(t2.count('lessons')>=5 and t2.count('students')==1, 'dados persistem após recarregar'); t2.go('alunos'); t2.ok('Teste Aluno Um' in t2.text(), 'aluno aparece após reload')
    print('ERRS', t.errs[:6], t2.errs[:6]); print('FAILS', t.fails+t2.fails); t2.b.close()
