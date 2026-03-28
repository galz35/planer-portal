#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / 'v2backend' / 'src'
OUT = Path(__file__).resolve().parents[1] / 'data' / 'endpoints_manifest.json'

ctrl_re = re.compile(r'@Controller\(([^)]*)\)')
method_re = re.compile(r'@(Get|Post|Put|Delete|Patch|All)\(([^)]*)\)', re.MULTILINE)


def clean(arg: str) -> str:
    arg = arg.strip()
    if arg in ('', "''", '""'):
        return ''
    if (arg.startswith("'") and arg.endswith("'")) or (arg.startswith('"') and arg.endswith('"')):
        return arg[1:-1]
    return arg


def join_paths(a: str, b: str) -> str:
    a = a.strip('/')
    b = b.strip('/')
    if a and b:
        return f'/{a}/{b}'
    if a:
        return f'/{a}'
    if b:
        return f'/{b}'
    return '/'


entries = []
for file in sorted(ROOT.rglob('*.controller.ts')):
    text = file.read_text(encoding='utf-8', errors='ignore')
    cm = ctrl_re.search(text)
    cprefix = clean(cm.group(1)) if cm else ''

    for m in method_re.finditer(text):
        method = m.group(1).upper()
        suffix = clean(m.group(2))
        path = join_paths(cprefix, suffix)
        entries.append(
            {
                'controller': str(file.relative_to(ROOT)).replace('\\\\', '/'),
                'method': method,
                'path': path,
                'implemented_in_rust': False,
            }
        )

manifest = {
    'source': 'v2sistema/v2backend/src/**/*.controller.ts',
    'total_endpoints': len(entries),
    'implemented_endpoints': 0,
    'progress_percent': 0,
    'endpoints': entries,
}

OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Generated {OUT} with {len(entries)} endpoints')
