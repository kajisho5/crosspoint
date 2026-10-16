# VR-4HD 抽出メモ（SW CROSSPOINT 機種追加用）

資料：
- R = `pdf/vr-4hd/VR-4HD_reference_v21_eng01_W.txt`（Reference Manual「Version 2.100 and later」、pdftotext -layout、全 2557 行。これ 1 冊のみ。Owner's Manual／Remote 接続ガイドは無い）
- 構成：Menu List p.2–20（行 34–991）／RS-232 Command Reference p.21–23（行 992–1163）／TALLY/GPIO p.24–25（行 1164–1263）／**MIDI Implementation p.26–41（行 1264–2556）**。p.26–29 と p.40 は 2 段組で左右が混在（CC の説明と SysEx の説明が同じ行に並ぶ）。p.30–39 の Parameter Address Map は 1 段組
- 行番号は txt の行、p. は紙面のノンブル（PDF ページ番号と一致）。bold の既定値は txt に出ないので p.5 を PDF で確認した
- **本資料には Specifications／端子一覧／パネル説明が無い**。端子の有無は本文の記述（「MIDI IN」「RS-232 connector」「USB 3.0 port」等）から読める範囲だけ書き、それ以外は【不明】

## 1. 接続手段

| 手段 | 有無 | 根拠 |
|---|---|---|
| LAN | **無し**。LAN／Ethernet／RJ45／IP／TCP の語が資料のどこにも無い。REMOTE メニューの項目は MIDI Rx CHANNEL / RS-232 / BAUDRATE / GPI / GPO のみ | R 行 240–264（p.5）、全文 grep ヒット 0 |
| USB | **映像・音声用のみ**。「USB 3.0 port」は PC へ MAIN/PVW 映像と音声を送る出力（USB TO PC）と PC からの音声入力（USB FROM PC）。USB 2.0/3.0 の接続状態（NC / USB2.0 / USB3.0）を読める | R 行 269, 277, 980（p.5, 20）、行 769–791（p.15）、行 2213（p.37 `03H 01H 14H`） |
| USB MIDI | **記載無し**【不明】。MIDI Implementation の見出しは「MIDI Messages Received at **MIDI IN**」「Transmitted from **MIDI OUT**」（行 1278, 1457–1464）で物理 MIDI 端子を指す。USB 経由で MIDI が通るという記述は無い。「USB MIDI」「class compliant」「driver」の語は全文ヒット 0 | R 行 1278, 1464 |
| Bluetooth | **無し**（BLE MIDI も音声も記載無し） | 全文 grep ヒット 0 |
| RS-232 | **有り**。D-sub 9 pin（オス）、9600/19200/38400/**115200**（既定）bps、パリティ無し、8 bit、ストップ 1 bit、ASCII、フロー制御 XON/XOFF、クロスケーブル。REMOTE メニュー「RS-232」を **ON** にしないとコマンドを送受信できない（既定 OFF） | R 行 244–245（p.5）、行 997–1024（p.21） |
| MIDI DIN | **有り**【推測度低】。「MIDI IN」「MIDI OUT」の語が MIDI Implementation に出る（行 1278, 1464）。端子形状（5 pin DIN か）は本資料に無い | R 行 1278, 1457–1464 |
| TALLY/GPIO | Mini D-sub 15 pin（メス）。TALLY PGM 1–4（オープンコレクタ）、GPI 1–4、GPO 1–4 — iPhone からは使えない | R 行 1171–1188（p.24） |

iPad／iPhone との接続：
- 本資料に iPad／iPhone／Remote アプリの記載は**無い**（全文 grep ヒット 0）。docs.json にも VR-4HD の Remote 接続ガイドは無い
- 「VR-4HD RCS」（PC 用専用ソフト）が静止画送信元として言及されるのみ（行 78, 81, 129）。RCS の通信方式は本資料に無い【不明】

→ **iPhone から使える経路は、本資料の範囲では MIDI DIN 経由（iPhone→USB MIDI インターフェース→MIDI IN）か、RS-232（USB シリアル変換）しか無い**。LAN・BLE MIDI・USB MIDI 直結はいずれも記載無し。capabilities では LAN／BLE／USB MIDI 直結を無効にし、MIDI DIN（外部インターフェース経由）を「要実機確認」で扱う。

## 2. SysEx（R p.27, 29 行 1365–1441, 1597–1625／チェックサム p.40 行 2414–2438）

| 項目 | 値 | 根拠 |
|---|---|---|
| Manufacturer ID | 41H（Roland） | 行 1381, 1427, 1608 |
| Device ID | **10H**（固定値として記載）。範囲・変更方法の記載無し【不明】（REMOTE メニューにも Address Map にも Device ID 設定項目は無い。MIDI ch は別途 `03H 02H 00H` で設定） | 行 1382, 1428, 1609 |
| Model ID | **00H 00H 00H 29H**（4 バイト） | 行 1383–1386, 1429–1432, 1610–1613 |
| DT1 Command ID | 12H | 行 1388, 1614 |
| RQ1 Command ID | 11H | 行 1433 |
| DT1 書式 | `F0 41 10 00 00 00 29 12 aa bb cc dd … ee sum F7` | 行 1374–1376, 1603–1604 |
| RQ1 書式 | `F0 41 10 00 00 00 29 11 aa bb cc ss tt uu sum F7`（サイズ 3 バイト） | 行 1422–1423 |
| RQ1 応答 | 送信可能な状態で、アドレス・サイズが適切なら DT1 で返す。不適切なら**何も返さない** | 行 1415–1419 |
| チェックサム | アドレス＋データ（RQ1 はサイズ）の合計を 128 で割った余り r、checksum = 128 − r（r=0 なら 0） | 行 2425–2438 |
| 分割サイズ | **256 バイト以下**のパケットに分割 | 行 1404, 1624 |
| 送信間隔 | DT1 を連続送信する時は **20 ms 以上**の間隔 | 行 1405, 1625 |
| MIDI ch | n = 0H–FH。**受信チャンネルは VR-4HD 側で [SYSTEM SETUP]→REMOTE→MIDI Rx CHANNEL（1–16、既定 1）に合わせる**（CC 用。SysEx はチャンネル無関係） | 行 1272, 1284–1285, 241–243、p.5 PDF（既定 1 は bold） |
| 実装バージョン | MIDI Implementation Version 1.50（2017-03-16）。MIDI Implementation Chart も Version 1.50（Mar. 16, 2017） | 行 1265–1268, 2493–2494 |
| 「#」付きアドレス | 「#」付きは 2 バイトまたは 3 バイトに分けて送る。**連続して全部受信しないとデータは無視される** | 行 1634–1635 |

備考：
- p.40 のチェックサム計算例は MIDI Visual Control（F0 7E …）の定型文で VR-4HD のアドレスではない（行 2442–2475）
- MIDI Implementation Chart（p.41）：Program Change ×、SysEx O/O、CC 14–15 / 21–30 / 52–54 / 46–47 / 55–61 が O/O（行 2497–2545）

### 2-1. Control Change（受信＝送信とも同じ番号。p.26–29 行 1288–1576）

| CC | 値 | 意味 | 根拠 |
|---|---|---|---|
| 0EH (14) | 00H–03H | **PGM 選択**（CH 1–4）「This selects the video output」。送信側は VIDEO INPUT SELECT [1]–[4] 操作で出力が切替わった時 | 行 1265–1272, 1455–1469 |
| 0FH (15) | 00H–03H | **合成用（サブ）チャンネル選択**（CH 1–4）「selects the video for composition」 | 行 1274–1283, 1472–1481 |
| 15H–1AH (21–26) | 00H–7FH | CH [1]/[2]/[3]/[4]/[5/6]/[7/8] フェーダー | 行 1303–1313 |
| 1BH–1EH (27–30) | 00H–7FH | HDMI [1]–[4] ノブ | 行 1304–1314 |
| 1FH (31) | 00H–7FH | USB [FROM PC] ノブ（※Chart の「21–30」の範囲外だが表にある） | 行 1308 |
| 34H (52) | 00H–7FH | [MAIN] フェーダー | 行 1311 |
| 35H (53) | 00H–7FH | [AUX] フェーダー | 行 1313 |
| 36H (54) | 00H–7FH | USB [To PC] ノブ | 行 1314 |
| 2EH (46) | 00H–02H | トランジションタイプ CUT, MIX, WIPE（原文 p.26 は「CUP」と誤植、p.28 は CUT） | 行 1289–1296, 1487–1492 |
| 2FH (47) | 00H–28H | トランジション時間 0.0–4.0 sec | 行 1302–1306 |
| 37H (55) | 00H–01H | [KEY] ボタン OFF/ON | 行 1313–1317 |
| 38H (56) | 00H–04H | KEY 合成チャンネル OFF, CH 1–4 | 行 1325–1330 |
| 39H (57) | 00H–7FH | KEY レベル（受信値×2 が本体の設定値。送信値は本体の 1/2） | 行 1337–1343, 1528–1531 |
| 3AH (58) | 00H–7FH | VIDEO FX レベル | 行 1348–1352 |
| 3BH (59) | 00H–03H | 合成タイプ OFF, PinP, SPLIT, QUAD | 行 1364–1375 |
| 3CH (60) | 00H–01H | [OUTPUT FADE] OFF/ON | 行 1378–1385 |
| 3DH (61) | 00H–01H | [FREEZE] OFF/ON | 行 1387–1394 |

フェーダー値 0–127 と dB の対応表は行 1319–1359（0=-Inf, 1=-80.0, …, 97=0.0, 127=+10.0）。

## 3. LAN プロトコル

**無し**。TCP ポート／パスワード／`DTH:`/`RQH:`/`VER;` の記載は資料のどこにも無い。V-160HD 系（DTH/RQH）とは**まったく別**。

代わりに **RS-232 簡易コマンド**がある（p.21–23 行 1029–1158）。書式は V-160HD の LAN 簡易制御コマンドに似るが先頭に **stx（02H）** が付く：
- 書式：`stx` + 英大文字 3 文字 + （`:` 引数[,引数…]） + `;`（行 1030–1033）
- 制御コード：stx=02H、**ACK=06H**、XON=11H、XOFF=13H（行 1042）
- **ACK（06H）が返ってから次を送る**（行 1043–1044）。VER/QPI/QDK/QPG/QUB/XON/XOFF には ACK は返らない（行 1125–1126）
- エラー：`stxERR:a;` a=0 syntax error / 4 invalid value / 5 out of range（行 1128–1130）
- キープアライブ／認証：記載無し（RS-232 なので無い）

受信コマンド（Controller→VR-4HD、行 1054–1114）：

| コマンド | 引数 | 意味 |
|---|---|---|
| `stxPGM:a;` | a: 0 (CH1)–3 (CH4) | 映像入力チャンネル選択（PGM） |
| `stxIS4:a;` | 0 HDMI / 1 RGB / 2 CVBS | INPUT 4 のコネクタ選択 |
| `stxTRS:a;` | 0 CUT / 1 MIX / 2 WIPE | トランジションタイプ |
| `stxTIM:a;` | 0–40（0.0–4.0 sec） | トランジション時間 |
| `stxPIP:a;` | 0 OFF / 1 ON | PinP オン/オフ |
| `stxPIS:a;` | 0–3 | PinP インセットのチャンネル |
| `stxDSK:a;` | 0 OFF / 1 ON | キー合成オン/オフ |
| `stxDSS:a;` | -1 OFF, 0–3 | キー合成ソースチャンネル |
| `stxFDE:a;` | 0/1 | OUTPUT FADE |
| `stxFRZ:a;` | 0/1 | FREEZE |
| `stxLM1:a;`–`stxLM4:a;` | 0–127 | オーディオ CH1–4 レベル |
| `stxLS1:a;` `stxLS2:a;` | 0–127 | CH5/6、CH7/8 レベル |
| `stxLH1:a;`–`stxLH4:a;` | 0–127 | HDMI 1–4 レベル |
| `stxLUB:a;` | 0–127 | USB FROM PC レベル |
| `stxLMN:a;` | 0–127 | MAIN 出力レベル |
| `stxMEM:a;` | 0 (MEMORY1)–7 (MEMORY8) | メモリーロード |
| `stxRUB;` | — | USB 接続リセット |
| `stxVER;` | — | バージョン返送 |
| `stxQPI;` `stxQDK;` `stxQPG;` `stxQUB;` | — | PinP／KEY／PGM／USB 状態の問い合わせ |

送信（VR-4HD→Controller、行 1124–1158）：`ACK`／`stxERR:a;`／`stxVER:VR-4HD,a;`（a=バージョン ASCII）／`stxQPI:a,b;`（a=PinP ON/OFF, b=CH 0–3）／`stxQDK:a,b;`（a=KEY ON/OFF, b=-1,0–3）／`stxQPG:a;`（PGM 0–3）／`stxQUB:a;`（0 未接続 / 2 USB2.0 / 3 USB3.0）。QPI/QDK/QPG/QUB は**状態変化時にも自発送信**される（行 1134–1154）。

## 4. アドレスマップの要点（SysEx 3 バイトアドレス）

値のエンコード：
- 1 バイト 7bit。「#」付きは 2 バイト `0aaaaaaa 0bbbbbbb`（aa×128+bb）または 3 バイト `0aaaaaaa 0bbbbbbb 0ccccccc`（行 1634–1635, 2449–2453）。nibbled（4bit）表記の説明は p.40 にあるが VR-4HD の表に nibbled 項目は無い（行 2455–2457）
- 符号付き：1 バイトの -64–63 は 00H–7FH（オフセット 64）、-50–+50% は 00H–64H（オフセット 50）。SPLIT CENTER POSITION だけ `4EH–7FH, 00H–32H` の 7bit 2 の補数表記（行 1715）。2 バイト値の -1920–1920 等は「aaaaaaabbbbbbb = -1920–1920」とだけ書かれ、オフセットか 2 の補数かの明記は無い【不明】
- レベル（3 バイト）：`-32768 : -INF dB`、`-80.0–+10.0 dB`（行 1851–1853）。-32768 を 21bit 2 の補数で表すと 7F 00 00H と読めるが明記無し【推測】。dB→整数のスケール（×10 か）も明記無し【不明】

| 用途 | アドレス | サイズ | 値域 | 意味 | 根拠 |
|---|---|---|---|---|---|
| **PGM 選択** | `00H 07H 00H` VIDEO CH SELECT | 1 | 00H–03H | CH 1–4 | 行 1801 |
| **PST/サブ選択** | `00H 07H 01H` VIDEO SUB CH SELECT | 1 | 00H–03H | CH 1–4（合成用。VR-4HD に PST バスは無い。CC 0FH と同じ） | 行 1802 |
| クロスポイント | **無し（物理入力直指定）**。CH4 だけ `00H 08H 00H` CH4 INPUT SELECT（HDMI / RGB / COMPOSITE）で入力コネクタを選ぶ | 1 | 00H–02H | | 行 1814 |
| トランジション CUT/AUTO | **トリガ無し**。`00H 07H 02H` TRANSITION TYPE（00H–02H = CUT, MIX, WIPE）を書くのがボタン相当。PGM を VIDEO CH SELECT で切替えると現在の TRANSITION TYPE で遷移する【推測】 | 1 | 00H–02H | | 行 1803 |
| トランジション パターン | `00H 01H 00H` MIX PATTERN（MIX, FAM, NAM, MOSAIC）／`00H 01H 01H` WIPE PATTERN（00H–1DH、30 種） | 1 | | | 行 1682–1687 |
| トランジション時間 | `00H 01H 02H` TRANSITION TIME | 1 | 00H–28H | 0–4.0 sec（0.1 sec 刻み） | 行 1688 |
| フェーダー位置（T-bar） | **無し**（VR-4HD に T-bar 無し） | | | | |
| 合成タイプ | `00H 07H 03H` COMPOSITION TYPE | 1 | 00H–03H | OFF, PinP, SPLIT, QUAD（PinP ON = 01H を書く） | 行 1804 |
| PinP | ON PGM = COMPOSITION TYPE=PinP。ON PVW 無し。ソース = VIDEO SUB CH SELECT。時間 無し。位置 `00H 02H 04H/05H`、サイズ `00H 02H 00H` 等（§4-1 参照） | | | | 行 1693–1704 |
| SPLIT | COMPOSITION TYPE=SPLIT。パターン `00H 03H 00H`、位置 `00H 03H 01H–04H` | | | | 行 1711–1715 |
| DSK（KEY） | ON/OFF `00H 07H 04H` KEY SW／ソース `00H 04H 01H` KEY SOURCE CH（OFF, CH1–4, STILL）／タイプ `00H 04H 00H` KEY TYPE（CHROMA, LUMI）／レベル `#00H 04H 02H` CHROMA KEY LEVEL・`#00H 04H 0FH` LUMI KEY LEVEL（2 バイト 0–255） | | | 1 系統 | 行 1721–1748, 1805 |
| OUTPUT FADE | `00H 07H 05H` OUTPUT FADE SW（OFF/ON）、色 `00H 06H 12H`（BLACK, WHITE, STILL） | 1 | 00H–01H | | 行 1806, 1785 |
| FREEZE | `00H 07H 06H` FREEZE SW、`00H 07H 07H` FREEZE SELECT（CH 1–4） | 1 | | | 行 1807–1808 |
| **オーディオ入力レベル** | `#01H xxH 03H–05H` LEVEL（3 バイト）。xx = 00H CH1, 01H CH2, 02H CH3, 03H CH4, 04H CH5/6, 05H CH7/8, 06H HDMI1, 07H HDMI2, 08H HDMI3, 09H HDMI4, 0AH USB(FROM PC) | 3 | -INF, -80.0–+10.0 dB | | 行 1823–1833, 1850–1854, 1929–1933 |
| オーディオ入力ミュート | `01H xxH 33H` MUTE（OFF/ON）、SOLO `01H xxH 32H` | 1 | 00H–01H | | 行 1915–1916, 1966–1967 |
| **MASTER レベル** | `#01H 0BH 00H–02H` MAIN LEVEL（3 バイト）。AUX `#01H 0BH 03H–05H`、PHONES `#01H 0BH 06H–08H`、USB OUT `#01H 0BH 09H–0BH` | 3 | -INF, -80.0–+10.0 dB | | 行 1976–1995 |
| MASTER ミュート | `01H 0BH 34H` MAIN MUTE SW、`01H 0BH 35H` AUX MUTE SW、`01H 0BH 36H` USB OUT MUTE SW | 1 | 00H–01H | | 行 2021–2023 |
| **メモリー ロード** | `03H 03H 00H` MEMORY RECALL TRIGGER | 1 | 00H–07H | MEMORY 1–8 | 行 2376 |
| メモリー 現在番号 | `03H 03H 01H` LOADED MEMORY NO | 1 | 00H–07H, 7FH | 7FH = 未ロード（Read Only） | 行 2377 |
| メモリー 保存／初期化 | `03H 03H 02H` SAVE TRIGGER、`03H 03H 03H` INIT TRIGGER | 1 | 00H–07H | | 行 2378–2379 |
| メモリー 名前 | **無し**（RENAME はメニューのみ、行 517） | | | | |
| メモリー数 | 8 | | | | 行 515, 2376 |
| **タリー** | **読めるブロック無し**。Address Map にタリーの項目は無い。PGM = `00H 07H 00H`（1 バイト）を読んで自前で作る。物理タリーは TALLY/GPIO 端子（TALLY PGM 1–4、合成・トランジション中も含めた MAIN 出力の表示チャンネルに出る） | | | | 行 1193–1197 |
| ラベル（入力名） | **無し** | | | | |
| マクロ／シーケンサー | **無し**。GPI/USER ボタン相当のトリガもアドレス無し（USER ボタンの機能割当自体は Address Map に無い） | | | | |
| **システムバージョン** | `03H 00H 00H`–`03H 00H 07H` System Version String (1)–(8) | 8 | 00H–7FH | ASCII（Read Only）。RS-232 なら `stxVER;` → `stxVER:VR-4HD,a;` | 行 2173–2180, 1132 |
| USB 接続状態 | `03H 01H 14H` USB CONNECTION STATUS | 1 | 00H–02H | NC, USB2.0, USB3.0（Read Only） | 行 2213 |
| 受信前提（MIDI ch） | `03H 02H 00H` MIDI RX Ch（00H–0FH = 1–16） | 1 | | | 行 2359 |
| RS-232 有効化 | `03H 02H 01H` RS232 SW（OFF/ON）、`03H 02H 02H` RS232 BaudRate | 1 | | | 行 2360–2361 |

### 4-1. Parameter Address Map 全転記（p.30–39 行 1633–2381）

先頭アドレス（行 1637–1640）：`00H 00H 00H` Video Parameter Area／`01H 00H 00H` Audio Parameter Area／`03H 00H 00H` System Parameter Area。

#### Video Parameter Area（行 1646–1655）

| Address | Parameter |
|---|---|
| 00H 00H 00H | CH4 Parameter |
| 00H 01H 00H | TRANSITION Parameter |
| 00H 02H 00H | PinP Parameter |
| 00H 03H 00H | SPLIT Parameter |
| 00H 04H 00H | KEY Parameter |
| 00H 05H 00H | VIDEO FX Parameter |
| 00H 06H 00H | OUTPUT Parameter |
| 00H 07H 00H | PANEL Parameter |
| 00H 08H 00H | IN/OUT SETUP Parameter |

**CH4 Parameter**（p.30 行 1660–1677）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 00H 00H 00H | CH4 RESOLUTION (EDID) | 00H–0EH | AUTO, 480/576i, 480/576p, 720p, 1080i, 1080p, 640x480, 800x600, 1024x768, 1280x768, 1280x1024, 1366x768, 1400x1050, 1600x1200, 1920x1200 |
| 00H 00H 01H | CH4 SCALING TYPE | 00H–03H | FULL, LETTERBOX, CROP, DOT BY DOT |
| #00H 00H 02H / 03H | CH4 H. POSITION | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -1920–1920 ※8 の倍数のみ |
| #00H 00H 04H / 05H | CH4 V. POSITION | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -1200–1200 |
| 00H 00H 06H | CH4 H. SIZE | 00H–78H | 80–200 % |
| 00H 00H 07H | CH4 V. SIZE | 00H–78H | 80–200 % |
| 00H 00H 08H | CH4 CONTRAST | 00H–7FH | -64–63 |
| 00H 00H 09H | CH4 SATURATION | 00H–7FH | -64–63 |
| 00H 00H 0AH | CH4 BRIGHTNESS | 00H–7FH | -64–63 |
| 00H 00H 0BH | Reserved | | |
| 00H 00H 0CH | CH4 FLICKER FILTER | 00H–0AH | 0–10 |

**TRANSITION Parameter**（p.30 行 1681–1688）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 00H 01H 00H | MIX PATTERN | 00H–03H | MIX, FAM, NAM, MOSAIC |
| 00H 01H 01H | WIPE PATTERN | 00H–1DH | H-DOWN, H-UP, V-RIGHT, V-LEFT, H-IN, H-OUT, V-IN, V-OUT, R-DOWN, L-DOWN, R-UP, L-UP, BLOCK, V-GRID, H-GRID, H-DOWN/s, H-UP/s, V-RIGHT/s, V-LEFT/s, H-IN/s, H-OUT/s, V-IN/s, V-OUT/s, R-DOWN/s（原文「-DOWN/s」）, L-DOWN/s, R-UP/s, L-UP/s, BLOCK/s, V-GRID/s, H-GRID/s |
| 00H 01H 02H | TRANSITION TIME | 00H–28H | 0–4.0 sec |

**PinP Parameter**（p.30 行 1692–1704）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 00H 02H 00H | PinP SIZE | 00H–02H | 1/4, 1/2, 1/3 |
| 00H 02H 01H | PinP BORDER WIDTH | 00H–0FH | 0–15 |
| 00H 02H 02H | PinP BORDER COLOR | 00H–06H | BLACK, WHITE, GRAY, RED, GREEN, BLUE, YELLOW |
| 00H 02H 03H | PinP PREVIOUS SELECT | 00H–01H | OFF, ON |
| 00H 02H 04H | PinP H. POSITION | 00H–64H | -50–+50 % |
| 00H 02H 05H | PinP V. POSITION | 00H–64H | -50–+50 % |
| 00H 02H 06H | SHAPE | 00H–03H | SQUARE, DIAMOND, CIRCLE, HEART |
| 00H 02H 07H | ASPECT | 00H–01H | 16:9, 1:1 |
| 00H 02H 08H | H. CROPPING | 01H–64H | 1–100% |
| 00H 02H 09H | V. CROPPING | 01H–64H | 1–100% |
| 00H 02H 0AH | H. VIEW POSITION | 00H–64H | -50–+50% |
| 00H 02H 0BH | V. VIEW POSITION | 00H–64H | -50–+50% |

**SPLIT Parameter**（p.31 行 1710–1715）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 00H 03H 00H | SPLIT PATTERN | 00H–03H | V.CENTER, H.CENTER, V.STRETCH, H.STRETCH |
| 00H 03H 01H | SPLIT A-CENTER | 00H–64H | 0–100 % |
| 00H 03H 02H | SPLIT B-CENTER | 00H–64H | 0–100 % |
| 00H 03H 03H | SPLIT PREVIOUS SELECT | 00H–01H | OFF, ON |
| 00H 03H 04H | CENTER POSITION | 4EH–7FH, 00H–32H | -50–+50% |

**KEY Parameter**（p.31 行 1720–1748）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 00H 04H 00H | KEY TYPE | 00H–01H | CHROMA, LUMI |
| 00H 04H 01H | KEY SOURCE CH | 00H–05H | OFF, CH 1–4, STILL |
| #00H 04H 02H / 03H | CHROMA KEY LEVEL | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = 0–255 |
| #00H 04H 04H / 05H | CHROMA KEY GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = 0–255 |
| 00H 04H 06H | CHROMA KEY COLOR | 00H–01H | BLUE, GREEN |
| #00H 04H 07H / 08H | CHROMA KEY HUE WIDTH | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -127–127 |
| #00H 04H 09H / 0AH | CHROMA KEY HUE FINE | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -127–127 |
| #00H 04H 0BH / 0CH | CHROMA KEY SATURATION WIDTH | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -127–127 |
| #00H 04H 0DH / 0EH | CHROMA KEY SATURATION FINE | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -127–127（メニューでは 0–255、行 142。資料内で不一致） |
| #00H 04H 0FH / 10H | LUMI KEY LEVEL | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = 0–255 |
| #00H 04H 11H / 12H | LUMI KEY GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = 0–255 |
| 00H 04H 13H | LUMI KEY COLOR | 00H–01H | BLACK, WHITE |

**VIDEO FX Parameter**（p.31 行 1753–1757）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 00H 05H 00H | EFFECT TYPE | 00H–08H | OFF, NEGATIVE, EMBOSS, COLORIZE, COLORPASS, POSTERIZE, SILHOUETTE, MONOCOLOR, FINDEDGE |
| 00H 05H 01H | VALUE | 00H–7FH | 0–127 |

**OUTPUT Parameter**（p.31 行 1762–1791）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 00H 06H 00H | OUTPUT RESOLUTION (EDID) | 00H–0EH | AUTO, 480/576i, 480/576p, 720p, 1080i, 1080p, 640x480, 800x600, 1024x768, 1280x768, 1280x1024, 1366x768, 1400x1050, 1600x1200, 1920x1200 |
| 00H 06H 01H | OUTPUT SCALING TYPE | 00H–03H | FULL, LETTERBOX, CROP, DOT BY DOT |
| #00H 06H 02H / 03H | OUTPUT H. POSITION | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -1920–1920 ※8 の倍数のみ |
| #00H 06H 04H / 05H | OUTPUT V. POSITION | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -1200–1200 |
| 00H 06H 06H | OUTPUT H. SIZE | 00H–78H | 80–200 % |
| 00H 06H 07H | OUTPUT V. SIZE | 00H–78H | 80–200 % |
| 00H 06H 08H | OUTPUT CONTRAST | 00H–7FH | -64–63 |
| 00H 06H 09H | OUTPUT SATURATION | 00H–7FH | -64–63 |
| 00H 06H 0AH | OUTPUT BRIGHTNESS | 00H–7FH | -64–63 |
| 00H 06H 0BH | OUTPUT COLOR SPACE | 00H–03H | AUTO, RGB-FULL, RGB-LIMIT, YPbPr |
| 00H 06H 0CH | OUTPUT DVI-D/HDMI | 01H–02H | DVI-D, HDMI |
| 00H 06H 0DH | PREVIEW CONTRAST | 00H–7FH | -64–63 |
| 00H 06H 0EH | PREVIEW SATURATION | 00H–7FH | -64–63 |
| 00H 06H 0FH | PREVIEW BRIGHTNESS | 00H–7FH | -64–63 |
| 00H 06H 10H | PREVIEW COLOR SPACE | 00H–03H | AUTO, RGB-FULL, RGB-LIMIT, YPbPr |
| 00H 06H 11H | PREVIEW DVI-D/HDMI | 01H–02H | DVI-D, HDMI |
| 00H 06H 12H | OUTPUT FADE | 00H–02H | BLACK, WHITE, STILL |
| #00H 06H 13H / 14H | OUTPUT FADE WHITE LEVEL | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = 0–255 |
| #00H 06H 15H / 16H | OUTPUT FADE BLACK LEVEL | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = 0–255 |

**PANEL Parameter**（p.32 行 1800–1808）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 00H 07H 00H | VIDEO CH SELECT | 00H–03H | CH 1–4 |
| 00H 07H 01H | VIDEO SUB CH SELECT | 00H–03H | CH 1–4 |
| 00H 07H 02H | TRANSITION TYPE | 00H–02H | CUT, MIX, WIPE |
| 00H 07H 03H | COMPOSITION TYPE | 00H–03H | OFF, PinP, SPLIT, QUAD |
| 00H 07H 04H | KEY SW | 00H–01H | OFF, ON |
| 00H 07H 05H | OUTPUT FADE SW | 00H–01H | OFF, ON |
| 00H 07H 06H | FREEZE SW | 00H–01H | OFF, ON |
| 00H 07H 07H | FREEZE SELECT | 00H–03H | CH 1–4 |

**IN/OUT SETUP Parameter**（p.32 行 1813–1816）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 00H 08H 00H | CH4 INPUT SELECT | 00H–02H | HDMI, RGB, COMPOSITE |
| 00H 08H 01H | PVW OUTPUT SELECT | 00H–01H | MAIN, PVW |
| 00H 08H 02H | USB OUTPUT SELECT | 00H–01H | MAIN, PVW |

#### Audio Parameter Area（p.32 行 1822–1837）

| Address | Parameter |
|---|---|
| 01H 00H 00H | CH1 Parameter |
| 01H 01H 00H | CH2 Parameter |
| 01H 02H 00H | CH3 Parameter |
| 01H 03H 00H | CH4 Parameter |
| 01H 04H 00H | CH5/6 Parameter |
| 01H 05H 00H | CH7/8 Parameter |
| 01H 06H 00H | HDMI1 Parameter |
| 01H 07H 00H | HDMI2 Parameter |
| 01H 08H 00H | HDMI3 Parameter |
| 01H 09H 00H | HDMI4 Parameter |
| 01H 0AH 00H | USB Parameter |
| 01H 0BH 00H | OUTPUT CH Parameter |
| 01H 20H 00H | AUDIO FOLLOW Parameter |
| 01H 30H 00H | AUTO MIXER Parameter |
| 01H 40H 00H | ECHO CANCEL Parameter（※個別表は資料に**無い**。行 1837 のみ） |

**CH1–4 Parameter**（p.32–33 行 1842–1916）xxH = 00H–03H（CH 1–4）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 01H xxH 00H | CH1–4 HA GAIN | 00H–40H | 0–64 dB |
| #01H xxH 01H / 02H | CH1–4 GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -42.0–42.0 dB |
| #01H xxH 03H / 04H / 05H | CH1–4 LEVEL | 0aaaaaaa / 0bbbbbbb / 0ccccccc | aaaaaaabbbbbbbccccccc = -32768 : -INF dB、-80.0–+10.0 dB |
| #01H xxH 06H / 07H / 08H | CH1–4 AUX SEND | 0aaaaaaa / 0bbbbbbb / 0ccccccc | 同上 |
| #01H xxH 09H / 0AH / 0BH | CH1–4 REV SEND | 0aaaaaaa / 0bbbbbbb / 0ccccccc | 同上 |
| 01H xxH 0CH | CH1–4 PAN | 00H–7FH | LEFT–RIGHT |
| 01H xxH 0DH–0FH | Reserved | | |
| #01H xxH 10H / 11H | CH1–4 EQ HI GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -15.0–15.0 dB |
| 01H xxH 12H | CH1–4 EQ HI FREQ | 44H–78H | 1.00–20.0KHz |
| #01H xxH 13H / 14H | CH1–4 EQ MID GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -15.0–15.0 dB |
| 01H xxH 15H | CH1–4 EQ MID FREQ | 00H–78H | 20 Hz–20.0 KHz |
| 01H xxH 16H | CH1–4 EQ MID Q | 00H–05H | 0.5–16.0 |
| #01H xxH 17H / 18H | CH1–4 EQ LO GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -15.0–15.0 dB |
| 01H xxH 19H | CH1–4 EQ LO FREQ | 00H–38H | 20–500 Hz |
| 01H xxH 1AH–1FH | Reserved | | |
| 01H xxH 20H | CH1–4 GATE SW | 00H–01H | OFF, ON |
| #01H xxH 21H / 22H | CH1–4 GATE THRESHOLD | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -80.0–0.0 dB |
| 01H xxH 23H | CH1–4 GATE RELEASE | 00H–7FH | 30–5000 ms |
| 01H xxH 24H | CH1–4 COMP SW | 00H–01H | OFF, ON |
| #01H xxH 25H / 26H | CH1–4 COMP THRESHOLD | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -60.0–0.0 dB |
| 01H xxH 27H | CH1–4 COMP RATIO | 00H–0DH | 1.0:1, 1.12:1, 1.25:1, 1.40:1, 1.60:1, 1.80:1, 2.00:1, 2.50:1, 3.20:1, 4.00:1, 5.60:1, 8.00:1, 16.0:1, INF:1 |
| 01H xxH 28H | CH1–4 COMP ATTACK | 00H–19H | 0.2–100 ms |
| 01H xxH 29H | CH1–4 COMP RELEASE | 00H–7FH | 30–5000 ms |
| 01H xxH 2AH | CH1–4 COMP AUTO GAIN SW | 00H–01H | OFF, ON |
| #01H xxH 2BH / 2CH | CH1–4 COMP MAKEUP GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -42.0–42.0 dB（メニューは -40–40 dB、行 588） |
| 01H xxH 2DH | CH1–4 HPF | 00H–01H | OFF, ON |
| 01H xxH 2EH | Reserved | | |
| 01H xxH 2FH | Reserved | | |
| #01H xxH 30H / 31H | CH1–4 DELAY | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = 0.0–500.0 ms |
| 01H xxH 32H | CH1–4 SOLO | 00H–01H | OFF, ON |
| 01H xxH 33H | CH1–4 MUTE | 00H–01H | OFF, ON |

**CH5/6, CH7/8, HDMI1–4, USB Parameter**（p.33 行 1921–1967）xxH = 04H–0AH（CH5/6, CH7/8, HDMI1–4, USB）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 01H xxH 00H | Reserved | | |
| #01H xxH 01H / 02H | GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -42.0–42.0 dB |
| #01H xxH 03H / 04H / 05H | LEVEL | 0aaaaaaa / 0bbbbbbb / 0ccccccc | aaaaaaabbbbbbbccccccc = -32768 : -INF dB、-80.0–+10.0 dB |
| #01H xxH 06H / 07H / 08H | AUX SEND | 0aaaaaaa / 0bbbbbbb / 0ccccccc | 同上 |
| #01H xxH 09H / 0AH / 0BH | REV SEND | 0aaaaaaa / 0bbbbbbb / 0ccccccc | 同上 |
| 01H xxH 0CH–0FH | Reserved | | |
| #01H xxH 10H / 11H | EQ HI GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -15.0–15.0 dB |
| 01H xxH 12H | EQ HI FREQ | 44H–78H | 1.00–20.0 KHz |
| #01H xxH 13H / 14H | EQ MID GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -15.0–15.0 dB |
| 01H xxH 15H | EQ MID FREQ | 00H–78H | 20 Hz–20.0 KHz |
| 01H xxH 16H | EQ MID Q | 00H–05H | 0.5–16.0 |
| #01H xxH 17H / 18H | EQ LO GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -15.0–15.0 dB |
| 01H xxH 19H | EQ LO FREQ | 00H–38H | 20–500 Hz |
| 01H xxH 1AH–2FH | Reserved | | |
| #01H xxH 30H / 31H | DELAY | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = 0.0–500.0 ms |
| 01H xxH 32H | SOLO | 00H–01H | OFF, ON |
| 01H xxH 33H | MUTE | 00H–01H | OFF, ON |

（USB(0AH) の LOOP-BACK は OUTPUT CH Parameter の `01H 0BH 59H` にある。USB TO PC の MUTE/LEVEL/DELAY も OUTPUT CH 側）

**OUTPUT CH Parameter**（p.34–35 行 1975–2070）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| #01H 0BH 00H / 01H / 02H | MAIN LEVEL | 0aaaaaaa / 0bbbbbbb / 0ccccccc | aaaaaaabbbbbbbccccccc = -32768 : -INF dB、-80.0–+10.0 dB |
| #01H 0BH 03H / 04H / 05H | AUX LEVEL | 同 | 同上 |
| #01H 0BH 06H / 07H / 08H | PHONES LEVEL | 同 | 同上 |
| #01H 0BH 09H / 0AH / 0BH | USB OUT LEVEL | 同 | 同上 |
| 01H 0BH 0CH–0FH | Reserved | | |
| #01H 0BH 10H / 11H | MAIN EQ HI GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -15.0–15.0 dB |
| 01H 0BH 12H | MAIN EQ HI FREQ | 44H–78H | 1.00–20.0 KHz |
| #01H 0BH 13H / 14H | MAIN EQ MID GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -15.0–15.0 dB |
| 01H 0BH 15H | MAIN EQ MID FREQ | 00H–78H | 20Hz–20.0 KHz |
| 01H 0BH 16H | MAIN EQ MID Q | 00H–05H | 0.5–16.0 |
| #01H 0BH 17H / 18H | MAIN EQ LO GAIN | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -15.0–15.0 dB |
| 01H 0BH 19H | MAIN EQ LO FREQ | 00H–38H | 20–500 Hz |
| 01H 0BH 1AH–2FH | Reserved | | |
| #01H 0BH 30H / 31H | USB TO PC DELAY | 0aaaaaaa / 0bbbbbbb | 原文「aaaaaaabbbbbbb = -80.0–0.0 dB」（単位が dB になっているのは資料の誤記と思われる。メニューは 0.0–500.0 ms、行 784）【不明】 |
| #01H 0BH 32H / 33H | AUX DELAY | 0aaaaaaa / 0bbbbbbb | 原文「30–5000 ms」（メニューは 0.0–500.0 ms、行 672。不一致）【不明】 |
| 01H 0BH 34H | MAIN MUTE SW | 00H–01H | OFF, ON |
| 01H 0BH 35H | AUX MUTE SW | 00H–01H | OFF, ON |
| 01H 0BH 36H | USB OUT MUTE SW | 00H–01H | OFF, ON |
| 01H 0BH 37H–3FH | Reserved | | |
| #01H 0BH 40H / 41H / 42H | REVERB LEVEL | 0aaaaaaa / 0bbbbbbb / 0ccccccc | aaaaaaabbbbbbbccccccc = -32768 : -INF dB、-80.0–+10.0 dB |
| 01H 0BH 43H | REVERB TYPE | 00H–01H | ROOM/HALL |
| 01H 0BH 44H | REVERB TIME | 00H–32H | 0.0–5.0 sec |
| 01H 0BH 45H | Main MBC SW | 00H–01H | OFF, ON |
| #01H 0BH 46H / 47H | Main MBC Hi Thres | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -40.0–0.0 dB |
| 01H 0BH 48H | Main MBC Hi Ratio | 00H–0DH | 1.0:1, 1.12:1, 1.25:1, 1.40:1, 1.60:1, 1.80:1, 2.00:1, 2.50:1, 3.20:1, 4.00:1, 5.60:1, 8.00:1, 16.0:1, INF:1 |
| #01H 0BH 49H / 4AH | Main MBC Mid Thres | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -40.0–0.0 dB |
| 01H 0BH 4BH | Main MBC Mid Ratio | 00H–0DH | 同上 14 段 |
| #01H 0BH 4CH / 4DH | Main MBC Low Thres | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -40.0–0.0 dB |
| 01H 0BH 4EH | Main MBC Low Ratio | 00H–0DH | 同上 14 段 |
| 01H 0BH 4FH | Main Lmt SW | 00H–01H | OFF, ON |
| #01H 0BH 50H / 51H | Main Lmt Thres | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -40.0–0.0 dB |
| 01H 0BH 52H | Phones Lmt SW | 00H–01H | OFF, ON |
| #01H 0BH 53H / 54H | Phones Lmt Thres | 0aaaaaaa / 0bbbbbbb | aaaaaaabbbbbbb = -40.0–0.0 dB |
| 01H 0BH 55H | MAIN Out Select | 00H–01H | MAIN, AUX |
| 01H 0BH 56H | AUX Out Select | 00H–01H | MAIN, AUX |
| 01H 0BH 57H | USB Out Select | 00H–01H | MAIN, AUX |
| 01H 0BH 58H | Phones Out Select | 00H–01H | MAIN, AUX |
| 01H 0BH 59H | LOOP-BACK | 00H–01H | OFF, ON |

**AUDIO FOLLOW Parameter**（p.35 行 2076–2125）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 01H 20H 00H | AUDIO FOLLOW SW | 00H–01H | OFF, ON |
| 01H 20H 01H | AUDIO FOLLOW SW Output Fade | 00H–01H | OFF, ON |
| 01H 20H 02H–0FH | Reserved | | |
| 01H 20H 10H | AUDIO FOLLOW CH1 VideoCh1 | 00H–01H | OFF, ON |
| 01H 20H 11H | AUDIO FOLLOW CH1 VideoCh2 | 00H–01H | OFF, ON |
| 01H 20H 12H | AUDIO FOLLOW CH1 VideoCh3 | 00H–01H | OFF, ON |
| 01H 20H 13H | AUDIO FOLLOW CH1 VideoCh4 | 00H–01H | OFF, ON |
| 01H 20H 14H | AUDIO FOLLOW CH2 VideoCh1 | 00H–01H | OFF, ON |
| 01H 20H 15H | AUDIO FOLLOW CH2 VideoCh2 | 00H–01H | OFF, ON |
| 01H 20H 16H | AUDIO FOLLOW CH2 VideoCh3 | 00H–01H | OFF, ON |
| 01H 20H 17H | AUDIO FOLLOW CH2 VideoCh4 | 00H–01H | OFF, ON |
| 01H 20H 18H | AUDIO FOLLOW CH3 VideoCh1 | 00H–01H | OFF, ON |
| 01H 20H 19H | AUDIO FOLLOW CH3 VideoCh2 | 00H–01H | OFF, ON |
| 01H 20H 1AH | AUDIO FOLLOW CH3 VideoCh3 | 00H–01H | OFF, ON |
| 01H 20H 1BH | AUDIO FOLLOW CH3 VideoCh4 | 00H–01H | OFF, ON |
| 01H 20H 1CH | AUDIO FOLLOW CH4 VideoCh1 | 00H–01H | OFF, ON |
| 01H 20H 1DH | AUDIO FOLLOW CH4 VideoCh2 | 00H–01H | OFF, ON |
| 01H 20H 1EH | AUDIO FOLLOW CH4 VideoCh3 | 00H–01H | OFF, ON |
| 01H 20H 1FH | AUDIO FOLLOW CH4 VideoCh4 | 00H–01H | OFF, ON |
| 01H 20H 20H | AUDIO FOLLOW CH5/6 VideoCh1 | 00H–01H | OFF, ON |
| 01H 20H 21H | AUDIO FOLLOW CH5/6 VideoCh2 | 00H–01H | OFF, ON |
| 01H 20H 22H | AUDIO FOLLOW CH5/6 VideoCh3 | 00H–01H | OFF, ON |
| 01H 20H 23H | AUDIO FOLLOW CH5/6 VideoCh4 | 00H–01H | OFF, ON |
| 01H 20H 24H | AUDIO FOLLOW CH7/8 VideoCh1 | 00H–01H | OFF, ON |
| 01H 20H 25H | AUDIO FOLLOW CH7/8 VideoCh2 | 00H–01H | OFF, ON |
| 01H 20H 26H | AUDIO FOLLOW CH7/8 VideoCh3 | 00H–01H | OFF, ON |
| 01H 20H 27H | AUDIO FOLLOW CH7/8 VideoCh4 | 00H–01H | OFF, ON |
| 01H 20H 28H | AUDIO FOLLOW HDMI1 VideoCh1 | 00H–01H | OFF, ON |
| 01H 20H 29H | AUDIO FOLLOW HDMI1 VideoCh2 | 00H–01H | OFF, ON |
| 01H 20H 2AH | AUDIO FOLLOW HDMI1 VideoCh3 | 00H–01H | OFF, ON |
| 01H 20H 2BH | AUDIO FOLLOW HDMI1 VideoCh4 | 00H–01H | OFF, ON |
| 01H 20H 2CH | AUDIO FOLLOW HDMI2 VideoCh1 | 00H–01H | OFF, ON |
| 01H 20H 2DH | AUDIO FOLLOW HDMI2 VideoCh2 | 00H–01H | OFF, ON |
| 01H 20H 2EH | AUDIO FOLLOW HDMI2 VideoCh3 | 00H–01H | OFF, ON |
| 01H 20H 2FH | AUDIO FOLLOW HDMI2 VideoCh4 | 00H–01H | OFF, ON |
| 01H 20H 30H | AUDIO FOLLOW HDMI3 VideoCh1 | 00H–01H | OFF, ON |
| 01H 20H 31H | AUDIO FOLLOW HDMI3 VideoCh2 | 00H–01H | OFF, ON |
| 01H 20H 32H | AUDIO FOLLOW HDMI3 VideoCh3 | 00H–01H | OFF, ON |
| 01H 20H 33H | AUDIO FOLLOW HDMI3 VideoCh4 | 00H–01H | OFF, ON |
| 01H 20H 34H | AUDIO FOLLOW HDMI4 VideoCh1 | 00H–01H | OFF, ON |
| 01H 20H 35H | AUDIO FOLLOW HDMI4 VideoCh2 | 00H–01H | OFF, ON |
| 01H 20H 36H | AUDIO FOLLOW HDMI4 VideoCh3 | 00H–01H | OFF, ON |
| 01H 20H 37H | AUDIO FOLLOW HDMI4 VideoCh4 | 00H–01H | OFF, ON |
| 01H 20H 38H | AUDIO FOLLOW USB VideoCh1 | 00H–01H | OFF, ON |
| 01H 20H 39H | AUDIO FOLLOW USB VideoCh2 | 00H–01H | OFF, ON |
| 01H 20H 3AH | AUDIO FOLLOW USB VideoCh3 | 00H–01H | OFF, ON |
| 01H 20H 3BH | AUDIO FOLLOW USB VideoCh4 | 00H–01H | OFF, ON |

**AUDIO MIXER（AUTO MIXER）Parameter**（p.35–36 行 2129–2155。PDF p.36 で原文を目視確認済み）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 01H 30H 00H | AUTO MIXER SW | 00H–01H | OFF, ON |
| 01H 30H 01H | AUTO MIXER CH1 SW | 00H–01H | OFF, ON |
| 01H 30H 02H | AUTO MIXER CH1 WEIGHT | 00H–64H | 0–100 |
| 01H 30H 03H | AUTO MIXER CH2 SW | 00H–01H | OFF, ON |
| 01H 30H 04H | AUTO MIXER CH2 WEIGHT | 00H–64H | 0–100 |
| 01H 30H 05H | AUTO MIXER CH3 SW | 00H–01H | OFF, ON |
| 01H 30H 06H | AUTO MIXER CH3 WEIGHT | 00H–64H | 0–100 |
| 01H 30H 07H | AUTO MIXER CH4 SW | 00H–01H | OFF, ON |
| 01H 30H 08H | AUTO MIXER CH4 WEIGHT | 00H–64H | 0–100 |
| 01H 30H 09H | AUTO MIXER CH5/6 SW | 00H–01H | OFF, ON |
| 01H 30H 0AH | AUTO MIXER CH5/6 WEIGHT | 00H–64H | 0–100 |
| 01H 30H 0BH | AUTO MIXER CH7/8 SW | 00H–01H | OFF, ON |
| 01H 30H 0CH | AUTO MIXER CH7/8 WEIGHT | 00H–64H | 0–100 |
| 01H 30H 0DH | AUTO MIXER HDMI1 SW | 00H–01H | OFF, ON |
| 01H 30H 0EH | AUTO MIXER HDMI1 WEIGHT | 00H–64H | 0–100 |
| 01H 30H 0FH | AUTO MIXER HDMI2 SW | 00H–01H | OFF, ON |
| **01H 20H 10H**（原文ママ） | AUTO MIXER HDMI2 WEIGHT | 00H–64H | 0–100 |
| **01H 20H 11H**（原文ママ） | AUTO MIXER HDMI3 SW | 00H–01H | OFF, ON |
| **01H 20H 12H**（原文ママ） | AUTO MIXER HDMI3 WEIGHT | 00H–64H | 0–100 |
| **01H 20H 13H**（原文ママ） | AUTO MIXER HDMI4 SW | 00H–01H | OFF, ON |
| **01H 20H 14H**（原文ママ） | AUTO MIXER HDMI4 WEIGHT | 00H–64H | 0–100 |

※ 最後の 5 行は原文（PDF p.36）が `01H 20H 10H`–`14H` となっているが、`01H 20H 10H`–`14H` は AUDIO FOLLOW CH1/CH2 と衝突する。`01H 30H 10H`–`14H` の誤植と思われる【推測】。実機で RQ1 して確かめる。

#### System Parameter Area（p.36 行 2161–2167）

| Address | Parameter |
|---|---|
| 03H 00H 00H | VERSION Parameter |
| 03H 01H 00H ／ 03H 04H 00H | SETUP Parameter（2 ブロック） |
| 03H 02H 00H | REMOTE Parameter |
| 03H 03H 00H | MEMORY Parameter |

**Version Parameter**（p.36 行 2172–2180）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 03H 00H 00H | System Version String (1) | 00H–7FH | ASCII Character (Read Only) |
| 03H 00H 01H | System Version String (2) | 00H–7FH | ASCII Character (Read Only) |
| 03H 00H 02H | System Version String (3) | 00H–7FH | ASCII Character (Read Only) |
| 03H 00H 03H | System Version String (4) | 00H–7FH | ASCII Character (Read Only) |
| 03H 00H 04H | System Version String (5) | 00H–7FH | ASCII Character (Read Only) |
| 03H 00H 05H | System Version String (6) | 00H–7FH | ASCII Character (Read Only) |
| 03H 00H 06H | System Version String (7) | 00H–7FH | ASCII Character (Read Only) |
| 03H 00H 07H | System Version String (8) | 00H–7FH | ASCII Character (Read Only) |

**Setup Parameter**（p.36–38 行 2185–2348）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 03H 01H 00H | HDCP SW | 00H–01H | OFF, ON |
| 03H 01H 01H | FRAME RATE | 00H–01H | 59.94 Hz, 50 Hz |
| 03H 01H 02H | SYSTEM FORMAT | 00H–02H | 720p, 1080i, 1080p |
| 03H 01H 03H | LCD BRIGHTNESS | 00H–01H | LOW, HIGH |
| 03H 01H 04H | MENU DISPLAY LEVEL | 05H–0FH | 5–15 |
| 03H 01H 05H | LEVEL METER DISPLAY | 00H–01H | OFF, ON |
| 03H 01H 06H | INPUT CH LABEL DISPLAY | 00H–01H | OFF, ON |
| 03H 01H 07H | TALLY LABEL DISPLAY | 00H–01H | OFF, ON |
| 03H 01H 08H | NO SIGNAL BACK | 00H–01H | BLACK, BLUE |
| 03H 01H 09H | UNFIT SIGNAL BACK | 00H–02H | BLACK, BLUE, THRU |
| 03H 01H 0AH | DEINTERLACE MODE | 00H–01H | WEAVE, BOB |
| 03H 01H 0BH | COLOR BAR OUTPUT | 00H–01H | OFF, ON |
| 03H 01H 0CH | TEST TONE OUTPUT | 00H–01H | OFF, ON |
| 03H 01H 0DH | AUTO OFF | 00H–01H | OFF, ON |
| 03H 01H 0EH | PANEL LOCK | 00H–01H | OFF, ON |
| 03H 01H 0FH | MONITOR BUTTON LOCK | 00H–01H | OFF, ON |
| 03H 01H 10H | TOUCH PANEL LOCK | 00H–01H | OFF, ON |
| 03H 01H 11H | FREEZE MODE | 00H–01H | ALL, SELECT |
| 03H 01H 12H | AUTO SWITCHING SW | 00H–01H | OFF, ON |
| （03H 01H 13H） | （表に無し） | | |
| 03H 01H 14H | USB CONNECTION STATUS | 00H–02H | NC, USB2.0, USB3.0 (Read Only) |
| 03H 04H 00H | AUTO SWITCHING TYPE | 00H–02H | AUTO SCAN, BEAT SYNC SWITCHING, VIDEO FOLLOWS AUDIO |
| 03H 04H 01H | AUTO SW TRANSITION TIME | 00H–28H | 0.0–4.0sec |
| 03H 04H 02H | AUTO SCAN SCANTIME VIDEO INPUT 1 | 00H–78H | OFF, 1–120sec |
| 03H 04H 03H | AUTO SCAN SCANTIME VIDEO INPUT 2 | 00H–78H | OFF, 1–120sec |
| 03H 04H 04H | AUTO SCAN SCANTIME VIDEO INPUT 3 | 00H–78H | OFF, 1–120sec |
| 03H 04H 05H | AUTO SCAN SCANTIME VIDEO INPUT 4 | 00H–78H | OFF, 1–120sec |
| 03H 04H 06H | AUTO SCAN SEQUENCE | 00H–01H | NORMAL, RANDOM |
| 03H 04H 07H | BEAT SYNC SWITCHING SYNC SOURCE | 00H–0AH | IN1, IN2, IN3, IN4, IN5/6, IN7/8, HDMI1, HDMI2, HDMI3, HDMI4, USB FROM PC |
| 03H 04H 08H | BEAT SYNC SWITCHING CYCLE | 01H–10H | 1–16 |
| 03H 04H 09H | BEAT SYNC SWITCHING SEQUENCE | 00H–01H | NORMAL, RANDOM |
| 03H 04H 0AH | BEAT SYNC SWITCHING VIDEO INPUT1 SW | 00H–01H | OFF, ON |
| 03H 04H 0BH | BEAT SYNC SWITCHING VIDEO INPUT2 SW | 00H–01H | OFF, ON |
| 03H 04H 0CH | BEAT SYNC SWITCHING VIDEO INPUT3 SW | 00H–01H | OFF, ON |
| 03H 04H 0DH | BEAT SYNC SWITCHING VIDEO INPUT4 SW | 00H–01H | OFF, ON |
| 03H 04H 0EH | VIDEO FOLLOWS AUDIO TIME | 01H–78H | 1–120sec |
| 03H 04H 0FH | VIDEO FOLLOWS AUDIO INPUT1 SENSE | 00H–64H | 0–100 |
| 03H 04H 10H | VIDEO FOLLOWS AUDIO INPUT2 SENSE | 00H–64H | 0–100 |
| 03H 04H 11H | VIDEO FOLLOWS AUDIO INPUT3 SENSE | 00H–64H | 0–100 |
| 03H 04H 12H | VIDEO FOLLOWS AUDIO INPUT4 SENSE | 00H–64H | 0–100 |
| 03H 04H 13H | VIDEO FOLLOWS AUDIO INPUT1 SELECT | 00H–05H | OFF, 1, 2, 3, 4, QUAD |
| 03H 04H 14H | VIDEO FOLLOWS AUDIO INPUT2 SELECT | 00H–05H | OFF, 1, 2, 3, 4, QUAD |
| 03H 04H 15H | VIDEO FOLLOWS AUDIO INPUT3 SELECT | 00H–05H | OFF, 1, 2, 3, 4, QUAD |
| 03H 04H 16H | VIDEO FOLLOWS AUDIO INPUT4 SELECT | 00H–05H | OFF, 1, 2, 3, 4, QUAD |
| 03H 04H 17H | VIDEO FOLLOWS AUDIO MULTI INPUT SELECT | 00H–05H | OFF, 1, 2, 3, 4, QUAD |
| 03H 04H 18H | VIDEO FOLLOWS AUDIO SILENT SELECT | 00H–06H | OFF, 1, 2, 3, 4, QUAD, AUTO SCAN |
| （03H 04H 19H） | （表に無し） | | |
| 03H 04H 1AH | PANEL LOCK VIDEO INPUT CH1 BUTTON | 00H–01H | OFF, ON |
| 03H 04H 1BH | PANEL LOCK VIDEO INPUT CH2 BUTTON | 00H–01H | OFF, ON |
| 03H 04H 1CH | PANEL LOCK VIDEO INPUT CH3 BUTTON | 00H–01H | OFF, ON |
| 03H 04H 1DH | PANEL LOCK VIDEO INPUT CH4 BUTTON | 00H–01H | OFF, ON |
| 03H 04H 1EH | PANEL LOCK OUTPUT FADE BUTTON | 00H–01H | OFF, ON |
| 03H 04H 1FH | PANEL LOCK KEY BUTTON | 00H–01H | OFF, ON |
| 03H 04H 20H | PANEL LOCK IN/OUT SETUP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 21H | PANEL LOCK VFX / KEY LEVEL BUTTON | 00H–01H | OFF, ON |
| 03H 04H 22H | PANEL LOCK FREEZE BUTTON | 00H–01H | OFF, ON |
| 03H 04H 23H | PANEL LOCK PinP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 24H | PANEL LOCK SPLIT BUTTON | 00H–01H | OFF, ON |
| 03H 04H 25H | PANEL LOCK QUAD BUTTON | 00H–01H | OFF, ON |
| 03H 04H 26H | PANEL LOCK CUT BUTTON | 00H–01H | OFF, ON |
| 03H 04H 27H | PANEL LOCK MIX BUTTON | 00H–01H | OFF, ON |
| 03H 04H 28H | PANEL LOCK WIPE BUTTON | 00H–01H | OFF, ON |
| 03H 04H 29H | PANEL LOCK TRANSITION TIME KNOB | 00H–01H | OFF, ON |
| 03H 04H 2AH | PANEL LOCK USER1 BUTTON | 00H–01H | OFF, ON |
| 03H 04H 2BH | PANEL LOCK USER2 BUTTON | 00H–01H | OFF, ON |
| 03H 04H 2CH | PANEL LOCK USER3 BUTTON | 00H–01H | OFF, ON |
| 03H 04H 2DH | PANEL LOCK USER4 BUTTON | 00H–01H | OFF, ON |
| 03H 04H 2EH | PANEL LOCK USER5 BUTTON | 00H–01H | OFF, ON |
| 03H 04H 2FH | PANEL LOCK USER SETUP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 30H | PANEL LOCK HDMI1 LEVEL KNOB | 00H–01H | OFF, ON |
| 03H 04H 31H | PANEL LOCK HDMI2 LEVEL KNOB | 00H–01H | OFF, ON |
| 03H 04H 32H | PANEL LOCK HDMI3 LEVEL KNOB | 00H–01H | OFF, ON |
| 03H 04H 33H | PANEL LOCK HDMI4 LEVEL KNOB | 00H–01H | OFF, ON |
| 03H 04H 34H | PANEL LOCK HDMI SETUP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 35H | PANEL LOCK USB FROM PC KNOB | 00H–01H | OFF, ON |
| 03H 04H 36H | PANEL LOCK USB TO PC KNOB | 00H–01H | OFF, ON |
| 03H 04H 37H | PANEL LOCK USB SETUP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 38H | PANEL LOCK INPUT1 GAIN KNOB | 00H–01H | OFF, ON |
| 03H 04H 39H | PANEL LOCK INPUT2 GAIN KNOB | 00H–01H | OFF, ON |
| 03H 04H 3AH | PANEL LOCK INPUT3 GAIN KNOB | 00H–01H | OFF, ON |
| 03H 04H 3BH | PANEL LOCK INPUT4 GAIN KNOB | 00H–01H | OFF, ON |
| 03H 04H 3CH | PANEL LOCK INPUT1 LEVEL FADER | 00H–01H | OFF, ON |
| 03H 04H 3DH | PANEL LOCK INPUT2 LEVEL FADER | 00H–01H | OFF, ON |
| 03H 04H 3EH | PANEL LOCK INPUT3 LEVEL FADER | 00H–01H | OFF, ON |
| 03H 04H 3FH | PANEL LOCK INPUT4 LEVEL FADER | 00H–01H | OFF, ON |
| 03H 04H 40H | PANEL LOCK INPUT1 SETUP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 41H | PANEL LOCK INPUT2 SETUP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 42H | PANEL LOCK INPUT3 SETUP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 43H | PANEL LOCK INPUT4 SETUP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 44H | PANEL LOCK INPUT 5/6 LEVEL FADER | 00H–01H | OFF, ON |
| 03H 04H 45H | PANEL LOCK INPUT 5/6 SETUP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 46H | PANEL LOCK INPUT 7/8 LEVEL FADER | 00H–01H | OFF, ON |
| 03H 04H 47H | PANEL LOCK INPUT 7/8 SETUP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 48H | PANEL LOCK MAIN OUT LEVEL FADER | 00H–01H | OFF, ON |
| 03H 04H 49H | PANEL LOCK MAIN OUT SETUP BUTTON | 00H–01H | OFF, ON |
| 03H 04H 4AH | PANEL LOCK PHONES KNOB | 00H–01H | OFF, ON |
| 03H 04H 4BH | PANEL LOCK REVERB KNOB | 00H–01H | OFF, ON |

**Remote Parameter**（p.39 行 2358–2369）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 03H 02H 00H | MIDI RX Ch | 00H–0FH | 1–16 |
| 03H 02H 01H | RS232 SW | 00H–01H | OFF, ON |
| 03H 02H 02H | RS232 BaudRate | 00H–03H | 9600, 19200, 38400, 115200 |
| 03H 02H 03H | GPI 1 ASSIGN | 00H–11H | N/A, CH SEL 1–4, MEMLOAD 1–8, USER 1–5 |
| 03H 02H 04H | GPI 2 ASSIGN | 00H–11H | N/A, CH SEL 1–4, MEMLOAD 1–8, USER 1–5 |
| 03H 02H 05H | GPI 3 ASSIGN | 00H–11H | N/A, CH SEL 1–4, MEMLOAD 1–8, USER 1–5 |
| 03H 02H 06H | GPI 4 ASSIGN | 00H–11H | N/A, CH SEL 1–4, MEMLOAD 1–8, USER 1–5 |
| 03H 02H 07H | GPO 1 TYPE | 00H–01H | ONESHOT, ALT |
| 03H 02H 08H | GPO 2 TYPE | 00H–01H | ONESHOT, ALT |
| 03H 02H 09H | GPO 3 TYPE | 00H–01H | ONESHOT, ALT |
| 03H 02H 0AH | GPO 4 TYPE | 00H–01H | ONESHOT, ALT |

**Memory Parameter**（p.39 行 2375–2381）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 03H 03H 00H | MEMORY RECALL TRIGGER | 00H–07H | MEMORY 1–8 |
| 03H 03H 01H | LOADED MEMORY NO | 00H–07H, 7FH | 0H–07H: MEMORY 1–8, 7FH = no load (Read Only) |
| 03H 03H 02H | MEMORY SAVE TRIGGER | 00H–07H | MEMORY 1–8 |
| 03H 03H 03H | MEMORY INIT TRIGGER | 00H–07H | MEMORY 1–8 |
| 03H 03H 04H | MANUAL MODE | 00H–01H | OFF, ON |
| 03H 03H 05H | POWER ON LOAD | 00H–08H | OFF, MEMORY 1–8 |

## 5. ソース一覧（VIDEO CH SELECT / SUB CH SELECT / CC 0EH・0FH / `stxPGM:` の値 → 物理入力）

| 値 | チャンネル | 物理入力 | 根拠 |
|---|---|---|---|
| 00H | CH 1 | HDMI IN 1 | 行 277（SYSTEM FORMAT 表「HDMI IN 1–3」）、行 975 |
| 01H | CH 2 | HDMI IN 2 | 同上 |
| 02H | CH 3 | HDMI IN 3 | 同上 |
| 03H | CH 4 | HDMI IN 4 ／ RGB/COMPONENT 4 ／ COMPOSITE 4 のいずれか（`00H 08H 00H` CH4 INPUT SELECT または `stxIS4:` で選択） | 行 285–287, 977, 1056, 1814 |

STILL は PGM ソースとしては選べない。KEY SOURCE CH（`00H 04H 01H`）の 05H = STILL（キャプチャ画／RCS から送った静止画）と、OUTPUT FADE=STILL（`00H 06H 12H`=02H で [OUTPUT FADE] が静止画出力ボタンになる）でのみ使う（行 128–129, 212–213, 1722, 1785）。

## 6. 数

| 項目 | 数 | 根拠 |
|---|---|---|
| 映像入力チャンネル | 4（CH 1–4） | 行 1801 |
| HDMI 入力 | 4（HDMI IN 1–4。CH4 は RGB/COMPONENT・COMPOSITE と排他） | 行 277, 285 |
| SDI | 0（記載無し） | |
| STILL | 1（キャプチャ or RCS 送信。電源 OFF で消える） | 行 77–83 |
| PinP | 1（COMPOSITION TYPE の 1 モード） | 行 1804 |
| SPLIT | 1（同上） | 行 1804 |
| QUAD | 1（4 分割。同上） | 行 1804 |
| DSK（KEY） | 1（CHROMA / LUMI） | 行 1721 |
| メモリー | 8 | 行 515, 2376 |
| マクロ | 0 | |
| USER ボタン | 5（アドレス無し） | 行 806 |
| オーディオ入力 | 11 系統：CH1–4（XLR/TRS、HA GAIN あり）、CH5/6、CH7/8（ステレオ）、HDMI 1–4、USB FROM PC | 行 1823–1833 |
| オーディオ出力 | MAIN、AUX、PHONES、USB TO PC（各 LEVEL／MAIN・AUX・USB に MUTE。各出力に MAIN/AUX バス選択） | 行 1976–2070 |
| 映像出力 | HDMI OUT ＋ RGB/COMPONENT（MAIN）、PVW OUT（MAIN/PVW 選択 `00H 08H 01H`）、USB 3.0（MAIN/PVW 選択 `00H 08H 02H`） | 行 175–176, 980–986, 1815–1816 |
| AUX 映像 | 無し（AUX はオーディオバスのみ） | |

## 7. 機種固有の注意

- **受信の前提設定（MIDI）**：CC は [SYSTEM SETUP]→REMOTE→**MIDI Rx CHANNEL**（既定 1）に送信側チャンネルを合わせる（行 241–243, 1284–1285）。SysEx の Device ID は 10H 固定で設定項目無し。MVC/V-LINK の ON/OFF 項目は無い（MIDI Visual Control の記述はチェックサム例のみ）
- **受信の前提設定（RS-232）**：REMOTE→**RS-232 を ON**（既定 OFF）、BAUDRATE を合わせる（既定 115200）（行 244–245、p.5 PDF）。SysEx でも `03H 02H 01H`／`02H` で設定可
- **ACK 必須**：RS-232 は ACK（06H）を待ってから次コマンド。VER/Q** 系は ACK 無しで応答本文が返る（行 1043–1044, 1125–1126）
- **REMOTE メニューの設定はメモリーに保存されず本体に 1 セットだけ**（行 520–527）
- RQ1 は不適切なら無応答（行 1419）→ タイムアウト前提で実装
- 「#」付きアドレスは分割バイトを連続で全部送らないと無視（行 1634–1635）
- **CUT/AUTO ボタンに相当するトリガが SysEx にも RS-232 にも無い**。PGM 切替（`00H 07H 00H`／CC 0EH／`stxPGM:`）が TRANSITION TYPE に従って遷移する【推測】。CUT したいなら TRANSITION TYPE=CUT を先に書く
- **PST/PVW バスが無い**。SUB CH SELECT は PinP/SPLIT/KEY の合成用ソース（PVW OUT は MAIN か 4 分割の PVW）
- タリー読出しブロック無し。PGM を読んで自前生成
- 対応 FW：MIDI Implementation は Version 1.50（2017-03-16）表記、マニュアルは「Version 2.100 and later」（行 2）。FW 2.1 でも Address Map は 1.50 のまま更新されていない可能性【推測】
- 資料内の誤記／不一致（転記はママ）：CC 46 の「CUP」（行 1293）／AUTO MIXER の `01H 20H 10H–14H`（行 2151–2155）／USB TO PC DELAY の単位 dB（行 2016）／AUX DELAY の 30–5000 ms（行 2019）／CHROMA KEY SAT FINE の値域（メニュー 0–255 vs Map -127–127）／COMP MAKEUP GAIN（メニュー ±40 vs Map ±42）／WIPE の「-DOWN/s」（R-DOWN/s の脱字、行 1686）

## 8. 不明・推測一覧（実機で確かめる項目）

1. **USB MIDI の有無**：USB 3.0 ポートが PC に対して MIDI デバイスとしても見えるか（RCS の通信方式が USB MIDI か独自か）。iPhone の CoreMIDI にデバイスが見えるか【不明】→ 本資料では iPhone から直結できる経路が確認できない
2. **MIDI DIN の端子形状**（5 pin DIN か）と、USB MIDI インターフェース経由で iPhone→MIDI IN の SysEx が通るか【推測：通る】
3. Device ID 10H 以外（ブロードキャスト 7FH 等）を受けるか【不明】
4. 3 バイトレベル値のエンコード：-INF = -32768 の 21bit 表現（7F 00 00H か）、dB×10 スケールか【不明】
5. 2 バイト符号付き値（H. POSITION ±1920、HUE WIDTH ±127、EQ GAIN ±15.0 等）がオフセットか 2 の補数か【不明】
6. AUTO MIXER HDMI2 WEIGHT 以降の正しいアドレス（`01H 30H 10H–14H` か原文どおり `01H 20H 10H–14H` か）【推測：30H】
7. USB TO PC DELAY／AUX DELAY の実際の値域・単位【不明】
8. VIDEO CH SELECT を書いた時にトランジション（MIX/WIPE、TRANSITION TIME）が掛かるか、即 CUT か【推測：TRANSITION TYPE に従う】
9. MEMORY RECALL TRIGGER の書込み後、LOADED MEMORY NO に反映されるタイミング／MANUAL MODE=ON 時の挙動【不明】
10. ECHO CANCEL Parameter（`01H 40H 00H`）の中身（資料に表が無い）【不明】
11. `03H 01H 13H`、`03H 04H 19H` の欠番の中身【不明】
12. RS-232 で `stxVER;` が返す a（バージョン文字列）の書式、SysEx の 8 文字版との対応【不明】
13. VR-4HD Remote（iPad アプリ）が存在するか、存在する場合の接続方式【不明】（本資料と docs.json に記載無し）
