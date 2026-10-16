# V-02HD MK II 抽出メモ

- id: `v02hdmk2` / Model: V-02HD MK II（Multi-Format Video Mixer）
- 資料：
  - `pdf/v-02hd_mk_ii/V-02HD_MKII_reference_eng03_W.txt`（Reference Manual eng03。以下「Ref」。行番号は .txt の行、p. は印刷ページ＝PDF ページ）
  - `pdf/v-02hd_mk_ii/V-02HD_MKII_Remote_eng01_W_1.txt`（iPad 接続ガイド。以下「Remote」）
- MIDI Implementation：Ref p.56–70（.txt 3516–4701）。Date June 17, 2021 / Version 1.00（Ref 3517–3519）
- 既対応 3 機種（V-160HD / V-80HD / VR-120HD）との最大の違い：**LAN 無し・RS-232 無し・MIDI DIN 無し・Bluetooth 無し。接続は USB STREAM（USB Type-C）1 本だけ**。入力 2 系統（HDMI×2）、PGM/PST バス選択ではなく「背景チャンネル＋ビデオフェーダー」モデル。

## 1. 接続手段

| 手段 | 可否 | 根拠 |
|---|---|---|
| LAN | **無し**（Ethernet 端子無し。Main Specifications の External Connectors は USB STREAM と CTL/EXP のみ） | Ref p.73 行 4870–4873 |
| USB | **USB STREAM port（USB Type-C）**。「for backup from PC, for remote control from PC and iPad」 | Ref p.73 行 4871、p.4 行 225 |
| Bluetooth | **無し**（資料中に Bluetooth の記載なし） | Ref 全文 grep |
| RS-232 | **無し** | Ref p.73 行 4870–4873 |
| MIDI DIN | **無し**（MIDI Implementation の見出しは「MIDI Messages Received at MIDI IN」だが、MIDI IN 端子は存在しない） | Ref p.56 行 3530、p.73 |
| CTL/EXP | 1/4" TRS（フットスイッチ/エクスプレッションペダル用。iPhone からは使えない） | Ref p.73 行 4873 |

- 公式 iPad アプリ「V-02HD MK II Remote」は **USB 接続専用**：「You can connect the V-02HD MK II to your iPad via USB and use the V-02HD MK II Remote app to remotely control」（Remote 行 6–8、Ref 行 15–17）
- 接続手順（Remote p.2 行 30–54）：iPad を V-02HD MK II の **USB STREAM port** に接続 → V-02HD MK II の電源を入れる → iPad でアプリ起動 → ステータスアイコンが「ONLINE」になれば接続。ケーブルは「USB Type-C cable」（USB-C iPad）または「USB cable (USB Type-C to A) + Lightning to USB camera adapter」（Lightning iPad）
- アプリの対応 FW：「compatible with V-02HD MK II system program version 1.03 and later」（Remote 行 20–21、Ref 行 20–21）
- 接続の注意（Remote 行 11–18）：他アプリに切替・iPad のスリープ（Auto-Lock）で切断、戻ると数秒で自動再接続。長時間使用は Auto-Lock OFF 推奨
- PC アプリ「V-02HD MK II RCS」も「from a computer connected via USB」（Ref 行 9–10）
- USB STREAM は PC からは USB video class / USB audio class デバイスとして認識（Ref p.30 行 1793–1795）。**USB MIDI（クラスコンプライアント）としても見えるかどうかは資料に明記なし → 【推測】** MIDI Implementation が存在し MIDI 端子が無いこと、RCS/Remote が USB 経由であることから、USB STREAM 上の USB-MIDI で SysEx/CC を受けると推測。実機で iPhone（Lightning→USB カメラアダプタ or USB-C）接続時に CoreMIDI にデバイスが現れるかを確認すること
- iPhone からの利用：**USB MIDI のみ候補**（LAN・BLE MIDI は不可）。Remote ガイドは iPad のみ言及、iPhone は記載なし【不明】

## 2. SysEx

根拠：Ref p.59 行 3760–3845（RQ1/DT1）、p.69 行 4556–4623（チェックサム）

| 項目 | 値 |
|---|---|
| Manufacturer ID | `41H`（Roland） |
| Device ID | `10H`（RQ1/DT1 の書式に固定で記載。範囲・変更設定の記載なし → 既定 10H、変更手段【不明】） |
| Model ID（5 バイト） | `00H 00H 00H 00H 0AH`（1st–4th byte = 00H、5th byte = 0AH。Ref 行 3779–3784、3824–3828） |
| RQ1 コマンド ID | `11H` |
| DT1 コマンド ID | `12H` |
| RQ1 書式 | `F0 41 10 00 00 00 00 0A 11 aa bb cc ss tt uu sum F7`（アドレス 3 バイト、サイズ 3 バイト） |
| DT1 書式 | `F0 41 10 00 00 00 00 0A 12 aa bb cc dd … ee sum F7` |
| チェックサム | アドレス＋サイズ（または データ）の合計を 128 で割った余りを r として `128 − r`（r=0 なら 0）。Ref p.69 行 4573–4586 |
| 分割サイズ | 「Data exceeding 256 bytes should be divided into packets of 256 bytes or smaller」（Ref 行 3844） |
| 送信間隔 | DT1 連続送信時は「set interval of 20 ms or longer between packets」（Ref 行 3845） |
| RQ1 応答 | 条件が合えば DT1 で返す。「If not, the unit sends nothing」（Ref 行 3764–3769） |
| 要求単位の注意 | 「Depending on the data type, the amount of single-time transmission is specified. It is necessary to execute data request according to the specified first address and size」（Ref 行 3796–3798） |
| MIDI ch | 「n MIDI Channel Fixed at 00H」（Ref 行 3523）。Implementation Chart の Basic Channel Default/Changed = 1（Ref 行 4646–4647） |

- **資料内の矛盾（要実機確認）**：p.59 の RQ1/DT1 の Data Byte 概要行は PDF 原本でも `41H, 10H, 00H, 00H, 00H, 54H, 11H, aaH, …`／`…, 54H, 12H, aaH, …` と印刷されており（Ref 行 3772、3814。pdftotext の混在ではなく原本の記載）、Model ID が 4 バイト「00 00 00 54」に読める。一方、直下の Byte Explanation 表は 1st–5th byte = `00H 00H 00H 00H 0AH` と 5 バイトで明記（行 3779–3784、3824–3828）。**本メモは Byte Explanation 表の `00 00 00 00 0A` を正とする**（既対応機種も 5 バイト Model ID。概要行の 54H は旧機種からの転記ミス【推測】）。実機で RQ1（`02H 00H 00H` サイズ 6 のバージョン読み）を両方の Model ID で試して応答する方を確定すること。
- MIDI Visual Control の例（Ref p.69 行 4590–4623）は汎用の説明例（`F0 7E 00 0C 01 …`）であり本機のアドレスではない（本機のマップに 10H 10H 02H の Dissolve Time Ctrl Assign は無い。10H 00H 00H は Preset Memory Area）

### Control Change（受信のみ。Ref p.56–58 行 3516–3757）
MIDI ch 固定 00H。`Bn cc vv`。実装チャートの Recognized：CC 10–31 / 32–51 / 61–119 = O、0–9 / 52–60 = ×（Ref 行 4660–4664。ただし本文には CC52–60 の定義があり矛盾 → 【不明】実機確認）

