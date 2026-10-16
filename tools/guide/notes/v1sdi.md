# V-1SDI 抽出メモ（SW CROSSPOINT 機種追加用）

資料（docs.json に載っている V-1SDI の公開資料はこの 1 本だけ。Owner's Manual／Remote Connection ガイドは無い）：
- R = `pdf/v-1sdi/V-1SDI_reference_v15_eng02_W.txt`（Reference Manual「Version 1.5 and later」© 2017、pdftotext -layout、1746 行、PDF 25 ページ）
  - Menu List p.2–6 = 行 17–368
  - RS-232 Command Reference p.7–10 = 行 369–619
  - MIDI Implementation p.11–23 = 行 620–1675（MIDI Implementation Version 1.50 / 2017-02-28）
    - p.11–13（行 620–935）は **2 段組で左右が混在**（左＝受信 CC / 送信 CC、右＝受信 CC 続き・RQ1/DT1 / 送信 CC 続き）。下の転記は左右を分離済み
    - p.14 = 行 1018（DT1 再掲）、**Parameter Address Map p.15–22 = 行 1021–1560（1 段組）**
    - p.23 = 行 1565–1675（補足：10 進/16 進表、チェックサム計算）
  - MIDI Implementation Chart p.24 = 行 1676–1741
- 行番号は txt の行、p. は PDF 紙面のノンブル。
- **この Reference Manual には仕様表・パネル説明・端子図（RS-232 以外）が無い**。端子の有無は本文中の語句（「MIDI IN」「MIDI OUT」「RS-232 connector」）からしか分からない。

## 1. 接続手段

| 手段 | 有無 | 根拠 |
|---|---|---|
| LAN | **無し**。LAN / Ethernet / RJ45 / Wi-Fi / IP の語が資料のどこにも無い（grep ヒット 0）。TCP 8023 / `DTH:` / `RQH:` / `VER;` の記載も無い | R 全文 |
| USB | **記載無し**【不明】。「USB」の語は資料に 1 回も出ない（grep ヒット 0）。「V-1SDI RCS dedicated software」から静止画を送れるとあるが（行 110, 241–244）、RCS が何経由で接続するかは書かれていない【不明】 | R 行 110, 241–244 |
| USB MIDI か・クラスコンプライアントか | 【不明】（USB の記載自体が無い） | — |
| Bluetooth | **無し**（grep「Bluetooth」ヒット 0。BLE MIDI も音声も記載無し） | R 全文 |
| RS-232 | **有り**。D-sub 9 ピン（オス）。9600 bps、パリティ無し、データ 8 bit、ストップ 1 bit、ASCII、フロー制御 XON/XOFF、全二重。RXD(2)/TXD(3)/GND(5) の 3 線をクロス結線、4–6 と 7–8 は本体内部で短絡。制御機器（RS-232 対応 PC 等）とはクロスケーブル | R 行 369–399（p.7） |
| MIDI DIN | 【推測：有り】。MIDI Implementation の見出しが「1. MIDI Messages Received at **MIDI IN**」「2. MIDI Messages Transmitted from **MIDI OUT**」で、Implementation Chart は Transmitted / Recognized とも SysEx・CC・PC が O。ただし端子の物理形状（5 ピン DIN か）はこの資料に無い【不明】 | R 行 643, 827–833, 1697–1717 |
| iPad/iPhone 接続ガイド | **無し**（docs.json に V-1SDI の Remote Connection ガイドは無く、本文にも iPad/iPhone の語は無い） | docs.json 行 70–77 |

→ iPhone から **直接** 使える手段（LAN・USB MIDI・BLE MIDI）は **どれも資料上確認できない**。
- 【推測】物理 MIDI IN/OUT があるなら、iPhone ＋ クラスコンプライアント USB-MIDI インターフェース（Lightning/USB-C カメラアダプタ経由）＋ DIN ケーブルで CoreMIDI から SysEx/CC を送れる。capabilities ではこれを「外部 MIDI インターフェース経由の MIDI」として扱い、LAN・BLE は無効にする。
- 【推測】RS-232 は iPhone から直接は使えない（USB シリアルアダプタは iOS 非対応）。
- 実機で確認：背面端子の種類（MIDI DIN の有無、USB 端子の有無と用途）、Roland 公式の V-1SDI Owner's Manual の仕様表。

## 2. SysEx（R p.12 行 735–817、p.14 行 985–1013、チェックサム p.23 行 1586–1616）

| 項目 | 値 | 根拠 |
|---|---|---|
| Manufacturer ID | 41H（Roland） | 行 751, 795–801, 996 |
| Device ID | **10H**（DT1/RQ1 の書式に固定で記載）。範囲・変更方法の記載無し【不明】。SETUP メニュー（行 24–252）にも Address Map（70H 01H）にも Device ID 設定項目は無い | 行 752, 796, 997 |
| Model ID | **00H 00H 00H 31H**（4 バイト） | 行 754–758, 797–801, 998–1001 |
| DT1 Command ID | 12H | 行 789, 1002 |
| RQ1 Command ID | 11H | 行 745–746, 759 |
| DT1 書式 | `F0 41 10 00 00 00 31 12 aa bb cc dd … ee sum F7` | 行 789–790, 991–992 |
| RQ1 書式 | `F0 41 10 00 00 00 31 11 aa bb cc ss tt uu sum F7`（サイズ 3 バイト） | 行 745–746, 761–770 |
| RQ1 応答 | 送信可能な状態で、アドレス・サイズが適切なら DT1 で返す。不適切なら**何も返さない** | 行 737–741 |
| チェックサム | アドレス＋データ（RQ1 はサイズ）の合計 ÷128 の余り r、checksum = 128 − r（r=0 なら 0）。Model ID / Device ID は含めない | 行 1603–1616 |
| 分割サイズ | **256 バイト以下**のパケットに分割 | 行 816, 1012 |
| 送信間隔 | DT1 を連続送信する時は **20 ms 以上** | 行 817, 1013 |
| MIDI ch | n = **00H 固定**（CC / PC 用） | 行 628 |
| 実装バージョン | MIDI Implementation Version 1.50（2017-02-28）。Implementation Chart も Version 1.50（Feb. 28, 2017） | 行 621–624, 1677–1678 |
| Implementation Chart | Basic Channel 1/1、CC 0,32 O、CC 10–29 O、CC 1–9 ×、CC 30–119 ×、Program Change O（0–127「Channel select」）、System Exclusive **O / O**。Note・AfterTouch・Pitch Bend・System Common/Real Time・Aux は全て × | 行 1681–1730 |

備考：p.23 のチェックサム計算例は MIDI Visual Control（F0 7E …）の定型例で、V-1SDI のアドレスではない（行 1619–1657）。

### 2-1. MIDI CC / Program Change（受信：p.11–12 行 643–790、送信：p.13–14 行 827–964。送信側は「操作されたら同じ CC/PC を送る」）

| CC# | 3rd byte | 受信時の動作 | 送信条件 | 根拠（受信/送信） |
|---|---|---|---|---|
| Bank Select 0 (MSB) / 32 (LSB) + PC | mm, ll / pp | MSB 00H LSB 00H + PC 00–03H → **bus A INPUT 1–4**。MSB 01H LSB 00H + PC 00–03H → **bus B INPUT 1–4**。MSB 50H LSB 00H + PC 00–07H → **MEMORY 1–8**。使えない Bank Select は無視して PC のみ受ける。Bank Select は次の Bank Select まで保持。選べない PC は無視 | 入力または MEMORY が選ばれた時 | 行 654–686, 777–790 / 846–862, 955–964 |
| 10 (0AH) | vv | SDI 1 入力レベル | 同左変更時 | 行 687–694 / 864–870 |
| 11 (0BH) | vv | SDI 2 入力レベル | 同 | 行 697–703 / 875–883 |
| 12 (0CH) | vv | SDI 3 入力レベル | 同 | 行 708–714 / 885–893 |
| 13 (0DH) | vv | HDMI 3 入力レベル | 同 | 行 717–722 / 896–903 |
| 14 (0EH) | vv | HDMI 4 入力レベル | 同 | 行 621–626 / 906–913 |
| 15 (0FH) | vv | AUDIO IN 入力レベル | 同 | 行 628–635 / 915–921 |
| 16 (10H) | vv | MIC 入力レベル | 同 | 行 639–643 / 924–931 |
| 17 (11H) | vv | MASTER 出力レベル | 同 | 行 647–655 / 825–834 |
| 18 (12H) | vv | **A/B フェーダー** | フェーダー操作時 | 行 657–662 / 837–848 |
| 19 (13H) | tt 00–28H | TRANSITION TIME 0.0–4.0 sec | 変更時 | 行 665–676 / 850–857 |
| 20 (14H) | tt 00–02H | トランジション種別 WIPE, MIX, CUT | [WIPE]/[MIX]/[CUT] 操作時 | 行 680–689 / 859–867 |
| 21 (15H) | xx 00/01 | [DSK] ボタン OFF/ON | [DSK] 操作時 | 行 692–700 / 871–878 |
| 22 (16H) | vv 任意（00–7FH） | **bus A ↔ bus B を切り替える（＝AUTO/TAKE 実行）** | **[AUTO] 操作時** | 行 704–713 / 881–887 |
| 23 (17H) | xx | [KEY LEVEL] ボタン OFF/ON | 同 | 行 715–721 / 889–897 |
| 24 (18H) | xx | [PinP] ボタン OFF/ON | 同 | 行 723–728 / 900–907 |
| 25 (19H) | xx | [SPLIT] ボタン OFF/ON | 同 | 行 734–740 / 909–914 |
| 26 (1AH) | vv | [OUTPUT FADE] ノブ | 同 | 行 742–748 / 917–922 |
| 27 (1BH) | xx | [FREEZE] ボタン OFF/ON | 同 | 行 750–758 / 925–930 |
| 28 (1CH) | vv | [CONTROL 1] ノブ | 同 | 行 760–767 / 938–943 |
| 29 (1DH) | vv | [CONTROL 2] ノブ | 同 | 行 769–774 / 946–951 |

