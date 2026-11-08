import os
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
with sync_playwright() as p:
    t=T(p); pg=t.pg
    t.go('configuracoes'); t.btn('Carregar dados de demonstração'); t.btn('Carregar', exact=True); pg.wait_for_function("S.students.length==4", timeout=30000); pg.wait_for_timeout(800)
    for r in ['dashboard','calendario','financeiro','aulas','relatorios']:
        t.go(r); pg.wait_for_timeout(200); pg.screenshot(path=f'/tmp/d_{r}.png', full_page=True)
    pid=pg.evaluate('S.plans[0].id'); t.go('plano-'+pid); pg.screenshot(path='/tmp/d_plano.png', full_page=True)
    rid=pg.evaluate('S.reports[1].id'); pg.evaluate("openReportView('%s')"%rid); pg.wait_for_timeout(300); pg.screenshot(path='/tmp/d_rep.png')
    print(t.errs); t.b.close()