| CC | 機能 | 値 |
|---|---|---|
| 10 (0AH) | ビデオフェーダー位置 | 00H–7FH（00H: far left, 7FH: far right） |
| 11 (0BH) | EFFECTS TYPE | 00H–03H（MIX, WIPE, PinP, KEY） |
| 12 (0CH) | MIX/WIPE TIME | 00H–28H（0.0–4.0sec） |
| 13 (0DH) | PinP TIME | 00H–28H |
| 14 (0EH) | KEY TIME | 00H–28H |
| 15 (0FH) | PinP POSITION H | 00H–64H（-50–50%） |
| 16 (10H) | PinP POSITION V | 00H–64H（-50–50%） |
| 17 (11H) | PinP SIZE | 0AH–64H（10–100%） |
| 18 (12H) | PinP VIEW ZOOM | 0AH–64H（100–1000%） |
| 19 (13H) | KEY SOURCE | 00H–02H（INPUT 1, INPUT 2, STILL IMAGE） |
| 20 (14H) | KEY LEVEL | 00H–7FH（0–255） |
| 21 (15H) | KEY GAIN | 00H–7FH（0–255） |
| 22 (16H) | KEY MIX LEVEL | 00H–7FH（0–255） |
| 23 (17H) | VFX SW | 00H, 01H（OFF, ON） |
| 24 (18H) | VFX TYPE | 00H–0FH（16 種） |
| 25 (19H) | VFX MIX LEVEL | 00H–7FH（0–255） |
| 26 (1AH) | [OUTPUT FADE] ノブ位置（反時計回り） | 00H–3FH |
| 27 (1BH) | [OUTPUT FADE] ノブ位置（時計回り） | 00H–3FH |
| 28 (1CH) | AUDIO INPUT LEVEL (AUDIO IN 1) | 00H–7FH（0–127、dB 対応表 p.59） |
| 29 (1DH) | AUDIO INPUT LEVEL (AUDIO IN 2) | 00H–7FH |
| 30 (1EH) | AUDIO INPUT LEVEL (USB IN) | 00H–7FH |
| 31 (1FH) | AUDIO OUTPUT LEVEL (HDMI IN 1)（原文ママ） | 00H–7FH |
| 32 (20H) | AUDIO OUTPUT LEVEL (HDMI IN 2)（原文ママ） | 00H–7FH |
| 33 (21H) | AUDIO OUTPUT LEVEL (MASTER OUTPUT) | 00H–7FH |
| 34 (22H) | AUDIO OUTPUT LEVEL (AUX) | 00H–7FH |
| 35 (23H) | AUDIO OUTPUT LEVEL (USB OUT) | 00H–7FH |
| 52 (34H) | [1] ボタンを押す | any（00H–7FH） |
| 53 (35H) | [2] ボタンを押す | any |
| 54 (36H) | 「AUTO TAKE」で映像を切替 | any |
| 55 (37H) | 「CUT」で映像を切替 | any |
| 56 (38H) | 静止画出力の有効化 | 00H, 01H（OFF, ON） |
| 57 (39H) | AUDIO INPUT 1 MUTE (AUDIO IN 1) | 00H, 01H |
| 58 (3AH) | AUDIO INPUT 2 MUTE (AUDIO IN 2) | 00H, 01H |
| 59 (3BH) | AUDIO IN MUTE (USB IN) | 00H, 01H |
| 60 (3CH) | AUDIO OUTPUT MUTE (HDMI IN 1)（原文ママ） | 00H, 01H |
| 61 (3DH) | AUDIO OUTPUT MUTE (HDMI IN 2)（原文ママ） | 00H, 01H |
| 62 (3EH) | AUDIO OUTPUT MUTE (MASTER OUTPUT) | 00H, 01H |
| 63 (3FH) | AUDIO OUTPUT MUTE (AUX) | 00H, 01H |
| 64 (40H) | AUDIO OUTPUT MUTE (USB OUT) | 00H, 01H |

- CC 36–51、65 以降の定義は本文に無い
- CC レベル値 0–127 → dB の対応表：Ref p.59 行 3761–3805（0 = -Inf、1 = -80.0 … 97 = 0.0 … 127 = 10.0）

### Program Change（Ref p.59 行 3809–3818）
- `Cn pp`：プリセットメモリー呼び出し。pp = 00H–07H（MEMORY 1–8）
- 実装チャートでは Program Change Recognized = ×（Ref 行 4675–4677）と矛盾 → 【不明】実機確認（SysEx の Memory Load Trigger 0AH 00H 00H の方を使う）

## 3. LAN プロトコル
**該当なし**（LAN 端子が無い）。V-160HD 系の DTH/RQH 簡易制御コマンドは使えない。SysEx（USB MIDI 経由【推測】）のみ。

## 4. アドレスマップの要点

- PGM/PST の概念無し。**[1][2] ボタン＝INPUT 1/2 を直接 PGM に出す 2 入力スイッチャー**（Ref p.2 行 125–139）。「物理入力直指定」。
- **PGM 相当（背景チャンネル）**：`00H 25H 00H` Background Channel 1 バイト 00H–01H（INPUT 1, 2）。コンポジット時の背景、通常時は PGM 側【推測：読み出し値が現在 PGM かは実機確認】
- **PST/PVW**：専用アドレス無し。2 入力なので PVW = もう一方の入力【推測】
- **クロスポイント**：無し（SHARED INPUT `00H 01H 15H` ON で INPUT 2 に INPUT 1 の映像を割当てる機能のみ。Ref 行 2328–2330）
- **トランジション**
  - CUT：SysEx 専用トリガ無し。**CC 55 (37H)** で CUT、**CC 54 (36H)** で AUTO TAKE（SysEx アドレスは無い）。INPUT n SW ASSIGN `02H 01H 02H/03H` でボタン動作を AUTO TAKE/CUT/TRANSFORM に変更可
  - タイプ：`00H 25H 04H` Effects Type 00H–03H（MIX, WIPE, PinP, KEY）／`00H 21H 00H` MIX TYPE（MIX, FAM, NAM）／`00H 21H 01H` WIPE TYPE 9 種
  - 時間：`00H 20H 00H` MIX/WIPE TIME、`00H 20H 01H` PinP TIME、`00H 20H 02H` KEY TIME（各 00H–28H = 0.0–4.0sec、0.1sec 刻み）
  - フェーダー位置（T-bar）：`00H 25H 01H`–`02H` Video Fader Position 2 バイト 00H 00H–03H 7FH（0–511）。CC 10 でも可（0–127）
  - 出力フェード：`00H 25H 03H` Output Fade Level 00H–7FH
- **PinP**（1 系統）：`00H 22H 00H`–`13H`。ON PGM = `00H 22H 13H` PROGRAM OUT MODE（OFF, ON）。ソース指定アドレス無し（PinP は Effects Type=PinP のとき [2] ボタン/フェーダーで挿入。インセットは背景でない方の入力【推測】）。時間は `00H 20H 01H`
- **KEY（DSK 相当、1 系統）**：`00H 23H 00H` KEY SOURCE（INPUT 1, INPUT 2, STILL IMAGE）、`00H 23H 01H` KEY TYPE（LUMINANCE-WHITE, LUMINANCE-BLACK, CHROMA）、ON PGM = `00H 23H 25H` PROGRAM OUT MODE、時間 `00H 20H 02H`
- **SPLIT**：無し
- **オーディオ入力**：`01H xxH …`、xx = 00H AUDIO IN 1 / 01H AUDIO IN 2 / 02H USB IN / 03H HDMI IN 1 / 04H HDMI IN 2（Ref 行 4162）。レベル `01H xxH 01H`–`03H`（3 バイト、-INF/-80.0–10.0dB）、ミュート `01H xxH 04H`
- **MASTER**：レベル `01H 11H 00H`–`02H`（3 バイト）、ミュート `01H 11H 04H`–`05H`（表記上 2 バイト幅、値 00H–01H → 【不明】サイズ 2 か誤植か）。AUX：`01H 12H 00H`–`02H` / `01H 12H 03H`。USB OUT：`01H 13H 00H`–`02H` / `01H 13H 03H`
- **メモリー**（8 個）：ロード `0AH 00H 00H`（00H–07H、Write Only）、セーブ `0AH 00H 01H`、初期化 `0AH 00H 02H`、現在番号 `0AH 00H 03H`（00H–07H、7FH = Last Memory、Read only）。名前（8 文字、Ref 行 1925–1926）の **アドレスは無い**【不明】。メモリー内容は `10H`–`1FH 00H 00H` 領域で直接読み書き可
- **タリー**：専用ブロック無し。Background Channel `00H 25H 00H` ＋ Video Fader Position `00H 25H 01H`、PinP/KEY の PROGRAM OUT MODE から推定【推測】
- **ラベル**：入力名アドレス無し（PREVIEW LABEL `02H 01H 08H` は表示 ON/OFF のみ）
- **マクロ／シーケンサー**：無し。AUTO SWITCHING（`02H 08H …`、INPUT SCAN / PRESET MEMORY SCAN）が近い機能
- **システムバージョン**：`02H 00H 00H`–`05H` 6 バイト（Major, Minor(1), Minor(2), Build(1), Build(2), Build(3)、各 00H–09H、Read Only）
- **値のエンコード**：7bit/バイト。多バイトは `aa×128+bb`（Ref 行 4597–4601）。負値は 2 の補数（例：2 バイト 70H 30H = 14384 = 16384−2000 → -2000、1 バイト 62H = 98 = 128−30 → -30、3 バイト 7FH 79H 60H = 2096352 = 2097152−800 → -80.0dB の 0.1dB 単位、7EH 00H 00H = -INF）。「nibbled」（4bit×n）はこの機種のマップでは使われていない。「#」付きアドレスは無し