xx：00H=OFF, 01H=ON。vv：00–7FH（中心値があるものは 40H が中心）（行 627–638）。

## 3. LAN プロトコル

**無し**。LAN 端子・TCP ポート・パスワード・`DTH:`/`RQH:`/`VER;` の記載は一切無い。V-160HD 系（DTH/RQH）とは**まったく別**。

代わりに **RS-232 コマンド**（p.7–10 行 404–615）がある。書式は V-160HD 系の LAN/RS-232 簡易制御コマンドに似た「3 文字＋`:`引数`,`区切り＋`;`」だが、**先頭に stx（02H）が必須**で、SysEx アドレスを使う DTH/RQH 相当は無い。

| 項目 | 値 | 根拠 |
|---|---|---|
| 書式 | `stx` + 英大文字 3 文字 + （`:` 引数[,引数…]）+ `;`。stx = 02H | 行 405–415 |
| 制御コード | stx 02H、ACK 06H、XON 11H、XOFF 13H | 行 418 |
| ACK | **バイト 06H**（文字列 `ACK;` ではない）。連続送信する時は ACK を待ってから次を送る | 行 418–420 |
| エラー | `stxERR:a;` a=0 構文エラー、5 範囲外エラー | 行 609–610 |
| 自発送信 | `stxQPL:b;`（QPL 8:ALL と同じ並び）。SETUP → SYSTEM 16/16 → **RS-232 PANEL STATUS = ON** の時、チャンネル切替・bus A/B 切替で送られる | 行 604–607, 246–248 |
| キープアライブ | 記載無し【不明】 | — |
| バージョン | `stxVER;` → `stxVER:V-1SDI,a;`（a = バージョン ASCII） | 行 591 |
| 状態取得 | `stxACS;` → ACK（「Acquire status of V-1SDI」とあるが応答内容の記載無し【不明】） | 行 589 |

### 3-1. RS-232 コマンド全一覧（行 428–615）

映像（行 429–500）：

| コマンド | 応答 | 引数 | 意味 |
|---|---|---|---|
| `stxPGM:a;` | ACK | a 0(CH1)–3(CH4) | bus A（PGM）のチャンネル選択 |
| `stxPST:a;` | ACK | a 0–3 | bus B（PST）のチャンネル選択 |
| `stxTRS:a;` | ACK | a 0 WIPE, 1 MIX, 2 CUT | トランジション種別 |
| `stxTIM:a;` | ACK | a 0(0.0s)–40(4.0s) | トランジション時間 |
| `stxATO;` | ACK | — | [AUTO] ボタンを押す |
| `stxPIP;` | ACK | — | [PinP] ボタンを押す |
| `stxSPT;` | ACK | — | [SPLIT] ボタンを押す |
| `stxDSK;` | ACK | — | [DSK] ボタンを押す |
| `stxFRZ;` | ACK | — | [FREEZE] ボタンを押す |
| `stxIPS:a;` | ACK | a 0 AUTO, 1 SDI3, 2 HDMI3 | INPUT 3 の入力端子選択 |
| `stxISC:a;` | ACK | a 0 FULL, 1 LETTERBOX, 2 CROP, 3 DOT BY DOT | INPUT 4 スケーリング |
| `stxIHP:a;` | ACK | a −1920–1920（8 の倍数のみ） | INPUT 4 水平位置 |
| `stxIVP:a;` | ACK | a −1080–1080（8 の倍数のみ） | INPUT 4 垂直位置 |
| `stxIZM:a;` | ACK | a 50–200 | INPUT 4 ズーム |
| `stxOPS:a;` | ACK | a 0 MULTI-VIEW, 1 PST, 2 PGM | PVW 端子（SDI）の出力割当 |
| `stxOMS:a;` | ACK | a 0 MULTI-VIEW, 1 PST, 2 PGM | MULTI-VIEW 端子（HDMI）の出力割当 |
| `stxKYL:a;` | ACK | a 0–255 | DSK KEY LEVEL |
| `stxPQA:a,b;` / `stxPTA:a,b;` / `stxPHA:a,b;` | ACK | a,b 0–255（H, V） | [PinP] ボタン割当の PinP 1/4・1/3・1/2 インセット位置 |
| `stxPQB:a,b;` / `stxPTB:a,b;` / `stxPHB:a,b;` | ACK | a,b 0–255 | [SPLIT] ボタン割当の PinP 1/4・1/3・1/2 インセット位置 |
| `stxSHA:a,b;` / `stxSVA:a,b;` | ACK | a,b 0–255（PGM 側, PST 側） | [PinP] ボタン割当の SPLIT-HC / SPLIT-VC 位置 |
| `stxSHB:a,b;` / `stxSVB:a,b;` | ACK | a,b 0–255 | [SPLIT] ボタン割当の SPLIT-HC / SPLIT-VC 位置 |
| `stxQIS;` | `stxQIS:a;` + ACK | a 0 SDI, 1 HDMI | INPUT 3 で選択中の端子を取得 |

音声（行 506–530）：

| コマンド | 応答 | 引数 | 意味 |
|---|---|---|---|
| `stxIAL:a,b;` | ACK | a 0 SDI1, 1 SDI2, 2 SDI3, 3 HDMI3, 4 HDMI4, 5 AUDIO IN, 6 MIC IN／b 0–127 | 入力レベル（dB 対応表 p.9 行 535–555） |
| `stxOAL:a;` | ACK | a 0–127 | 出力レベル |
| `stxADT:a,b;` | ACK | a 同上／b 0(0.0ms)–5000(500.0ms) | 入力ディレイ |
| `stxQAL:a;` | `stxQAL:b;` + ACK | a 0–6 同上, 7 MASTER OUT, 8 ALL／b 0–127 | レベル取得。a=8 で 8 値をカンマ区切り（例 `stxQAL:100,80,70,60,50,40,30,20;`） |

システム（行 563–595）：

| コマンド | 応答 | 引数 | 意味 |
|---|---|---|---|
| `stxHCP:a;` | ACK | a 0 OFF, 1 ON | HDCP |
| `stxASN:a;` | ACK | a 0 OFF, 1 ON | Auto Scan |
| `stxMEM:a;` | ACK | a 0(A-1), 1(A-2), 2(A-3), 3(A-4), 4(B-1), 5(B-2), 6(B-3), 7(B-4) | メモリー呼出（メモリー 1–8 はパネルの A-1…B-4 ボタンに対応） |
| `stxQPL:a;` | `stxQPL:b;` + ACK | a 0 PGM, 1 PST, 2 PinP, 3 SPLIT, 4 DSK, 5 TRANSITION, 6 OUTPUT FADE, 7 A/B fader, 8 ALL | パネル状態取得。b：PGM/PST 0–3、PinP/SPLIT/DSK 0/1、TRANSITION 0 WIPE 1 MIX 2 CUT、OUTPUT FADE 0–255（0 黒, 255 白, 128 中央）、A/B fader 0–255（0 bus B 端, 255 bus A 端, 128 中央）。a=8 で全部（例 `stxQPL:0,1,0,1,1,0,100,255;`） |
| `stxACS;` | ACK | — | V-1SDI の状態取得（内容不明） |
| `stxVER;` | `stxVER:V-1SDI,a;` | a バージョン文字列 | バージョン |
| XON / XOFF | — | — | フロー制御（双方向） |

## 4. アドレスマップの要点（SysEx 3 バイトアドレス）

