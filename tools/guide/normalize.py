"""Remote Control Guide の生パラメータ表（parse_guide.py の出力）→ アプリ用パラメータ定義 JSON。

入力 1 行 = {page, section, sub, addr:[a1,a2,a3]（'xx' あり）, size, name, sysex, meaning, notes}
出力 = {model, groups:[{id, title, area, instances:[{xx, label}] | null, params:[Param]}]}
Param = {id, name, a1, a2, a3, size, kind, ...}
  kind: 'bool' | 'enum' | 'int' | 'level' | 'char' | 'ro'（読取専用）
  int: min, max（表示値）, scale（表示 = raw × scale）, unit, offset（raw 0 の表示値を示す zeroLabel）
  level: 3byte s21、-INF あり
  enum: labels[]（raw 0.. 順）、または values[]（raw が連続でないとき）
  exec: 書くと実行されるトリガ（PRESET RECALL 等）
  writeOnly / readOnly
heuristics で決まらない行は unparsed に出すので、目視で確認して手で直す。
"""
import json, re, sys

DASH = '-'

def hexes(s):
    return [int(h[:-1], 16) for h in re.findall(r'[0-9A-F]{2}H', s)]

def parse_sysex(sysex, size):
    """sysex 文字列 → (min_raw, max_raw, signed, values|None, negInf)
    size バイトの 7bit 連結値として解釈。"""
    s = sysex.replace('–', DASH)
    neg_inf = False
    if s.startswith('7EH 00H 00H,'):
        neg_inf = True
        s = s.split(',', 1)[1].strip()
    # 'xxH, yyH, zzH' → 離散値
    if ',' in s and DASH not in s:
        vals = [to_signed(v, 1) for v in hexes(s)]
        if not vals:
            return None
        return (min(vals), max(vals), any(v < 0 for v in vals), vals, neg_inf)
    # 'aaH-bbH' / 'aaH-00H-bbH' / 'aaH bbH-ccH ddH' / 'aaH bbH-ccH ddH-eeH ffH' / '00H-1DH, 7FH'
    extra = []
    if ',' in s:
        main, rest = s.split(',', 1)
        extra = hexes(rest)
        s = main
    parts = [p.strip() for p in s.split(DASH) if p.strip()]
    raws = []
    for p in parts:
        hs = hexes(p)
        if not hs:
            continue
        v = 0
        for h in hs:
            v = (v << 7) | h
        raws.append(v)
    if not raws:
        return None
    bits = 7 * size
    signed = raws[0] > raws[-1] or (len(raws) == 3 and raws[0] > raws[1])
    lo, hi = raws[0], raws[-1]
    if signed:
        lo = to_signed_bits(lo, bits)
        hi = to_signed_bits(hi, bits)
    if extra and hi - lo < 256:
        return (lo, hi, signed, list(range(lo, hi + 1)) + extra, neg_inf)
    return (lo, hi, signed, None, neg_inf)

def to_signed_bits(v, bits):
    return v - (1 << bits) if v & (1 << (bits - 1)) else v

def to_signed(v, size):
    return to_signed_bits(v, 7 * size)

NUM = r'-?\d+(?:\.\d+)?'
RANGE_RE = re.compile(rf'^({NUM})(?:{DASH}({NUM}))?(?:{DASH}({NUM}))?\s*([A-Za-z%°/]*)\s*(.*)$')

def expand_labels(meaning):
    """'HDMI 1-8, SDI 1-8, STILL 1-16' → 32 個のラベル。'INPUT 1-10' → 10 個。'AUDIO IN 1-3/4' → 1, 2, 3/4"""
    out = []
    for tok in split_commas(meaning):
        tok = tok.strip()
        m = re.match(rf'^(.*?)(\d+){DASH}(\d+)(/\d+)?$', tok)
        if m and not re.search(r'\d\.\d', tok):
            base, a, b, frac = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
            if frac:  # '1-3/4' → 1, 2, 3/4
                for i in range(a, b):
                    out.append(f'{base}{i}')
                out.append(f'{base}{b}{frac}')
            else:
                for i in range(a, b + 1):
                    out.append(f'{base}{i}')
        else:
            out.append(tok)
    return out

def split_commas(s):
    # 括弧内のカンマは分割しない
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur)
    return [x.strip() for x in out if x.strip()]