## 5. ソース一覧

| 値 | 物理入力 | 使う場所 |
|---|---|---|
| 00H | INPUT 1（HDMI） | Background Channel `00H 25H 00H`、KEY SOURCE、Audio Follow |
| 01H | INPUT 2（HDMI） | 同上 |
| 02H | STILL IMAGE（キャプチャ静止画 1 枚） | KEY SOURCE `00H 23H 00H` / CC 19 のみ |

静止画の PGM 出力は CC 56 または [OUTPUT FADE] ノブ機能（`02H 01H 04H/05H` に STILL IMAGE 割当）。

## 6. 数

| 項目 | 数 | 根拠 |
|---|---|---|
| 映像入力 | 2（HDMI type A ×2、INPUT 1–2） | Ref p.72 行 4787–4789 |
| SDI | 0 | — |
| STILL | 1（本体に 1 枚のみ保存） | Ref 行 1221–1222 |
| 映像出力 | PROGRAM OUT (HDMI)、PREVIEW OUT (HDMI)、USB STREAM | Ref 行 4790–4793 |
| PinP | 1 | マップ `00H 22H` |
| KEY（DSK 相当） | 1 | マップ `00H 23H` |
| SPLIT | 0 | — |
| メモリー | 8 | Ref 行 3818、4874 |
| マクロ | 0 | — |
| オーディオ入力 | 5（AUDIO IN 1/2 ステレオミニ、USB IN、HDMI IN 1/2） | Ref 行 4162、4845–4849 |
| オーディオ出力バス | MASTER OUTPUT / AUX / USB OUT（+PHONES） | `01H 10H`–`13H` |
| AUX ソース選択 | AUX SEND `01H 12H 08H`–`0CH`（入力ごとのセンド量）、AUX EFFECT `01H 12H 0DH`–`11H` | — |
| VFX | 1 系統 16 種 | `00H 24H` |

## 7. 機種固有の注意

- 受信の前提設定：**資料に MIDI 受信を有効化する設定項目は無い**（MIDI Rx SOURCE 等のメニュー無し）。USB STREAM で接続すれば受けると読める【推測】
- MVC/V-LINK の設定項目無し
- 対応 FW：iPad アプリは 1.03 以降（Remote 行 20）。MIDI Implementation は Version 1.00（2021-06-17）
- `00H 23H 18H` CHROMA COLOR は「Even if this is rewritten by DT1, the HUE and SATURATION settings are not changed」（Ref 行 4052）
- `01H xxH 08H` EFFECT PRESET も「Even if this is rewritten by DT1, the effect settings are not changed」（Ref 行 4181）
- `02H 00H` System Version は Read Only、`0AH 00H 00H–02H` は Write Only、`0AH 00H 03H` は Read only
- USB STREAM は同時に UVC/UAC（配信用）。「CONNECTION RESET」メニューあり（Ref 行 1810–1812）
- PC アプリ RCS は「winter 2021」リリース予定と記載（Ref 行 13）
- Implementation Chart の「Transmitted」は SysEx のみ O、CC は全て ×（Ref 行 4660–4678）。本機からの自発送信は無い → ポーリング前提
- CC で ON/OFF 系は 00H/01H、[1][2]/AUTO TAKE/CUT は任意値で発火

## 8. 不明・推測一覧（実機確認）

1. 【推測】USB STREAM が USB-MIDI クラスデバイスとして iPhone（CoreMIDI）に見えるか。デバイス名／エンドポイント名
2. 【不明】Device ID 10H の変更可否（マップに該当項目無し）
3. 【推測】`00H 25H 00H` Background Channel が通常（MIX/WIPE）時に PGM を示すか、フェーダー位置との関係
4. 【不明】CC 52–60（ボタン・AUTO TAKE・CUT・静止画・ミュート）が実装チャートでは × だが本文で定義 → 効くか
5. 【不明】Program Change（チャート ×）が効くか
6. 【不明】`01H 11H 04H`–`05H` OUTPUT MUTE のサイズ（1 か 2）
7. 【不明】メモリー名（8 文字）の読み書きアドレス
8. 【推測】PinP ON/OFF の操作：`00H 22H 13H` PROGRAM OUT MODE の DT1 で [2] ボタン相当になるか
9. 【不明】RQ1 でブロック一括読み（例 `00H 25H 00H` サイズ 5）が可能か、要求単位の制約
10. 【不明】iPhone（iPad 以外）での公式動作保証。Lightning カメラアダプタ経由の給電要否
11. 【不明】DT1 への応答（ACK 相当）の有無（記載無し。無応答が前提）
12. 【不明】Model ID：Byte Explanation 表の `00 00 00 00 0A`（5 バイト）か、概要行の `00 00 00 54`（4 バイト）か（§2 参照）

---

## Parameter Address Map 全転記（Ref p.60–68 行 3853–4525）

### エリア（Ref 行 3853–3859）

| Start Address | Description |
|---|---|
| 00H 00H 00H | Video Parameter Area |
| 01H 00H 00H | Audio Parameter Area |
| 02H 00H 00H | System Parameter Area |
| 0AH 00H 00H | Other Parameter Area |
| 10H 00H 00H | Preset Memory Area |

### Video Parameter Area

#### Video Input（xxH = 00H, 01H：INPUT 1, INPUT 2）Ref 行 3866–3901

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 00H xxH 00H | 1 | FLICKER FILTER | 00H–01H | OFF, ON |
| 00H xxH 01H | 1 | FLIP H | 00H–01H | OFF, ON |
| 00H xxH 02H | 1 | FLIP V | 00H–01H | OFF, ON |
| 00H xxH 03H | 1 | EDID | 00H–0BH | INTERNAL, SVGA (800x600), XGA (1024x768), WXGA (1280x800), FWXGA (1366x768), SXGA (1280x1024), SXGA+ (1400x1050), UXGA (1600x1200), WUXGA (1920x1200), 720p, 1080i, 1080p |
| 00H xxH 04H–05H | 2 | ZOOM | 00H 64H–4EH 10H | 10.0–1000.0% |
| 00H xxH 06H | 1 | SCALING TYPE | 00H–04H | FULL, LETTERBOX, CROP, DOT BY DOT, MANUAL |
| 00H xxH 07H–08H | 2 | MANUAL SIZE H | 70H 30H–00H 00H–0FH 50H | -2000–0–2000 |
| 00H xxH 09H–0AH | 2 | MANUAL SIZE V | 70H 30H–00H 00H–0FH 50H | -2000–0–2000 |
| 00H xxH 0BH–0CH | 2 | POSITION H | 71H 00H–00H 00H–0FH 00H | -1920–0–1920 |
| 00H xxH 0DH–0EH | 2 | POSITION V | 76H 50H–00H 00H–09H 30H | -1200–0–1200 |
| 00H xxH 0FH | 1 | BRIGHTNESS | 00H–7FH | -64–63 |
| 00H xxH 10H | 1 | CONTRAST | 00H–7FH | -64–63 |
| 00H xxH 11H | 1 | SATURATION | 00H–7FH | -64–63 |
| 00H xxH 12H | 1 | RED | 00H–7FH | -64–63 |
| 00H xxH 13H | 1 | GREEN | 00H–7FH | -64–63 |
| 00H xxH 14H | 1 | BLUE | 00H–7FH | -64–63 |
| 00H xxH 15H | 1 | SHARED INPUT (*) | 00H–01H | OFF, ON　(*) INPUT 2 only |