値のエンコード（p.15 行 1022–1023、p.23 行 1627–1645）：
- 1 バイト 7bit。符号付き 1 バイトは 00H=−64, 40H=±0, 7FH=+63（例 CONTRAST 00–7FH = −64–63、EQ 00–1EH = −15–15 dB、HUE WIDTH 2 バイト 00 00–01 7FH = −128–127）→ **最小値オフセット方式**
- 「#」付きアドレス＝**2 バイト値**（上位・下位の 2 アドレス連続）。「指定データは上位 2 バイトと下位 2 バイトに分けて送られる。2 バイト組が連続して受信されないとデータは無視」（行 1022–1023）→ 1 つの DT1 で 2 バイト同時に書く【推測：aa×128+bb。例 H.POSITION 00 00–1E 00 = 0–3840 → −1920–1920、DELAY 00 00–27 08 = 0–5000 → 0.0–500.0 ms、A/B FADER 00 00–07 7F = 0–1023】
- nibbled（4bit×n）の説明は p.23 にあるが、V-1SDI の Address Map に nibbled 項目は無い

| 用途 | アドレス | サイズ | 値域 | 意味 | 根拠 |
|---|---|---|---|---|---|
| PGM 選択（bus A） | 71 03 08 | 1 | 00–03 | Input 1–4（VIDEO SEL A） | 行 1392 |
| PST 選択（bus B） | 71 03 09 | 1 | 00–03 | Input 1–4（VIDEO SEL B） | 行 1393 |
| クロスポイント | **無し（物理入力直指定）**。INPUT 1–4 は固定で、INPUT 3 のみ SDI3/HDMI3 を切替（71 00 00 CH3 INPUT SELECT 00 AUTO, 01 SDI, 02 HDMI） | | | | 行 1151 |
| PANEL MODE | 70 01 00 | 1 | 00–01 | A/B, PGM/PST（※メニュー表記は「PGM/PST, A/B」の順で、Address Map と順序が逆。どちらが 00H か実機確認） | 行 1058, 124 |
| CUT トリガ | 専用アドレス無し。方法①：71 03 0C を 02H（CUT）にして AUTO。方法②：CTRL BUTTON 73 04 00 に 11H（[CUT] 押下）/31H（長押し）/51H（離す）。方法③：PGM/PST モードなら 71 03 08 を直接書く【推測：即時切替になるか不明】 | 73 04 00 | 1 | 11/31/51 | [CUT] button on/long press/off | 行 1557 |
| AUTO トリガ | 73 04 00 | 1 | 13/33/53 | [AUTO] button on/long press/off。別経路：CC22（任意値）、RS-232 `stxATO;` | 行 1559, 704–713, 441 |
| トランジションタイプ | 71 03 0C | 1 | 00–02 | WIPE, MIX, CUT（TRANSITION PATTERN） | 行 1396 |
| WIPE パターン | 71 00 18 | 1 | 00–1D | H-DOWN … H-GRID/s（30 種） | 行 1186–1190 |
| MIX パターン | 71 00 19 | 1 | 00–03 | MIX, FAM, NAM, MOSAIC | 行 1191 |
| トランジション時間 | 71 00 17 | 1 | 00–28 | 0.0–4.0 sec | 行 1185 |
| フェーダー位置（A/B FADER） | #71 03 00–01 | 2 | 00 00–07 7F | 0–1023 | 行 1380–1382 |
| A/B FADER START POSITION | 71 03 0F | 1 | 00–01 | 00 bus A 端, 01 bus B 端 | 行 1399 |
| PinP ON（[PinP] ボタン） | 71 03 0A | 1 | 00–01 | OFF, ON。ON PGM / ON PVW の区別は無い | 行 1394 |
| PinP パターン（[PinP] ボタン割当） | 71 00 1A | 1 | 00–07 | PinP 1/4, PinP 1/3, PinP 1/2, SPLIT-VS, SPLIT-VC, SPLIT-HS, SPLIT-HC, QUAD | 行 1192 |
| PinP ソース | 専用アドレス無し【不明】（RS-232 にも無し。PinP インセットは PST（bus B）側【推測】） | | | | — |
| PinP 位置 | #71 03 10–37（CONTROL 1/2 VOL ×パターン×ボタン） | 2 | 00 00–01 7F | 0–255 | 行 1400–1459 |
| PinP 時間 | 専用無し（TRANSITION TIME 共通【推測】） | | | | — |
| SPLIT ON（[SPLIT] ボタン） | 71 03 0B | 1 | 00–01 | OFF, ON | 行 1395 |
| SPLIT パターン（[SPLIT] ボタン割当） | 71 00 1B | 1 | 00–07 | 同 PinP PATTERN | 行 1193 |
| DSK ON | 71 00 1F（DSK ON/OFF）／71 03 0D（[DSK] ボタン） | 1 | 00–01 | OFF, ON（2 アドレスの違いは不明【不明】） | 行 1197, 1397 |
| DSK ソース | 71 00 20 | 1 | 00–04 | INPUT1, INPUT2, INPUT3, INPUT4, STILL | 行 1198 |
| DSK キータイプ | 71 00 21 | 1 | 00–03 | WHT-L.KEY, BLK-L.KEY, GRN-C.KEY, BLU-C.KEY | 行 1199 |
| DSK KEY LEVEL / GAIN / MIX LEVEL | #71 00 22–23 / 24–25 / 26–27 | 2 | 00 00–01 7F | 0–255 | 行 1200–1208 |
| DSK 時間 | 無し | | | | — |
| オーディオ入力レベル | 71 01 0x（x=00 SDI1, 01 SDI2, 02 SDI3, 03 HDMI3, 04 HDMI4, 05 AUDIO IN, 06 MIC） | 1 | 00–7F | −INF–+6.0 dB（dB 対応表 行 535–555） | 行 1227–1233 |
| オーディオ入力ミュート | **無し**（A.FOLLOW 71 01 08–0E はオーディオフォロー ON/OFF であってミュートではない） | | | | 行 1235–1241 |
| MASTER レベル | 71 01 07 | 1 | 00–7F | −INF–+6.0 dB | 行 1234 |
| MASTER ミュート | 無し | | | | — |
| メモリー ロード | 73 01 00 | 1 | 00–07 | MEMORY 1–8 を選択（SELECT）。10–17H で SAVE、20–27H で INIT、28H で Current を初期化。1nH/2nH を送るとそのメモリーが選択状態になる | 行 1472–1477 |
| メモリー 現在番号 | 73 01 00（RQ1） | 1 | 00–07 | RQ1 は常に 00–07H（現在選択中）を返す | 行 1477 |
| メモリー 名前 | 無し | | | | — |
| メモリー 数 | 8（72 00 00–72 1F 00 に Memory 1–8 の Video/Audio-1/Audio-2/Panel ブロック） | | | | 行 1129–1144 |
| タリー | 専用ブロック無し。読める代替：**LED 73 02 11–18**（VDOSEL1A–4A, 1B–4B、各 1 バイト 00–07 = OFF, RED, GREEN, YELLOW, BLUE, MAZENTA, CYAN, WHITE、Read Only）、または 71 03 08/09 を RQ1 | 73 02 11 | 8 | 00–07 | ボタン LED 色（PGM LED 色は 70 01 01、PST LED 色は 70 01 02 で設定） | 行 1500–1507, 1059–1060 |
| ラベル（入力名） | 無し | | | | — |
| マクロ / シーケンサー | 無し | | | | — |
| 簡易制御コマンド | RS-232 のみ（§3） | | | | — |
| システムバージョン | 70 00 00–08 | 9 | 00–7F | ASCII（Read Only）。RS-232 は `stxVER;` | 行 1041–1049 |
| ボタン押下（CTRL BUTTON） | 73 04 00 | 1 | 下記 | 値 = ボタン番号 + 00H(on)/20H(long press)/40H(off) | 行 1540–1559 |
| OUTPUT FADER | #71 03 06–07 | 2 | 00 00–01 7F | 0–255 | 行 1389–1391 |
| FREEZE | CTRL BUTTON 73 04 00 = 00/20/40H。FREEZE MODE 70 01 1E、FREEZE SELECT CH 70 01 2B | | | | 行 1540, 1093, 1106 |

### 4-1. Parameter Address Map 全転記（p.15–22 行 1021–1560）

先頭アドレス（行 1025–1032）：

| Start Address | Description |
|---|---|
| 00H 00H 00H | Reserved |
| 70H 00H 00H | System Parameter Area |
| 71H 00H 00H | Video, Audio, Panel Parameter Area |
| 72H 00H 00H | Video, Audio, Panel Parameter Memory Area |
| 73H 00H 00H | Reserved |
| 73H 01H 00H | Other Parameter Area |
| 74H 00H 00H | Reserved |

