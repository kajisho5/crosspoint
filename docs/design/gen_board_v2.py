#!/usr/bin/env python3
"""SW CROSSPOINT — デザインボード v2（v1.2 で追加した画面：S5 その他 / F12 INPUT 設定 / F13 メニュー / F14 クイック操作 / F15 AUX / F16 マクロ / VR-120HD）
gen_board.py の部品（status_bar / tab_bar / phone / t / r / C）を再利用する。実装（app/(tabs)/more/*.tsx）の構成に合わせる。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from gen_board import C, H, W, GAP, TOP, conn_pill, home_ind, phone, r, status_bar, t, tab_bar, xp_button  # noqa: E402


def nav(title, back=None):
    """Stack ヘッダー（大タイトル無し・44pt）"""
    o = [r(0, 54, W, 44, 0, "#000")]
    if back:
        o.append(t(16, 83, "‹ " + back, 17, 400, C["acc"]))
    o.append(t(W / 2, 83, title, 17, 600, anchor="middle"))
    o.append(f'<line x1="0" y1="98" x2="{W}" y2="98" stroke="{C["sep"]}" stroke-width="0.5"/>')
    return "".join(o)


def group(y, title, rows, footer=None, row_h=44):
    """GroupCard：タイトル（13pt 60%）＋ ListRow（44pt）＋ フッター。rows = [(title, value, kind)] kind: chevron/switch_on/switch_off/check/none"""
    o = []
    if title:
        o.append(t(32, y + 10, title, 13, 500, C["lab2"], op=0.6, ls=0.4))
        y += 20
    o.append(r(16, y, 361, row_h * len(rows), 10, C["g1"]))
    for i, row in enumerate(rows):
        title_, value, kind = row[0], row[1], row[2]
        icon = row[3] if len(row) > 3 else None
        yy = y + i * row_h
        tx = 32
        if icon:
            o.append(r(32, yy + 6, 32, 32, 8, icon))
            tx = 76
        o.append(t(tx, yy + row_h / 2 + 6, title_, 17, 400))
        if kind == "chevron":
            if value:
                o.append(t(352, yy + row_h / 2 + 6, value, 17, 400, C["lab2"], "end", 0.6))
            o.append(t(365, yy + row_h / 2 + 7, "›", 22, 400, C["lab2"], "end", 0.3))
        elif kind in ("switch_on", "switch_off"):
            on = kind == "switch_on"
            o.append(r(310, yy + 7, 51, 31, 15.5, C["pst"] if on else "#39393D"))
            o.append(f'<circle cx="{334 + (12 if on else -12)}" cy="{yy+22.5}" r="13.5" fill="#fff"/>')
        elif kind == "check":
            o.append(f'<path d="M343 {yy+row_h/2} l6 6 l11 -13" stroke="{C["acc"]}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
        elif kind == "value":
            o.append(t(361, yy + row_h / 2 + 6, value, 17, 400, C["lab2"], "end", 0.6, mono=True))
        if i < len(rows) - 1:
            o.append(f'<line x1="{tx}" y1="{yy+row_h}" x2="377" y2="{yy+row_h}" stroke="{C["sep"]}" stroke-width="0.5"/>')
    y += row_h * len(rows)
    if footer:
        for j, line in enumerate(footer):
            o.append(t(32, y + 18 + j * 17, line, 13, 400, C["lab2"], op=0.6))
        y += 18 + 17 * len(footer)
    return "".join(o), y + 16


def big_button(x, y, w, h, label, active=False, sub=None):
    o = [r(x, y, w, h, 10, C["acc"] if active else C["g2"])]
    o.append(t(x + w / 2, y + h / 2 + (2 if sub else 6), label, 15, 600, "#fff", "middle", 1 if active else 0.95))
    if sub:
        o.append(t(x + w / 2, y + h / 2 + 18, sub, 11, 500, "#fff", "middle", 0.7))
    return "".join(o)


def offline_banner_none():
    return ""


# ---------------- S5 その他 ----------------
def screen_more():
    o = [status_bar(), t(16, 70, "DEMO-SW-A · V-160HD", 13, 500, C["lab2"], op=0.6, ls=0.4), t(16, 98, "その他", 28, 700), conn_pill(265, 70)]
    y = 116
    g, y = group(y, "接続", [("DEMO-SW-A", "", "chevron", C["acc"]), ("切断", "", "none")])
    o.append(g)
    g, y = group(y, "本体設定", [("AUX", "", "chevron", C["acc"]), ("マクロ・シーケンサー", "", "chevron", C["acc"]), ("クイック操作", "", "chevron", C["warn"]), ("メニュー（全パラメータ）", "", "chevron", C["acc"])],
                 ["AUX：AUX バスのソースをボタンで切替。マクロ：1–100 をタップで実行。", "クイック操作：HDMI OUT 3 切替・入力音声一括・SDI OUT LEVEL-A。"])
    o.append(g)
    g, y = group(y, "操作", [("操作ロック", "", "switch_off", "#8E8E93"), ("ハプティクス", "", "switch_on", "#8E8E93"), ("スリープ防止", "", "switch_on", C["warn"])])
    o.append(g)
    g, y = group(y, "通信", [("ポーリング周期", "200 ms", "chevron"), ("PGM 値モード", "INPUT 1–20", "chevron")])
    o.append(g)
    o.append(t(W / 2, y + 6, "↓ 診断（送受信ログ・コマンド送信）/ デモ / このアプリについて", 12, 400, C["lab2"], "middle", 0.5))
    o.append(tab_bar("more"))
    return "".join(o)


# ---------------- F12 INPUT 設定シート ----------------
def screen_input_setup():
    o = [status_bar()]
    # 背景のスイッチャーを暗く
    o.append(t(16, 98, "V-160HD", 22, 700, op=0.4))
    o.append(r(0, 0, W, H, 0, "#000", op=0.5))
    o.append(r(0, 120, W, H - 120, 12, C["g1"]))
    o.append(r(176, 126, 40, 5, 2.5, "#5A5A5E"))
    o.append(t(16, 164, "閉じる", 17, 400, C["acc"]))
    o.append(t(W / 2, 164, "INPUT 3 の設定", 17, 600, anchor="middle"))
    o.append(t(377, 164, "完了", 17, 600, C["acc"], "end"))
    y = 196
    o.append(t(32, y + 10, "ラベル（8 文字まで）", 13, 500, C["lab2"], op=0.6, ls=0.4))
    o.append(r(16, y + 20, 361, 44, 10, C["g2"]))
    o.append(t(32, y + 48, "CAM 3", 17, 400, mono=True))
    o.append(f'<line x1="86" y1="{y+32}" x2="86" y2="{y+56}" stroke="{C["acc"]}" stroke-width="2"/>')
    o.append(t(361, y + 48, "5/8", 13, 500, C["lab2"], "end", 0.6, mono=True))
    y += 84
    o.append(t(32, y + 10, "割当ソース", 13, 500, C["lab2"], op=0.6, ls=0.4))
    y += 20
    srcs = [("HDMI 1", "CAM 1"), ("HDMI 2", "CAM 2"), ("HDMI 3", "CAM 3"), ("HDMI 4", "CAM 4"), ("HDMI 5", "PC 1"), ("HDMI 6", "PC 2"), ("HDMI 7", "PC 3"), ("HDMI 8", "VTR"), ("SDI 1", ""), ("SDI 2", "")]
    o.append(r(16, y, 361, 44 * len(srcs), 10, C["g2"]))
    for i, (nm, lb) in enumerate(srcs):
        yy = y + i * 44
        o.append(t(32, yy + 28, nm, 17, 400))
        if lb:
            o.append(t(130, yy + 28, lb, 15, 400, C["lab2"], op=0.6, mono=True))
        if i == 2:
            o.append(f'<path d="M343 {yy+22} l6 6 l11 -13" stroke="{C["acc"]}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
        if i < len(srcs) - 1:
            o.append(f'<line x1="32" y1="{yy+44}" x2="377" y2="{yy+44}" stroke="{C["sep"]}" stroke-width="0.5"/>')
    o.append(t(32, y + 44 * len(srcs) + 20, "↓ SDI 3–8、STILL 1–16（スクロール）", 13, 400, C["lab2"], op=0.5))
    o.append(home_ind())
    return "".join(o)


# ---------------- F13 メニュー（一覧） ----------------
def screen_menu():
    o = [status_bar(), nav("メニュー", "その他")]
    y = 112
    groups = [("ビデオ", ["VIDEO ASSIGN", "VIDEO INPUT (HDMI)", "VIDEO INPUT (SDI)", "VIDEO OUTPUT (HDMI)", "VIDEO OUTPUT (SDI)", "MIX/WIPE", "TRANSITION TIME", "PinP & KEY", "DSK", "SPLIT"]),
              ("オーディオ", ["AUDIO INPUT", "AUDIO OUTPUT ASSIGN", "AUDIO EMBEDDED", "MASTER OUTPUT"]),
              ("システム", ["SYSTEM", "CAMERA CONTROL", "AUTO SWITCHING", "FREEZE", "LABEL EDIT"])]
    for title, items in groups:
        rows = [(nm, "", "chevron") for nm in items]
        if y + 20 + 44 * len(rows) > 780:
            rows = rows[: max(1, (780 - y - 20) // 44)]
        g, y = group(y, title, rows)
        o.append(g)
        if y > 740:
            break
    o.append(t(W / 2, 800, "↓ システム / Memory / Tally など全 32 グループ", 13, 400, C["lab2"], "middle", 0.5))
    o.append(home_ind())
    return "".join(o)


# ---------------- F13 メニュー（グループ：AUDIO INPUT） ----------------
def screen_menu_group():
    o = [status_bar(), nav("AUDIO INPUT", "メニュー")]
    y = 112
    # instance picker
    o.append(r(16, y, 361, 44, 10, C["g1"]))
    o.append(t(32, y + 28, "系統", 17, 400))
    o.append(t(352, y + 28, "HDMI IN 1", 17, 400, C["lab2"], "end", 0.6))
    o.append(t(365, y + 29, "›", 22, 400, C["lab2"], "end", 0.3))
    y += 60
    rows = [("ANALOG GAIN (*1)", "—", "value"), ("DIGITAL GAIN", "-16.8 dB", "value"), ("INPUT LEVEL", "-20.0 dB", "value"), ("INPUT MUTE", "", "switch_off"),
            ("PAN (*1)", "CENTER", "chevron"), ("STEREO LINK (*2)", "", "switch_off"), ("MONO (*3)", "LR MIX", "chevron"), ("SOLO", "", "switch_off"),
            ("EFFECT PRESET", "DEFAULT", "chevron"), ("DELAY", "0.0 msec", "value"), ("REVERB SEND", "0", "value"), ("HIGH PASS FILTER 80Hz", "", "switch_on"),
            ("NOISE GATE SW", "", "switch_off"), ("COMPRESSOR SW", "", "switch_off")]
    g, y = group(y, None, rows)
    o.append(g)
    o.append(t(W / 2, y + 8, "↓ EQ / COMPRESSOR / VOICE CHANGER …（表示中は追加ポーリング）", 12, 400, C["lab2"], "middle", 0.5))
    o.append(home_ind())
    return "".join(o)


# ---------------- F14 クイック操作 ----------------
def screen_quick():
    o = [status_bar(), nav("クイック操作", "その他")]
    y = 112
    o.append(t(32, y + 10, "HDMI OUT 3 の出力", 13, 500, C["lab2"], op=0.6, ls=0.4))
    y += 20
    o.append(r(16, y, 361, 80, 10, C["g1"]))
    bw = (361 - 32 - 20) / 3
    for i, lab in enumerate(["PROGRAM", "PREVIEW", "MULTI-VIEW"]):
        o.append(big_button(32 + i * (bw + 10), y + 12, bw, 56, lab, active=(i == 2)))
    y += 80
    o.append(t(32, y + 18, "現在：MULTI-VIEW（HDMI OUTPUT 3 ASSIGN）", 13, 400, C["lab2"], op=0.6))
    y += 40
    rows = [("HDMI/SDI 入力音声を −16.8 dB・LR MIX に", "", "chevron", C["warn"]), ("SDI OUT をすべて LEVEL-A に", "", "chevron", C["warn"])]
    o.append(t(32, y + 10, "一括設定", 13, 500, C["lab2"], op=0.6, ls=0.4))
    y += 20
    o.append(r(16, y, 361, 120, 10, C["g1"]))
    subs = ["HDMI IN 1〜SDI IN 8（16 系統）の DIGITAL GAIN を −16.8 dB、MONO を LR MIX に", "SDI OUT 1・SDI OUT 2・SDI OUT 3 の 3G-SDI MAPPING を LEVEL-A に"]
    for i, row in enumerate(rows):
        yy = y + i * 60
        o.append(r(32, yy + 14, 32, 32, 8, row[3]))
        o.append(t(76, yy + 26, row[0], 14, 400))
        o.append(t(76, yy + 45, subs[i][:30] + "…", 12, 400, C["lab2"], op=0.6))
        o.append(t(365, yy + 37, "›", 22, 400, C["lab2"], "end", 0.3))
        if i == 0:
            o.append(f'<line x1="76" y1="{yy+60}" x2="377" y2="{yy+60}" stroke="{C["sep"]}" stroke-width="0.5"/>')
    y += 120
    o.append(t(32, y + 18, "タップすると内容を確認してから本体へ書き込みます。", 13, 400, C["lab2"], op=0.6))
    # confirm dialog
    o.append(r(0, 0, W, H, 0, "#000", op=0.45))
    dx, dy, dw, dh = 63, 330, 270, 190
    o.append(r(dx, dy, dw, dh, 14, "#2C2C2E"))
    o.append(t(W / 2, dy + 32, "HDMI/SDI 入力音声を −16.8 dB・LR MIX に", 15, 600, anchor="middle"))
    o.append(t(W / 2, dy + 58, "HDMI IN 1〜SDI IN 8（16 系統）の", 13, 400, "#fff", "middle", 0.85))
    o.append(t(W / 2, dy + 76, "DIGITAL GAIN を −16.8 dB、MONO を LR MIX にします。", 13, 400, "#fff", "middle", 0.85))
    o.append(t(W / 2, dy + 104, "32 件を書き込みます。", 13, 400, "#fff", "middle", 0.85))
    o.append(f'<line x1="{dx}" y1="{dy+dh-44}" x2="{dx+dw}" y2="{dy+dh-44}" stroke="{C["sep"]}" stroke-width="0.5"/>')
    o.append(f'<line x1="{dx+dw/2}" y1="{dy+dh-44}" x2="{dx+dw/2}" y2="{dy+dh}" stroke="{C["sep"]}" stroke-width="0.5"/>')
    o.append(t(dx + dw / 4, dy + dh - 16, "キャンセル", 17, 400, C["acc"], "middle"))
    o.append(t(dx + dw * 3 / 4, dy + dh - 16, "実行", 17, 600, C["acc"], "middle"))
    o.append(home_ind())
    return "".join(o)


# ---------------- F15 AUX（VR-120HD：AUX 1/2/3） ----------------
def screen_aux():
    o = [status_bar(), nav("AUX", "その他")]
    y = 112
    o.append(r(16, y, 361, 32, 8, "#2A2A2D"))
    for i, lab in enumerate(["AUX 1", "AUX 2", "AUX 3"]):
        if i == 1:
            o.append(r(18 + i * 119, y + 2, 119, 28, 6, "#636366"))
        o.append(t(18 + i * 119 + 59, y + 21, lab, 13, 600 if i == 1 else 500, "#fff", "middle", 1 if i == 1 else 0.8))
    y += 48
    o.append(t(32, y + 10, "AUX 2 ソース", 13, 500, C["lab2"], op=0.6, ls=0.4))
    y += 20
    o.append(r(16, y, 361, 44, 10, C["g1"]))
    o.append(t(32, y + 28, "現在：SDI In 3", 13, 400, C["lab2"], op=0.6))
    y += 44
    o.append(t(32, y + 18, "AUX 2 を出している出力：HDMI OUT 2、SDI OUT 3", 13, 400, C["lab2"], op=0.6))
    y += 36
    bw, bh, gp = (361 - 24) / 4, 58, 8

    def sect(title, labels, subs, sel):
        nonlocal y
        o.append(t(20, y + 10, title, 13, 500, C["lab2"], op=0.6, ls=0.4))
        y += 18
        for i, lab in enumerate(labels):
            x = 16 + (i % 4) * (bw + gp)
            yy = y + (i // 4) * (bh + gp)
            active = i == sel
            o.append(r(x, yy, bw, bh, 12, C["acc"] if active else C["g2"]))
            o.append(t(x + bw / 2, yy + (26 if subs[i] else 34), lab, 12, 600, "#fff", "middle", 1 if active else 0.95))
            if subs[i]:
                o.append(t(x + bw / 2, yy + 44, subs[i], 11, 400, "#fff", "middle", 0.75 if active else 0.55, mono=True))
        y += ((len(labels) + 3) // 4) * (bh + gp) + 8

    sect("HDMI", [f"HDMI In {i}" for i in range(1, 7)], ["CAM 1", "CAM 2", "PC 1", "PC 2", "", ""], -1)
    sect("SDI", [f"SDI In {i}" for i in range(1, 7)], ["CAM 3", "CAM 4", "", "", "", ""], 2)
    sect("STILL", [f"Still {i}" for i in range(1, 9)], ["STILL 1"] + [""] * 7, -1)
    o.append(t(W / 2, 760, "↓ Still 9–16 / INPUT 1–8 / その他", 12, 400, C["lab2"], "middle", 0.5))
    o.append(home_ind())
    return "".join(o)


# ---------------- F16 マクロ・シーケンサー ----------------
def screen_macro():
    o = [status_bar(), nav("マクロ・シーケンサー", "その他")]
    y = 112
    o.append(t(32, y + 10, "シーケンサー", 13, 500, C["lab2"], op=0.6, ls=0.4))
    y += 20
    o.append(r(16, y, 361, 136, 10, C["g1"]))
    bw2 = (361 - 32 - 10) / 2
    o.append(big_button(32, y + 12, bw2, 56, "SEQ OFF", active=True))
    o.append(big_button(32 + bw2 + 10, y + 12, bw2, 56, "AUTO ON"))
    bw3 = (361 - 32 - 20) / 3
    for i, lab in enumerate(["先頭へ", "PREV", "NEXT"]):
        o.append(big_button(32 + i * (bw3 + 10), y + 78, bw3, 46, lab))
    y += 136
    o.append(t(32, y + 18, "LAN 簡易制御コマンド（本体 Ver.3.5 以降）。状態：ON、Auto：OFF", 12, 400, C["lab2"], op=0.6))
    y += 40
    o.append(t(32, y + 10, "マクロ 1–100", 13, 500, C["lab2"], op=0.6, ls=0.4))
    y += 20
    rows_n = 8
    o.append(r(16, y, 361, 12 + rows_n * 56, 10, C["g1"]))
    bw5 = (361 - 32 - 32) / 5
    for n in range(1, rows_n * 5 + 1):
        i = n - 1
        x = 32 + (i % 5) * (bw5 + 8)
        yy = y + 12 + (i // 5) * 56
        active = n == 7
        o.append(r(x, yy, bw5, 48, 12, C["acc"] if active else C["g2"]))
        o.append(t(x + bw5 / 2, yy + 30, str(n), 17, 600, "#fff", "middle", 1 if active else 0.9, mono=True))
    y += 12 + rows_n * 56
    o.append(t(32, y + 18, "最後に実行：マクロ 7", 13, 400, C["lab2"], op=0.6))
    o.append(home_ind())
    return "".join(o)


# ---------------- スイッチャー（VR-120HD：INPUT 1–8、CUT/AUTO は簡易制御コマンド） ----------------
def screen_switcher_vr120():
    o = [status_bar()]
    o.append(t(16, 76, "DEMO-SW-C", 13, 600, C["lab2"], op=0.6, ls=0.6))
    o.append(t(16, 98, "VR-120HD", 22, 700))
    o.append(t(130, 98, "FW 2.20", 13, 500, C["lab2"], op=0.6, mono=True))
    o.append(conn_pill(265, 72))
    y = 116
    o.append(r(16, y, 180, 34, 9, C["g1"]))
    o.append(r(18, y + 2, 88, 30, 7, C["g3"]))
    o.append(t(62, y + 22, "MIX", 14, 600, anchor="middle"))
    o.append(t(150, y + 22, "WIPE", 14, 500, C["lab2"], "middle", 0.6))
    o.append(r(206, y, 171, 34, 9, C["g1"]))
    o.append(t(220, y + 22, "TIME", 12, 600, C["lab2"], op=0.6, ls=0.6))
    o.append(t(292, y + 23, "1.0s", 16, 600, anchor="middle", mono=True))
    labels = ["CAM 1", "CAM 2", "CAM 3", "CAM 4", "PC 1", "PC 2", "VP/SRT", "STILL 1"]
    bw, bh = (361 - 24) / 4, 58
    for bus, y0, sel, title, col in (("pgm", 190, 0, "PROGRAM", C["pgm"]), ("pst", 346, 2, "PRESET", C["pst"])):
        o.append(f'<circle cx="20" cy="{y0-14}" r="4" fill="{col}"/>')
        o.append(t(30, y0 - 10, title, 13, 600, col, ls=0.6))
        for i in range(8):
            x = 16 + (i % 4) * (bw + 8)
            yy = y0 + (i // 4) * (bh + 8)
            tally = {0: "pgm", 2: "pst"}.get(i)
            o.append(xp_button(x, yy, bw, bh, i + 1, labels[i], bus, i == sel, tally if i != sel else None))
    by = 506
    o.append(r(16, by, 172, 118, 18, C["g2"]))
    o.append(t(102, by + 68, "CUT", 30, 800, anchor="middle", ls=2))
    o.append(t(102, by + 94, "タップで切替", 11, 500, C["lab2"], "middle", 0.5))
    ay = by + 128
    o.append(r(16, ay, 172, 118, 18, C["acc"]))
    o.append(t(102, ay + 68, "AUTO", 30, 800, anchor="middle", ls=2))
    o.append(t(102, ay + 94, "1.0s", 11, 600, "#FFFFFF", "middle", 0.7, mono=True))
    tx, tw, ty, th = 200, 177, by, 246
    o.append(r(tx, ty, tw, th, 18, C["g1"]))
    o.append(t(tx + 14, ty + 24, "T-BAR", 12, 600, C["lab2"], op=0.6, ls=0.6))
    trx = tx + 58
    o.append(r(trx, ty + 40, 14, 190, 7, C["g3"]))
    o.append(r(trx, ty + 40 + 190 * 0.62, 14, 190 * 0.38, 7, C["acc"]))
    hy = ty + 40 + 190 * 0.62 - 14
    o.append(r(trx - 30, hy, 74, 28, 8, "#F2F2F7"))
    o.append(tab_bar("switcher"))
    return "".join(o)


def main():
    screens = [(screen_more, "その他", "S5"), (screen_input_setup, "INPUT 設定（長押し）", "F12"), (screen_menu, "メニュー（全パラメータ）", "F13a"), (screen_menu_group, "メニュー › AUDIO INPUT", "F13b"),
               (screen_quick, "クイック操作（確認中）", "F14"), (screen_aux, "AUX（VR-120HD）", "F15"), (screen_macro, "マクロ・シーケンサー", "F16"), (screen_switcher_vr120, "スイッチャー（VR-120HD）", "S1b")]
    per_row = 4
    rows = (len(screens) + per_row - 1) // per_row
    total_w = 80 + per_row * (W + 20 + GAP) + 40
    total_h = TOP + 60 + rows * (H + 120) + 40
    body = [f'<rect width="{total_w}" height="{total_h}" fill="#08080A"/>',
            t(80, 64, "SW CROSSPOINT — iPhone UI v1.2 追加画面", 30, 800),
            t(80, 92, "その他 / INPUT 設定 / メニュー / クイック操作 / AUX / マクロ・シーケンサー / VR-120HD · 実装の構成どおり（docs/design/gen_board_v2.py）", 15, 500, C["lab2"], op=0.6)]
    for idx, (fn, cap, code) in enumerate(screens):
        x = 90 + (idx % per_row) * (W + 20 + GAP)
        y = TOP + 80 + (idx // per_row) * (H + 120)
        body.append(phone(x, y, fn(), cap, code))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w}" height="{total_h}" viewBox="0 0 {total_w} {total_h}">' + "".join(body) + "</svg>")
    out = Path(__file__).with_name("sw-crosspoint-board-v2.svg")
    out.write_text(svg, encoding="utf-8")
    print(out, total_w, total_h)


if __name__ == "__main__":
    main()
