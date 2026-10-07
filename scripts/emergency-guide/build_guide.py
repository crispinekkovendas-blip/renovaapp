# Aplica a errata ao JSON extraído e gera src/lib/emergency-guide/data.ts.
import json, re, sys, unicodedata
from errata import TYPOS, JOINS, FIXES, NOTES, DROPS, REPLACE, MERGE_INTO_PREVIOUS, SPLITS, RENAMES, AS_SUB

import os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'src', 'lib', 'emergency-guide', 'data.ts')
os.chdir(HERE)
g = json.load(open('guide.raw.json', encoding='utf8'))
problems = []


def topics():
    for c in g:
        for t in c['topics']:
            yield c, t


def topic(sub):
    for c, t in topics():
        if sub in t['title']:
            return t
    problems.append(f'tópico não achado: {sub}')
    return None


for c, t in topics():
    for b in t['blocks']:
        b.pop('p', None)
        for a, z in TYPOS:
            b['t'] = b['t'].replace(a, z)

for sub, a, z in JOINS:
    t = topic(sub)
    hit = [b for b in t['blocks'] if b['t'].endswith(a)]
    if not hit:
        problems.append(f'join: {sub} / {a}')
    for b in hit[:1]:
        b['t'] = b['t'][: -len(a)] + z

n_fix = 0
for sub, a, z, why, after in FIXES:
    t = topic(sub)
    if not t:
        continue
    start = 0
    if after:
        idx = [i for i, b in enumerate(t['blocks']) if after in b['t']]
        if not idx:
            problems.append(f'fix after não achado: {sub} / {after}')
            continue
        start = idx[0]
    hit = next((b for b in t['blocks'][start:] if a in b['t']), None)
    if not hit:
        problems.append(f'fix não achado: {sub} / {a}')
        continue
    orig = hit['t']
    hit['t'] = hit['t'].replace(a, z, 1)
    hit['fix'] = {'orig': orig, 'why': why}
    n_fix += 1

n_note = 0
for sub, a, note in NOTES:
    t = topic(sub)
    hit = next((b for b in t['blocks'] if a in b['t']), None) if t else None
    if not hit:
        problems.append(f'nota não achada: {sub} / {a}')
        continue
    hit['note'] = note
    n_note += 1

for sub, text, nth, _why in DROPS:
    t = topic(sub)
    idx = [i for i, b in enumerate(t['blocks']) if b['t'] == text]
    if len(idx) < nth:
        problems.append(f'drop não achado: {sub} / {text} #{nth}')
        continue
    del t['blocks'][idx[nth - 1]]

for sub, start, n, new in REPLACE:
    t = topic(sub)
    idx = next((i for i, b in enumerate(t['blocks']) if b['t'].startswith(start)), None)
    if idx is None:
        problems.append(f'replace não achado: {sub} / {start}')
        continue
    removed = t['blocks'][idx: idx + n]
    t['blocks'][idx: idx + n] = [dict(b, fix={'orig': ' | '.join(r['t'] for r in removed), 'why': 'Tabela do PDF refeita para leitura; conteúdo mantido.'}) if i == 0 else dict(b) for i, b in enumerate(new)]

for sub, text in AS_SUB:
    t = topic(sub)
    for b in t['blocks']:
        if b['t'] == text:
            b['k'] = 'sub'

for c in g:
    kept = []
    for t in c['topics']:
        if t['title'] in MERGE_INTO_PREVIOUS and kept:
            kept[-1]['blocks'].append({'k': 'sub', 't': MERGE_INTO_PREVIOUS[t['title']]})
            kept[-1]['blocks'].extend(t['blocks'])
        else:
            kept.append(t)
    c['topics'] = kept

for sub, start, title in SPLITS:
    done = False
    for c in g:
        for ti, t in enumerate(c['topics']):
            if sub not in t['title']:
                continue
            idx = next((i for i, b in enumerate(t['blocks']) if b['k'] == 'strong' and b['t'].startswith(start)), None)
            if idx is None:
                continue
            first = t['blocks'][idx]
            rest = first['t'][len(start):].strip()
            moved = ([{'k': 'sub', 't': rest}] if rest else []) + t['blocks'][idx + 1:]
            t['blocks'] = t['blocks'][:idx]
            c['topics'].insert(ti + 1, {'title': title, 'page': t['page'], 'blocks': moved})
            done = True
            break
        if done:
            break
    if not done:
        problems.append(f'split não achado: {sub} / {start}')