#### Video Output（xxH = 10H, 11H：PROGRAM OUT, PREVIEW OUT）Ref 行 3904–3918

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 00H xxH 00H | 1 | OUTPUT ASSIGN (*1) | 00H–01H | PROGRAM, PREVIEW　(*1) PREVIEW OUT only |
| 00H xxH 01H | 1 | COLOR SPACE | 00H–03H | YCC, RGB (0-255), RGB (16-235)（原文は 00H–03H で 3 項目） |
| 00H xxH 02H | 1 | DVI-D/HDMI SIGNAL | 00H–01H | HDMI, DVI-D |
| 00H xxH 03H | 1 | BRIGHTNESS | 00H–7FH | -64–63 |
| 00H xxH 04H | 1 | CONTRAST | 00H–7FH | -64–63 |
| 00H xxH 05H | 1 | SATURATION | 00H–7FH | -64–63 |
| 00H xxH 06H | 1 | RED | 00H–7FH | -64–63 |
| 00H xxH 07H | 1 | GREEN | 00H–7FH | -64–63 |
| 00H xxH 08H | 1 | BLUE | 00H–7FH | -64–63 |

#### Scaling Ref 行 3926–3945

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 00H 12H 00H | 1 | OUTPUT FORMAT | 00H–0DH | 480p/576p, 720p, 1080i, 1080p, SVGA (800x600), XGA (1024x768), WXGA (1280x800), FWXGA (1366x768), SXGA (1280x1024), SXGA+ (1400x1050), UXGA (1600x1200), WUXGA (1920x1200), HD (1280x720), FHD (1920x1080) |
| 00H 12H 01H–02H | 2 | ZOOM | 00H 64H–4EH 10H | 10.0–1000.0% |
| 00H 12H 03H–04H | 2 | SIZE H | 70H 30H–00H 00H–0FH 50H | -2000–0–2000 |
| 00H 12H 05H–06H | 2 | SIZE V | 70H 30H–00H 00H–0FH 50H | -2000–0–2000 |
| 00H 12H 07H–08H | 2 | POSITION H | 71H 00H–00H 00H–0FH 00H | -1920–0–1920 |
| 00H 12H 09H–0AH | 2 | POSITION V | 76H 50H–00H 00H–09H 30H | -1200–0–1200 |

#### USB OUT Ref 行 3949–3952

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 00H 13H 00H | 1 | USB OUTPUT ASSIGN | 00H–01H | PROGRAM, PREVIEW |
| 00H 13H 01H | 1 | USB OUTPUT FORMAT | 00H–01H | YUY2 & MJPEG, YUY2 |

#### Transition Time Ref 行 3956–3960

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 00H 20H 00H | 1 | MIX/WIPE TIME | 00H–28H | 0.0–4.0sec |
| 00H 20H 01H | 1 | PinP TIME | 00H–28H | 0.0–4.0sec |
| 00H 20H 02H | 1 | KEY TIME | 00H–28H | 0.0–4.0sec |

#### MIX/WIPE Ref 行 3964–3972

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 00H 21H 00H | 1 | MIX TYPE | 00H–02H | MIX, FAM, NAM |
| 00H 21H 01H | 1 | WIPE TYPE | 00H–08H | HORIZONTAL, VERTICAL, UPPER LEFT, UPPER RIGHT, LOWER LEFT, LOWER RIGHT, H-CENTER, V-CENTER, BOX |
| 00H 21H 02H | 1 | WIPE DIRECTION | 00H–02H | NORMAL, REVERSE, ROUND TRIP |
| 00H 21H 03H | 1 | WIPE BORDER COLOR | 00H–08H | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, SOFT EDGE |
| 00H 21H 04H | 1 | WIPE BORDER WIDTH | 00H–0FH | 0–15 |

#### PinP Ref 行 3976–4005

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 00H 22H 00H–01H | 2 | POSITION H | 78H 18H–00H 00H–07H 68H | -100.0–0.0–100.0% |
| 00H 22H 02H–03H | 2 | POSITION V | 78H 18H–00H 00H–07H 68H | -100.0–0.0–100.0% |
| 00H 22H 04H–05H | 2 | SIZE | 00H 64H–07H 68H | 10.0–100.0% |
| 00H 22H 06H–07H | 2 | CROPPING H | 00H 00H–07H 68H | 0.0–100.0% |
| 00H 22H 08H–09H | 2 | CROPPING V | 00H 00H–07H 68H | 0.0–100.0% |
| 00H 22H 0AH | 1 | BORDER COLOR | 00H–08H | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, SOFT EDGE |
| 00H 22H 0BH | 1 | BORDER WIDTH | 00H–0FH | 0–15 |
| 00H 22H 0CH | 1 | SHAPE | 00H–02H | RECTANGLE, CIRCLE, DIAMOND |
| 00H 22H 0DH–0EH | 2 | VIEW POSITION H | 7CH 0CH–00H 00H–03H 74H | -50.0–0.0–50.0% |
| 00H 22H 0FH–10H | 2 | VIEW POSITION V | 7CH 0CH–00H 00H–03H 74H | -50.0–0.0–50.0% |
| 00H 22H 11H–12H | 2 | VIEW ZOOM | 00H 64H–4EH 10H | 100–1000% |
| 00H 22H 13H | 1 | PROGRAM OUT MODE | 00H–01H | OFF, ON |

#### KEY Ref 行 4013–4069

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 00H 23H 00H | 1 | KEY SOURCE | 00H–02H | INPUT 1, INPUT 2, STILL IMAGE |
| 00H 23H 01H | 1 | KEY TYPE | 00H–02H | LUMINANCE-WHITE, LUMINANCE-BLACK, CHROMA |
| 00H 23H 02H–03H | 2 | KEY LEVEL | 00H 00H–01H 7FH | 0–255 |
| 00H 23H 04H–05H | 2 | KEY GAIN | 00H 00H–01H 7FH | 0–255 |
| 00H 23H 06H–07H | 2 | MIX LEVEL | 00H 00H–01H 7FH | 0–255 |
| 00H 23H 08H–09H | 2 | POSITION H | 78H 18H–00H 00H–07H 68H | -100.0–0.0–100.0% |
| 00H 23H 0AH–0BH | 2 | POSITION V | 78H 18H–00H 00H–07H 68H | -100.0–0.0–100.0% |
| 00H 23H 0CH–0DH | 2 | SIZE | 00H 64H–07H 68H | 10.0–100.0% |
| 00H 23H 0EH–0FH | 2 | CROPPING H | 00H 00H–07H 68H | 0.0–100.0% |
| 00H 23H 10H–11H | 2 | CROPPING V | 00H 00H–07H 68H | 0.0–100.0% |
| 00H 23H 12H–13H | 2 | VIEW POSITION H | 7CH 0CH–00H 00H–03H 74H | -50.0–0.0–50.0% |
| 00H 23H 14H–15H | 2 | VIEW POSITION V | 7CH 0CH–00H 00H–03H 74H | -50.0–0.0–50.0% |
| 00H 23H 16H–17H | 2 | VIEW ZOOM | 00H 64H–4EH 10H | 100–1000% |
| 00H 23H 18H | 1 | CHROMA COLOR | 00H–01H | GREEN, BLUE　* Even if this is rewritten by DT1, the HUE and SATURATION settings are not changed. |
| 00H 23H 19H | 1 | HUE WIDTH | 62H–00H–1EH | -30–0–30 |
| 00H 23H 1AH–1BH | 2 | HUE FINE | 00H 00H–02H 68H | 0–360 |
| 00H 23H 1CH–1DH | 2 | SATURATION WIDTH | 7FH 00H–00H 00H–00H 7FH | -128–0–127 |
| 00H 23H 1EH–1FH | 2 | SATURATION FINE | 00H 00H–01H 7FH | 0–255 |
| 00H 23H 20H | 1 | FILL TYPE | 00H–01H | BUS, MATTE |
| 00H 23H 21H | 1 | MATTE COLOR | 00H–07H | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK |
| 00H 23H 22H | 1 | EDGE TYPE | 00H–04H | OFF, BORDER, DROP, SHADOW, OUTLINE |
| 00H 23H 23H | 1 | EDGE COLOR | 00H–07H | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK |
| 00H 23H 24H | 1 | EDGE WIDTH | 00H–0FH | 0–15 |
| 00H 23H 25H | 1 | PROGRAM OUT MODE | 00H–01H | OFF, ON |
| 00H 23H 26H | 1 | reserved | — | — |

