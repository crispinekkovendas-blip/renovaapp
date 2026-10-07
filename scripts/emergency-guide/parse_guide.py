# Converte o Guia de Prescrições da Emergência em JSON estruturado:
# capítulos -> tópicos -> blocos {k: tipo, t: texto}.
import fitz, json, re, sys, unicodedata

import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
# O PDF não vai para o repositório; passe o caminho como argumento.
SRC = sys.argv[1] if len(sys.argv) > 1 else 'E:/admin-moved/Downloads/Guiadeprescriesdaemergncia-2026-Atualizado.pdf'
d = fitz.open(SRC)

FIRST, LAST = 8, 207  # conteúdo (1-based); 1-7 = capa, autores, sumário


def kind(size, bold, color, text, font=''):
    s = round(size)
    if 'Italic' in font and color in ('202020', '000000', '434343', '827269'):
        return 'route'
    if s == 9 and color == '434343' and bold:
        return 'ped' if text.startswith('Dose pediátrica') else 'sub'
    if s == 9 and color == '9e9088' and not bold and len(text) < 40 and not re.search(r'\d', text) and not text.endswith(':') and not text.startswith(('Dose', 'Equivale')) and text[:1].isupper() and len(text) >= 5 and not text.endswith('.'):
        return 'section'
    if s == 14 and text.strip() == '+':
        return 'plus'
    if s == 16 and color == 'ad1614':
        return 'chapter'
    if s == 11 and color == '434343':
        return 'topic'
    if s == 11 and color == '9e9088':
        return 'sub'
    if s == 9 and color in ('827269', '434343'):
        return 'sub'
    if color in ('ad1614', '5a9242') and s in (8, 9):
        return 'drug' if bold else 'drugnote'
    if color == '9e9088':
        return 'ped'
    if color == 'ff914d':
        return 'tip'
    if color == 'b4b4b4':
        return 'skip'
    if s == 7:
        return 'table'
    if color in ('202020', '000000') and s in (9, 11):
        return 'strong' if bold else 'text'
    return None


def chrome(page_no, size, color, text, bbox):
    t = text.strip()
    if not t:
        return True
    if 'ASSISTIR A AULA' in t or t.startswith('Aprenda a prescrever'):
        return True
    if round(size) == 11 and color == 'ad1614' and t.isdigit():
        return True
    if bbox[1] > 520:  # rodapé
        return True
    return False


lines = []  # (page, kind, text, x0)
for pn in range(FIRST, LAST + 1):
    p = d[pn - 1]
    for b in p.get_text('dict', sort=True)['blocks']:
        if b['type'] != 0:
            continue
        for l in b['lines']:
            spans = [s for s in l['spans'] if s['text'].strip()]
            if not spans:
                continue
            s = spans[0]
            text = ''.join(x['text'] for x in l['spans']).strip()
            color = f"{s['color']:06x}"
            bold = 'Bold' in s['font']
            if chrome(pn, s['size'], color, text, l['bbox']):
                continue
            k = kind(s['size'], bold, color, text, s['font'])
            if k == 'skip' or text in ('POTÁSSIO', 'SÓDIO', 'CÁLCIO'):
                continue
            if text == 'Meningite e encefalite':
                k = 'section'
            if k is None:
                print('?? estilo', pn, round(s['size']), color, bold, text[:60], file=sys.stderr)
                k = 'text'
            # Linha que começa em negrito ("Dose máxima:") e segue normal: fica "strong".
            lines.append({'p': pn, 'k': k, 't': text})

ENDS = re.compile(r'(?<!\b[A-Z])[.:;!?]$')
chapters = []
chapter = None
topic = None


def new_topic(title, page):
    global topic
    topic = {'title': title, 'page': page, 'blocks': []}
    chapter['topics'].append(topic)


for ln in lines:
    k, t, pn = ln['k'], ln['t'], ln['p']
    if k == 'chapter':
        chapter = {'title': t, 'topics': []}
        chapters.append(chapter)
        topic = None
        continue
    if chapter is None:
        chapter = {'title': 'GERAL', 'topics': []}
        chapters.append(chapter)
    if k == 'section':
        new_topic(t, pn)
        topic['section'] = True
        continue
    if k == 'topic':
        if topic and topic.get('section') and not topic['blocks']:
            topic['title'] = topic['title'] + ' — ' + t
            topic['section'] = False
            continue
        # Título partido em duas linhas ("TROMBOSE VENOSA ... (TVP) E" / "(TEP)").
        if topic and not topic['blocks'] and topic['page'] >= pn - 1:
            topic['title'] += ' ' + t
        else:
            new_topic(t, pn)
        continue
    if topic is None:
        new_topic(chapter['title'], pn)
    blocks = topic['blocks']
    prev = blocks[-1] if blocks else None
    cont_kinds = {'route': ('route',), 'text': ('text', 'strong'), 'strong': ('text', 'strong'), 'ped': ('ped',), 'tip': ('tip',),
                  'drugnote': ('drugnote',), 'sub': ('sub',), 'drug': ('drug',), 'table': ('table',)}
    if prev and prev['k'] == 'tip' and k in ('text', 'strong') and not ENDS.search(prev['t']):
        prev['t'] += ' ' + t
        continue
    if prev and prev['k'] == k and prev['t'] == t:
        continue
    if prev and prev['k'] in cont_kinds.get(k, ()) and not ENDS.search(prev['t']) and not re.match(r'^(\d+[.)]|[•\-–])\s?', t):
        joiner = '' if prev['t'].endswith('-') and not prev['t'].endswith(' -') else ' '
        prev['t'] = (prev['t'][:-1] if joiner == '' else prev['t']) + joiner + t
        continue
    blocks.append({'k': k, 't': t, 'p': pn})

# Limpeza de espaços duplicados e hifenização "ob- servação".
for c in chapters:
    for tp in c['topics']:
        for b in tp['blocks']:
            b['t'] = re.sub(r'\s+', ' ', b['t']).replace('​', '').strip()

json.dump(chapters, open('guide.raw.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
n = sum(len(c['topics']) for c in chapters)
print(len(chapters), 'capítulos', n, 'tópicos', sum(len(tp['blocks']) for c in chapters for tp in c['topics']), 'blocos')
for c in chapters:
    print('#', c['title'], '→', ' | '.join(f"{tp['title']} ({len(tp['blocks'])})" for tp in c['topics']))
