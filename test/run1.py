import os
import sys, json
from playwright.sync_api import sync_playwright
mock = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock.js')).read()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':1280,'height':900})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
    pg.add_init_script(mock)
    pg.goto('file:///home/claude/eth/index.html'); pg.wait_for_timeout(1500)
    print(pg.inner_text('body')[:900]); print('ERRS', errs[:10])
    pg.screenshot(path='/tmp/s1.png')
    b.close()