#### VFX Ref 行 4073–4145

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 00H 24H 00H | 1 | VFX SW | 00H–01H | OFF, ON |
| 00H 24H 01H | 1 | VFX TYPE | 00H–0FH | PART MOSAIC, BACKGROUND MOSAIC, FULL MOSAIC, WAVE, RGB REPLACE, COLOR PASS, NEGATIVE, COLORIZE, POSTERIZE, SILHOUETTE, EMBOSS, FIND EDGES, MONOCOLOR, HUE OFFSET, SATURATION OFFSET, VALUE OFFSET |
| 00H 24H 02H–03H | 2 | MIX LEVEL | 00H 00H–01H 7FH | 0–255 |
| 00H 24H 04H | 1 | PART MOSAIC BLOCK SIZE | 00H–07H | OFF (1x1), 4x4, 8x8, 16x16, 32x32, 64x64, 128x128, 256x256 |
| 00H 24H 05H–06H | 2 | PART MOSAIC POSITION H | 78H 18H–00H 00H–07H 68H | -100.0–0–100.0% |
| 00H 24H 07H–08H | 2 | PART MOSAIC POSITION V | 78H 18H–00H 00H–07H 68H | -100.0–0–100.0% |
| 00H 24H 09H–0AH | 2 | PART MOSAIC AREA SIZE | 00H 64H–07H 68H | 10.0–100.0% |
| 00H 24H 0BH–0CH | 2 | PART MOSAIC AREA CORRECTION H | 70H 30H–00H 00H–0FH 50H | -2000–0–2000 |
| 00H 24H 0DH–0EH | 2 | PART MOSAIC AREA CORRECTION V | 70H 30H–00H 00H–0FH 50H | -2000–0–2000 |
| 00H 24H 0FH | 1 | BG MOSAIC BLOCK SIZE | 00H–07H | OFF (1x1), 4x4, 8x8, 16x16, 32x32, 64x64, 128x128, 256x256 |
| 00H 24H 10H–11H | 2 | BG MOSAIC POSITION H | 78H 18H–00H 00H–07H 68H | -100.0–0–100.0% |
| 00H 24H 12H–13H | 2 | BG MOSAIC POSITION V | 78H 18H–00H 00H–07H 68H | -100.0–0–100.0% |
| 00H 24H 14H–15H | 2 | BG MOSAIC AREA SIZE | 00H 64H–07H 68H | 10.0–100.0% |
| 00H 24H 16H–17H | 2 | BG MOSAIC AREA CORRECTION H | 70H 30H–00H 00H–0FH 50H | -2000–0–2000 |
| 00H 24H 18H–19H | 2 | BG MOSAIC AREA CORRECTION V | 70H 30H–00H 00H–0FH 50H | -2000–0–2000 |
| 00H 24H 1AH | 1 | FULL MOSAIC BLOCK SIZE | 00H–07H | OFF (1x1), 4x4, 8x8, 16x16, 32x32, 64x64, 128x128, 256x256 |
| 00H 24H 1BH–1CH | 2 | WAVE GAIN | 00H 00H–01H 7FH | 0–255 |
| 00H 24H 1DH | 1 | WAVE TYPE | 00H–07H | 0–7 |
| 00H 24H 1EH | 1 | RGB REPLACE TYPE | 00H–05H | OFF (R.G.B), B.R.G, G.B.R, R.B.G, G.R.B, B.G.R |
| 00H 24H 1FH | 1 | COLOR PASS TYPE | 01H–3FH | 1–63 |
| 00H 24H 20H | 1 | NEGATIVE TYPE | 01H–07H | Cr, Cb, CbCr, Y, YCr, YCb, YCbCr |
| 00H 24H 21H | 1 | COLORIZE TYPE | 00H–07H | 1–8 |
| 00H 24H 22H | 1 | POSTERIZE LEVEL | 00H–03H | 1–4 |
| 00H 24H 23H | 1 | SILHOUETTE TYPE | 00H–7FH | 1–128 |
| 00H 24H 24H | 1 | EMBOSS TYPE | 00H–7FH | 1–128 |
| 00H 24H 25H | 1 | EMBOSS CONTRAST | 00H–0FH | 0–15 |
| 00H 24H 26H | 1 | FIND EDGES FG COLOR | 00H–0FH | 0–15 |
| 00H 24H 27H | 1 | FIND EDGES BG COLOR | 00H–0FH | 0–15 |
| 00H 24H 28H | 1 | MONOCOLOR Pb COLOR | 00H–3FH | 0–63 |
| 00H 24H 29H | 1 | MONOCOLOR Pr COLOR | 00H–3FH | 0–63 |
| 00H 24H 2AH–2BH | 2 | HUE OFFSET VALUE | 00H 00H–02H 67H | 0–359 |
| 00H 24H 2CH–2DH | 2 | SATURATION OFFSET VALUE | 7EH 00H–00H 00H–01H 7FH | -256–0–255 |
| 00H 24H 2EH–2FH | 2 | VALUE OFFSET VALUE | 7EH 00H–00H 00H–01H 7FH | -256–0–255 |

#### Panel Ref 行 4148–4155

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 00H 25H 00H | 1 | Background Channel | 00H–01H | INPUT 1, 2 |
| 00H 25H 01H–02H | 2 | Video Fader Position | 00H 00H–03H 7FH | 0–511 |
| 00H 25H 03H | 1 | Output Fade Level | 00H–7FH | 0–127 |
| 00H 25H 04H | 1 | Effects Type | 00H–03H | MIX, WIPE, PinP, KEY |

### Audio Parameter Area

#### Audio Input（xxH = 00H–04H：AUDIO IN 1, AUDIO IN 2, USB IN, HDMI IN 1, HDMI IN 2）Ref 行 4160–4218

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 01H xxH 00H | 1 | ANALOG GAIN | 00H–37H | 0–55dB　* AUDIO IN 1/2 only |
| 01H xxH 01H–03H | 3 | INPUT LEVEL | 7EH 00H 00H, 7FH 79H 60H–00H 00H 00H–00H 00H 64H | -INFdB, -80.0–0.0–10.0dB |
| 01H xxH 04H | 1 | INPUT MUTE | 00H–01H | OFF, ON |
| 01H xxH 05H | 1 | PLUG IN POWER | 00H–01H | OFF, ON　* AUDIO IN 1/2 only |
| 01H xxH 06H | 1 | MONO | 00H–01H | OFF, ON |
| 01H xxH 07H | 1 | SOLO | 00H–01H | OFF, ON |
| 01H xxH 08H | 1 | EFFECT PRESET | 00H–04H | DEFAULT, MEETING, INTERVIEW, AMBIENT MIC, WINDY FIELD　* Even if this is rewritten by DT1, the effect settings are not changed. |
| 01H xxH 09H–0AH | 2 | DELAY | 00H 00H–27H 08H | 0.0–500.0msec |
| 01H xxH 0BH | 1 | REVERB SEND | 00H–7FH | 0–127 |
| 01H xxH 0CH | 1 | HIGH PASS FILTER 80Hz | 00H–01H | OFF, ON |
| 01H xxH 0DH | 1 | NOISE GATE SW | 00H–01H | OFF, ON |
| 01H xxH 0EH | 1 | NOISE GATE THRESHOLD | 30H–00H | -80–0dB |
| 01H xxH 0FH | 1 | NOISE GATE RELEASE | 00H–7FH | 30–5000ms |
| 01H xxH 10H | 1 | DE-ESSOR SW | 00H–01H | OFF, ON |
| 01H xxH 11H | 1 | DE-ESSOR SENS | 00H–64H | 0–100 |
| 01H xxH 12H | 1 | DE-ESSOR DEPTH | 00H–64H | 0–100 |
| 01H xxH 13H | 1 | COMPRESSOR SW | 00H–01H | OFF, ON |
| 01H xxH 14H | 1 | COMPRESSOR THRESHOLD | 4EH–00H | -50–0dB |
| 01H xxH 15H | 1 | COMPRESSOR RATIO | 00H–0DH | 1.00:1, 1.12:1, 1.25:1, 1.40:1, 1.60:1, 1.80:1, 2.00:1, 2.50:1, 3.20:1, 4.00:1, 5.60:1, 8.00:1, 16.0:1, INF:1 |
| 01H xxH 16H | 1 | COMPRESSOR ATTACK | 00H–73H | 0.0–100msec |
| 01H xxH 17H | 1 | COMPRESSOR RELEASE | 00H–7FH | 30–5000ms |
| 01H xxH 18H | 1 | COMPRESSOR MAKEUP GAIN | 58H–00H–28H | -40–40dB |
| 01H xxH 19H | 1 | EQUALIZER SW | 00H–01H | OFF, ON |
| 01H xxH 1AH | 1 | EQUALIZER Hi GAIN | 04H–7CH | -12.0–12.0dB |
| 01H xxH 1BH | 1 | EQUALIZER Hi FREQUENCY | 24H–3EH | 1.00–20.0kHz |
| 01H xxH 1CH | 1 | EQUALIZER Mid GAIN | 04H–7CH | -12.0–12.0dB |
| 01H xxH 1DH | 1 | EQUALIZER Mid FREQUENCY | 02H–3EH | 20Hz–20.0kHz |
| 01H xxH 1EH | 1 | EQUALIZER Mid Q | 00H–05H | 0.5–16.0 |
| 01H xxH 1FH | 1 | EQUALIZER Lo GAIN | 04H–7CH | -12.0–12.0dB |
| 01H xxH 20H | 1 | EQUALIZER Lo FREQUENCY | 02H–2AH | 20–2.00kHz |
| 01H xxH 21H | 1 | VOICE CHANGER SW | 00H–01H | OFF, ON |
| 01H xxH 22H | 1 | VOICE CHANGER PITCH | 74H–00H–0CH | -12–+12 |
| 01H xxH 23H | 1 | VOICE CHANGER FORMANT | 76H–00H–0AH | -10–+10 |
| 01H xxH 24H | 1 | VOICE CHANGER ROBOT | 00H–01H | OFF, ON |
| 01H xxH 25H | 1 | VOICE CHANGER MIX | 00H–64H | 0–100 |

