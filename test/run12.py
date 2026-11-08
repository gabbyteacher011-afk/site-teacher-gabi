import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
with sync_playwright() as p:
    t=T(p); pg=t.pg
    t.btn('Cadastrar primeiro aluno'); pg.fill('input[name=name]','Maria Teste'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(600)
    t.go('portal'); pg.get_by_role('button', name='Vincular conta').click(); pg.wait_for_timeout(300); pg.locator('#acct-res .item').first.click(); pg.wait_for_timeout(1500)
    t.go('gravacoes'); t.ok('Nenhuma gravação ainda' in t.text(), 'página vazia com ação')
    t.btn('Adicionar gravação'); pg.fill('input[name=title]','Aula 1'); pg.select_option('select[name=studentId]', index=1)
    pg.fill('input[name=url]','javascript:alert(1)'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(300)
    t.ok(not [k for k in t.store() if '/recordings/' in k], 'link inválido rejeitado')
    pg.fill('input[name=url]','https://zoom.us/rec/abc'); pg.click('#modals button[type=submit]'); pg.wait_for_timeout(1800)
    t.ok(len([k for k in t.store() if '/recordings/' in k])==1, 'gravação salva')
    d=[v for k,v in t.store().items() if k.startswith('portal/')][0]
    t.ok(len(d['recordings'])==1 and d['recordings'][0]['url']=='https://zoom.us/rec/abc', 'chega ao painel do aluno')
    t.btn('Ocultar'); pg.wait_for_timeout(1800)
    d=[v for k,v in t.store().items() if k.startswith('portal/')][0]; t.ok(len(d['recordings'])==0, 'ocultar remove do painel')
    t.btn('Mostrar'); pg.wait_for_timeout(300)
    t.go('portal'); pg.get_by_role('button', name='Prévia').click(); pg.wait_for_timeout(300)
    pg.get_by_role('tab', name='Gravações').click(); pg.wait_for_timeout(200); t.ok('Aula 1' in t.text() and 'Assistir' in t.text(), 'aba Gravações no painel')
    t.go('alunos'); 
    print('ERRS', t.errs, 'FAILS', t.fails); t.b.close()