#### System Parameter Area — Products, version, mode（行 1036–1051）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 70H 00H 00H | System Version String (1) | 00H–7FH | ASCII Character (Read Only) |
| 70H 00H 01H | System Version String (2) | 00H–7FH | ASCII Character (Read Only) |
| 70H 00H 02H | System Version String (3) | 00H–7FH | ASCII Character (Read Only) |
| 70H 00H 03H | System Version String (4) | 00H–7FH | ASCII Character (Read Only) |
| 70H 00H 04H | System Version String (5) | 00H–7FH | ASCII Character (Read Only) |
| 70H 00H 05H | System Version String (6) | 00H–7FH | ASCII Character (Read Only) |
| 70H 00H 06H | System Version String (7) | 00H–7FH | ASCII Character (Read Only) |
| 70H 00H 07H | System Version String (8) | 00H–7FH | ASCII Character (Read Only) |
| 70H 00H 08H | System Version String (9) | 00H–7FH | ASCII Character (Read Only) |
| 70H 00H 09H | Reserved | | |
| 70H 00H 10H | System Device Mode | 00H | 00H: NORMAL (Read Only) |

#### Setup Parameter（行 1055–1106）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 70H 01H 00H | PANEL MODE | 00H–01H | A/B, PGM/PST |
| 70H 01H 01H | PGM LED | 00H–06H | RED, GREEN, YELLOW, BLUE, PURPLE, L.BLUE, WHITE |
| 70H 01H 02H | PST LED | 00H–06H | RED, GREEN, YELLOW, BLUE, PURPLE, L.BLUE, WHITE |
| 70H 01H 03H | INPUT LED | 00H–01H | OFF, ON |
| 70H 01H 04H | DSK LED | 00H–01H | OFF, ON |
| 70H 01H 05H | AUTO LED | 00H–01H | OFF, ON |
| 70H 01H 06H | AUDIO LED | 00H–08H | OFF, MASTER OUT, MIC, AUDIO IN, SDI 1, SDI 2, SDI 3, HDMI 3, HDMI 4 |
| 70H 01H 07H | ALL LED OFF | 00H–01H | DISABLE, ENABLE |
| 70H 01H 08H | LOCK DSK SW | 00H–01H | OFF, ON |
| 70H 01H 09H | LOCK AUTO SW | 00H–01H | OFF, ON |
| 70H 01H 0AH | LOCK FREEZE SW | 00H–01H | OFF, ON |
| 70H 01H 0BH | LOCK MEMORY SW | 00H–01H | OFF, ON |
| 70H 01H 0CH | LOCK AUDIO SW | 00H–01H | OFF, ON |
| 70H 01H 0DH | LOCK A/B BUS SW | 00H–01H | OFF, ON |
| 70H 01H 0EH | LOCK KEY LEVEL SW | 00H–01H | OFF, ON |
| 70H 01H 0FH | LOCK WIPE SW | 00H–01H | OFF, ON |
| 70H 01H 10H | LOCK MIX SW | 00H–01H | OFF, ON |
| 70H 01H 11H | LOCK CUT SW | 00H–01H | OFF, ON |
| 70H 01H 12H | LOCK PinP SW | 00H–01H | OFF, ON |
| 70H 01H 13H | LOCK SPLIT SW | 00H–01H | OFF, ON |
| 70H 01H 14H | LOCK OUTPUT FADE VOL | 00H–01H | OFF, ON |
| 70H 01H 15H | LOCK CONTROL 1 VOL | 00H–01H | OFF, ON |
| 70H 01H 16H | LOCK CONTROL 2 VOL | 00H–01H | OFF, ON |
| 70H 01H 17H | LOCK A/B FADER | 00H–01H | OFF, ON |
| 70H 01H 18H | MEMORY PANEL LOAD | 00H–01H | OFF, ON |
| 70H 01H 19H | POWER ON LOAD | 00H–07H | Memory 1–Memory 8 |
| 70H 01H 1AH | MEMORY PROTECT | 00H–01H | OFF, ON |
| 70H 01H 1BH | AUTO MEMORY | 00H–01H | OFF, ON |
| 70H 01H 1CH | HDCP | 00H–01H | OFF, ON |
| 70H 01H 1DH | FRAME RATE | 00H–01H | 59.94, 50 |
| 70H 01H 1EH | FREEZE MODE | 00H–02H | ALL, SELECT, STILL |
| 70H 01H 1FH | DEINTERLACE MODE | 00H–01H | WEAVE, BOB |
| 70H 01H 20H | AUTO OFF | 00H–01H | OFF, ON |
| 70H 01H 21H | OUTPUT FADER ASSIGN | 00H–03H | VIDEO, V & A, AUDIO, BLACK / A |
| 70H 01H 22H | PVW INDICATER LABEL | 00H–01H | OFF, ON |
| 70H 01H 23H | PVW INDICATER TALLY | 00H–01H | OFF, ON |
| 70H 01H 24H | PVW INDICATER AUDIO | 00H–02H | OFF, UPPER, LOWER |
| 70H 01H 25H | AUTO SCAN ON/OFF | 00H–01H | OFF, ON |
| 70H 01H 26H | AUTO SCAN TIME | 01H–78H | 1–120 sec |
| 70H 01H 27H | AUTO SCAN TRANS TIME | 00H–28H | 0.0–4.0 sec |
| 70H 01H 28H | COLOR BAR OUTPUT | 00H–01H | OFF, ON |
| 70H 01H 29H | TEST TONE OUTPUT | 00H–03H | OFF, -20 dB@1 kHz, -6 dB@1 kHz, 0 dB@1 kHz |
| 70H 01H 2AH | RS-232 PANEL STATUS | 00H–01H | OFF, ON |
| 70H 01H 2BH | FREEZE SELECT CH | 00H–03H | CH-1–CH-4 |

#### Video/Audio/Panel Parameter Area（行 1110–1119）「These modify current operation.」

| Address | Parameter Name |
|---|---|
| 71H 00H 00H | Video |
| 71H 01H 00H | Audio Parameter-1 |
| 71H 02H 00H | Audio Parameter-2 |
| 71H 03H 00H | Panel Parameter |

#### Video, Audio, Panel Parameter Memory Area（行 1123–1144）

「現在選択中以外のメモリー番号に保存されたデータを読み書きする。現在選択中のメモリーのデータは変更されない。Video Parameter / Audio Parameter-1 / Audio Parameter-2 / Panel Parameter の各パラメータはメモリーエリアでも共通（下位アドレスは同じ）」

| Address | Parameter Name | Address | Parameter Name |
|---|---|---|---|
| 72H 00H 00H | Video (Memory 1) | 72H 10H 00H | Video (Memory 5) |
| 72H 01H 00H | Audio Parameter-1 (Memory 1) | 72H 11H 00H | Audio Parameter-1 (Memory 5) |
| 72H 02H 00H | Audio Parameter-2 (Memory 1) | 72H 12H 00H | Audio Parameter-2 (Memory 5) |
| 72H 03H 00H | Panel (Memory 1) | 72H 13H 00H | Panel (Memory 5) |
| 72H 04H 00H | Video (Memory 2) | 72H 14H 00H | Video (Memory 6) |
| 72H 05H 00H | Audio Parameter-1 (Memory 2) | 72H 15H 00H | Audio Parameter-1 (Memory 6) |
| 72H 06H 00H | Audio Parameter-2 (Memory 2) | 72H 16H 00H | Audio Parameter-2 (Memory 6) |
| 72H 07H 00H | Panel (Memory 2) | 72H 17H 00H | Panel (Memory 6) |
| 72H 08H 00H | Video (Memory 3) | 72H 18H 00H | Video (Memory 7) |
| 72H 09H 00H | Audio Parameter-1 (Memory 3) | 72H 19H 00H | Audio Parameter-1 (Memory 7) |
| 72H 0AH 00H | Audio Parameter-2 (Memory 3) | 72H 1AH 00H | Audio Parameter-2 (Memory 7) |
| 72H 0BH 00H | Panel (Memory 3) | 72H 1BH 00H | Panel (Memory 7) |
| 72H 0CH 00H | Video (Memory 4) | 72H 1CH 00H | Video (Memory 8) |
| 72H 0DH 00H | Audio Parameter-1 (Memory 4) | 72H 1DH 00H | Audio Parameter-1 (Memory 8) |
| 72H 0EH 00H | Audio Parameter-2 (Memory 4) | 72H 1EH 00H | Audio Parameter-2 (Memory 8) |
| 72H 0FH 00H | Panel (Memory 4) | 72H 1FH 00H | Panel (Memory 8) |

→ メモリー m（1–8）のブロック中位バイト = (m−1)×4 + {00 Video, 01 Audio-1, 02 Audio-2, 03 Panel}