#### Audio Output Assign Ref 行 4220–4225

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 01H 10H 00H | 1 | PHONES OUT | 00H–01H | MASTER OUTPUT, AUX |
| 01H 10H 01H | 1 | USB OUT | 00H–01H | MASTER OUTPUT, AUX |
| 01H 10H 02H | 1 | HDMI OUT PROGRAM | 00H–02H | AUTO, MASTER OUTPUT, AUX |
| 01H 10H 03H | 1 | HDMI OUT PREVIEW | 00H–02H | AUTO, MASTER OUTPUT, AUX |

#### Audio Output（MASTER OUTPUT）Ref 行 4227–4264

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 01H 11H 00H–02H | 3 | OUTPUT LEVEL | 7EH 00H 00H, 7FH 79H 60H–00H 00H 00H–00H 00H 64H | -INFdB, -80.0–0.0–10.0dB |
| 01H 11H 03H | 1（原文表記） | OUTPUT DELAY | 00H 00H–27H 08H | 0.0–500.0msec（値は 2 バイト幅。原文は 03H のみ記載 → 【不明】） |
| 01H 11H 04H–05H | 2（原文表記） | OUTPUT MUTE | 00H–01H | OFF, ON（原文は 04H–05H の 2 行にまたがる → 【不明】サイズ） |
| 01H 11H 06H | 1 | LIMITER SW | 00H–01H | OFF, ON |
| 01H 11H 07H | 1 | LIMITER THRESHOLD | 58H–00H | -40–0.0dB |
| 01H 11H 08H | 1 | REVERB SW | 00H–01H | OFF, ON |
| 01H 11H 09H | 1 | REVERB LEVEL | 00H–7FH | 0–127 |
| 01H 11H 0AH | 1 | REVERB TYPE | 00H–01H | ROOM, HALL |
| 01H 11H 0BH | 1 | REVERB SIZE | 01H–14H | 1–20 |
| 01H 11H 0CH | 1 | EQUALIZER SW | 00H–01H | OFF, ON |
| 01H 11H 0DH | 1 | EQUALIZER Hi GAIN | 04H–7CH | -12.0–12.0dB |
| 01H 11H 0EH | 1 | EQUALIZER Hi FREQUENCY | 24H–3EH | 1.00–20.0kHz |
| 01H 11H 0FH | 1 | EQUALIZER Mid GAIN | 04H–7CH | -12.0–12.0dB |
| 01H 11H 10H | 1 | EQUALIZER Mid FREQUENCY | 02H–3EH | 20Hz–20.0kHz |
| 01H 11H 11H | 1 | EQUALIZER Mid Q | 00H–05H | 0.5–16.0 |
| 01H 11H 12H | 1 | EQUALIZER Lo GAIN | 04H–7CH | -12.0–12.0dB |
| 01H 11H 13H | 1 | EQUALIZER Lo FREQUENCY | 02H–2AH | 20–2.00kHz |
| 01H 11H 14H | 1 | MULTI BAND COMPRESSOR SW | 00H–01H | OFF, ON |
| 01H 11H 15H | 1 | MB COMP Hi THRESHOLD | 58H–00H | -40–0.0dB |
| 01H 11H 16H | 1 | MB COMP Hi RATIO | 00H–0DH | 1.00:1 … INF:1（COMPRESSOR RATIO と同じ 14 段） |
| 01H 11H 17H | 2（値表記） | MB COMP Mid THRESHOLD | 7CH 70H–00H 00H | -40.0–0.0dB（原文は 17H 1 行のみ → 【不明】サイズ） |
| 01H 11H 18H | 1 | MB COMP Mid RATIO | 00H–0DH | 1.00:1 … INF:1 |
| 01H 11H 19H | 2（値表記） | MB COMP Lo THRESHOLD | 7CH 70H–00H 00H | -40.0–0.0dB（同上【不明】） |
| 01H 11H 1AH | 1 | MB COMP Lo RATIO | 00H–0DH | 1.00:1 … INF:1 |

#### Audio AUX Output Ref 行 4269–4291

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 01H 12H 00H–02H | 3 | AUX LEVEL | 7EH 00H 00H, 7FH 79H 60H–00H 00H 00H–00H 00H 64H | -INFdB, -80.0–0.0–10.0dB |
| 01H 12H 03H | 1 | AUX MUTE | 00H–01H | OFF, ON |
| 01H 12H 04H–05H | 2 | AUX DELAY | 00H 00H–27H 08H | 0.0–500.0msec |
| 01H 12H 06H | 1 | LIMITER SW | 00H–01H | OFF, ON |
| 01H 12H 07H | 1（原文表記） | LIMITER THRESHOLD | 7CH 70H–00H 00H | -40.0–0.0dB（値は 2 バイト幅 → 【不明】サイズ） |
| 01H 12H 08H | 1 | AUX SEND AUDIO IN 1 | 2FH–00H | -INFdB, -80–0dB |
| 01H 12H 09H | 1 | AUX SEND AUDIO IN 2 | 2FH–00H | -INFdB, -80–0dB |
| 01H 12H 0AH | 1 | AUX SEND USB IN | 2FH–00H | -INFdB, -80–0dB |
| 01H 12H 0BH | 1 | AUX SEND HDMI IN 1 | 2FH–00H | -INFdB, -80–0dB |
| 01H 12H 0CH | 1 | AUX SEND HDMI IN 2 | 2FH–00H | -INFdB, -80–0dB |
| 01H 12H 0DH | 1 | AUX EFFECT AUDIO IN 1 | 00H–02H | DRY, PRE FADER, POST FADER |
| 01H 12H 0EH | 1 | AUX EFFECT AUDIO IN 2 | 00H–02H | DRY, PRE FADER, POST FADER |
| 01H 12H 0FH | 1 | AUX EFFECT USB IN | 00H–02H | DRY, PRE FADER, POST FADER |
| 01H 12H 10H | 1 | AUX EFFECT HDMI IN 1 | 00H–02H | DRY, PRE FADER, POST FADER |
| 01H 12H 11H | 1 | AUX EFFECT HDMI IN 2 | 00H–02H | DRY, PRE FADER, POST FADER |

#### Audio USB Output Ref 行 4293–4311

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 01H 13H 00H–02H | 3 | USB OUT LEVEL | 7EH 00H 00H, 7FH 79H 60H–00H 00H 00H–00H 00H 64H | -INFdB, -80.0–0.0–10.0dB |
| 01H 13H 03H | 1 | USB OUT MUTE | 00H–01H | OFF, ON |
| 01H 13H 04H–05H | 2 | USB OUT DELAY | 00H 00H–27H 08H | 0.0–500.0msec |
| 01H 13H 06H | 1 | EQUALIZER SW | 00H–01H | OFF, ON |
| 01H 13H 07H | 1 | EQUALIZER Hi GAIN | 04H–7CH | -12.0–12.0dB |
| 01H 13H 08H | 1 | EQUALIZER Hi FREQUENCY | 24H–3EH | 1.00–20.0kHz |
| 01H 13H 09H | 1 | EQUALIZER Mid GAIN | 04H–7CH | -12.0–12.0dB |
| 01H 13H 0AH | 1 | EQUALIZER Mid FREQUENCY | 02H–3EH | 20Hz–20.0kHz |
| 01H 13H 0BH | 1 | EQUALIZER Mid Q | 00H–05H | 0.5–16.0 |
| 01H 13H 0CH | 1 | EQUALIZER Lo GAIN | 04H–7CH | -12.0–12.0dB |
| 01H 13H 0DH | 1 | EQUALIZER Lo FREQUENCY | 02H–2AH | 20–2.00kHz |