for title, nth, new, why in RENAMES:
    hits = [t for c, t in topics() if t['title'] == title]
    if len(hits) < nth:
        problems.append(f'rename não achado: {title}')
        continue
    t = hits[nth - 1]
    if why:
        t['fix'] = {'orig': t['title'], 'why': why}
    t['title'] = new
for c in g:
    if c['title'] == 'Especial: GESTANTES':
        c['title'] = 'GESTANTES'

# Texto que sobrou vazio.
for c, t in topics():
    t['blocks'] = [b for b in t['blocks'] if b['t'].strip() or b['k'] in ('plus', 'grid')]

KEEP = {'TVP', 'TEP', 'ICAD', 'EAP', 'CAD', 'EHH', 'DPOC', 'AVC', 'SNC', 'PS', 'IST', 'HIV', 'ITU', 'PBE', 'OMA', 'SUA'}
LOWER = {'e', 'de', 'da', 'do', 'das', 'dos', 'no', 'na', 'em', 'a', 'o', 'por', 'para', 'ou', 'com', 'sem'}


def pretty(title):
    words = re.split(r'(\s+|[()/,:—–-])', title)
    out = []
    first = True
    for w in words:
        core = w.strip()
        if not core or re.fullmatch(r'[()/,:—–-]', core):
            out.append(w)
            continue
        if core.upper() in KEEP:
            out.append(core.upper())
        elif first:
            out.append(core[:1].upper() + core[1:].lower())
        else:
            out.append(core.lower())
        first = False
    s = ''.join(out)
    s = re.sub(r'\bh\. pylori', 'H. pylori', s)
    return s.rstrip(':').strip()