#### Video Parameter（行 1148–1220）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 71H 00H 00H | CH3 INPUT SELECT | 00H–02H | AUTO, SDI, HDMI |
| 71H 00H 01H | CH4 HDMI SCALING TYPE | 00H–03H | FULL, LETTERBOX, CROP, DOT BY DOT |
| #71H 00H 02H–03H | CH4 HDMI H. POSITION | 00H 00H–1EH 00H | -1920–1920 ※8 の倍数のみ指定可 |
| #71H 00H 04H–05H | CH4 HDMI V. POSITION | 00H 00H–10H 70H | -1080–1080 ※8 の倍数のみ指定可 |
| #71H 00H 06H–07H | CH4 HDMI ZOOM | 00H 32H–01H 48H | 50–200 |
| 71H 00H 08H | CH4 HDMI CONTRAST | 00H–7FH | -64–63 |
| 71H 00H 09H | CH4 HDMI SATURATION | 00H–7FH | -64–63 |
| 71H 00H 0AH | CH4 HDMI BRIGHTNESS | 00H–7FH | -64–63 |
| 71H 00H 0BH | CH4 HDMI FLICKER FILTER | 00H–01H | OFF, ON |
| 71H 00H 0CH | CH4 HDMI EDID | 00H–0EH | AUTO, 480/576i, 480/576p, 720p, 1080i, 1080p, 640x480, 800x600, 1024x768, 1280x768, 1280x1024, 1366x768, 1400x1050, 1600x1200, 1920x1200 |
| 71H 00H 0DH | Reserved | | |
| 71H 00H 0EH | SDI PVW ASSIGN | 00H–02H | MULTI-VIEW, PST, PGM |
| 71H 00H 0FH | 3G-SDI MAPPING | 00H–01H | LEVEL A, LEVEL B |
| 71H 00H 10H | HDMI PVW ASSIGN | 00H–02H | MULTI-VIEW, PST, PGM |
| 71H 00H 11H | HDMI OUT COLOR SPACE | 00H–03H | AUTO, RGB 0-255, RGB 16-235, YCC |
| 71H 00H 12H | DVI-D/HDMI SIGNAL | 00H–02H | AUTO, DVI-D, HDMI |
| 71H 00H 13H | VIDEO OUT CONTRAST | 00H–7FH | -64–63 |
| 71H 00H 14H | VIDEO OUT SATURATION | 00H–7FH | -64–63 |
| 71H 00H 15H | VIDEO OUT BRIGHTNESS | 00H–7FH | -64–63 |
| 71H 00H 16H | Reserved | | |
| 71H 00H 17H | TRANSITION TIME | 00H–28H | 0.0–4.0 sec |
| 71H 00H 18H | WIPE PATTERN | 00H–1DH | H-DOWN, H-UP, V-RIGHT, V-LEFT, H-IN, H-OUT, V-IN, V-OUT, R-DOWN, L-DOWN, R-UP, L-UP, BLOCK, V-GRID, H-GRID, H-DOWN/s, H-UP/s, V-RIGHT/s, V-LEFT/s, H-IN/s, H-OUT/s, V-IN/s, V-OUT/s, -DOWN/s（原文ママ。メニューでは R-DOWN/s）, L-DOWN/s, R-UP/s, L-UP/s, BLOCK/s, V-GRID/s, H-GRID/s |
| 71H 00H 19H | MIX PATTERN | 00H–03H | MIX, FAM, NAM, MOSAIC |
| 71H 00H 1AH | PinP PATTERN | 00H–07H | PinP 1/4, PinP 1/3, PinP 1/2, SPLIT-VS, SPLIT-VC, SPLIT-HS, SPLIT-HC, QUAD |
| 71H 00H 1BH | SPLIT PATTERN | 00H–07H | PinP 1/4, PinP 1/3, PinP 1/2, SPLIT-VS, SPLIT-VC, SPLIT-HS, SPLIT-HC, QUAD |
| 71H 00H 1CH | PinP BORDER WIDTH | 00H–0FH | 0–15 |
| 71H 00H 1DH | PinP BORDER COLOR | 00H–06H | BLACK, WHITE, GRAY, RED, GREEN, BLUE, YELLOW |
| 71H 00H 1EH | Reserved | | |
| 71H 00H 1FH | DSK ON/OFF | 00H–01H | OFF, ON |
| 71H 00H 20H | DSK SOURCE CH | 00H–04H | INPUT1, INPUT2, INPUT3, INPUT4, STILL |
| 71H 00H 21H | KEY TYPE | 00H–03H | WHT-L.KEY, BLK-L.KEY, GRN-C.KEY, BLU-C.KEY |
| #71H 00H 22H–23H | KEY LEVEL | 00H 00H–01H 7FH | 0–255 |
| #71H 00H 24H–25H | KEY GAIN | 00H 00H–01H 7FH | 0–255 |
| #71H 00H 26H–27H | MIX LEVEL | 00H 00H–01H 7FH | 0–255 |
| #71H 00H 28H–29H | HUE WIDTH | 00H 00H–01H 7FH | -128–127 |
| #71H 00H 2AH–2BH | HUE FINE | 00H 00H–01H 7FH | -128–127 |
| #71H 00H 2CH–2DH | SATURATION WIDTH | 00H 00H–01H 7FH | -128–127 |
| #71H 00H 2EH–2FH | SATURATION FINE | 00H 00H–01H 7FH | 0–255 |

#### Audio Parameter-1（行 1224–1311）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 71H 01H 00H | SDI1 INPUT LEVEL | 00H–7FH | -INF–+6.0 dB |
| 71H 01H 01H | SDI2 INPUT LEVEL | 00H–7FH | -INF–+6.0 dB |
| 71H 01H 02H | SDI3 INPUT LEVEL | 00H–7FH | -INF–+6.0 dB |
| 71H 01H 03H | HDMI3 INPUT LEVEL | 00H–7FH | -INF–+6.0 dB |
| 71H 01H 04H | HDMI4 INPUT LEVEL | 00H–7FH | -INF–+6.0 dB |
| 71H 01H 05H | AUDIO INPUT LEVEL | 00H–7FH | -INF–+6.0 dB |
| 71H 01H 06H | MIC INPUT LEVEL | 00H–7FH | -INF–+6.0 dB |
| 71H 01H 07H | MASTER OUT LEVEL | 00H–7FH | -INF–+6.0 dB |
| 71H 01H 08H | A. FOLLOW SDI1 | 00H–01H | OFF, ON |
| 71H 01H 09H | A. FOLLOW SDI2 | 00H–01H | OFF, ON |
| 71H 01H 0AH | A. FOLLOW SDI3 | 00H–01H | OFF, ON |
| 71H 01H 0BH | A. FOLLOW HDMI3 | 00H–01H | OFF, ON |
| 71H 01H 0CH | A. FOLLOW HDMI4 | 00H–01H | OFF, ON |
| 71H 01H 0DH | A. FOLLOW AUDIO IN | 00H–04H | OFF, 1–4 |
| 71H 01H 0EH | A. FOLLOW MIC IN | 00H–04H | OFF, 1–4 |
| 71H 01H 0FH | Reserved | | |
| #71H 01H 10H–11H | DELAY SDI1 | 00H 00H–27H 08H | 0.0–500.0 ms |
| #71H 01H 12H–13H | DELAY SDI2 | 00H 00H–27H 08H | 0.0–500.0 ms |
| #71H 01H 14H–15H | DELAY SDI3 | 00H 00H–27H 08H | 0.0–500.0 ms |
| #71H 01H 16H–17H | DELAY HDMI3 | 00H 00H–27H 08H | 0.0–500.0 ms |
| #71H 01H 18H–19H | DELAY HDMI4 | 00H 00H–27H 08H | 0.0–500.0 ms |
| #71H 01H 1AH–1BH | DELAY AUDIO IN | 00H 00H–27H 08H | 0.0–500.0 ms |
| #71H 01H 1CH–1DH | DELAY MIC IN | 00H 00H–27H 08H | 0.0–500.0 ms |
| 71H 01H 1EH | Reserved | | |
| 71H 01H 1FH | Reserved | | |
| 71H 01H 20H | SDI1 IN EQ Hi | 00H–1EH | -15–15 dB |
| 71H 01H 21H | SDI1 IN EQ Hi FREQ | 44H–78H | 1.00–20.0 kHz |
| 71H 01H 22H | SDI1 IN EQ Mid | 00H–1EH | -15–15 dB |
| 71H 01H 23H | SDI1 IN EQ Mid FREQ | 00H–78H | 20 Hz–20.0 kHz |
| 71H 01H 24H | SDI1 IN EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 01H 25H | SDI1 IN EQ Lo | 00H–1EH | -15–15 dB |
| 71H 01H 26H | SDI1 IN EQ Lo FREQ | 00H–38H | 20–500 Hz |
| 71H 01H 27H | Reserved | | |
| 71H 01H 28H | SDI2 IN EQ Hi | 00H–1EH | -15–15 dB |
| 71H 01H 29H | SDI2 IN EQ Hi FREQ | 44H–78H | 1.00–20.0 kHz |
| 71H 01H 2AH | SDI2 IN EQ Mid | 00H–1EH | -15–15 dB |
| 71H 01H 2BH | SDI2 IN EQ Mid FREQ | 00H–78H | 20 Hz–20.0 kHz |
| 71H 01H 2CH | SDI2 IN EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 01H 2DH | SDI2 IN EQ Lo | 00H–1EH | -15–15 dB |
| 71H 01H 2EH | SDI2 IN EQ Lo FREQ | 00H–38H | 20–500 Hz |
| 71H 01H 2FH | Reserved | | |
| 71H 01H 30H | SDI3 IN EQ Hi | 00H–1EH | -15–15 dB |
| 71H 01H 31H | SDI3 IN EQ Hi FREQ | 44H–78H | 1.00–20.0 kHz |
| 71H 01H 32H | SDI3 IN EQ Mid | 00H–1EH | -15–15 dB |
| 71H 01H 33H | SDI3 IN EQ Mid FREQ | 00H–78H | 20 Hz–20.0 kHz |
| 71H 01H 34H | SDI3 IN EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 01H 35H | SDI3 IN EQ Lo | 00H–1EH | -15–15 dB |
| 71H 01H 36H | SDI3 IN EQ Lo FREQ | 00H–38H | 20–500 Hz |
| 71H 01H 37H | Reserved | | |
| 71H 01H 38H | HDMI3 IN EQ Hi | 00H–1EH | -15–15 dB |
| 71H 01H 39H | HDMI3 IN EQ Hi FREQ | 44H–78H | 1.00–20.0 kH（原文ママ） |
| 71H 01H 3AH | HDMI3 IN EQ Mid | 00H–1EH | -15–15 dB |
| 71H 01H 3BH | HDMI3 IN EQ Mid FREQ | 00H–78H | 20 Hz–20.0 kHz |
| 71H 01H 3CH | HDMI3 IN EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 01H 3DH | HDMI3 IN EQ Lo | 00H–1EH | -15–15 dB |
| 71H 01H 3EH | HDMI3 IN EQ Lo FREQ | 00H–38H | 20–500 Hz |
| 71H 01H 3FH | Reserved | | |
| 71H 01H 40H | HDMI4 IN EQ Hi | 00H–1EH | -15–15 dB |
| 71H 01H 41H | HDMI4 IN EQ Hi FREQ | 44H–78H | 1.00–20.0 kHz |
| 71H 01H 42H | HDMI4 IN EQ Mid | 00H–1EH | -15–15 dB |
| 71H 01H 43H | HDMI4 IN EQ Mid FREQ | 00H–78H | 20 Hz–20.0 kHz |
| 71H 01H 44H | HDMI4 IN EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 01H 45H | HDMI4 IN EQ Lo | 00H–1EH | -15–15 dB |
| 71H 01H 46H | HDMI4 IN EQ Lo FREQ | 00H–38H | 20–500 Hz |