#### Audio Follow Ref 行 4313–4319

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 01H 20H 00H | 1 | HDMI IN 1 | 00H–01H | OFF, ON |
| 01H 20H 01H | 1 | HDMI IN 2 | 00H–01H | OFF, ON |
| 01H 20H 02H | 1 | AUDIO IN 1 | 00H–02H | OFF, INPUT 1, INPUT 2 |
| 01H 20H 03H | 1 | AUDIO IN 2 | 00H–02H | OFF, INPUT 1, INPUT 2 |
| 01H 20H 04H | 1 | USB IN | 00H–02H | OFF, INPUT 1, INPUT 2 |

### System Parameter Area

#### Version Parameter Ref 行 4325–4332

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 02H 00H 00H | 1 | System Version Major | 00H–09H | Version Number (Read Only) |
| 02H 00H 01H | 1 | System Version Minor (1) | 00H–09H | Version Number (Read Only) |
| 02H 00H 02H | 1 | System Version Minor (2) | 00H–09H | Version Number (Read Only) |
| 02H 00H 03H | 1 | System Version Build (1) | 00H–09H | Version Number (Read Only) |
| 02H 00H 04H | 1 | System Version Build (2) | 00H–09H | Version Number (Read Only) |
| 02H 00H 05H | 1 | System Version Build (3) | 00H–09H | Version Number (Read Only) |

#### System Ref 行 4340–4373

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 02H 01H 00H | 1 | HDCP | 00H–01H | OFF, ON |
| 02H 01H 01H | 1 | FRAME RATE | 00H–01H | 59.94Hz, 50Hz |
| 02H 01H 02H | 1 | INPUT 1 SW ASSIGN | 00H–04H | AUTO TAKE, AUTO TAKE(alt), CUT, CUT(alt), TRANSFORM（原文は記号付き「’AUTO TAKE, ’AUTO TAKE&, ’CUT, ’CUT&, ’TRANSFORM」。記号はフォント崩れ） |
| 02H 01H 03H | 1 | INPUT 2 SW ASSIGN | 00H–04H | AUTO TAKE&, ’AUTO TAKE&, CUT&, ’CUT&, TRANSFORM&（原文ママ、同上） |
| 02H 01H 04H | 1 | OUTPUT FADE LEFT ASSIGN | 00H–07H | BLACK, WHITE, STILL IMAGE, CONTRAST, AUDIO, BLACK&AUDIO, WHITE&AUDIO, STILL IMAGE&AUDIO |
| 02H 01H 05H | 1 | OUTPUT FADE RIGHT ASSIGN | 00H–07H | BLACK, WHITE, STILL IMAGE, CONTRAST, AUDIO, BLACK&AUDIO, WHITE&AUDIO, STILL IMAGE&AUDIO |
| 02H 01H 06H | 1 | AUDIO FX ASSIGN CTR1 | 00H–1BH | AUDIO IN 1 ANALOG GAIN, AUDIO IN 2 ANALOG GAIN, AUDIO IN 1 LEVEL, AUDIO IN 2 LEVEL, USB IN LEVEL, HDMI IN 1 LEVEL, HDMI IN 2 LEVEL, MASTER OUTPUT LEVEL, AUX OUTPUT LEVEL, USB OUTPUT LEVEL, AUDIO IN 1 DELAY, AUDIO IN 2 DELAY, USB IN DELAY, HDMI IN 1 DELAY, HDMI IN 2 DELAY, USB OUT DELAY, AUDIO IN 1 REVERB SEND, AUDIO IN 2 REVERB SEND, USB IN REVERB SEND, HDMI IN 1 REVERB SEND, HDMI IN 2 REVERB SEND, REVERB LEVEL, AUDIO IN 1 VOICE PITCH, AUDIO IN 2 VOICE PITCH, AUDIO IN 1 VOICE FORMANT, AUDIO IN 2 VOICE FORMANT, AUDIO IN 1 VOICE MIX, AUDIO IN 2 VOICE MIX |
| 02H 01H 07H | 1 | AUDIO FX ASSIGN CTR2 | 00H–1BH | （CTR1 と同じ 28 項目） |
| 02H 01H 08H | 1 | PREVIEW LABEL | 00H–01H | OFF, ON |
| 02H 01H 09H | 1 | AUDIO LEVEL METER | 00H–01H | OFF, ON |
| 02H 01H 0AH | 1 | AUTO INPUT DETECT | 00H–01H | OFF, ON |
| 02H 01H 0BH | 1 | AUTO OFF | 00H–01H | OFF, ON |
| 02H 01H 0CH | 1 | TEST PATTERN | 00H–05H | OFF, 75% COLOR BAR, 100% COLOR BAR, RAMP, STEP, HATCH |
| 02H 01H 0DH | 1 | TEST TONE LEVEL | 00H–03H | OFF, -20dB, -10dB, 0dB |
| 02H 01H 0EH | 1 | TEST TONE FREQUENCY L | 00H–02H | 500Hz, 1kHz, 2kHz |
| 02H 01H 0FH | 1 | TEST TONE FREQUENCY R | 00H–02H | 500Hz, 1kHz, 2kHz |

#### Panel Lock Ref 行 4377–4386

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 02H 02H 00H | 1 | INPUT 1 SW | 00H–01H | OFF, ON |
| 02H 02H 01H | 1 | INPUT 2 SW | 00H–01H | OFF, ON |
| 02H 02H 02H | 1 | VIDEO FADER | 00H–01H | OFF, ON |
| 02H 02H 03H | 1 | OUTPUT FADE | 00H–01H | OFF, ON |
| 02H 02H 04H | 1 | VFX SW | 00H–01H | OFF, ON |
| 02H 02H 05H | 1 | EFFECT TYPE SW | 00H–01H | OFF, ON |
| 02H 02H 06H | 1 | CONTROL 1 ENCODER | 00H–01H | OFF, ON |
| 02H 02H 07H | 1 | CONTROL 2 ENCODER | 00H–01H | OFF, ON |

#### LED Assign Ref 行 4390–4402

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 02H 03H 00H | 1 | PROGRAM LED COLOR | 00H–07H | RED, GREEN, YELLOW, BLUE, PURPLE, L.BLUE, WHITE, OFF |
| 02H 03H 01H | 1 | PREVIEW LED COLOR | 00H–07H | RED, GREEN, YELLOW, BLUE, PURPLE, L.BLUE, WHITE, OFF |
| 02H 03H 02H | 1 | BG SELECT LED COLOR | 00H–07H | RED, GREEN, YELLOW, BLUE, PURPLE, L.BLUE, WHITE, OFF |
| 02H 03H 03H | 1 | INPUT 1 LED | 00H–01H | OFF, ON |
| 02H 03H 04H | 1 | INPUT 2 LED | 00H–01H | OFF, ON |
| 02H 03H 05H | 1 | VIDEO FADER LED | 00H–01H | OFF, ON |
| 02H 03H 06H | 1 | MENU LED | 00H–01H | OFF, ON |
| 02H 03H 07H | 1 | VFX LED | 00H–01H | OFF, ON |
| 02H 03H 08H | 1 | EFFECTS LED | 00H–01H | OFF, ON |
| 02H 03H 09H | 1 | OUTPUT FADE LEFT LED | 00H–01H | OFF, ON |
| 02H 03H 0AH | 1 | OUTPUT FADE RIGHT LED | 00H–01H | OFF, ON |

#### Effect Type SW Assign Ref 行 4410–4415

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 02H 04H 00H | 1 | MIX | 00H–01H | DISABLE, ENABLE |
| 02H 04H 01H | 1 | WIPE | 00H–01H | DISABLE, ENABLE |
| 02H 04H 02H | 1 | PinP | 00H–01H | DISABLE, ENABLE |
| 02H 04H 03H | 1 | KEY | 00H–01H | DISABLE, ENABLE |

