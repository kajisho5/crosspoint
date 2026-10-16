"""機種抽出メモ（tools/guide/notes/<id>.md、公開 Reference Manual の MIDI Implementation を Markdown 表に転記したもの）
→ parse_guide.py と同じ生パラメータ行 JSON。Remote Control Guide が無く Reference Manual の付録にしか
アドレスマップが無い機種（V-8HD / V-1HD / V-1SDI / VR-4HD / V-02HD MK II）用。

入力の表は列順が機種メモごとに違うので、見出し行（Address / アドレス、Size / サイズ、Parameter / 名前、
Sys.Ex / 値域、Meaning / 意味）から列の役割を決める。見出し（### / ####）のテキストをサブセクション名にし、
「xx = 00–05：INPUT 1–6」のような注記は normalize.py の '* xxH: 00H-05H (INPUT 1-6)' 形式に直す。

使い方：python3 tools/guide/notes_to_raw.py tools/guide/notes/v8hd.md tools/guide/v8hd.raw.json
"""
import json, re, sys

HEX2 = r'[0-9A-F]{2}'
ADDR_CELL = re.compile(rf'^(#?)\s*({HEX2}|xx)H?\s+({HEX2}|xx)H?\s+({HEX2})H?(?:\s*[–\-/,]\s*(?:{HEX2}H?\s*)+)?\s*$', re.I)
INST_HEAD = re.compile(r'xx\s*H?\s*=\s*([0-9A-F]{2})H?\s*[–\-]\s*([0-9A-F]{2})H?\s*[：:（(]\s*([^）)]+)')
INST_LIST = re.compile(r'xx\s*H?\s*=\s*((?:[0-9A-F]{2}H?\s*,\s*)+[0-9A-F]{2})H?\s*[：:（(]\s*([^）)]+)')

ROLE_WORDS = {
    'addr': ('address', 'アドレス'),
    'size': ('size', 'サイズ'),
    'name': ('parameter', 'name', '名前', 'パラメータ'),
    'sysex': ('sys', '値域', 'sysex', 'value'),
    'meaning': ('meaning', '意味'),
}

def norm(s):
    s = s.replace('–', '-').replace('—', '-').replace('’', "'").replace('　', ' ')
    s = s.replace('（', ' (').replace('）', ') ').replace('：', ': ').replace('、', ', ')
    return ' '.join(s.split()).strip()

def add_h(s):
    """'00-05' / '7E 00 00, 7F 79 60-00 00 00' / '00H-05H' → 'H' 付きに統一"""
    s = norm(s)
    if not s or s in ('-', '—', '同', '同上'):
        return ''
    return re.sub(rf'\b({HEX2})(?!H)\b(?![\.\d%])', r'\1H', s)

def roles_of(header_cells):
    roles = []
    for c in header_cells:
        cl = norm(c).lower()
        role = None
        for r, words in ROLE_WORDS.items():
            if any(w in cl for w in words):
                role = r
                break
        roles.append(role)
    # 'Parameter Name' と 'Meaning of Value' の両方に 'value' / 'name' が含まれる揺れを補正
    if roles.count('sysex') > 1:
        first = roles.index('sysex')
        roles = [r if (r != 'sysex' or i == first) else 'meaning' for i, r in enumerate(roles)]
    return roles

def instance_note(text):
    t = norm(text)
    m = INST_HEAD.search(t)
    if m:
        return f"* xxH: {m.group(1).upper()}H-{m.group(2).upper()}H ({norm(m.group(3))})"
    m = INST_LIST.search(t)
    if m:
        hs = [h.strip().rstrip('H').rstrip('h') for h in m.group(1).split(',')]
        return "* xxH: " + ', '.join(f'{h.upper()}H' for h in hs) + f" ({norm(m.group(2))})"
    return None

def parse_addr(cell):
    c = norm(cell)
    m = ADDR_CELL.match(c)
    if not m:
        return None
    a1, a2, a3 = m.group(2).upper(), m.group(3).upper(), m.group(4).upper()
    if a2.lower() == 'xx':
        a2 = 'xx'
    if a1.lower() == 'xx':
        return None
    # 末尾の範囲 '04-05' / '00H / 01H / 02H' → サイズ
    tail = c[m.end(4):]
    extra = re.findall(rf'({HEX2})H?', tail)
    size = 1
    if extra:
        last = int(extra[-1], 16)
        if '-' in tail:
            size = last - int(a3, 16) + 1
        else:
            size = 1 + len(extra)
    return [a1, a2, a3], max(size, 1)

def convert(md_path):
    rows = []
    sub = None
    inst = None
    roles = None
    in_table = False
    for raw in open(md_path, encoding='utf-8'):
        line = raw.rstrip('\n')
        bold = re.match(r'^\*\*([^*]+)\*\*(.*)$', line)
        if line.startswith('#') or bold:
            if bold:
                level = 4
                title = bold.group(1).strip()
                line = bold.group(1) + bold.group(2)
            else:
                level = len(line) - len(line.lstrip('#'))
                title = line.lstrip('#').strip()
            title = re.sub(r'\s*Ref\s*行.*$', '', title).strip()
            title = re.sub(r'[（(]\s*(p\.|行|Ref|G |R |p ).*$', '', title).strip()
            title = re.sub(r'\s*[（(][^（）()]*(行|p\.)[^（）()]*[）)]\s*', ' ', title).strip()
            if level >= 3:
                note = instance_note(line)
                if note:
                    inst = note
                    title = re.sub(r'\s*[（(]\s*xx.*$', '', title).strip()
                else:
                    inst = None
                sub = re.sub(r'^[A-Z]\.\s*', '', title)
                sub = re.sub(r'^\d+(-\d+)*\.?\s*', '', sub)
                sub = sub.split(' — ')[-1].split('—')[-1].strip() if '—' in sub else sub
                sub = norm(sub)
            in_table = False
            roles = None
            continue
        if not line.startswith('|'):
            in_table = False
            roles = None
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if all(re.fullmatch(r':?-{2,}:?', c) for c in cells if c):
            continue
        if roles is None:
            roles = roles_of(cells)
            if 'addr' in roles and ('sysex' in roles or 'name' in roles):
                in_table = True
                continue
            roles = None
            # 見出し行が無い表（2 列の領域一覧など）は飛ばす
            continue
        if not in_table or len(cells) < 2:
            continue
        rec = {}
        for i, c in enumerate(cells):
            r = roles[i] if i < len(roles) else None
            if r:
                rec[r] = c
        if 'addr' not in rec:
            continue
        pa = parse_addr(rec['addr'])
        if pa is None:
            continue
        addr, size = pa
        if 'size' in rec and re.fullmatch(r'\d+', norm(rec['size'])):
            size = int(norm(rec['size']))
        name = norm(rec.get('name', ''))
        if not name or name.lower() in ('reserved', '(reserved)', '-'):
            continue
        rows.append({'page': 0, 'section': 'Parameter Address Map', 'sub': sub, 'addr': addr, 'size': size,
                     'notes': [inst] if inst else [], 'name': name, 'sysex': add_h(rec.get('sysex', '')),
                     'meaning': norm(rec.get('meaning', ''))})
    return rows

if __name__ == '__main__':
    rows = convert(sys.argv[1])
    json.dump(rows, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    print(len(rows), 'rows', dict(Counter(r['size'] for r in rows)))
    print(len(Counter(r['sub'] for r in rows)), 'subs:', sorted(Counter(r['sub'] for r in rows).items())[:60])
    print('with xx note:', sum(1 for r in rows if r['notes']))