#### Audio Parameter-2（行 1319–1369）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 71H 02H 00H | AUDIO IN EQ Hi | 00H–1EH | -15–15 dB |
| 71H 02H 01H | AUDIO IN EQ Hi FREQ | 44H–78H | 1.00–20.0 kHz |
| 71H 02H 02H | AUDIO IN EQ Mid | 00H–1EH | -15–15 dB |
| 71H 02H 03H | AUDIO IN EQ Mid FREQ | 00H–78H | 20 Hz–20.0 kHz |
| 71H 02H 04H | AUDIO IN EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 02H 05H | AUDIO IN EQ Lo | 00H–1EH | -15–15 dB |
| 71H 02H 06H | AUDIO IN EQ Lo FREQ | 00H–38H | 20–500 Hz |
| 71H 02H 07H | Reserved | | |
| 71H 02H 08H | MIC IN EQ Hi | 00H–1EH | -15–15 dB |
| 71H 02H 09H | MIC IN EQ Hi FREQ | 44H–78H | 1.00–20.0 kHz |
| 71H 02H 0AH | MIC IN EQ Mid | 00H–1EH | -15–15 dB |
| 71H 02H 0BH | MIC IN EQ Mid FREQ | 00H–78H | 20 Hz–20.0 kHz |
| 71H 02H 0CH | MIC IN EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 02H 0DH | MIC IN EQ Lo | 00H–1EH | -15–15 dB |
| 71H 02H 0EH | MIC IN EQ Lo FREQ | 00H–38H | 20–500 Hz |
| 71H 02H 0FH | MIC IN HPF | 00H–01H | OFF, ON |
| 71H 02H 10H | MIC IN COMP | 00H–01H | OFF, ON |
| 71H 02H 11H | MIC IN COMP THRESHOLD | 00H–32H | -50–0 dB |
| 71H 02H 12H | MIC IN COMP RATIO | 00H–08H | 1.0:1 – INF:1 |
| 71H 02H 13H | MIC IN COMP ATTACK | 00H–19H | 0.2–100 ms |
| 71H 02H 14H | MIC IN COMP RELEASE | 00H–7FH | 30–5000 ms |
| 71H 02H 15H | MIC IN GATE | 00H–01H | OFF, ON |
| 71H 02H 16H | MIC IN GATE THRESHOLD | 00H–32H | -50–0 dB |
| 71H 02H 17H | MIC IN GATE RELEASE | 00H–7FH | 30–5000 ms |
| 71H 02H 18H | MASTER OUT EQ Hi | 00H–1EH | -15–15 dB |
| 71H 02H 19H | MASTER OUT EQ Hi FREQ | 44H–78H | 1.00–20.0 kHz |
| 71H 02H 1AH | MASTER OUT EQ Mid | 00H–1EH | -15–15 dB |
| 71H 02H 1BH | MASTER OUT EQ Mid FREQ | 00H–78H | 20 Hz–20.0 kHz |
| 71H 02H 1CH | MASTER OUT EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 02H 1DH | MASTER OUT EQ Lo | 00H–1EH | -15–15 dB |
| 71H 02H 1EH | MASTER OUT EQ Lo FREQ | 00H–38H | 20–500 Hz |
| 71H 02H 1FH | Reserved | | |
| 71H 02H 20H | REVERB LEVEL | 00H–7FH | 0–127 |
| 71H 02H 21H | REVERB TIME | 00H–32H | 0.0–5.0 sec |
| 71H 02H 22H | REVERB TYPE | 00H–01H | ROOM, HALL |
| 71H 02H 23H | REVERB SEND LEVEL SDI1 | 00H–7FH | 0–127 |
| 71H 02H 24H | REVERB SEND LEVEL SDI2 | 00H–7FH | 0–127 |
| 71H 02H 25H | REVERB SEND LEVEL SDI3 | 00H–7FH | 0–127 |
| 71H 02H 26H | REVERB SEND LEVEL HDMI3 | 00H–7FH | 0–127 |
| 71H 02H 27H | REVERB SEND LEVEL HDMI4 | 00H–7FH | 0–127 |
| 71H 02H 28H | REVERB SEND LEVEL AUDIO IN | 00H–7FH | 0–127 |
| 71H 02H 29H | REVERB SEND LEVEL MIC IN | 00H–7FH | 0–127 |
| 71H 02H 2AH | MASTERING | 00H–01H | OFF, ON |
| 71H 02H 2BH | MASTERING NOISE SUPPRESSOR | 00H–7FH | 0–127 |
| 71H 02H 2CH | MASTERING ENHANSER | 00H–7FH | 0–127 |
| 71H 02H 2DH | MASTERING Hi | 00H–7FH | 0–127 |
| 71H 02H 2EH | MASTERING Mid | 00H–7FH | 0–127 |
| 71H 02H 2FH | MASTERING Lo | 00H–7FH | 0–127 |