def classify(row):
    name, sysex, meaning, size = row['name'], row['sysex'].replace('–', DASH), row['meaning'].replace('–', DASH), row['size']
    flags = {}
    m_low = meaning.lower()
    if '(read only)' in m_low or 'read only' in m_low:
        flags['readOnly'] = True
    if '(write only)' in m_low:
        flags['writeOnly'] = True
    if 'executes when written' in m_low:
        flags['exec'] = True
    meaning_clean = re.sub(r'\(read only\)|\(write only\)|\* executes when written\.?', '', meaning, flags=re.I).strip().rstrip('.')
    meaning_clean = re.sub(r'\s*-\s*\+?', '-', meaning_clean) if re.match(rf'^{NUM}', meaning_clean) else meaning_clean
    meaning_clean = meaning_clean.replace('-0 -', '-0-')
    ps = parse_sysex(sysex, size)
    # 文字（ラベル・ログイン名・パスワード）
    if re.search(r'character\)', m_low) or sysex.strip() == '20H-7EH':
        return dict(kind='char', **flags)
    if ps is None:
        return dict(kind='unknown', **flags)
    lo, hi, signed, values, neg_inf = ps
    # レベル（-INF あり 3byte）
    if neg_inf:
        return dict(kind='level', min=-80.0, max=10.0, scale=0.1, unit='dB', **flags)
    # 数値範囲
    rm = RANGE_RE.match(meaning_clean)
    toks = split_commas(meaning_clean)
    if rm and (rm.group(2) is not None or rm.group(4)) and len(toks) == 1 and ' ' not in meaning_clean.split(rm.group(4) or '\x00')[0].strip():
        nums = [float(x) for x in (rm.group(1), rm.group(2), rm.group(3)) if x is not None]
        dmin, dmax = nums[0], nums[-1]
        unit = rm.group(4) or ''
        span_raw = hi - lo
        scale = (dmax - dmin) / span_raw if span_raw else 1
        # きれいな scale に丸める
        for cand in (1, 0.1, 0.01, 0.5, 0.25, 2, 5, 10, 100, 1000):
            if abs(scale - cand) < 1e-6:
                scale = cand
                break
        return dict(kind='int', min=dmin, max=dmax, rawMin=lo, rawMax=hi, scale=scale, unit=unit, signed=signed, **flags)
    # 'OFF, 1-120sec' / 'N/A, 0.0-4.0sec' → 0 にラベル付き数値
    if len(toks) == 2 and RANGE_RE.match(toks[1]) and not re.search(r'[A-Za-z]', toks[0].replace('N/A', '').replace('OFF', '').replace('Off', '')):
        rm2 = RANGE_RE.match(toks[1])
        nums = [float(x) for x in (rm2.group(1), rm2.group(2), rm2.group(3)) if x is not None]
        unit = rm2.group(4) or ''
        span_raw = hi - (lo + 1)
        scale = (nums[-1] - nums[0]) / span_raw if span_raw else 1
        for cand in (1, 0.1, 0.01, 0.5, 2, 5, 10):
            if abs(scale - cand) < 1e-6:
                scale = cand
                break
        return dict(kind='int', min=nums[0], max=nums[-1], rawMin=lo + 1, rawMax=hi, scale=scale, unit=unit, signed=signed, zeroLabel=toks[0], zeroRaw=lo, **flags)
    # 列挙
    labels = expand_labels(meaning_clean)
    if values is not None:
        if len(labels) == len(values):
            return dict(kind='enum', values=values, labels=labels, **flags)
    count = hi - lo + 1
    if labels and (len(labels) == count or len(labels) == 2 and count == 2):
        if lo == 0 and len(labels) == 2 and labels[0].upper() in ('OFF', 'DISABLE') and labels[1].upper() in ('ON', 'ENABLE'):
            return dict(kind='bool', labels=labels, **flags)
        return dict(kind='enum', values=list(range(lo, hi + 1)), labels=labels, **flags)
    if labels and len(labels) != count and not rm and count <= 256:
        return dict(kind='enum', values=list(range(lo, hi + 1)), labels=labels, mismatch=True, **flags)
    if not labels and hi > lo:
        # 意味欄が無い（別資料参照）→ 生の数値として編集可能にする
        return dict(kind='int', min=lo, max=hi, rawMin=lo, rawMax=hi, scale=1, unit='', signed=signed, raw=True, **flags)
    return dict(kind='unknown', rawMin=lo, rawMax=hi, **flags)

INST_RE = re.compile(r'\*\s*xxH:\s*(.*)$')

