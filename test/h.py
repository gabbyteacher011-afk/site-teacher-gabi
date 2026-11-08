import os
from playwright.sync_api import sync_playwright
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
mock = open(os.path.join(ROOT, 'test', 'mock.js')).read()
URL='file://' + os.path.join(ROOT, 'index.html')
class T:
    def __init__(s, p, init=None, w=1280, h=900):
        s.b = p.chromium.launch(); s.pg = s.b.new_page(viewport={'width':w,'height':h}); s.errs=[]; s.fails=[]
        s.pg.on('pageerror', lambda e: s.errs.append(str(e)))
        s.pg.on('console', lambda m: s.errs.append('console:'+m.text) if m.type=='error' and 'ERR_TUNNEL' not in m.text else None)
        if init: s.pg.add_init_script('window.__INIT_STORE=' + json_s(init) + ';')
        s.pg.add_init_script(mock)
        s.pg.goto(URL); s.pg.wait_for_selector('#shell', timeout=8000)
    def go(s, r): s.pg.evaluate("r=>{location.hash=r}", r); s.pg.wait_for_timeout(250)
    def text(s): return s.pg.inner_text('#main')
    def ok(s, cond, msg):
        print(('PASS ' if cond else 'FAIL ') + msg)
        if not cond: s.fails.append(msg)
    def click(s, sel, **k): s.pg.click(sel, **k); s.pg.wait_for_timeout(200)
    def btn(s, name, **k): s.pg.get_by_role('button', name=name, exact=k.pop('exact', False)).first.click(); s.pg.wait_for_timeout(250)
    def store(s):
        import json; return json.loads(s.pg.evaluate('window.__store()'))
    def count(s, col):
        return len([k for k in s.store() if k.startswith('data/users/u1/hub/'+col+'/') ])
def json_s(o):
    import json; return json.dumps(json.dumps(o))