#### Panel Parameter（行 1377–1459）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| #71H 03H 00H–01H | A/B FADER | 00H 00H–07H 7F | 0–1023 |
| #71H 03H 02H–03H | CONTROL 1 VOL | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 04H–05H | CONTROL 2 VOL | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 06H–07H | OUTPUT FADER | 00H 00H–01H 7FH | 0–255 |
| 71H 03H 08H | VIDEO SEL A | 00H–03H | Input 1–4 |
| 71H 03H 09H | VIDEO SEL B | 00H–03H | Input 1–4 |
| 71H 03H 0AH | [PinP] | 00H–01H | [PinP] button OFF, ON |
| 71H 03H 0BH | [SPLIT] | 00H–01H | [SPLIT] button OFF, ON |
| 71H 03H 0CH | TRANSITION PATTERN | 00H–02H | WIPE, MIX, CUT |
| 71H 03H 0DH | [DSK] | 00H–01H | [DSK] button OFF, ON |
| 71H 03H 0EH | [KEY LEVEL] | 00H–01H | [KEY LEVEL] button OFF, ON |
| 71H 03H 0FH | A/B FADER START POSITION | 00H–01H | 00H: bus A end, 01H: bus B end |
| #71H 03H 10H–11H | PinP 1/4 CONTROL 1 VOL (PinP SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 12H–13H | PinP 1/4 CONTROL 2 VOL (PinP SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 14H–15H | PinP 1/2 CONTROL 1 VOL (PinP SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 16H–17H | PinP 1/2 CONTROL 2 VOL (PinP SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 18H–19H | SPLIT VC CONTROL 1 VOL (PinP SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 1AH–1BH | SPLIT VC CONTROL 2 VOL (PinP SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 1CH–1DH | SPLIT HC CONTROL 1 VOL (PinP SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 1EH–1FH | SPLIT HC CONTROL 2 VOL (PinP SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 20H–21H | PinP 1/4 CONTROL 1 VOL (SPLIT SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 22H–23H | PinP 1/4 CONTROL 2 VOL (SPLIT SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 24H–25H | PinP 1/2 CONTROL 1 VOL (SPLIT SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 26H–27H | PinP 1/2 CONTROL 2 VOL (SPLIT SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 28H–29H | SPLIT VC CONTROL 1 VOL (SPLIT SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 2AH–2BH | SPLIT VC CONTROL 2VOL (SPLIT SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 2CH–2DH | SPLIT HC CONTROL 1 VOL (SPLIT SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 2EH–2FH | SPLIT HC CONTROL 2 VOL (SPLIT SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 30H–31H | PinP 1/3 CONTROL 1VOL (PinP SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 32H–33H | PinP 1/3 CONTROL 2VOL (PinP SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 34H–35H | PinP 1/3 CONTROL 1VOL (SPLIT SW) | 00H 00H–01H 7FH | 0–255 |
| #71H 03H 36H–37H | PinP 1/3 CONTROL 2VOL (SPLIT SW) | 00H 00H–01H 7FH | 0–255 |

#### Other Parameter Area — MEMORY（行 1469–1477）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 73H 01H 00H | MEMORY SELECT | 00H–07H | MEMORY 1–8 |
| 〃 | MEMORY SAVE | 10H–17H | MEMORY 1–8 |
| 〃 | MEMORY INIT | 20H–28H | MEMORY 1–8（20H–27H）と Current（28H）を既定値に戻す |

- 1nH または 2nH を送ると、メモリー選択が指定メモリーに変わる
- 1nH / 2nH を指定しても、RQ1 では 00H–07H（現在選択中のメモリー）が返る

#### LED（行 1480–1507、全て Read Only）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 73H 02H 00H | LED OUTFADER BLACK | 00H–01H | OFF, GREEN (Read Only) |
| 73H 02H 01H | LED OUTFADER WHITE | 00H–01H | OFF, GREEN (Read Only) |
| 73H 02H 02H | LED FREEZE | 00H–01H | OFF, RED (Read Only) |
| 73H 02H 03H | LED MEMORY | 00H–01H | OFF, BLUE (Read Only) |
| 73H 02H 04H | LED AUDIO | 00H–03H | OFF, RED, GREEN, YELLOW (Read Only) |
| 73H 02H 05H | LED PEKSIG | 00H–03H | OFF, RED, GREEN, YELLOW (Read Only) |
| 73H 02H 06H | LED SETUP | 00H–01H | OFF, GREEN (Read Only) |
| 73H 02H 07H | LED PANELLOCK | 00H–01H | OFF, RED (Read Only) |
| 73H 02H 08H | LED PINP | 00H–01H | OFF, GREEN (Read Only) |
| 73H 02H 09H | LED SPLIT | 00H–01H | OFF, GREEN (Read Only) |
| 73H 02H 0AH | LED HDCP | 00H–01H | OFF, RED (Read Only) |
| 73H 02H 0BH | LED KEYLEVEL | 00H–01H | OFF, RED (Read Only) |
| 73H 02H 0CH | LED WIPE | 00H–01H | OFF, GREEN (Read Only) |
| 73H 02H 0DH | LED MIX | 00H–01H | OFF, GREEN (Read Only) |
| 73H 02H 0EH | LED CUT | 00H–01H | OFF, GREEN (Read Only) |
| 73H 02H 0FH | LED DSK | 00H–07H | OFF, RED, GREEN, YELLOW, BLUE, MAZENTA, CYAN, WHITE (Read Only) |
| 73H 02H 10H | LED AUTO | 00H–07H | OFF, RED, GREEN, YELLOW, BLUE, MAZENTA, CYAN, WHITE (Read Only) |
| 73H 02H 11H | LED VDOSEL1A | 00H–07H | OFF, RED, GREEN, YELLOW, BLUE, MAZENTA, CYAN, WHITE (Read Only) |
| 73H 02H 12H | LED VDOSEL2A | 00H–07H | OFF, RED, GREEN, YELLOW, BLUE, MAZENTA, CYAN, WHITE (Read Only) |
| 73H 02H 13H | LED VDOSEL3A | 00H–07H | OFF, RED, GREEN, YELLOW, BLUE, MAZENTA, CYAN, WHITE (Read Only) |
| 73H 02H 14H | LED VDOSEL4A | 00H–07H | OFF, RED, GREEN, YELLOW, BLUE, MAZENTA, CYAN, WHITE (Read Only) |
| 73H 02H 15H | LED VDOSEL1B | 00H–07H | OFF, RED, GREEN, YELLOW, BLUE, MAZENTA, CYAN, WHITE (Read Only) |
| 73H 02H 16H | LED VDOSEL2B | 00H–07H | OFF, RED, GREEN, YELLOW, BLUE, MAZENTA, CYAN, WHITE (Read Only) |
| 73H 02H 17H | LED VDOSEL3B | 00H–07H | OFF, RED, GREEN, YELLOW, BLUE, MAZENTA, CYAN, WHITE (Read Only) |
| 73H 02H 18H | LED VDOSEL4B | 00H–07H | OFF, RED, GREEN, YELLOW, BLUE, MAZENTA, CYAN, WHITE (Read Only) |

#### AUDIO LEVEL METER（行 1511–1529、全て Read Only）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 73H 03H 00H | AUDIO LEVEL METER MASTER L | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 01H | AUDIO LEVEL METER MASTER R | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 02H | AUDIO LEVEL METER SDI1 L | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 03H | AUDIO LEVEL METER SDI1 R | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 04H | AUDIO LEVEL METER SDI2 L | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 05H | AUDIO LEVEL METER SDI2 R | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 06H | AUDIO LEVEL METER SDI3 L | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 07H | AUDIO LEVEL METER SDI3 R | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 08H | AUDIO LEVEL METER HDMI3 L | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 09H | AUDIO LEVEL METER HDMI3 R | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 0AH | AUDIO LEVEL METER HDMI4 L | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 0BH | AUDIO LEVEL METER HDMI4 R | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 0CH | AUDIO LEVEL METER LINE L | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 0DH | AUDIO LEVEL METER LINE R | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 0EH | AUDIO LEVEL METER MIC L | 00H–33H | -INF, -50–0 dB (Read Only) |
| 73H 03H 0FH | AUDIO LEVEL METER MIC R | 00H–33H | -INF, -50–0 dB (Read Only) |

#### CTRL BUTTON（行 1537–1559。全て同一アドレス 73H 04H 00H、1 バイト。値 = on / long press / off）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 73H 04H 00H | [FREEZE] | 00H, 20H, 40H | [FREEZE] button on/long press/off |
| 〃 | [MEMORY] | 01H, 21H, 41H | [MEMORY] button on/long press/off |
| 〃 | [AUDIO] | 02H, 22H, 42H | [AUDIO] button on/long press/off |
| 〃 | [SETUP] | 03H, 23H, 43H | [SETUP] button on/long press/off |
| 〃 | [PinP] | 04H, 24H, 44H | [PinP] button on/long press/off |
| 〃 | [SPLIT] | 05H, 25H, 45H | [SPLIT] button on/long press/off |
| 〃 | [VIDEO SELECT 1A] | 06H, 26H, 46H | [VIDEO SELECT 1A] button on/long press/off |
| 〃 | [VIDEO SELECT 2A] | 07H, 27H, 47H | [VIDEO SELECT 2A] button on/long press/off |
| 〃 | [VIDEO SELECT 3A] | 08H, 28H, 48H | [VIDEO SELECT 3A] button on/long press/off |
| 〃 | [VIDEO SELECT 4A] | 09H, 29H, 49H | [VIDEO SELECT 4A] button on/long press/off |
| 〃 | [VIDEO SELECT 1B] | 0AH, 2AH, 4AH | [VIDEO SELECT 1B] button on/long press/off |
| 〃 | [VIDEO SELECT 2B] | 0BH, 2BH, 4BH | [VIDEO SELECT 2B] button on/long press/off |
| 〃 | [VIDEO SELECT 3B] | 0CH, 2CH, 4CH | [VIDEO SELECT 3B] button on/long press/off |
| 〃 | [VIDEO SELECT 4B] | 0DH, 2DH, 4DH | [VIDEO SELECT 4B] button on/long press/off |
| 〃 | [KEY LEVEL] | 0EH, 2EH, 4EH | [KEY LEVEL] button on/long press/off |
| 〃 | [WIPE] | 0FH, 2FH, 4FH | [WIPE] button on/long press/off |
| 〃 | [MIX] | 10H, 30H, 50H | [MIX] button on/long press/off |
| 〃 | [CUT] | 11H, 31H, 51H | [CUT] button on/long press/off |
| 〃 | [DSK] | 12H, 32H, 52H | [DSK] button on/long press/off |
| 〃 | [AUTO] | 13H, 33H, 53H | [AUTO] button on/long press/off |

