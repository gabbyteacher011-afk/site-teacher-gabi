import os
import sys, json, urllib.parse; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
H='data/users/u1/hub/'
init={H+'students/s1':{'name':'Lia Menor','status':'ativo','level':'Básico','phone':'(11) 98765-4321','guardianPhone':'11 91234-5678','email':'lia@x.com','minor':True,'startDate':'2026-01-01','duration':60,'schedule':[]},
 H+'students/s2':{'name':'Sem Fone','status':'ativo','level':'Básico','startDate':'2026-01-01','duration':60,'schedule':[]},
 H+'homework/h1':{'studentId':'s1','title':'Reading A','assignedDate':'2026-10-20','dueDate':'2026-10-27','status':'corrigida','score':8.5,'maxScore':10}}
with sync_playwright() as p:
    t=T(p, init=init); pg=t.pg
    t.go('portal')
    pg.locator('tr', has_text='Lia').get_by_role('button', name='Avisar').click(); pg.wait_for_timeout(300)
    href=pg.get_attribute('#ntf-a','href'); t.ok(href.startswith('https://wa.me/5511987654321?text='), 'link wa.me do aluno com 55: '+href[:40])
    t.ok('Lia' in urllib.parse.unquote(href) and 'index.html' in urllib.parse.unquote(href), 'texto traz nome e link do site')
    pg.select_option('#ntf-who','resp'); pg.wait_for_timeout(200); t.ok('5511912345678' in pg.get_attribute('#ntf-a','href') and 'Olá! O painel' in pg.input_value('#ntf-text'), 'destinatário responsável muda número e texto')
    pg.fill('#ntf-text','Oi editado & teste'); pg.dispatch_event('#ntf-text','input'); pg.wait_for_timeout(200)
    t.ok('Oi%20editado%20%26%20teste' in pg.get_attribute('#ntf-a','href'), 'edição do texto vai no link (codificada)')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.locator('tr', has_text='Sem Fone').get_by_role('button', name='Avisar').click(); pg.wait_for_timeout(300)
    t.ok(pg.get_attribute('#ntf-a','href') is None and 'Sem telefone válido' in pg.inner_text('#modals'), 'sem telefone: link desativado com aviso')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    t.go('exercicios'); pg.evaluate("document.querySelector('[data-act=ex-tab][data-tab=hw]').click()"); pg.wait_for_timeout(200); pg.evaluate("document.querySelector('[data-act=hw-open]').click()"); pg.wait_for_timeout(400)
    pg.get_by_role('button', name='Avisar por WhatsApp').click(); pg.wait_for_timeout(300)
    t.ok('foi corrigida' in pg.input_value('#ntf-text') and 'Reading A' in pg.input_value('#ntf-text'), 'aviso de homework corrigido com o título')
    print('ERRS', t.errs, 'FAILS', t.fails); t.b.close()