#### Preset Memory（設定）Ref 行 4417–4438

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 02H 05H 00H | 1 | START UP | 00H–08H | LAST MEMORY, MEMORY 1–8 |
| 02H 05H 01H | 1 | MEMORY PROTECT | 00H–01H | OFF, ON |
| 02H 05H 02H | 1 | FADE TIME | 00H–28H | 0.0–4.0sec |
| 02H 05H 03H | 1 | FADE SW MIX/WIPE | 00H–01H | OFF, ON |
| 02H 05H 04H | 1 | FADE SW PinP | 00H–01H | OFF, ON |
| 02H 05H 05H | 1 | FADE SW KEY | 00H–01H | OFF, ON |
| 02H 05H 06H | 1 | LOAD PARAMETER VIDEO INPUT | 00H–01H | OFF, ON |
| 02H 05H 07H | 1 | LOAD PARAMETER VIDEO OUTPUT | 00H–01H | OFF, ON |
| 02H 05H 08H | 1 | LOAD PARAMETER TRANS TIME | 00H–01H | OFF, ON |
| 02H 05H 09H | 1 | LOAD PARAMETER MIX/WIPE | 00H–01H | OFF, ON |
| 02H 05H 0AH | 1 | LOAD PARAMETER PinP | 00H–01H | OFF, ON |
| 02H 05H 0BH | 1 | LOAD PARAMETER KEY | 00H–01H | OFF, ON |
| 02H 05H 0CH | 1 | LOAD PARAMETER VFX | 00H–01H | OFF, ON |
| 02H 05H 0DH | 1 | LOAD PARAMETER VIDEO CROSSPOINT | 00H–01H | OFF, ON |
| 02H 05H 0EH | 1 | LOAD PARAMETER VIDEO FADER | 00H–01H | OFF, ON |
| 02H 05H 0FH | 1 | LOAD PARAMETER AUDIO INPUT | 00H–01H | OFF, ON |
| 02H 05H 10H | 1 | LOAD PARAMETER AUDIO OUTPUT | 00H–01H | OFF, ON |
| 02H 05H 11H | 1 | LOAD PARAMETER AUDIO FOLLOW | 00H–01H | OFF, ON |

#### CTL/EXP Ref 行 4442–4457

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 02H 06H 00H | 1 | CTL/EXP TYPE | 00H–02H | OFF, CTL A & CTL B, EXP |
| 02H 06H 01H | 1 | CTL A ASSIGN | 00H–19H | N/A, EFFECT TYPE SW, EFFECT MIX, EFFECT WIPE, EFFECT PinP, EFFECT KEY, VFX SW, INPUT 1 SW, INPUT 2 SW, AUTO TAKE, CUT, STILL IMAGE, INPUT 1 AUDIO MUTE, INPUT 2 AUDIO MUTE, AUDIO IN AUDIO MUTE, AUDIO OUTPUT MUTE, OUTPUT FADE LEFT, OUTPUT FADE RIGHT, LOAD MEMORY 1–8 |
| 02H 06H 02H | 1 | CTL B ASSIGN | 00H–19H | （CTL A と同じ 26 項目） |
| 02H 06H 03H | 1 | EXP ASSIGN | 00H–0AH | N/A, VIDEO FADER, CUT, VFX MIX LEVEL, OUTPUT FADE LEFT, OUTPUT FADE RIGHT, STILL IMAGE, INPUT 1 AUDIO LEVEL, INPUT 2 AUDIO LEVEL, AUDIO IN AUDIO LEVEL, AUDIO OUTPUT LEVEL |

#### CAPTURE IMAGE Ref 行 4459–4462

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 02H 07H 00H | 1 | CAPTURE SHORTCUT | 00H–01H | DISABLE, ENABLE |
| 02H 07H 01H | 1 | SAVE TO INTERNAL STORAGE | 00H–01H | DISABLE, ENABLE |

#### AUTO SWITCHING Ref 行 4466–4485

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 02H 08H 00H | 1 | AUTO SWITCHING SW | 00H–01H | OFF, ON |
| 02H 08H 01H | 1 | AUTO SWITCHING TYPE | 00H–01H | INPUT SCAN, PRESET MEMORY SCAN |
| 02H 08H 02H | 1 | INPUT SCAN TIME INPUT 1 | 00H–78H | OFF, 1–120 sec |
| 02H 08H 03H | 1 | INPUT SCAN TIME INPUT 2 | 00H–78H | OFF, 1–120 sec |
| 02H 08H 04H | 1 | INPUT SCAN TRANS TIME | 00H–28H | 0.0 sec–4.0 sec |
| 02H 08H 05H | 1 | MEMORY SCAN SEQUENCE | 00H–02H | NORMAL, REVERSE, RANDOM |
| 02H 08H 06H | 1 | MEMORY SCAN MEMORY 1 TIME | 00H–78H | OFF, 1–120 sec |
| 02H 08H 07H | 1 | MEMORY SCAN MEMORY 2 TIME | 00H–78H | OFF, 1–120 sec |
| 02H 08H 08H | 1 | MEMORY SCAN MEMORY 3 TIME | 00H–78H | OFF, 1–120 sec |
| 02H 08H 09H | 1 | MEMORY SCAN MEMORY 4 TIME | 00H–78H | OFF, 1–120 sec |
| 02H 08H 0AH | 1 | MEMORY SCAN MEMORY 5 TIME | 00H–78H | OFF, 1–120 sec |
| 02H 08H 0BH | 1 | MEMORY SCAN MEMORY 6 TIME | 00H–78H | OFF, 1–120 sec |
| 02H 08H 0CH | 1 | MEMORY SCAN MEMORY 7 TIME | 00H–78H | OFF, 1–120 sec |
| 02H 08H 0DH | 1 | MEMORY SCAN MEMORY 8 TIME | 00H–78H | OFF, 1–120 sec |

### Other Parameter Area

#### Preset Memory（トリガ）Ref 行 4491–4496

| Address | Size | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|---|
| 0AH 00H 00H | 1 | Memory Load Trigger | 00H–07H | Memory 1–8 (Write Only) |
| 0AH 00H 01H | 1 | Memory Save Trigger | 00H–07H | Memory 1–8 (Write Only) |
| 0AH 00H 02H | 1 | Memory Initialize Trigger | 00H–07H | Memory 1–8 (Write Only) |
| 0AH 00H 03H | 1 | Loaded Memory Number | 00H–07H, 7FH | Memory 1–8, Last Memory (Read only) |

### Preset Memory Area Ref 行 4501–4524
「You can load or rewrite the stored contents of the preset memories. The 2nd byte and 3rd byte of a Preset Memory Area address, and the value range, are in common with the Video Parameter Area (00H 00H 00H) and the Audio Parameter Area (01H 00H 00H).」

| Address | Parameter Name |
|---|---|
| 10H 00H 00H | Video Parameter (Memory 1) |
| 11H 00H 00H | Audio Parameter (Memory 1) |
| 12H 00H 00H | Video Parameter (Memory 2) |
| 13H 00H 00H | Audio Parameter (Memory 2) |
| 14H 00H 00H | Video Parameter (Memory 3) |
| 15H 00H 00H | Audio Parameter (Memory 3) |
| 16H 00H 00H | Video Parameter (Memory 4) |
| 17H 00H 00H | Audio Parameter (Memory 4) |
| 18H 00H 00H | Video Parameter (Memory 5) |
| 19H 00H 00H | Audio Parameter (Memory 5) |
| 1AH 00H 00H | Video Parameter (Memory 6) |
| 1BH 00H 00H | Audio Parameter (Memory 6) |
| 1CH 00H 00H | Video Parameter (Memory 7) |
| 1DH 00H 00H | Audio Parameter (Memory 7) |
| 1EH 00H 00H | Video Parameter (Memory 8) |
| 1FH 00H 00H | Audio Parameter (Memory 8) |

### MIDI Implementation Chart（Ref p.70 行 4641–4700）
- Basic Channel Default/Changed：1 / 1
- Control Change Recognized：0–9 ×、10–31 O、32–51 O、52–60 ×、61–119 O（Transmitted は全て ×）
- Program Change：× / ×
- System Exclusive：O / O
- その他（Note, After Touch, Pitch Bend, System Common, Real Time, Aux）：全て ×
