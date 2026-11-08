/* Junta src/*.js + CSS em UM arquivo estático: index.html (pronto para GitHub Pages). */
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const FILES = ['logo.js', 'logic.js', 'ui.js', 'core.js', 'pages1.js', 'pages2.js', 'pages3.js', 'pages4.js', 'pages5.js', 'pages6.js', 'pages7.js', 'pages8.js', 'demo.js', 'api.js', 'main.js'];
const js = FILES.map(src).join('\n;\n');
const head = '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
  '<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n';
const body = '\n</style>\n</head>\n<body>\n<div id="root"></div><div id="modals"></div><div class="toasts" id="toasts" aria-live="polite"></div>\n' +
  '<script src="config.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>\n<script>\n"use strict";\n' + js + '\n</script>\n</body>\n</html>\n';
const out = head + src('head.html') + src('style.css') + body;

fs.writeFileSync(path.join(__dirname, 'index.html'), out);
fs.writeFileSync(path.join(__dirname, '.nojekyll'), '');
console.log('ok index.html', (out.length / 1024).toFixed(0) + ' KB');