def slug(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


TITLE_OVERRIDES = {
    'Paralisia de bell': 'Paralisia de Bell',
    'Intoxicação alcoolica': 'Intoxicação alcoólica',
    'Controle da dor musculoesquelética no pronto socorro': 'Dor musculoesquelética no pronto-socorro',
    'Bacterianas superficiais - celulite e erisipela': 'Celulite e erisipela',
    'Bacterianas purulentas - furunculose e abscesso': 'Furunculose e abscesso',
    'Bacterianas graves ou profundas - sinais sistêmicos (internação), fatores de risco ou profundas (fasceíte)': 'Infecções bacterianas graves ou profundas (fasceíte)',
    'Adjuvantes': 'Anafilaxia — adjuvantes',
    'Alergias': 'Reações alérgicas',
    'Causas externas': 'Mordeduras',
    'Organofosforados/carbamatos': 'Organofosforados e carbamatos',
}
seen = set()
data = []
for c in g:
    ch = {'title': pretty(c['title'].replace('SISTEMA ', 'Sistema ')), 'topics': []}
    ch['title'] = ch['title'][:1].upper() + ch['title'][1:]
    for t in c['topics']:
        title = TITLE_OVERRIDES.get(pretty(t['title']), pretty(t['title']))
        s = slug(title)
        base, k = s, 2
        while s in seen:
            s, k = f'{base}-{k}', k + 1
        seen.add(s)
        topic_out = {'slug': s, 'title': title, 'page': t['page'], 'blocks': t['blocks']}
        if 'fix' in t:
            topic_out['fix'] = t['fix']
        ch['topics'].append(topic_out)
    data.append(ch)

# Revisões seguintes (2ª, 3ª…): já sobre os títulos finais. Cada correção e
# aviso leva o número da revisão ('rev'); corrigir de novo um trecho guarda a
# correção anterior em 'earlier', para o app mostrar o histórico inteiro.
import importlib


def final_topic(title, rev):
    for c in data:
        for t in c['topics']:
            if t['title'] == title:
                return t
    problems.append(f'revisão {rev} — tópico não achado: {title}')
    return None


def set_fix(b, a, z, why, rev, everywhere=False):
    orig = b['t']
    b['t'] = b['t'].replace(a, z) if everywhere else b['t'].replace(a, z, 1)
    if 'fix' in b:
        old = dict(b['fix'])
        old.setdefault('rev', 1)
        b['earlier'] = b.get('earlier', []) + [old]
    b['fix'] = {'orig': orig, 'why': why, 'rev': rev}


def set_note(b, note, rev, replaced_why=None):
    # Aviso novo sobre um trecho que já tinha aviso: o antigo fica visível como
    # "substituído", com o motivo, para o médico ver o que mudou.
    if 'note' in b:
        b['notesEarlier'] = b.get('notesEarlier', []) + [{
            'note': b['note'], 'rev': b.get('noteRev', 1),
            'withdrawn': replaced_why or f'Substituído pelo aviso da {rev}ª revisão.',
            'withdrawnRev': rev, 'replaced': True,
        }]
    b['note'] = note
    b['noteRev'] = rev


for rev in range(2, 20):
    try:
        R = importlib.import_module(f'errata_revisao{rev}')
    except ModuleNotFoundError:
        continue
    # (titulo, trecho, novo, motivo[, depois_de]): 'depois_de' é um trecho de um bloco
    # anterior, para achar o certo quando o mesmo texto se repete no tópico.
    for title, a, z, why, *after in getattr(R, 'FIXES', []):
        t = final_topic(title, rev)
        blocks = t['blocks'] if t else []
        if after:
            start = next((i for i, b in enumerate(blocks) if after[0] in b['t']), None)
            if start is None:
                problems.append(f'revisão {rev} — "depois de" não achado: {title} / {after[0]}')
                continue
            blocks = blocks[start + 1:]
        hit = next((b for b in blocks if a in b['t']), None)
        if not hit:
            problems.append(f'revisão {rev} — trecho não achado: {title} / {a}')
            continue
        set_fix(hit, a, z, why, rev)
    for a, z, why in getattr(R, 'FIX_EVERYWHERE', []):
        hits = [b for c in data for t in c['topics'] for b in t['blocks'] if a in b['t']]
        if not hits:
            problems.append(f'revisão {rev} — trecho (em todo o guia) não achado: {a}')
        for b in hits:
            set_fix(b, a, z, why, rev, everywhere=True)
    for title, a, note, *why in getattr(R, 'NOTES', []):
        t = final_topic(title, rev)
        hit = next((b for b in t['blocks'] if a in b['t']), None) if t else None
        if not hit:
            problems.append(f'revisão {rev} — âncora não achada: {title} / {a}')
            continue
        set_note(hit, note, rev, why[0] if why else None)
    # Aviso retirado: some da tela, mas fica no histórico com o motivo.
    for title, a, why in getattr(R, 'WITHDRAW_NOTES', []):
        t = final_topic(title, rev)
        hit = next((b for b in t['blocks'] if a in b['t'] and 'note' in b), None) if t else None
        if not hit:
            problems.append(f'revisão {rev} — aviso a retirar não achado: {title} / {a}')
            continue
        hit['notesEarlier'] = hit.get('notesEarlier', []) + [{'note': hit.pop('note'), 'rev': hit.pop('noteRev', 1), 'withdrawn': why, 'withdrawnRev': rev}]

if problems:
    print('\n'.join(problems))
    sys.exit(1)

n_topics = sum(len(c['topics']) for c in data)
n_blocks = sum(len(t['blocks']) for c in data for t in c['topics'])
fixes = sum(1 for c in data for t in c['topics'] for b in t['blocks'] if 'fix' in b) + sum(1 for c in data for t in c['topics'] if 'fix' in t)
notes = sum(1 for c in data for t in c['topics'] for b in t['blocks'] if 'note' in b)
header = '''// Gerado por scripts/emergency-guide/build_guide.py a partir do PDF do Guia de Prescrições da Emergência (2ª ed.).
// Não editar à mão: corrija a errata e gere de novo.
import type { GuideChapter } from "./types.ts";

export const EMERGENCY_GUIDE: readonly GuideChapter[] = '''
J = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':'))
lines = ['[']
for c in data:
    lines.append(' {"title":' + J(c['title']) + ',"topics":[')
    for t in c['topics']:
        head = {k: v for k, v in t.items() if k != 'blocks'}
        lines.append('  ' + J(head)[:-1] + ',"blocks":[')
        lines.extend('   ' + J(b) + ',' for b in t['blocks'])
        lines.append('  ]},')
    lines.append(' ]},')
lines.append(']')
body = chr(10).join(lines)
open(OUT, 'w', encoding='utf8', newline='\n').write(header + body + ';\n')
blocks_all = [b for c in data for t in c['topics'] for b in t['blocks']]
by_rev = {r: sum(1 for b in blocks_all if b.get('fix', {}).get('rev') == r or b.get('noteRev') == r) for r in range(2, 20)}
by_rev = {r: n for r, n in by_rev.items() if n}
print(f'{len(data)} capítulos, {n_topics} tópicos, {n_blocks} blocos, {fixes} correções, {notes} avisos; por revisão: {by_rev}')
for c in data:
    print('#', c['title'], '→', ' | '.join(t['title'] for t in c['topics']))
