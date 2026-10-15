#!/usr/bin/env python3
"""SW CROSSPOINT — Step 2 デザインボード SVG 生成（iPhone 393x852pt）"""
from pathlib import Path

W, H = 393, 852
GAP = 56
TOP = 96
FONT = "-apple-system, 'SF Pro Text', 'Hiragino Sans', Inter, 'Noto Sans CJK JP', sans-serif"
MONO = "'SF Mono', ui-monospace, Menlo, 'JetBrains Mono', monospace"

C = dict(
    bg="#000000", g1="#1C1C1E", g2="#2C2C2E", g3="#3A3A3C", sep="#38383A",
    lab="#FFFFFF", lab2="#EBEBF5", lab2a="0.60", lab3a="0.30",
    pgm="#FF3B30", pst="#30D158", acc="#0A84FF", warn="#FF9F0A",
)


def t(x, y, s, size=15, w=400, fill="#FFFFFF", anchor="start", op=1.0, mono=False, ls=0):
    fam = MONO if mono else FONT
    s = str(s).replace("&", "&amp;").replace("<", "&lt;")
    return (f'<text x="{x}" y="{y}" font-family="{fam}" font-size="{size}" font-weight="{w}" '
            f'fill="{fill}" fill-opacity="{op}" text-anchor="{anchor}" letter-spacing="{ls}">{s}</text>')


def r(x, y, w, h, rx=0, fill="none", stroke=None, sw=1, op=1.0):
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" fill-opacity="{op}"{st}/>'


def status_bar():
    o = [t(52, 37, "9:41", 17, 600, anchor="middle")]
    # signal / wifi / battery
    for i, hh in enumerate([4, 6, 8, 10]):
        o.append(r(300 + i * 5, 34 - hh, 3, hh, 1, C["lab"]))
    o.append('<path d="M330 26 a9 9 0 0 1 14 0 M333 29 a5 5 0 0 1 8 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>')
    o.append('<circle cx="337" cy="32" r="1.6" fill="#fff"/>')
    o.append(r(350, 24, 25, 12, 3.5, "none", "#fff", 1, 1))
    o.append(r(352, 26, 18, 8, 2, C["lab"]))
    o.append(r(376.5, 28, 1.5, 4, 0.5, C["lab"], op=0.5))
    # dynamic island
    o.append(r(134, 11, 125, 37, 18.5, "#000"))
    return "".join(o)


def home_ind():
    return r(130, 838, 134, 5, 2.5, C["lab"])


def tab_bar(active):
    items = [("switcher", "スイッチャー"), ("keys", "キー"), ("audio", "オーディオ"), ("memory", "メモリー"), ("more", "その他")]
    o = [r(0, 769, W, 83, 0, "#121212", op=0.94), f'<line x1="0" y1="769" x2="{W}" y2="769" stroke="{C["sep"]}" stroke-width="0.5"/>']
    cw = W / 5
    for i, (k, lab) in enumerate(items):
        cx = cw * i + cw / 2
        col = C["acc"] if k == active else "#8E8E93"
        o.append(icon(k, cx, 790, col))
        o.append(t(cx, 818, lab, 10, 500, col, "middle"))
    o.append(home_ind())
    return "".join(o)