## 5. ソース一覧（PGM/PST に書く値 → 物理入力）

VIDEO SEL A / B（71 03 08 / 09）、RS-232 PGM/PST、Bank Select+PC、CTRL BUTTON の全てで同じ 0 始まりの番号：

| 値 | 入力 | 物理端子 | 根拠 |
|---|---|---|---|
| 00H | INPUT 1 | SDI IN 1 | 行 1392, 433, 1227（SDI1 INPUT LEVEL） |
| 01H | INPUT 2 | SDI IN 2 | 同上 |
| 02H | INPUT 3 | SDI IN 3 **または** HDMI IN 3（CH3 INPUT SELECT 71 00 00 で AUTO/SDI/HDMI。AUTO は両方接続時 SDI 優先） | 行 29–36, 1151 |
| 03H | INPUT 4 | HDMI IN 4（スケーラー付き：SCALING/位置/ZOOM/EDID は CH4 のみ） | 行 37–61, 1152–1174 |
| — | STILL | 直接 PGM/PST には選べない。DSK SOURCE CH（71 00 20）の 04H、または FREEZE MODE=STILL（70 01 1E=02H）で [FREEZE] を静止画出力ボタンにする。静止画は CH4 からキャプチャ（CAPTURE IMAGE）か RCS から送信、電源 OFF で消える | 行 109–110, 208–212, 240–245 |

音声ソース（71 01 0x / RS-232 IAL a / CC）：0 SDI1, 1 SDI2, 2 SDI3, 3 HDMI3, 4 HDMI4, 5 AUDIO IN, 6 MIC IN, 7 MASTER OUT（行 510, 520, 1227–1234）。レベルメーターでは AUDIO IN が「LINE」と表記（行 1526–1527）。

## 6. 数

| 項目 | 数 | 根拠 |
|---|---|---|
| 映像入力（チャンネル） | 4（INPUT 1–4） | 行 433, 1392 |
| SDI 入力 | 3（SDI IN 1–3） | 行 33–35, 265–267 |
| HDMI 入力 | 2（HDMI IN 3、HDMI IN 4。CH3 は SDI と排他） | 行 33–37 |
| STILL | 1（本体内一時保存、電源 OFF で消去） | 行 241–245 |
| PinP | 1（[PinP] ボタン 1 つ。パターン 8 種のうち PinP 1/4・1/3・1/2 と SPLIT ×4・QUAD） | 行 87–92, 1192 |
| SPLIT | 1（[SPLIT] ボタン 1 つ。PinP と同じ 8 パターンから割当） | 行 1193 |
| DSK | 1 | 行 107, 1197 |
| メモリー | 8 | 行 195, 1472 |
| マクロ | 0（記載無し） | — |
| シーケンサー | 0（記載無し） | — |
| オーディオ入力 | 7（SDI1–3 エンベデッド、HDMI3、HDMI4、AUDIO IN、MIC） | 行 265–271, 510 |
| オーディオ出力 | MASTER OUT 1 系統（L/R） | 行 272, 1514–1515 |
| 映像出力 | 3（PGM（SDI）、PVW（SDI：割当 MULTI-VIEW/PST/PGM = 71 00 0E）、MULTI-VIEW（HDMI：割当 71 00 10）） | 行 63–69, 94, 1176–1178 |
| AUX | 無し（PVW/MULTI-VIEW 端子の割当が代替） | — |
| 出力解像度 | 本資料に無し（FRAME RATE 59.94/50 のみ）【不明】 | 行 207 |

## 7. 機種固有の注意

- **受信の前提設定は無し**：SETUP メニュー（行 24–252）に MIDI 関連項目（MIDI Rx、MIDI ch、Device ID、MVC 等）は一切無い。Address Map 70 01 にも無い。→ MIDI IN は常時有効【推測】。RS-232 も設定不要（RS-232 PANEL STATUS は自発送信の有無だけ）
- **MIDI ch は 00H 固定**（行 628）
- **PANEL MODE**（70 01 00、メニュー PANEL 9/16）：PGM/PST と A/B。Address Map の順序は「A/B, PGM/PST」、メニューの順序は「PGM/PST, A/B」で一致しない。A/B モードではフェーダー位置でどちらのバスが PGM かが変わる（A/B FADER START POSITION 71 03 0F）。アプリは PGM/PST モード前提にし、実機で 00H/01H の対応を確認
- **CUT は「ボタン」ではなく「トランジション種別」**（[WIPE]/[MIX]/[CUT] の 3 択、71 03 0C）。実行は [AUTO]（CC22 / RS-232 ATO / CTRL BUTTON 13H）
- **DSK ON/OFF が 2 箇所**（71 00 1F「DSK ON/OFF」と 71 03 0D「[DSK] button」）。違いは資料に無い【不明】
- **PinP/SPLIT ボタン**は「パターンを割り当てたボタン」であり、PinP ソース指定・ON PVW の概念は無い。インセット位置は CONTROL 1/2 VOL（#71 03 10–37）で、ボタン×パターン別に 14 組
- **メモリー呼出は 73 01 00 に 00–07H**。RS-232 MEM と Bank 50H+PC でも可。MEMORY PROTECT=ON だと SAVE 不可、AUTO MEMORY=ON だとメモリー 1 がラストメモリーになる（行 197–202）
- **RS-232 は stx（02H）前置・ACK=06H・XON/XOFF**。V-160HD 系の LAN コマンド（stx 無し、`ACK;`）とは別物
- **対応 FW**：Reference Manual「Version 1.5 and later」、MIDI Implementation Version 1.50（2017-02-28）。1.5 より前の FW での差分は不明【不明】
- 【推測】RCS（V-1SDI RCS）という PC 用ソフトが存在し静止画送信ができる → PC と繋ぐ端子（USB か RS-232 か）があるはずだが、本資料に記載無し
- タリー専用ブロックが無いので、PGM/PST 表示は 71 03 08/09 の RQ1 か LED 73 02 11–18 のポーリングで作る。MIDI OUT からは VIDEO SEL 変更時に Bank+PC、[AUTO] 操作時に CC22 が自発送信されるので、それを購読すればポーリング間隔を伸ばせる（行 854–862, 881–887）

## 8. 不明・推測一覧（実機で確かめる項目）

| # | 項目 | 状態 |
|---|---|---|
| 1 | 背面端子の種類：MIDI IN/OUT が 5 ピン DIN か、USB 端子の有無と用途（RCS 接続）、USB MIDI クラスコンプライアントか | 【不明】資料に仕様表が無い。Owner's Manual の仕様ページで確認 |
| 2 | iPhone ＋ USB-MIDI インターフェース ＋ DIN で CoreMIDI から SysEx が通るか | 【推測】 |
| 3 | Device ID 10H の変更可否・範囲 | 【不明】設定項目無し |
| 4 | PANEL MODE 70 01 00 の 00H が A/B か PGM/PST か（Address Map とメニューで順序が逆） | 【不明】 |
| 5 | 「#」付き 2 バイト値のエンコード（aa×128+bb に最小値オフセット）と、1 つの DT1 に 2 バイト入れれば「連続受信」扱いになるか | 【推測】 |
| 6 | PGM/PST モードで 71 03 08（VIDEO SEL A）を DT1 で書いた時に即時カットになるか、PST 側だけ変わるか | 【不明】 |
| 7 | 71 00 1F「DSK ON/OFF」と 71 03 0D「[DSK] button」の違い | 【不明】 |
| 8 | CTRL BUTTON 73 04 00 で on（00–13H）だけ送って off（40–53H）を送らない場合の挙動（押しっぱなし扱いか） | 【不明】 |
| 9 | RQ1 で複数バイトをまとめて読める範囲（例 71 03 00 から 10H バイト、73 02 00 から 19H バイト、70 00 00 から 09H バイト）と、RQ1 に対する DT1 応答の遅延 | 【不明】 |
| 10 | RS-232 `stxACS;` の応答内容 | 【不明】 |
| 11 | FW 1.5 未満の個体で Address Map が同じか | 【不明】 |
| 12 | A/B FADER（#71 03 00、0–1023）を DT1 で書いた時に実際に映像がトランジションするか（読み取り専用の可能性） | 【不明】 |
| 13 | AUDIO LEVEL METER 73 03 の 00–33H と dB の対応（00=−INF、01–33H=−50–0 dB【推測】） | 【推測】 |
