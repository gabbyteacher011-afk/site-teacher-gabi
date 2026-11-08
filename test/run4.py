import os
import sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
def modal(pg): return pg.locator('#modals .modal-bg').last
P='data/users/u1/hub/'
init={P+'students/s1':{'name':'Joana Teste','level':'Básico','status':'ativo','monthly':400,'dueDay':10,'duration':60,'schedule':[],'startDate':'2026-10-01','archived':False,'createdAt':1760000000000}}
with sync_playwright() as p:
    t=T(p,init=init); pg=t.pg
    G=lambda col:[v for k,v in t.store().items() if '/'+col+'/' in k]
    # ---------- exercícios
    t.go('exercicios'); t.btn('Novo exercício'); m=modal(pg)
    m.locator('#f_title').fill('Verb to be quiz')
    m.locator('textarea[name="q_prompt[]"]').first.fill('She ___ happy.'); m.locator('textarea[name="q_options[]"]').first.fill('is\nare\nam'); m.locator('input[name="q_answer[]"]').first.fill('is')
    m.get_by_role('button', name='Adicionar questão').click(); pg.wait_for_timeout(150)
    m.locator('textarea[name="q_prompt[]"]').nth(1).fill('They ___ here.'); m.locator('textarea[name="q_options[]"]').nth(1).fill('is\nare'); m.locator('input[name="q_answer[]"]').nth(1).fill('are')
    m.locator('button[type=submit]').click(); pg.wait_for_timeout(400)
    ex=G('exercises'); t.ok(len(ex)==1 and len(ex[0]['questions'])==2 and ex[0]['questions'][0]['options']==['is','are','am'] and ex[0]['questions'][1]['answer']=='are', 'exercício com 2 questões salvo: '+str([q['answer'] for q in ex[0]['questions']] if ex else ''))
    t.go('exercicios'); pg.locator('#main .excard').first.get_by_role('button', name='Duplicar').click(); pg.wait_for_timeout(400); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    t.ok(len(G('exercises'))==2, 'exercício duplicado')
    # ---------- homework
    t.go('exercicios'); pg.locator('#main .excard').first.get_by_role('button', name='Atribuir').click(); pg.wait_for_timeout(250); m=modal(pg)
    m.locator('input[name="studentIds[]"]').first.check(); m.locator('button[type=submit]').click(); pg.wait_for_timeout(400)
    hw=G('homework'); t.ok(len(hw)==1 and hw[0]['status']=='atribuida' and hw[0]['studentId']=='s1', 'homework atribuído')
    pg.locator('[data-act="ex-tab"][data-tab="hw"]').click(); pg.wait_for_timeout(200); pg.locator('#main tbody tr').first.click(); pg.wait_for_timeout(250)
    pg.get_by_role('button', name='Registrar entrega').click(); pg.wait_for_timeout(200); modal(pg).locator('button[type=submit]').click(); pg.wait_for_timeout(300)
    t.ok(G('homework')[0]['status']=='pendente_correcao', 'entrega registrada -> pendente de correção')
    pg.locator('#main tbody tr').first.click(); pg.wait_for_timeout(250); pg.get_by_role('button', name='Corrigir').click(); pg.wait_for_timeout(200)
    m=modal(pg); m.locator('#f_score').fill('15'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(250); t.ok(G('homework')[0]['status']=='pendente_correcao', 'nota > máximo é recusada')
    m.locator('#f_score').fill('8'); m.locator('#f_feedback').fill('Bom trabalho'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(300)
    h=G('homework')[0]; t.ok(h['status']=='corrigida' and h['score']==8 and h['feedback']=='Bom trabalho', 'homework corrigido com nota e feedback')
    t.go('dashboard'); t.ok('Atividades a revisar' in t.text(), 'dashboard carregou')
    # ---------- plano
    t.go('planos'); t.btn('Novo plano', exact=False); m=modal(pg); m.locator('#f_studentId').select_option('s1'); m.locator('#f_weekStart').fill('2026-11-02'); m.locator('#f_goal').fill('Verbo to be'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(500)
    pl=G('plans'); t.ok(len(pl)==1 and pl[0]['weekEnd']=='2026-11-08', 'plano criado (7 dias)'); t.ok('Weekly Study Plan' in t.text(), 'abriu detalhe do plano')
    for i,title in enumerate(['Ler texto','Fazer exercício']):
        pg.locator('[data-act="act-new"]').nth(i).click(); pg.wait_for_timeout(200); m=modal(pg); m.locator('#f_title').fill(title); m.locator('button[type=submit]').click(); pg.wait_for_timeout(300)
    pr=lambda: sum(len(v) for v in G('plans')[0]['days'].values()); t.ok(pr()==2, 'duas atividades no plano')
    t.ok('0%' in t.text(), 'progresso 0%')
    pg.locator('select[data-change="act-status"]').first.select_option('concluida'); pg.wait_for_timeout(400); t.ok('50%' in t.text(), 'progresso 50% após concluir 1 de 2')
    pg.locator('select[data-change="act-status"]').nth(1).select_option('concluida'); pg.wait_for_timeout(400); t.ok('100%' in t.text(), 'progresso 100%')
    pg.get_by_role('button', name='Duplicar p/ próxima semana').click(); pg.wait_for_timeout(500); pls=G('plans'); t.ok(len(pls)==2 and any(x['weekStart']=='2026-11-09' for x in pls), 'plano duplicado; original mantido')
    t.ok('0%' in t.text(), 'plano duplicado reinicia atividades')
    # ---------- financeiro
    t.go('financeiro'); tx=t.text(); t.ok('Sem cobrança gerada' in tx, 'previsto aparece como sem cobrança (não gera automático)'); t.ok(len(G('charges'))==0, 'nenhuma cobrança criada automaticamente')
    t.btn('Gerar cobranças do mês'); modal(pg).locator('button[type=submit]').click(); pg.wait_for_timeout(400); ch=G('charges'); t.ok(len(ch)==1 and ch[0]['amount']==400, 'cobrança criada só após autorização')
    t.btn('Registrar pagamento'); m=modal(pg); m.locator('#f_studentId').select_option('s1'); pg.wait_for_timeout(100); m.locator('#f_amount').fill('150'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(400)
    t.ok(len(G('payments'))==1, 'pagamento parcial registrado')
    tx=t.text(); t.ok('Parcialmente pago' in tx, 'status Parcialmente pago')
    t.go('financeiro'); cards=pg.locator('.stat').all_inner_texts(); print(cards)
    rec=[c for c in cards if 'Recebido' in c][0]; pen=[c for c in cards if 'Pendente' in c][0]; t.ok('150' in rec, 'recebido = 150 (só o pago)'); t.ok('250' in pen, 'pendente = 250')
    t.btn('Registrar pagamento'); m=modal(pg); m.locator('#f_studentId').select_option('s1'); m.locator('#f_amount').fill('150'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(300)
    t.ok('duplicado' in modal(pg).inner_text(), 'aviso de pagamento duplicado'); pg.get_by_role('button', name='Cancelar', exact=True).last.click(); pg.wait_for_timeout(150)
    m=modal(pg); m.locator('#f_amount').fill('900'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(300); t.ok('maior que o saldo' in modal(pg).inner_text(), 'aviso de valor acima do saldo'); pg.get_by_role('button', name='Cancelar', exact=True).last.click(); pg.wait_for_timeout(150)
    m=modal(pg); m.locator('#f_amount').fill('250'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(400); t.ok(len(G('payments'))==2, 'segundo pagamento (quitação)')
    t.go('financeiro'); tx=pg.locator('#main tbody').first.inner_text(); t.ok('Pago' in tx, 'status Pago após quitar')
    # ---------- relatório
    t.go('relatorios'); t.btn('Novo relatório'); m=modal(pg); m.locator('#f_studentId').select_option('s1'); m.locator('#f_score_grammar').fill('7'); m.locator('#f_score_speaking').fill('11'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(250)
    t.ok(len(G('reports'))==0, 'nota 11 recusada'); m.locator('#f_score_speaking').fill('6.5'); m.locator('#f_strengths').fill('Bom vocabulário'); m.locator('button[type=submit]').click(); pg.wait_for_timeout(500)
    r=G('reports'); t.ok(len(r)==1 and r[0]['scores']['grammar']['score']==7 and 'attendancePct' in r[0]['snapshot'], 'relatório salvo com snapshot'); t.ok('Relatório de desempenho' in modal(pg).inner_text() and '6,8' in modal(pg).inner_text(), 'visualização com média 6,8')
    modal(pg).get_by_role('button', name='Baixar HTML').click(); pg.wait_for_timeout(400); t.ok(any(d['filename'].endswith('.html') for d in pg.evaluate('window.__downloads')), 'export HTML do relatório')
    pg.keyboard.press('Escape')
    # ---------- busca global
    pg.fill('#gsearch','joana'); pg.wait_for_timeout(300); t.ok('Joana' in pg.inner_text('.search-res'), 'busca global acha aluno')
    pg.fill('#gsearch','')
    # ---------- exportações / backup / restauração / exclusão
    t.go('configuracoes'); t.btn('Alunos', exact=True); t.btn('Baixar backup completo'); pg.wait_for_timeout(300)
    dl=pg.evaluate('window.__downloads'); t.ok(any(d['filename'].endswith('.csv') for d in dl) and any(d['filename'].endswith('.json') for d in dl), 'CSV e backup baixados '+str([d['filename'] for d in dl]))
    bk=pg.evaluate('JSON.stringify(backupObject())'); total=sum(len(v) for v in json.loads(bk)['collections'].values()); print('backup registros',total)
    t.go('alunos'); pg.locator('[data-act="st-delete"]').first.click(); pg.wait_for_timeout(250); print(modal(pg).inner_text()[:300]); modal(pg).get_by_role('button', name='Excluir').last.click(); pg.wait_for_timeout(1200)
    t.ok(t.count('students')==0 and t.count('lessons')==0 and t.count('payments')==0 and t.count('homework')==0, 'excluir aluno remove dados ligados (cascata) c/ confirmação')
    t.go('configuracoes'); t.btn('Restaurar backup'); m=modal(pg); import tempfile,os
    f=tempfile.NamedTemporaryFile('w',suffix='.json',delete=False); f.write(bk); f.close(); m.locator('input[type=file]').set_input_files(f.name); m.locator('button[type=submit]').click(); pg.wait_for_timeout(300); modal(pg).get_by_role('button', name='Restaurar', exact=True).last.click(); pg.wait_for_timeout(1500)
    t.ok(t.count('students')==1 and t.count('payments')==2 and t.count('reports')==1, 'restauração de backup devolveu os dados')
    t.btn('Restaurar backup'); m=modal(pg); f=tempfile.NamedTemporaryFile('w',suffix='.json',delete=False); f.write('{"a":1}'); f.close(); m.locator('input[type=file]').set_input_files(f.name); m.locator('button[type=submit]').click(); pg.wait_for_timeout(300); t.ok('não é um backup' in pg.inner_text('#toasts'), 'backup inválido recusado'); pg.keyboard.press('Escape')
    print('ERRS', t.errs[:8]); print('FAILS', t.fails); t.b.close()