def icon(kind, cx, cy, col):
    if kind == "switcher":
        return "".join(r(cx - 11 + (i % 3) * 8, cy - 8 + (i // 3) * 9, 6, 7, 1.5, col) for i in range(6))
    if kind == "keys":
        return (f'<rect x="{cx-11}" y="{cy-8}" width="22" height="16" rx="3" fill="none" stroke="{col}" stroke-width="2"/>'
                f'<rect x="{cx+1}" y="{cy-4}" width="7" height="6" rx="1.5" fill="{col}"/>')
    if kind == "audio":
        o = ""
        for i, (yy) in enumerate([-2, 3, -5]):
            x = cx - 8 + i * 8
            o += f'<line x1="{x}" y1="{cy-9}" x2="{x}" y2="{cy+9}" stroke="{col}" stroke-width="2" stroke-linecap="round"/>'
            o += r(x - 3.5, cy + yy - 2, 7, 4, 1.5, col)
        return o
    if kind == "memory":
        return "".join(r(cx - 10 + (i % 2) * 11, cy - 9 + (i // 2) * 10, 9, 8, 2, col) for i in range(4))
    if kind == "more":
        return "".join(f'<circle cx="{cx-8+i*8}" cy="{cy}" r="2.4" fill="{col}"/>' for i in range(3))
    return ""


def conn_pill(x, y, label="LAN", rtt="12 ms", state="ok"):
    col = {"ok": C["pst"], "warn": C["warn"], "err": C["pgm"]}[state]
    w = 112
    return (r(x, y, w, 30, 15, C["g1"]) + f'<circle cx="{x+16}" cy="{y+15}" r="4.5" fill="{col}"/>'
            + t(x + 28, y + 20, label, 13, 600) + t(x + w - 12, y + 20, rtt, 12, 500, C["lab2"], "end", 0.6, mono=True))


def nav_header(title, sub=None, pill=True):
    o = [t(16, 96, title, 28, 700)]
    if sub:
        o.append(t(16, 70, sub, 13, 500, C["lab2"], op=0.6, ls=0.4))
    if pill:
        o.append(conn_pill(265, 70))
    return "".join(o)


LABELS = ["CAM 1", "CAM 2", "CAM 3", "CAM 4", "PC 1", "PC 2", "SDI 7", "SDI 8", "STILL 1", "STILL 2"]
TALLY = {0: "pgm", 2: "pst"}  # index -> bus  (PGM=INPUT1, PST=INPUT3)


def xp_button(x, y, w, h, n, label, bus, selected, tally):
    """クロスポイントボタン。selected=そのバスで選択中、tally=全体タリー（他バス表示用）"""
    if selected:
        fill = C["pgm"] if bus == "pgm" else C["pst"]
        o = [r(x, y, w, h, 12, fill)]
        tc, nc, nop = "#FFFFFF", "#FFFFFF", 0.85
    else:
        o = [r(x, y, w, h, 12, C["g2"])]
        tc, nc, nop = "#FFFFFF", C["lab2"], 0.6
        if tally:
            col = C["pgm"] if tally == "pgm" else C["pst"]
            o.append(r(x + 1, y + 1, w - 2, h - 2, 11, "none", col, 2))
    o.append(t(x + 8, y + 16, str(n), 11, 600, nc, op=nop, mono=True))
    o.append(t(x + w / 2, y + h / 2 + 10, label, 13, 600, tc, "middle"))
    return "".join(o)


def crosspoint_grid(y0, bus, sel):
    o = []
    bw, bh, g = 66, 58, 8
    for i in range(10):
        cx = 16 + (i % 5) * (bw + 8)
        cy = y0 + (i // 5) * (bh + g)
        tally = TALLY.get(i)
        o.append(xp_button(cx, cy, bw, bh, i + 1, LABELS[i], bus, i == sel, tally if i != sel else None))
    return "".join(o)


def section_label(x, y, s, col=None, dot=None):
    o = ""
    if dot:
        o += f'<circle cx="{x+4}" cy="{y-4}" r="4" fill="{dot}"/>'
        x += 14
    return o + t(x, y, s, 13, 600, col or C["lab2"], op=0.6 if not col else 1, ls=0.6)


# ---------------- S1 スイッチャー ----------------
def screen_switcher():
    o = [status_bar()]
    o.append(t(16, 76, "DEMO-SW-A", 13, 600, C["lab2"], op=0.6, ls=0.6))
    o.append(t(16, 98, "V-160HD", 22, 700))
    o.append(t(120, 98, "FW 3.60", 13, 500, C["lab2"], op=0.6, mono=True))
    o.append(conn_pill(265, 72))
    # transition strip
    y = 116
    o.append(r(16, y, 180, 34, 9, C["g1"]))
    o.append(r(18, y + 2, 88, 30, 7, C["g3"]))
    o.append(t(62, y + 22, "MIX", 14, 600, anchor="middle"))
    o.append(t(150, y + 22, "WIPE", 14, 500, C["lab2"], "middle", 0.6))
    o.append(r(206, y, 171, 34, 9, C["g1"]))
    o.append(t(220, y + 22, "TIME", 12, 600, C["lab2"], op=0.6, ls=0.6))
    o.append(t(292, y + 23, "1.0s", 16, 600, anchor="middle", mono=True))
    o.append(f'<line x1="326" y1="{y+8}" x2="326" y2="{y+26}" stroke="{C["sep"]}"/>')
    o.append(t(344, y + 23, "−", 20, 500, C["acc"], "middle"))
    o.append(t(366, y + 23, "+", 20, 500, C["acc"], "middle"))
    # PGM
    o.append(section_label(16, 180, "PGM", C["pgm"], C["pgm"]))
    # バンク切替 1–10 / 11–20（INPUT 11–20 は 0x2A–0x33）
    o.append(r(255, 164, 122, 24, 7, C["g1"]))
    o.append(r(257, 166, 58, 20, 5, C["g3"]))
    o.append(t(286, 180, "1–10", 11, 700, anchor="middle", mono=True))
    o.append(t(346, 180, "11–20", 11, 600, C["lab2"], "middle", 0.6, mono=True))
    o.append(crosspoint_grid(190, "pgm", 0))
    # PST
    o.append(section_label(16, 346, "PST", C["pst"], C["pst"]))
    o.append(crosspoint_grid(356, "pst", 2))
    # CUT / AUTO
    by = 506
    o.append(r(16, by, 172, 118, 18, C["g2"]))
    o.append(t(102, by + 68, "CUT", 30, 800, anchor="middle", ls=2))
    o.append(t(102, by + 94, "押している間 ON", 11, 500, C["lab2"], "middle", 0.5))
    ay = by + 128
    o.append(r(16, ay, 172, 118, 18, C["acc"]))
    o.append(t(102, ay + 68, "AUTO", 30, 800, anchor="middle", ls=2))
    o.append(f'<circle cx="160" cy="{ay+24}" r="10" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="3"/>')
    o.append(f'<path d="M160 {ay+14} a10 10 0 0 1 9.5 13.1" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>')
    o.append(t(102, ay + 94, "1.0s · EMULATED", 11, 600, "#FFFFFF", "middle", 0.7, mono=True))
    # T-BAR
    tx, tw, ty, th = 200, 177, by, 246
    o.append(r(tx, ty, tw, th, 18, C["g1"]))
    o.append(t(tx + 14, ty + 24, "T-BAR", 12, 600, C["lab2"], op=0.6, ls=0.6))
    o.append(t(tx + tw - 14, ty + 24, "38%", 15, 600, anchor="end", mono=True))
    trx = tx + 58
    o.append(r(trx, ty + 40, 14, 190, 7, C["g3"]))
    o.append(r(trx, ty + 40 + 190 * 0.62, 14, 190 * 0.38, 7, C["acc"]))
    for i in range(11):
        yy = ty + 40 + i * 19
        o.append(f'<line x1="{trx+26}" y1="{yy}" x2="{trx+(40 if i%5==0 else 34)}" y2="{yy}" stroke="#fff" stroke-opacity="0.3"/>')
    hy = ty + 40 + 190 * 0.62 - 14
    o.append(r(trx - 30, hy, 74, 28, 8, "#F2F2F7"))
    o.append(f'<line x1="{trx-18}" y1="{hy+14}" x2="{trx+32}" y2="{hy+14}" stroke="#8E8E93" stroke-width="2"/>')
    o.append(t(tx + tw - 14, ty + 52, "B", 13, 700, C["lab2"], "end", 0.6, mono=True))
    o.append(t(tx + tw - 14, ty + 232, "A", 13, 700, C["lab2"], "end", 0.6, mono=True))
    o.append(tab_bar("switcher"))
    return "".join(o)


# ---------------- S0 接続（シート） ----------------
def screen_connect():
    o = [status_bar()]
    # dimmed background
    o.append(r(0, 54, W, 30, 0, "#111"))
    o.append(r(0, 64, W, H - 64, 12, C["g1"]))
    o.append(r(176, 70, 40, 5, 2.5, "#5A5A5E"))
    o.append(t(16, 108, "キャンセル", 17, 400, C["acc"]))
    o.append(t(W / 2, 108, "接続", 17, 600, anchor="middle"))
    # segmented
    sy = 128
    o.append(r(16, sy, 361, 34, 9, "#2A2A2D"))
    o.append(r(18, sy + 2, 118, 30, 7, "#636366"))
    o.append(t(77, sy + 22, "LAN / Wi-Fi", 14, 600, anchor="middle"))
    o.append(t(197, sy + 22, "USB", 14, 500, anchor="middle", op=0.8))
    o.append(t(318, sy + 22, "Bluetooth", 14, 500, anchor="middle", op=0.8))
    # saved
    o.append(t(32, 196, "保存済みデバイス", 13, 500, C["lab2"], op=0.6))
    ly = 206
    o.append(r(16, ly, 361, 120, 10, C["g2"]))
    rows = [("DEMO-SW-A", "192.168.0.50 · LAN", True), ("DEMO-SW-B", "USB · Roland V-160HD", False)]
    for i, (nm, sub, chk) in enumerate(rows):
        yy = ly + i * 60
        o.append(r(30, yy + 14, 32, 32, 8, C["acc"] if i == 0 else "#48484A"))
        o.append(r(38, yy + 22, 16, 11, 2, "none", "#fff", 1.6))
        o.append(f'<line x1="42" y1="{yy+37}" x2="50" y2="{yy+37}" stroke="#fff" stroke-width="1.6"/>')
        o.append(t(74, yy + 28, nm, 17, 500))
        o.append(t(74, yy + 47, sub, 13, 400, C["lab2"], op=0.6, mono=True))
        if chk:
            o.append('<path d="M343 %d l6 6 l11 -13" stroke="%s" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' % (yy + 30, C["acc"]))
        else:
            o.append(t(360, yy + 36, "›", 22, 400, C["lab2"], "end", 0.3))
        if i == 0:
            o.append(f'<line x1="74" y1="{yy+60}" x2="377" y2="{yy+60}" stroke="{C["sep"]}" stroke-width="0.5"/>')
    # new LAN form
    o.append(t(32, 360, "新規（LAN）", 13, 500, C["lab2"], op=0.6))
    fy = 370
    o.append(r(16, fy, 361, 176, 10, C["g2"]))
    fields = [("名前", "DEMO-SW-C", False), ("IP アドレス", "192.168.0.51", True), ("ポート", "8023", True), ("パスワード", "••••", False)]
    for i, (k, v, mono) in enumerate(fields):
        yy = fy + i * 44
        o.append(t(32, yy + 28, k, 17, 400))
        o.append(t(361, yy + 28, v, 17, 400, C["lab2"] if i != 3 else "#fff", "end", 0.6 if i != 3 else 1, mono=mono))
        if i < 3:
            o.append(f'<line x1="32" y1="{yy+44}" x2="377" y2="{yy+44}" stroke="{C["sep"]}" stroke-width="0.5"/>')
    o.append(t(32, 570, "本体 MENU → LAN CONTROL で IP アドレスと", 13, 400, C["lab2"], op=0.6))
    o.append(t(32, 588, "4桁の NETWORK PASSWORD を確認してください。", 13, 400, C["lab2"], op=0.6))
    # connect button
    o.append(r(16, 690, 361, 52, 14, C["acc"]))
    o.append(t(W / 2, 722, "接続", 17, 600, anchor="middle"))
    # state line
    o.append(f'<circle cx="138" cy="663" r="6" fill="none" stroke="{C["warn"]}" stroke-width="2" stroke-dasharray="20 18"/>')
    o.append(t(152, 668, "認証中…  VER 確認待ち", 13, 500, C["warn"], mono=True))
    o.append(home_ind())
    return "".join(o)


# ---------------- S2 キー ----------------
def toggle_pill(x, y, label, on, bus):
    col = C["pgm"] if bus == "pgm" else C["pst"]
    if on:
        return r(x, y, 64, 34, 17, col) + t(x + 32, y + 22, label, 13, 700, anchor="middle")
    return r(x, y, 64, 34, 17, C["g3"]) + t(x + 32, y + 22, label, 13, 600, C["lab2"], "middle", 0.6)


def screen_keys():
    o = [status_bar(), nav_header("キー", "DEMO-SW-A · V-160HD")]
    groups = [("PinP & KEY", [("PinP & KEY 1", "CAM 2 · 0.5s", True, False), ("PinP & KEY 2", "PC 1 · 0.5s", False, True),
                              ("PinP & KEY 3", "STILL 1 · 1.0s", False, False), ("PinP & KEY 4", "CAM 4 · 1.0s", False, False)]),
              ("DSK", [("DSK 1", "STILL 2 · LUMA · 1.0s", True, True), ("DSK 2", "PC 2 · CHROMA · 1.0s", False, False)]),
              ("SPLIT", [("SPLIT 1", "CAM 1 / CAM 2", False, False), ("SPLIT 2", "CAM 3 / CAM 4", False, False)])]
    y = 124
    for g, rows in groups:
        o.append(t(32, y + 10, g, 13, 500, C["lab2"], op=0.6, ls=0.4))
        y += 20
        o.append(r(16, y, 361, 60 * len(rows), 10, C["g2"]))
        for i, (nm, sub, pgm, pvw) in enumerate(rows):
            yy = y + i * 60
            o.append(t(32, yy + 26, nm, 16, 600))
            o.append(t(32, yy + 45, sub, 12, 400, C["lab2"], op=0.6, mono=True))
            if g == "SPLIT":
                o.append(toggle_pill(297, yy + 13, "ON", pgm, "pgm"))
            else:
                o.append(toggle_pill(225, yy + 13, "PGM", pgm, "pgm"))
                o.append(toggle_pill(297, yy + 13, "PVW", pvw, "pst"))
            if i < len(rows) - 1:
                o.append(f'<line x1="32" y1="{yy+60}" x2="377" y2="{yy+60}" stroke="{C["sep"]}" stroke-width="0.5"/>')
        y += 60 * len(rows) + 16
    o.append(tab_bar("keys"))
    return "".join(o)


# ---------------- S3 オーディオ ----------------
def strip(x, name, db, pos, mute, w=66, master=False):
    o = []
    top, h = 150, 520
    o.append(r(x, top, w, h, 14, C["g1"] if not master else "#15233A"))
    o.append(t(x + w / 2, top + 26, name, 12, 700, anchor="middle", ls=0.4))
    o.append(t(x + w / 2, top + 48, db, 13, 600, C["lab2"] if not mute else C["pgm"], "middle", 0.8 if not mute else 1, mono=True))
    trx, trt, trh = x + w / 2 - 3, top + 70, 340
    o.append(r(trx, trt, 6, trh, 3, C["g3"]))
    fill_h = trh * (1 - pos)
    o.append(r(trx, trt + trh * pos, 6, fill_h, 3, C["acc"] if not mute else "#636366"))
    # 0dB mark
    zy = trt + trh * 0.22
    o.append(f'<line x1="{x+8}" y1="{zy}" x2="{x+16}" y2="{zy}" stroke="#fff" stroke-opacity="0.5"/>')
    o.append(f'<line x1="{x+w-16}" y1="{zy}" x2="{x+w-8}" y2="{zy}" stroke="#fff" stroke-opacity="0.5"/>')
    ky = trt + trh * pos - 16
    o.append(r(x + 9, ky, w - 18, 32, 7, "#F2F2F7"))
    o.append(f'<line x1="{x+15}" y1="{ky+16}" x2="{x+w-15}" y2="{ky+16}" stroke="#8E8E93" stroke-width="2"/>')
    my = top + h - 52
    if mute:
        o.append(r(x + 8, my, w - 16, 38, 10, C["pgm"]))
        o.append(t(x + w / 2, my + 24, "MUTE", 12, 800, anchor="middle"))
    else:
        o.append(r(x + 8, my, w - 16, 38, 10, C["g3"]))
        o.append(t(x + w / 2, my + 24, "MUTE", 12, 700, C["lab2"], "middle", 0.6))
    return "".join(o)


def screen_audio():
    o = [status_bar(), nav_header("オーディオ", "DEMO-SW-A · V-160HD")]
    o.append(t(16, 136, "INPUT", 12, 600, C["lab2"], op=0.6, ls=0.6))
    o.append(t(318, 136, "MASTER", 12, 600, C["lab2"], op=0.6, ls=0.6))
    chs = [("IN 1", "−6.0", 0.32, False), ("IN 2", "0.0", 0.22, False), ("USB", "−INF", 1.0, True), ("BT", "−12.5", 0.45, False)]
    for i, (n, d, p, m) in enumerate(chs):
        o.append(strip(16 + i * 74, n, d, p, m))
    o.append(f'<line x1="308" y1="150" x2="308" y2="670" stroke="{C["sep"]}"/>')
    o.append(strip(314, "MAIN", "−2.0", 0.27, False, w=63, master=True))
    o.append(t(162, 700, "← スワイプで HDMI / SDI 入力 →", 12, 500, C["lab2"], "middle", 0.45))
    for i in range(5):
        o.append(f'<circle cx="{142+i*10}" cy="722" r="3" fill="#fff" fill-opacity="{0.9 if i==0 else 0.25}"/>')
    o.append(tab_bar("audio"))
    return "".join(o)


# ---------------- S4 メモリー ----------------
def screen_memory():
    o = [status_bar(), nav_header("メモリー", "DEMO-SW-A · V-160HD")]
    o.append(r(16, 116, 361, 54, 12, C["g1"]))
    o.append(t(32, 139, "現在", 12, 600, C["lab2"], op=0.6))
    o.append(t(32, 160, "MEM 07", 17, 700, mono=True))
    o.append(t(361, 150, "長押しで呼び出し", 13, 500, C["lab2"], "end", 0.6))
    cw, ch, g = 66, 66, 8
    for i in range(30):
        x = 16 + (i % 5) * (cw + g)
        y = 186 + (i // 5) * (ch + g)
        cur = i == 6
        hold = i == 11
        o.append(r(x, y, cw, ch, 12, C["acc"] if cur else C["g2"]))
        o.append(t(x + cw / 2, y + 38, f"{i+1:02d}", 20, 700, "#fff", "middle", 1 if cur else 0.9, mono=True))
        o.append(t(x + cw / 2, y + 56, "SCENE" if i < 12 else "—", 9, 600, "#fff", "middle", 0.75 if i < 12 else 0.3, ls=0.6))
        if hold:
            o.append(r(x + 1.5, y + 1.5, cw - 3, ch - 3, 11, "none", C["warn"], 3))
            o.append(f'<path d="M{x+cw/2} {y+1.5} H{x+cw-12} a10.5 10.5 0 0 1 10.5 10.5 V{y+ch/2}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>')
    o.append(r(16, 640, 361, 44, 12, "#3A2A10"))
    o.append(t(W / 2, 668, "MEM 12 を呼び出し中… 指を離すとキャンセル", 13, 600, C["warn"], "middle"))
    o.append(tab_bar("memory"))
    return "".join(o)


# ---------------- コンポーネント仕様パネル ----------------
def components_panel(x0, y0, w, h):
    o = [r(x0, y0, w, h, 24, "#0B0B0C", "#2A2A2C", 1)]
    o.append(t(x0 + 28, y0 + 48, "Components & Tokens", 22, 700))
    y = y0 + 90
    o.append(t(x0 + 28, y, "CrosspointButton  66×58pt · r12", 13, 600, C["lab2"], op=0.7, mono=True))
    y += 16
    states = [("default", "", None), ("PGM 選択", "pgm", None), ("PST 選択", "pst", None), ("PGMタリー", "", "pgm"), ("PSTタリー", "", "pst"), ("disabled", "dis", None)]
    for i, (nm, sel, tl) in enumerate(states):
        x = x0 + 28 + i * 80
        if sel == "dis":
            o.append(r(x, y, 66, 58, 12, C["g2"], op=0.4) + t(x + 33, y + 39, "CAM 1", 13, 600, "#fff", "middle", 0.3))
        else:
            o.append(xp_button(x, y, 66, 58, 1, "CAM 1", sel or "pgm", bool(sel), tl))
        o.append(t(x + 33, y + 78, nm, 11, 500, C["lab2"], "middle", 0.6))
    y += 120
    o.append(t(x0 + 28, y, "ConnectionPill", 13, 600, C["lab2"], op=0.7, mono=True))
    y += 14
    o.append(conn_pill(x0 + 28, y, "LAN", "12 ms", "ok"))
    o.append(conn_pill(x0 + 152, y, "BLE", "48 ms", "warn"))
    o.append(conn_pill(x0 + 276, y, "USB", "—", "err"))
    o.append(t(x0 + 28 + 56, y + 50, "online", 11, 500, C["lab2"], "middle", 0.6))
    o.append(t(x0 + 152 + 56, y + 50, "reconnecting", 11, 500, C["lab2"], "middle", 0.6))
    o.append(t(x0 + 276 + 56, y + 50, "error / offline", 11, 500, C["lab2"], "middle", 0.6))
    y += 90
    o.append(t(x0 + 28, y, "Color tokens (Dark)", 13, 600, C["lab2"], op=0.7, mono=True))
    y += 14
    toks = [("bg", "#000000"), ("group", "#1C1C1E"), ("fill", "#2C2C2E"), ("fill2", "#3A3A3C"), ("sep", "#38383A"),
            ("pgm", C["pgm"]), ("pst", C["pst"]), ("accent", C["acc"]), ("warn", C["warn"])]
    for i, (k, v) in enumerate(toks):
        x = x0 + 28 + (i % 5) * 92
        yy = y + (i // 5) * 78
        o.append(r(x, yy, 80, 40, 8, v, "#3A3A3C", 1))
        o.append(t(x, yy + 56, k, 12, 600))
        o.append(t(x, yy + 70, v, 11, 400, C["lab2"], op=0.6, mono=True))
    y += 176
    o.append(t(x0 + 28, y, "Type scale (SF Pro / Hiragino)", 13, 600, C["lab2"], op=0.7, mono=True))
    y += 34
    for s, wgt, nm in [(28, 700, "Large Title 28 Bold"), (17, 600, "Headline 17 Semibold"), (15, 400, "Body 15 Regular"), (13, 600, "Section 13 Semibold / tracking +0.6"), (12, 500, "Mono 12 — 数値・アドレス")]:
        o.append(t(x0 + 28, y, nm, s, wgt, mono=(nm.startswith("Mono"))))
        y += s + 16
    y += 8
    o.append(t(x0 + 28, y, "Interaction rules", 13, 600, C["lab2"], op=0.7, mono=True))
    rules = ["タップ領域 ≥ 44pt。CUT/AUTO・Tバーは画面下 1/3（親指圏）",
             "クロスポイント：タップで即送信＋Haptic(.rigid)。同値は送らない",
             "CUT：touchDown で 01、touchUp/cancel で 00（必ず解除）",
             "Tバー：端到達で Haptic(.heavy)、33ms 間引き送信",
             "メモリー：0.6s 長押しで確定、指を離すとキャンセル",
             "未接続：全操作 disabled(40%) ＋上部バナー"]
    for i, s in enumerate(rules):
        o.append(t(x0 + 28, y + 26 + i * 22, "• " + s, 13, 400, C["lab2"], op=0.85))
    return "".join(o)


def phone(x, y, inner, caption, code):
    return (f'<g transform="translate({x},{y})">'
            + t(0, -40, code, 13, 700, C["acc"], mono=True, ls=1)
            + t(0, -18, caption, 18, 700)
            + f'<rect x="-10" y="-10" width="{W+20}" height="{H+20}" rx="62" fill="#1A1A1A" stroke="#3A3A3C" stroke-width="2"/>'
            + f'<clipPath id="clip{code}"><rect width="{W}" height="{H}" rx="54"/></clipPath>'
            + f'<g clip-path="url(#clip{code})"><rect width="{W}" height="{H}" fill="#000"/>{inner}</g></g>')


def main():
    screens = [(screen_connect, "接続（シート）", "S0"), (screen_switcher, "スイッチャー", "S1"),
               (screen_keys, "キー", "S2"), (screen_audio, "オーディオ", "S3"), (screen_memory, "メモリー", "S4")]
    n = len(screens)
    comp_w = 520
    total_w = 80 + n * (W + 20 + GAP) + comp_w + 40
    total_h = TOP + 60 + H + 120
    body = [f'<rect width="{total_w}" height="{total_h}" fill="#08080A"/>',
            t(80, 64, "SW CROSSPOINT — iPhone UI v0.1", 30, 800),
            t(80, 92, "Roland V-160HD remote · Dark · iPhone 393×852pt · Step 2 design (実装前確認用)", 15, 500, C["lab2"], op=0.6)]
    x = 90
    for fn, cap, code in screens:
        body.append(phone(x, TOP + 80, fn(), cap, code))
        x += W + 20 + GAP
    body.append(components_panel(x, TOP + 70, comp_w, H + 30))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w}" height="{total_h}" viewBox="0 0 {total_w} {total_h}">'
           + "".join(body) + "</svg>")
    out = Path(__file__).with_name("sw-crosspoint-board.svg")
    out.write_text(svg, encoding="utf-8")
    print(out, total_w, total_h)


if __name__ == "__main__":
    main()
