import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
with sync_playwright() as p:
    t=T(p); pg=t.pg
    t.btn('Cadastrar primeiro aluno'); pg.fill('input[name=name]','Maria Teste'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(600)
    t.go('portal'); pg.get_by_role('button', name='Vincular conta').click(); pg.wait_for_timeout(300); pg.locator('#acct-res .item').first.click(); pg.wait_for_timeout(1500)
    t.go('planos'); t.btn('Novo plano', exact=True)
    m=pg.inner_text('#modals'); t.ok('Meta da semana' not in m and 'Observações' not in m and 'PDF do Weekly Study Plan' in m, 'form do plano: sem meta/observações, com PDF')
    pg.select_option('select[name=studentId]', index=1); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(300)
    t.ok(not [k for k in t.store() if '/plans/' in k], 'sem PDF nem link: recusa')
    pg.set_input_files('input[name=pfile]','/tmp/t.pdf'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(1800)
    pl=[v for k,v in t.store().items() if '/plans/' in k]; t.ok(len(pl)==1 and pl[0]['pdfAssetId'], 'plano salvo com PDF')
    t.ok('Abrir PDF' in t.text() and 'Trocar PDF' in t.text(), 'lista mostra PDF clicável e botão de trocar')
    d=[v for k,v in t.store().items() if k.startswith('portal/')][0]; t.ok(len(d['planFiles'])==1, 'PDF chega ao aluno')
    # calendar
    t.go('portal'); pg.get_by_role('button', name='Calendar').click(); pg.wait_for_timeout(300)
    pg.fill('input[name=calendarUrl]','ftp://x'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(200)
    t.ok(not any(v.get('calendarUrl') for k,v in t.store().items() if '/students/' in k), 'calendar: link inválido recusado')
    pg.fill('input[name=calendarUrl]','https://calendar.google.com/x'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(1800)
    d=[v for k,v in t.store().items() if k.startswith('portal/')][0]; t.ok(d['calendar']['url']=='https://calendar.google.com/x', 'calendar no espelho')
    pg.get_by_role('button', name='Prévia').click(); pg.wait_for_timeout(300)
    pg.get_by_role('tab', name='Meus dados').click(); pg.wait_for_timeout(200); tx=t.text(); t.ok('Calendar' in tx and 'Abrir calendário' in tx, 'Dados mostra seção Calendar')
    pg.get_by_role('tab', name='Plano da semana').click(); pg.wait_for_timeout(200); t.ok('Abrir PDF' in t.text(), 'aba Plano mostra PDF clicável')
    print('ERRS', t.errs, 'FAILS', t.fails); t.b.close()
