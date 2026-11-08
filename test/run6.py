import os
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
with sync_playwright() as p:
    t=T(p); pg=t.pg; t.go('configuracoes')
    pg.fill('#f_platformName','Meu Hub'); pg.fill('#f_teacherName','Gabi'); pg.select_option('#f_currency','USD'); pg.locator('form[data-form=settings] button[type=submit]').click(); pg.wait_for_timeout(600)
    print(pg.evaluate("[S.settings.platformName,S.settings.teacherName,S.settings.currency]"), pg.inner_text('#brand-name'), pg.inner_text('#brand-sub'))
    t.ok(pg.evaluate("S.settings.platformName")=='Meu Hub' and 'Meu Hub' in pg.inner_text('#brand-name'),'settings reflect desktop')
    st=t.store(); print([k for k in st if k.endswith('/hub')], st.get('data/users/u1/hub',{}).get('settings',{}).get('platformName'))
    t.go('financeiro'); print(t.text()[:200])
    print(t.errs); t.b.close()
