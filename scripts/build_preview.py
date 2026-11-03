#!/usr/bin/env python3
"""Make preview/index.html: public/index.html without the document skeleton,
for publishing as a claude.ai Artifact (which adds its own skeleton)."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', 'public', 'index.html'), encoding='utf-8').read()
head = re.search(r'<head>(.*)</head>', src, re.S).group(1)
body = re.search(r'<body>(.*)</body>', src, re.S).group(1)
head = re.sub(r'<meta (charset|name="viewport"|name="description")[^>]*>\n?', '', head)
head = re.sub(r'<link rel="(manifest|apple-touch-icon)"[^>]*>\n?', '', head)
out = head.strip() + '\n<style>body{background:var(--bg)}</style>\n' + body.strip() + '\n'
os.makedirs(os.path.join(HERE, '..', 'preview'), exist_ok=True)
open(os.path.join(HERE, '..', 'public', 'preview.html'), 'w', encoding='utf-8').write(out)
print('wrote public/preview.html', len(out), 'bytes')