def parse_instances(note):
    """'* xxH: 01H-04H (HDMI IN 1-4), 09H-10H (SDI IN 1-8)' → [{xx, label}]"""
    m = INST_RE.match(note.replace('–', DASH))
    if not m:
        return None
    body = m.group(1)
    out = []
    for seg in re.finditer(r'([0-9A-F]{2}H(?:\s*[,-]\s*[0-9A-F]{2}H)*)\s*\(([^)]*)\)', body):
        hs = hexes(seg.group(1))
        if DASH in seg.group(1):
            xs = list(range(hs[0], hs[-1] + 1))
        else:
            xs = hs
        labels = expand_labels(seg.group(2))
        if len(labels) != len(xs):
            # 'CTL/EXP 1, 2' のような形
            labels = [f'{seg.group(2)}'] * len(xs) if len(labels) == 1 else labels
        for i, x in enumerate(xs):
            out.append({'xx': x, 'label': labels[i] if i < len(labels) else f'{x:02X}'})
    return out or None

AREA = {'00': 'video', '01': 'audio', '02': 'system', '0A': 'other', '0C': 'tally', '60': 'name',
        # Reference Manual 系（V-8HD / VR-4HD / V-1HD / V-1SDI / V-02HD MK II）
        '03': 'system', '0B': 'panel', '50': 'other', '70': 'system', '71': 'video', '72': 'other', '73': 'panel', '10': 'other'}

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def normalize(rows, model):
    groups = {}
    unparsed = []
    for r in rows:
        if r['sub'] is None or r['addr'][0] not in AREA or (r['addr'][0] == '00' and r['addr'][1] == '00' and r['addr'][2] == '00' and 'Area' in r['name']):
            continue
        if 'Parameter Area' in r['name'] or 'Parameter (Memory' in r['name']:
            continue
        inst_note = next((n for n in r['notes'] if n.startswith('* xxH')), None)
        key = (r['sub'], inst_note)
        if key not in groups:
            groups[key] = {'id': f"{slug(r['sub'])}-{len(groups)}", 'title': r['sub'], 'area': AREA[r['addr'][0]],
                           'instances': parse_instances(inst_note) if inst_note else None, 'params': []}
        g = groups[key]
        c = classify(r)
        p = {'id': slug(r['name']) or f"p{len(g['params'])}", 'name': r['name'], 'a1': r['addr'][0], 'a2': r['addr'][1], 'a3': r['addr'][2], 'size': r['size'],
             'sysex': r['sysex'], 'meaning': r['meaning'], **c}
        if c['kind'] == 'unknown':
            unparsed.append(p)
        # 同名 id の重複回避
        ids = {q['id'] for q in g['params']}
        if p['id'] in ids:
            p['id'] = f"{p['id']}-{r['addr'][2].lower()}"
        g['params'].append(p)
    # 連続する 1 文字パラメータ（LABEL (0)…(7)、LOGIN NAME 1…8、PASSWORD 1…16）→ 1 つの text パラメータに統合
    for g in groups.values():
        merged = []
        for p in g['params']:
            base = re.sub(r'\s*\(?\d+\)?$', '', p['name']).strip()
            if p['kind'] == 'char' and merged and merged[-1]['kind'] == 'text' and merged[-1]['base'] == base and merged[-1]['a2'] == p['a2'] and int(merged[-1]['a3'], 16) + merged[-1]['size'] == int(p['a3'], 16):
                merged[-1]['size'] += 1
                continue
            if p['kind'] == 'char':
                q = dict(p); q['kind'] = 'text'; q['base'] = base; q['name'] = base; q['id'] = slug(base); q['size'] = 1
                merged.append(q)
                continue
            merged.append(p)
        for q in merged:
            q.pop('base', None)
        g['params'] = merged
    # 'xx' なのに instances が無いグループ
    for g in groups.values():
        if any(p['a2'] == 'xx' for p in g['params']) and not g['instances']:
            g['warning'] = 'xx instances missing'
    return {'model': model, 'groups': list(groups.values())}, unparsed

if __name__ == '__main__':
    src, model, dst = sys.argv[1], sys.argv[2], sys.argv[3]
    rows = json.load(open(src, encoding='utf-8'))
    out, unparsed = normalize(rows, model)
    json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    kinds = Counter(p['kind'] for g in out['groups'] for p in g['params'])
    print(model, len(out['groups']), 'groups', sum(len(g['params']) for g in out['groups']), 'params', dict(kinds))
    for g in out['groups']:
        if g.get('warning'):
            print('  WARN', g['title'], g['warning'])
    for p in unparsed:
        print('  UNPARSED', p['a1'], p['a2'], p['a3'], p['size'], '|', p['name'], '|', p['sysex'][:40], '|', p['meaning'][:60])
