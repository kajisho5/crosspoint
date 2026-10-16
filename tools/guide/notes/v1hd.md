# V-1HD 抽出メモ（SW CROSSPOINT 機種追加用）

資料：
- G = `pdf/v-1hd/V-1HD_RC_guide_eng02_W.txt`（Remote Control Guide、pdftotext -layout、1536 行。MIDI Implementation は Model V-1HD / Date November 20, 2015 / Version 1.00（G 行 176–179）。p.5–11 は 2 段組で左右が混在、p.12–20 の Parameter Address Map は 1 段組）
- C = `pdf/v-1hd/V-1HD_Remote_e01_W.txt`（V-1HD Remote（iPad）接続ガイド、123 行、Copyright 2016）
- 行番号は txt の行、p. は PDF の紙面ノンブル。G の対応：p.2＝行 22–80、p.3＝81–147、p.4＝148–174、p.5＝175–278、p.6＝279–368、p.7＝369–448、p.8＝449–543、p.9＝544–617、p.10＝618–729、p.11＝730–811、p.12＝812–878、p.13＝879–931、p.14＝932–1013、p.15＝1014–1080、p.16＝1081–1146、p.17＝1147–1197、p.18＝1198–1227、p.19＝1228–1283、p.20＝1284–1362、p.21＝1363–1466、p.22＝1467–1531
- 本機は LAN を持たない **MIDI（DIN＋USB）専用** の機種。V-160HD 系の DTH/RQH 簡易制御とは無関係。

## 1. 接続手段

| 手段 | 有無 | 根拠 |
|---|---|---|
| LAN | **無し**。LAN/Ethernet/TCP/IP/Wi-Fi の記載が G・C のどこにも無い | G/C 全文に該当語無し |
| USB | **有り**。USB MIDI。「Messages that the V-1HD generates are always transmitted to USB MIDI」。SETUP の MIDI Rx SOURCE＝USB で USB から受信 | G 行 62（p.2）、行 637（p.10）、図（行 62–69）に「USB MIDI」 |
| USB MIDI がクラスコンプライアントか | 「class compliant」「driver」の語は**無し**【不明】。iPad 接続ガイドは「Lightning-to-USB camera adapter＋USB ケーブル」で接続→アプリ起動→[V-1HD] ボタンで接続、ドライバ手順無し（C 行 29–32, 15–18）→ クラスコンプライアント USB MIDI【推測】。iPhone の CoreMIDI にデバイスが見えるか実機確認 |
| Bluetooth | **無し**（BLE MIDI／音声とも記載無し） | G/C 全文に「Bluetooth」無し |
| RS-232 | 無し | 同上 |
| MIDI DIN | **有り**。MIDI IN、MIDI OUT/THRU（1 端子を OUT か THRU に切替）。図：MIDI IN → V-1HD → MIDI OUT、USB MIDI ⇄ V-1HD | G 行 62–69（p.2）、行 85（複数台チェーン時は THRU） |

iPad との接続（C 行 8–49）：
- 「V-1HD Remote は Roland V-1HD 専用の iPad アプリ。V-1HD と iPad を **USB** で接続して操作」（C 行 15–18）
- 手順：Lightning-to-USB camera adapter を iPad の Lightning に接続 → USB ケーブルでアダプタと V-1HD の USB ポートを接続 → V-1HD 電源 ON → iPad 電源 ON → アプリ起動 → [V-1HD] ボタンをタップ（点灯で接続）（C 行 29–32, 48–49, 10–17）
- 注意：「[V-1HD] ボタンが点灯しない場合、V-1HD の [(TAP) BPM] 長押し → SETUP メニューで **MIDI Rx SOURCE が USB か確認。MIDI IN なら USB に変更**」（C 行 37–39）
- 「MIDI Rx SOURCE は V-1HD Remote からは変更できない」（C 行 96）
- iPhone の記載は無し（iPad のみ）。接続方式の記載は USB のみ

→ iPhone から使えるのは **USB MIDI だけ**。LAN トランスポート・BLE MIDI は capabilities で無効にする。MIDI DIN は iPhone から直接は使えない（BLE MIDI アダプタ等を挟む場合は別途【不明】）。

## 2. SysEx（G p.8–9 行 507–612、p.11 行 778–806、チェックサム p.21 行 1387–1449）

| 項目 | 値 | 根拠 |
|---|---|---|
| Manufacturer ID | 41H（Roland） | 行 521, 555, 789 |
| Device ID（SysEx） | **dev: 00H–1FH、既定 10H** | 行 522, 559, 790（p.8, 9, 11） |
| Device ID（SETUP メニュー表示） | MIDI DEVICE ID＝**1 (00h)–32 (1Fh)**。メニュー表示値＝SysEx 値＋1 → 既定 10H はメニュー上「17」。「MVC モード・V-LINK モードの Device ID も兼ねる」 | 行 72–73（p.2）、アドレス 70H 01H 1FH（行 888） |
| Model ID | **00H 00H 00H 20H**（4 バイト） | 行 523–526, 557–563（表記「1st–4th byte of model ID (V-1HD)」）、行 791–794 |
| RQ1 Command ID | 11H | 行 527 |
| DT1 Command ID | 12H（資料の DT1 表では「12H Command ID (RQ1)」と誤記されているが、見出しは Data Set 1 (DT1)） | 行 546, 553, 564, 795 |
| DT1 書式 | `F0 41 dev 00 00 00 20 12 aa bb cc dd … ee sum F7` | 行 552–554 |
| RQ1 書式 | `F0 41 dev 00 00 00 20 11 aa bb cc ss tt uu sum F7`（サイズ 3 バイト） | 行 515–517, 531–533 |
| RQ1 応答 | 送信可能な状態で、アドレス・サイズが適切なら DT1 で返す。不適切なら**何も返さない** | 行 509–513 |
| チェックサム | アドレス＋データ（RQ1 はサイズ）の合計 sum、sum/128 の余り r、checksum＝128−r（r=0 なら 0） | 行 1406–1419 |
| 分割サイズ | **256 バイト以下**のパケットに分割 | 行 579–580 |
| 送信間隔 | DT1 を連続送信する時は **20 ms 以上**の間隔 | 行 580 |
| RQ1 の単位 | 「データ型ごとに 1 回で送れる量が決まっている。Address Map の先頭アドレスとサイズに従って要求すること」 | 行 537–539 |
| Active Sensing（受信） | FEH 受信で 400 ms 監視モードに入る。**MIDI Rx SOURCE＝USB のときは受信しない** | 行 456–468（p.8） |
| Active Sensing（送信） | 約 250 ms 間隔で MIDI OUT へ。**USB MIDI へは送らない** | 行 751–757（p.11） |
| 実装バージョン | MIDI Implementation Version 1.00（2015-11-20）。Implementation Chart も Version 1.00 | 行 176–179, 1468–1469 |

その他の SysEx（本アプリでは使わないが受信仕様として記録）：
- MVC（MIDI Visual Control）メッセージ：`F0 7E dev 0C 01 aa bb cc dd … ee sum F7`。dev は「F00H–1FH; MVC default＝00H」（誤植、00H–1FH の意）。「#」付きアドレスは上位ニブル／下位ニブルの 2 バイトに分けて送る（行 584–612, 1251–1254）
- V-LINK メッセージ：`F0 41 dev 00 51 12 aa bb cc dd … ee sum F7`（Model ID 2 バイト 00H 51H、dev 既定 10H）（行 547–575）

## 3. LAN プロトコル

**無し**。TCP ポート／パスワード／`DTH:` `RQH:` `VER;` のような簡易制御コマンドの記載は資料のどこにも無い。V-160HD 系（DTH/RQH）とは**まったく別**で、V-1HD は MIDI（SysEx DT1/RQ1 ＋ CC/PC）のみ。

## 4. アドレスマップの要点（SysEx 3 バイトアドレス）

値のエンコード（G 行 816–818, 1427–1439, 1251–1254）：
- 1 バイト 7bit（00H–7FH）。
- Standard マップの「#」付きアドレス：「指定データを**上位 2 バイトと下位 2 バイト**に分けて送る。2 バイト組が連続して受信されないとデータは無視される」（行 817–818）。実際の値域は 2 バイトで「00 00H–07 7FH＝0–1023」「00 00H–27 08H＝0.0–500.0 msec（＝0–5000）」「00 14H–01 7AH＝20–250」なので **7bit×2（aa×128＋bb）**（行 1429–1432 の説明に一致）。「#」はアドレス aa bb cc と cc+1 の 2 アドレスを 1 組で書く（例：#71H 00H 00H / 01H）。
- MVC / V-LINK マップの「#」：**ニブル分割**（BCH → 0BH, 0CH）（行 1251–1254, 1309–1312）。Standard とは分割規則が違う。
- 符号付き：1 バイトは 00H＝−64、40H＝±0、7FH＝+63（オフセット 64）。例 OUTPUT CONTRAST 00H–7FH＝−64–63（行 856, 1433–1437）
- Read Only の項目は RQ1 で読むだけ。

| 用途 | アドレス | サイズ | 値域 | 意味 | 根拠（G 行） |
|---|---|---|---|---|---|
| バス構成モード | 70H 01H 15H | 1 | 00H–01H | A/B MODE：A/B, PGM/PST | 873 |
| PGM 選択（＝bus A の video select） | 71H 00H 08H | 1 | 00H–03H | video sel A：HDMI 1–4。PGM/PST モードで A＝PGM【推測：名称からの推測、資料に A=PGM の明記無し】 | 986 |
| PST 選択（＝bus B の video select） | 71H 00H 09H | 1 | 00H–03H | video sel B：HDMI 1–4 | 987 |
| クロスポイント（INPUT n 割当） | — | — | — | **無し（物理入力直指定）**。入力は HDMI 1–4 固定 | 986–987 |
| フェーダー位置（A/B fader、T-bar） | #71H 00H 00H / 01H | 2 | 00 00H–07 7FH | 0–1023 | 974–976 |
| トランジションタイプ | 71H 00H 0CH | 1 | 00H–02H | WIPE, MIX, CUT（Standard CC#19 でも同じ 00H–02H） | 990, 233–239 |
| トランジション時間 | 71H 00H 14H | 1 | 00H–2CH | TRANSFORM TIME：0.0–4.0 sec, BPM×1/4, BPM×1/2, BPM×1, BPM×2（0.1 s 刻みで 00H–28H、29H–2CH が BPM×1/4〜×2【推測：値数 45＝41＋4 から】） | 1010 |
| CUT トリガ | 73H 04H 00H | 1 | 11H→51H | Ctrl Button：[CUT] ボタン on/off。ON の後は必ず OFF を送る。※V-1HD の [CUT] はトランジション種別選択ボタンで、押すだけでカットが実行されるかは記載無し【不明】 | 1190–1192, 1218 |
| AUTO トリガ | 73H 04H 00H | 1 | 12H→52H（A）/ 13H→53H（B） | TRANSFORMER [A]/[B] ボタン on/off。TRANSFORMER A/B（71H 00H 12H/13H）に「TRANSFORM」「WIPE」「MIX」「CUT」を割り当てた状態で押すと自動トランジションになる【推測】。専用の AUTO アドレスは無い | 1220–1222, 1005–1009 |
| TRANSFORMER A 機能 | 71H 00H 12H | 1 | 00H–0AH | NONE, TRANSFORM, （2 項目は txt で空白＝アイコン表記【不明】）, WHITE, BLACK, BPM SYNC, WIPE, MIX, CUT, EFFECTS | 1004–1006 |
| TRANSFORMER B 機能 | 71H 00H 13H | 1 | 00H–0AH | 同上 | 1007–1009 |
| 出力フェード（outfader） | #71H 00H 06H / 07H | 2 | 00 00H–01 7FH | 1–255 | 983–985 |
| PinP / キー / SPLIT（効果 A） | 71H 00H 0EH | 1 | 00H–12H | EFFECTS A 種別：NEGATIVE, EMBOSS, COLORIZE, COLORPASS, POSTERIZE, SILHOUETTE, MONOCOLOR, FINDEDGE, FLIP, WHT-L.KEY, BLK-L.KEY, GRN-C.KEY, BLU-C.KEY, PinP 1/4, PinP 1/2, SPLIT-VS, SPLIT-VC, SPLIT-HS, SPLIT-HC（0DH＝PinP 1/4、0EH＝PinP 1/2、0FH–12H＝SPLIT） | 992–994 |
| PinP / キー / SPLIT（効果 B） | 71H 00H 0FH | 1 | 00H–12H | EFFECTS B 種別：同上 | 995–997 |
| 効果 A ON/OFF | 71H 00H 0AH | 1 | 00H–01H | effect A：OFF, ON（PinP/キー/SPLIT の ON/OFF はこれ。ON PGM / ON PVW の区別は無い） | 988 |
| 効果 B ON/OFF | 71H 00H 0BH | 1 | 00H–01H | effect B：OFF, ON | 989 |
| 効果 A/B つまみ（キーレベル等） | #71H 00H 02H / 03H、#71H 00H 04H / 05H | 2 | 00 00H–01 7FH | effects A pod / effects B pod：1–255 | 977–982 |
| PinP A 位置・クロップ | 71H 00H 15H–18H | 各 1 | 01H–64H / 00H–64H | CROPPING H/V 1–100%、VIEW POSITION H/V −50–50% | 1011, 1017–1019 |
| PinP B 位置・クロップ | 71H 00H 19H–1CH | 各 1 | 同上 | 同上 | 1020–1023 |
| PinP ソース | — | — | — | **無し**。PinP は効果として bus A/B に掛かるため、PinP の素材は反対バスの video select で決まる【推測：資料に明記無し】 | — |
| DSK | — | — | — | **専用 DSK 無し**。キー合成は EFFECTS の WHT-L.KEY / BLK-L.KEY / GRN-C.KEY / BLU-C.KEY | 992–997 |
| オーディオ入力レベル | 71H 01H 00H–05H | 各 1 | 00H–7FH | 中位 01H、下位 00H=HDMI IN 1, 01H=HDMI IN 2, 02H=HDMI IN 3, 03H=HDMI IN 4, 04H=AUDIO IN, 05H=MIC：0–127 | 1028–1033 |
| MASTER レベル | 71H 01H 06H | 1 | 00H–7FH | MASTER OUT LEVEL 0–127 | 1034 |
| ミュート | — | — | — | **ミュートのパラメータは無い**（レベル 0 で代用するしかない）【不明：実機で確認】 | 1028–1034 |
| AUDIO FOLLOW | 71H 01H 07H | 1 | 00H–01H | OFF, ON | 1035 |
| メモリー ロード | 73H 01H 00H | 1 | 00H–07H | Memory Select：Memory 1–8 | 1152–1153 |
| メモリー パネル保存 | 73H 01H 00H | 1 | 10H–17H | Memory PANEL Save：Memory 1–8（ロードと同一アドレス、値域で区別） | 1154 |
| 現在メモリー番号 | — | — | — | 専用の「現在番号」読出しアドレスは無い。73H 01H 00H を RQ1 で読めるかは【不明】。LED MEMORY（73H 02H 03H）は MEMORY ボタンの点灯のみ | 1152–1158 |
| メモリー名 | — | — | — | 無し | — |
| メモリー領域（直接読み書き） | 72H xxH 00H | — | — | Memory 1–8 の Video / Audio-1 / Audio-2 を 72H (4(n−1)+0/1/2)H 00H で直接読み書き（現在選択中のメモリーは変更されない） | 948–967 |
| タリー | — | — | — | **タリーブロック無し**。代替：LED 状態（Read Only）73H 02H 11H–14H＝LED VDOSELA-1〜4、73H 02H 15H–18H＝LED VDOSELB-1〜4（各 1 バイト 00H–07H：OFF, Red, Green, Yellow, Blue, Mazenta, Cyan, White。色は PGM LED / PST LED 設定 70H 01H 23H/24H に依存） | 1172–1179, 892–893 |
| ラベル（入力名） | — | — | — | 無し | — |
| マクロ / シーケンサー / LAN 簡易制御 | — | — | — | 無し | — |
| パネルボタン押下 | 73H 04H 00H | 1 | 00H–13H（ON）/ 40H–53H（OFF） | Ctrl Button：下表 | 1190–1222 |
| システムバージョン文字列 | 70H 00H 00H–07H | 8 | 00H–7FH | System Version String (1)–(8)：ASCII（Read Only） | 836–843 |
| システムデバイスモード | 70H 00H 10H | 1 | 00H | 00H: Normal（Read Only） | 845 |
| オーディオレベルメーター | 73H 03H 00H–0CH | — | 00H–7FH | Master L/R、HDMI 1–4、Line、MIC（Read Only）。HDMI は 02H, 04H, 06H, 08H と 2 刻み（L/R の 2 バイト【推測】） | 1180–1187 |
| MIDI Rx SOURCE | 70H 01H 1CH | 1 | 00H–01H | USB, MIDI IN（USB で接続中に MIDI IN へ書くと自分の受信が切れる。iPad アプリも変更不可にしている） | 885、C 96 |

Ctrl Button（73H 04H 00H）の値一覧（G 行 1201–1222、p.18）：ON＝左値、OFF＝左値＋40H。「正しく動作させるため、ON の後に必ず OFF を送る」（行 1191–1192）

| ボタン | ON | OFF |
|---|---|---|
| [FREEZE] | 00H | 40H |
| [MEMORY] | 01H | 41H |
| [AUDIO] | 02H | 42H |
| [(TAP) BPM] | 03H | 43H |
| EFFECTS A [ON] | 04H | 44H |
| EFFECTS B [ON] | 05H | 45H |
| [A-1] | 06H | 46H |
| [A-2] | 07H | 47H |
| [A-3] | 08H | 48H |
| [A-4] | 09H | 49H |
| [B-1] | 0AH | 4AH |
| [B-2] | 0BH | 4BH |
| [B-3] | 0CH | 4CH |
| [B-4] | 0DH | 4DH |
| [BPM SYNC] | 0EH | 4EH |
| [WIPE] | 0FH | 4FH |
| [MIX] | 10H | 50H |
| [CUT] | 11H | 51H |
| TRANSFORMER [A] | 12H | 52H |
| TRANSFORMER [B] | 13H | 53H |

### 4-a. Standard モードの CC / PC（SysEx の代替手段。MIDI Rx CHANNEL≠OFF が必要）（G p.5–6 行 207–325）

| メッセージ | 内容 | 根拠 |
|---|---|---|
| CC#0 (MSB) / CC#32 (LSB) ＋ Program Change | MSB 00H LSB 00H PC 00H–03H＝A ch. INPUT 1–4／MSB 01H LSB 00H PC 00H–03H＝B ch. INPUT 1–4／MSB 50H LSB 00H PC 00H–07H＝MEMORY 1–8。Bank Select は次の PC まで保持。無効な Bank は無視して PC だけ受ける | 218–246, 308–325 |
| CC#10 / 11 / 12 / 13 | HDMI 1 / 2 / 3 / 4 audio input level | 249–271, 176–181 |
| CC#14 | AUDIO IN level | 183–191 |
| CC#15 | MIC level | 194–200 |
| CC#16 | MASTER output level | 203–208 |
| CC#17 | A/B fader | 211–217 |
| CC#18 | TRANSFORMER TIME | 220–225 |
| CC#19 | Transition Select：00H–02H（WIPE, MIX, CUT） | 228–239 |
| CC#20 / 21 | TRANSFORMER [A] / [B] ボタン on/off（xx：00H–3FH OFF、40H–7FH ON） | 242–256, 196–198 |
| CC#22 | BPM SYNC on/off | 259–264 |
| CC#23 / 24 | [EFFECTS A] / [EFFECTS B] つまみ（00H で効果 OFF） | 267–273, 281–289 |
| CC#25 | [OUTPUT FADE] つまみ | 292–297 |
| CC#26 | FREEZE on/off | 299–304 |

送信側（MIDI OUT／USB MIDI）も同じ CC 番号・Bank/PC で本体操作を送る（G p.10–11 行 630–738）。アプリ側で本体の状態を追従するのに使える（SysEx の DT1 が自発送信されるかは記載無し【不明】）。

## 5. ソース一覧（video sel A / B に書く値 → 物理入力）

| 値 | 物理入力 | 根拠 |
|---|---|---|
| 00H | HDMI 1 | G 行 986–987（「HDMI 1–4」）、Bank/PC 表（行 244–245「A ch. INPUT 1–4」） |
| 01H | HDMI 2 | 同上 |
| 02H | HDMI 3 | 同上 |
| 03H | HDMI 4 | 同上 |

STILL / 内蔵カラー等の選択肢は無し（値域 00H–03H）。

## 6. 数

| 項目 | 数 | 根拠 |
|---|---|---|
| 映像入力 | 4（HDMI 1–4） | G 行 986–987 |
| HDMI 入力 | 4 | 同上 |
| SDI 入力 | 0（記載無し） | — |
| STILL | 0（記載無し） | — |
| PinP | 効果枠 2（EFFECTS A / B のどちらにも PinP 1/4・PinP 1/2 を割当可。PinP A / PinP B の位置・クロップ設定あり） | G 行 992–997, 1011–1023 |
| DSK | 0（専用無し。キーは EFFECTS の 4 種） | G 行 992–997 |
| SPLIT | 効果として 4 種（SPLIT-VS, SPLIT-VC, SPLIT-HS, SPLIT-HC）を EFFECTS A/B に割当 | G 行 994 |
| メモリー | 8 | G 行 1152, 956–967 |
| マクロ | 0 | — |
| オーディオ入力 | 6（HDMI 1–4、AUDIO IN、MIC） | G 行 1028–1033 |
| 映像出力 | 2（OUTPUT、PREVIEW。PREVIEW OUT を MULTI-VIEW / OUTPUT / PREVIEW に切替＝70H 01H 0FH） | G 行 867 |
| AUX | 無し（AUX ソース選択のアドレス無し） | — |
| トランジション種別 | WIPE 30 パターン（00H–1DH）、MIX 4（MIX, FAM, NAM, MOS-AIC）、CUT | G 行 998–1003 |

## 7. 機種固有の注意

- **受信の前提設定（SETUP メニュー、G p.2–3 行 56–143）**
  - `MIDI Rx SOURCE`（USB / MIDI IN、アドレス 70H 01H 1CH）：**iPhone/iPad から USB で使うには USB に設定する必要がある**（C 行 37–39）。この項目は V-1HD Remote からは変更できない（C 行 96）→ 本アプリでも「本体側で USB にしてください」と案内する。
  - `MIDI DEVICE ID`（1 (00h)–32 (1Fh)、アドレス 70H 01H 1FH）：SysEx の dev は 00H–1FH、既定 10H（メニュー表示「17」）。MVC / V-LINK の Device ID も兼ねる（G 行 72–73）。アプリ側は既定 10H、設定で 00H–1FH を選べるようにする。
  - `MIDI Rx CHANNEL`（1–16 / OFF、アドレス 70H 01H 20H）：OFF だと **Standard モードのチャンネルボイスメッセージ（CC / PC）を受けない**（G 行 74, 211–213）。SysEx DT1/RQ1 には無関係（ch 指定無し）。
  - `MIDI OUT`（OUT / THRU、アドレス 70H 01H 1DH）：複数台チェーンのときだけ THRU（G 行 85）。USB MIDI への送信は設定に関係なく常に行われる（G 行 637）。
  - `MIDI Rx TEMPO CLOCK`（ON / OFF）：BPM SYNC 用。本アプリ無関係。
- **MVC / V-LINK ON は不要**：「3-1. Standard (original for the V-1HD)：Transmission and reception are always possible regardless of whether MVC or V-LINK is on or off」（G 行 815–816）。本アプリは Standard モードの SysEx（Model ID 00 00 00 20）だけを使い、MVC ON（10H 00H 00H＝01H、Universal SysEx 7EH）や V-LINK ON（Model ID 00H 51H）は送らない。
  - MVC メッセージは MVC OFF 中は（MVC ON 以外）無視、V-LINK メッセージは V-LINK OFF 中は無視（G 行 1236–1239, 1293–1294）。
  - Implementation Chart の「*1 Only while the MVC Mode or V-LINK Mode is activated」は CC#1–9, 28–31, 64–95・After Touch・Pitch Bend に付く注記（G 行 1486–1493, 1521）。CC#10–26 と Bank/PC・SysEx は Standard モードで有効。
- **Active Sensing**：Rx SOURCE＝USB では受信しない／USB MIDI へは送信しない（G 行 468, 757）→ USB 接続ではアクティブセンシング監視は実装不要。
- **Ctrl Button（73H 04H 00H）は ON の後に必ず OFF を送る**（G 行 1191–1192）。
- **応答しないコマンド**：RQ1 はアドレス・サイズが不適切だと何も返さない（G 行 512–513）。タイムアウト処理必須。
- **DT1 分割**：256 バイト以下、連続送信は 20 ms 以上空ける（G 行 579–580）。本機のブロックは最大でも Audio Parameter-2 の 35H バイトなので実質分割不要。
- **対応 FW バージョン**：資料に FW バージョン要件の記載無し【不明】。MIDI Implementation Version 1.00（2015-11-20）、ガイド版数 eng02。
- 資料の誤記（転記時注意）：DT1 表の「12H Command ID (RQ1)」（行 564, 795）は DT1 の誤り／MVC の dev「F00H–1FH」（行 593）は 00H–1FH の誤り／HDMI IN 2 DELAY のアドレス「#71H 01H 10H / 11H」（行 1055–1057）は HDMI IN 1 DELAY と重複しており、並びから **#71H 01H 1AH / 1BH** の誤植【推測】。

## 8. 不明・推測一覧（実機で確かめる項目）

| # | 項目 | 状態 |
|---|---|---|
| 1 | USB MIDI がクラスコンプライアントで、iPhone（Lightning-USB カメラアダプタ／USB-C）の CoreMIDI に見えるか | 【推測：見える】 |
| 2 | A/B MODE＝PGM/PST のとき bus A＝PGM、bus B＝PST か（video sel A/B の役割） | 【推測】 |
| 3 | Ctrl Button [CUT]（11H/51H）で即時カットが実行されるか、種別選択だけか | 【不明】 |
| 4 | TRANSFORMER A/B に TRANSFORM / WIPE / MIX / CUT を割り当て、Ctrl Button 12H/52H で AUTO 相当のトランジションになるか。TRANSFORMER 値 02H・03H の名称（txt では空白） | 【推測】【不明】 |
| 5 | TRANSFORM TIME 00H–2CH のうち BPM×1/4〜×2 が 29H–2CH か | 【推測】 |
| 6 | 「#」付きアドレスの実エンコード（上位 2 バイト／下位 2 バイト＝7bit×2 と解釈）。A/B fader に 00 00H〜07 7FH を書いて動くか | 【推測】 |
| 7 | 73H 01H 00H（Memory Select）を RQ1 で読んで現在のメモリー番号が返るか | 【不明】 |
| 8 | オーディオミュートの手段（アドレス無し。レベル 0 で代用） | 【不明】 |
| 9 | 本体操作時に DT1 が自発送信されるか（CC/PC・Bank は送信される） | 【不明】 |
| 10 | オーディオレベルメーター 73H 03H 02H/04H/06H/08H の 2 刻みが L/R ペアか | 【推測】 |
| 11 | HDMI IN 2 DELAY の正しいアドレス（1AH/1BH と推測） | 【推測】 |
| 12 | LED VDOSELA/B の色値をタリー代替として使えるか（PGM LED / PST LED の設定色に依存） | 【推測】 |
| 13 | 対応 FW バージョンの下限 | 【不明】 |
| 14 | PinP の素材が反対バスの video select で決まるか | 【推測】 |

---

## 付録：Parameter Address Map 全転記（G p.12–20 行 814–1357）

### A. 先頭アドレス一覧（3-1 Standard、行 820–827）

| Start Address | Description |
|---|---|
| 00H 00H 00H | Reserved |
| 70H 00H 00H | System Parameter Area (See 3-1-1) |
| 71H 00H 00H | Video, Audio Parameter Area (See 3-1-2) |
| 72H 00H 00H | Video, Audio Parameter Memory Area (See 3-1-2) |
| 73H 00H 00H | Reserved |
| 73H 01H 00H | Panel Parameter Area (See 3-1-3) |
| 74H 00H 00H | Reserved |

注記（行 816–818）：MVC/V-LINK の ON/OFF に関係なく常に送受信可能。「#」付きアドレスは上位 2 バイト・下位 2 バイトに分けて送り、2 バイト組が連続しないと無視。

### B. 3-1-1 System Parameter Area — Products, version, mode（行 835–845）

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
| 70H 00H 08H | Reserved | | |
| 70H 00H 10H | System Device Mode | 00H | 00H: Normal (Read Only) |

### C. 3-1-1 Setup Parameter（行 850–926）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| #70H 01H 00H / 01H | BPM | 00 14H–01 7AH | 20–250 |
| 70H 01H 02H | BPM SYNC | 00H–03H | ×1/4, ×1/2, ×1, ×2 |
| 70H 01H 03H | HDCP | 00H–01H | OFF, ON |
| 70H 01H 04H | OUTPUT CONTRAST | 00H–7FH | -64–63 |
| 70H 01H 05H | OUTPUT SATURATION | 00H–7FH | -64–63 |
| 70H 01H 06H | OUTPUT BRIGHTNESS | 00H–7FH | -64–63 |
| 70H 01H 07H | OUTPUT COLOR SPACE | 00H–03H | AUTO, RGB-FULL, RGB-LIMIT, YPbPr |
| 70H 01H 08H | OUTPUT DVI-D, HDMI | 00H–02H | AUTO, DVI-D, HDMI |
| 70H 01H 09H | Reserved | | |
| 70H 01H 0AH | PREVIEW CONTRAST | 00H–7FH | -64–63 |
| 70H 01H 0BH | PREVIEW SATURATION | 00H–7FH | -64–63 |
| 70H 01H 0CH | PREVIEW BRIGHTNESS | 00H–7FH | -64–63 |
| 70H 01H 0DH | PREVIEW COLOR SPACE | 00H–03H | AUTO, RGB-FULL, RGB-LIMIT, YPbPr |
| 70H 01H 0EH | PREVIEW DVI-D, HDMI | 00H–02H | AUTO, DVI-D, HDMI |
| 70H 01H 0FH | PREVIEW OUT | 00H–02H | MULTI-VIEW, OUTPUT, PREVIEW |
| 70H 01H 10H | PinP BORDER | 00H–0FH | 0–15 |
| 70H 01H 11H | PinP BORDER COLOR | 00H–06H | BLACK, WHITE, GRAY, RED, GREEN, BLUE, YELLOW |
| 70H 01H 12H | AUTO SCAN | 00H–01H | OFF, ON |
| 70H 01H 13H | Reserved | | |
| 70H 01H 14H | AUTO SCAN TRANS TIME | 00H–28H | 0.0–4.0sec |
| 70H 01H 15H | A/B MODE | 00H–01H | A/B, PGM/PST |
| 70H 01H 16H | FREEZE MODE | 00H–01H | ALL, SELECT |
| 70H 01H 17H | NO SIGNAL BACK | 00H–01H | BLACK, BLUE |
| 70H 01H 18H | UNFIT SIGNAL BACK | 00H–02H | BLACK, BLUE, THRU |
| 70H 01H 19H | DEINTERLACE MODE | 00H–01H | WEAVE, BOB |
| 70H 01H 1AH | COLOR BAR OUTPUT | 00H–01H | OFF, ON |
| 70H 01H 1BH | TEST TONE OUTPUT | 00H–01H | OFF, ON |
| 70H 01H 1CH | MIDI Rx SOURCE | 00H–01H | USB, MIDI IN |
| 70H 01H 1DH | MIDI OUT | 00H–01H | OUT, THRU |
| 70H 01H 1EH | MIDI Tx CHANNEL | 00H–0FH | ch. 1–16 |
| 70H 01H 1FH | MIDI DEVICE ID | 00H–1FH | 1–32 |
| 70H 01H 20H | MIDI Rx CHANNEL | 00H–0FH | ch. 1–16（メニューの OFF に対応する値は表に無し【不明】） |
| 70H 01H 21H | MIDI Rx TEMPO CLOCK | 00H–01H | OFF, ON |
| 70H 01H 22H | POWER ON LOAD | 00H–07H | MEMORY 1–8 |
| 70H 01H 23H | PGM LED | 00H–06H | RED, GREEN, YELLOW, BLUE, PURPLE, L.BLUE, WHITE |
| 70H 01H 24H | PST LED | 00H–06H | RED, GREEN, YELLOW, BLUE, PURPLE, L.BLUE, WHITE |
| 70H 01H 25H | INPUT LED | 00H–01H | OFF, ON |
| 70H 01H 26H | TRANSFORMER LED | 00H–01H | OFF, ON |
| 70H 01H 27H | AUDIO LED | 00H–06H | MASTER OUT, MIC, AUDIO IN, HDMI 1, HDMI 2, HDMI 3, HDMI 4 |
| 70H 01H 28H | MEMORY PANEL LOAD | 00H–01H | OFF, ON |
| 70H 01H 29H | EFFECTS TYPE CHANGE | 00H–01H | OFF, ON |
| 70H 01H 2AH | WIPE TYPE CHANGE | 00H–01H | OFF, ON |
| 70H 01H 2BH | MIX TYPE CHANGE | 00H–01H | OFF, ON |
| 70H 01H 2CH | AUTO OFF | 00H–01H | OFF, ON |
| 70H 01H 2DH | FRAME RATE | 00H–01H | 59.94, 50 |
| 70H 01H 2EH | AUTO SCAN TIME CH1 | 00H–78H | OFF, 1–120sec |
| 70H 01H 2FH | AUTO SCAN TIME CH2 | 00H–78H | OFF, 1–120sec |
| 70H 01H 30H | AUTO SCAN TIME CH3 | 00H–78H | OFF, 1–120sec |
| 70H 01H 31H | AUTO SCAN TIME CH4 | 00H–78H | OFF, 1–120sec |
| 70H 01H 32H | AUTO SCAN SEQUENCE | 00H–01H | NORMAL, RANDOM |
| 70H 01H 33H | AUDIO LEVEL METER | 00H–09H | OFF, LOWER L, LOWER, LOWER R, LEFT, CENTER, RIGHT, UPPER L, UPPER, UPPER R |
| 70H 01H 34H | OUTPUT FADE LEFT | 00H–02H | BLACK, AUDIO, BLK & AUD |
| 70H 01H 35H | OUTPUT FADE RIGHT | 00H–02H | WHITE, AUDIO, WHT & AUD |
| 70H 01H 36H | A BUS SW LOCK | 00H–01H | OFF, ON |
| 70H 01H 37H | B BUS SW LOCK | 00H–01H | OFF, ON |
| 70H 01H 38H | TRANSFORMER SW LOCK | 00H–01H | OFF, ON |
| 70H 01H 39H | BPM SYNC SW LOCK | 00H–01H | OFF, ON |
| 70H 01H 3AH | WIPE SW LOCK | 00H–01H | OFF, ON |
| 70H 01H 3BH | MIX SW LOCK | 00H–01H | OFF, ON |
| 70H 01H 3CH | CUT SW LOCK | 00H–01H | OFF, ON |
| 70H 01H 3DH | FREEZE SW LOCK | 00H–01H | OFF, ON |
| 70H 01H 3EH | MEMORY SW LOCK | 00H–01H | OFF, ON |
| 70H 01H 3FH | AUDIO SW LOCK | 00H–01H | OFF, ON |
| 70H 01H 40H | EFFECTS SW LOCK | 00H–01H | OFF, ON |
| 70H 01H 41H | EFFECTS VOL LOCK | 00H–01H | OFF, ON |
| 70H 01H 42H | OUTPUT FADE VOL LOCK | 00H–01H | OFF, ON |
| 70H 01H 43H | A/B FADER LOCK | 00H–01H | OFF, ON |

### D. 3-1-2 Video/Audio Parameter Area — ブロック先頭（行 940–944）

「These modify current operation.」

| Address | Parameter Name |
|---|---|
| 71H 00H 00H | Video |
| 71H 01H 00H | Audio Parameter-1 |
| 71H 02H 00H | Audio Parameter-2 |

### E. 3-1-2 Video/Audio Parameter Memory Area（行 948–967）

「現在選択中以外のメモリー番号に保存されたデータを読み書きする。現在選択中のメモリーのデータは変更されない。Video / Audio Parameter-1 / Audio Parameter-2 のパラメータ配置は上記（71H）と共通。」

| Address | Parameter Name | Address | Parameter Name |
|---|---|---|---|
| 72H 00H 00H | Video (Memory 1) | 72H 10H 00H | Video (Memory 5) |
| 72H 01H 00H | Audio Parameter-1 (Memory 1) | 72H 11H 00H | Audio Parameter-1 (Memory 5) |
| 72H 02H 00H | Audio Parameter-2 (Memory 1) | 72H 12H 00H | Audio Parameter-2 (Memory 5) |
| 72H 04H 00H | Video (Memory 2) | 72H 14H 00H | Video (Memory 6) |
| 72H 05H 00H | Audio Parameter-1 (Memory 2) | 72H 15H 00H | Audio Parameter-1 (Memory 6) |
| 72H 06H 00H | Audio Parameter-2 (Memory 2) | 72H 16H 00H | Audio Parameter-2 (Memory 6) |
| 72H 08H 00H | Video (Memory 3) | 72H 18H 00H | Video (Memory 7) |
| 72H 09H 00H | Audio Parameter-1 (Memory 3) | 72H 19H 00H | Audio Parameter-1 (Memory 7) |
| 72H 0AH 00H | Audio Parameter-2 (Memory 3) | 72H 1AH 00H | Audio Parameter-2 (Memory 7) |
| 72H 0CH 00H | Video (Memory 4) | 72H 1CH 00H | Video (Memory 8) |
| 72H 0DH 00H | Audio Parameter-1 (Memory 4) | 72H 1DH 00H | Audio Parameter-1 (Memory 8) |
| 72H 0EH 00H | Audio Parameter-2 (Memory 4) | 72H 1EH 00H | Audio Parameter-2 (Memory 8) |

（規則：Memory n の Video＝72H (4(n−1))H 00H、Audio-1＝+01H、Audio-2＝+02H、+03H は未使用）

### F. Video Parameter（71H 00H xx、行 973–1023）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| #71H 00H 00H / 01H | A/B fader | 00 00H–07 7FH | 0–1023 |
| #71H 00H 02H / 03H | effects A pod | 00 00H–01 7FH | 1–255 |
| #71H 00H 04H / 05H | effects B pod | 00 00H–01 7FH | 1–255 |
| #71H 00H 06H / 07H | outfader | 00 00H–01 7FH | 1–255 |
| 71H 00H 08H | video sel A | 00H–03H | HDMI 1–4 |
| 71H 00H 09H | video sel B | 00H–03H | HDMI 1–4 |
| 71H 00H 0AH | effect A | 00H–01H | OFF, ON |
| 71H 00H 0BH | effect B | 00H–01H | OFF, ON |
| 71H 00H 0CH | transition | 00H–02H | WIPE, MIX, CUT |
| 71H 00H 0DH | BPM SYNC | 00H–01H | OFF, ON |
| 71H 00H 0EH | EFFECTS A | 00H–12H | NEGATIVE, EMBOSS, COLORIZE, COLORPASS, POSTERIZE, SILHOUETTE, MONOCOLOR, FINDEDGE, FLIP, WHT-L.KEY, BLK-L.KEY, GRN-C.KEY, BLU-C.KEY, PinP 1/4, PinP 1/2, SPLIT-VS, SPLIT-VC, SPLIT-HS, SPLIT-HC |
| 71H 00H 0FH | EFFECTS B | 00H–12H | 同上（NEGATIVE … SPLIT-HC） |
| 71H 00H 10H | WIPE | 00H–1DH | H-DOWN, H-UP, V-RIGHT, V-LEFT, V-IN, V-OUT, H-IN, H-OUT, R-DOWN, L-DOWN, R-UP, L-UP, BLOCK, V-GRID, H-GRID, H-DOWN/s, H-UP/s, V-RIGHT/s, V-LEFT/s, H-IN/s, H-OUT/s, V-IN/s, V-OUT/s, R-DOWN/s, L-DOWN/s, R-UP/s, L-UP/s, BLOCK/s, V-GRID/s, H-GRID/s |
| 71H 00H 11H | MIX | 00H–03H | MIX, FAM, NAM, MOS-AIC |
| 71H 00H 12H | TRANSFORMER A | 00H–0AH | NONE, TRANSFORM, （空白）, （空白）, WHITE, BLACK, BPM SYNC, WIPE, MIX, CUT, EFFECTS（02H・03H は txt で名称が空白＝紙面はアイコン【不明】） |
| 71H 00H 13H | TRANSFORMER B | 00H–0AH | 同上 |
| 71H 00H 14H | TRANSFORM TIME | 00H–2CH | 0.0–4.0sec, BPM×1/4, BPM×1/2, BPM×1, BPM×2 |
| 71H 00H 15H | PinP A CROPPING H | 01H–64H | 1–100% |
| 71H 00H 16H | PinP A CROPPING V | 01H–64H | 1–100% |
| 71H 00H 17H | PinP A VIEW POSITION H | 00H–64H | -50–50% |
| 71H 00H 18H | PinP A VIEW POSITION V | 00H–64H | -50–50% |
| 71H 00H 19H | PinP B CROPPING H | 01H–64H | 1–100% |
| 71H 00H 1AH | PinP B CROPPING V | 01H–64H | 1–100% |
| 71H 00H 1BH | PinP B VIEW POSITION H | 00H–64H | -50–50% |
| 71H 00H 1CH | PinP B VIEW POSITION V | 00H–64H | -50–50% |

### G. Audio Parameter-1（71H 01H xx、行 1027–1079）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 71H 01H 00H | HDMI IN 1 LEVEL | 00H–7FH | 0–127 |
| 71H 01H 01H | HDMI IN 2 LEVEL | 00H–7FH | 0–127 |
| 71H 01H 02H | HDMI IN 3 LEVEL | 00H–7FH | 0–127 |
| 71H 01H 03H | HDMI IN 4 LEVEL | 00H–7FH | 0–127 |
| 71H 01H 04H | AUDIO IN LEVEL | 00H–7FH | 0–127 |
| 71H 01H 05H | MIC LEVEL | 00H–7FH | 0–127 |
| 71H 01H 06H | MASTER OUT LEVEL | 00H–7FH | 0–127 |
| 71H 01H 07H | AUDIO FOLLOW | 00H–01H | OFF, ON |
| 71H 01H 08H | HDMI IN 1 EQ Hi | 00H–1EH | -15–15dB |
| 71H 01H 09H | HDMI IN 1 EQ Hi FREQ | 00H–08H | 700Hz–11.0KHz |
| 71H 01H 0AH | HDMI IN 1 EQ Mid | 00H–1EH | -15–15dB |
| 71H 01H 0BH | HDMI IN 1 EQ Mid FREQ | 00H–1BH | 20.0Hz–10.0KHz |
| 71H 01H 0CH | HDMI IN 1 EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 01H 0DH | HDMI IN 1 EQ Lo | 00H–1EH | -15–15dB |
| 71H 01H 0EH | HDMI IN 1 EQ Lo FREQ | 00H–09H | 55Hz–800Hz |
| 71H 01H 0FH | Reserved | | |
| #71H 01H 10H / 11H | HDMI IN 1 DELAY | 00 00H–27 08H | 0.0–500.0msec |
| 71H 01H 12H | HDMI IN 2 EQ Hi | 00H–1EH | -15–15dB |
| 71H 01H 13H | HDMI IN 2 EQ Hi FREQ | 00H–08H | 700Hz–11.0KHz |
| 71H 01H 14H | HDMI IN 2 EQ Mid | 00H–1EH | -15–15dB |
| 71H 01H 15H | HDMI IN 2 EQ Mid FREQ | 00H–1BH | 20.0Hz–10.0KHz |
| 71H 01H 16H | HDMI IN 2 EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 01H 17H | HDMI IN 2 EQ Lo | 00H–1EH | -15–15dB |
| 71H 01H 18H | HDMI IN 2 EQ Lo FREQ | 00H–09H | 55Hz–800Hz |
| 71H 01H 19H | Reserved | | |
| #71H 01H 10H / 11H（原文ママ。並びから 1AH / 1BH の誤植【推測】） | HDMI IN 2 DELAY | 00 00H–27 08H | 0.0–500.0msec |
| 71H 01H 1CH | HDMI IN 3 EQ Hi | 00H–1EH | -15–15dB |
| 71H 01H 1DH | HDMI IN 3 EQ Hi FREQ | 00H–08H | 700Hz–11.0KHz |
| 71H 01H 1EH | HDMI IN 3 EQ Mid | 00H–1EH | -15–15dB |
| 71H 01H 1FH | HDMI IN 3 EQ Mid FREQ | 00H–1BH | 20.0Hz–10.0KHz |
| 71H 01H 20H | HDMI IN 3 EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 01H 21H | HDMI IN 3 EQ Lo | 00H–1EH | -15–15dB |
| 71H 01H 22H | HDMI IN 3 EQ Lo FREQ | 00H–09H | 55Hz–800Hz |
| 71H 01H 23H | Reserved | | |
| #71H 01H 24H / 25H | HDMI IN 3 DELAY | 00 00H–27 08H | 0.0–500.0msec |
| 71H 01H 26H | HDMI IN 4 EQ Hi | 00H–1EH | -15–15dB |
| 71H 01H 27H | HDMI IN 4 EQ Hi FREQ | 00H–08H | 700Hz–11.0KHz |
| 71H 01H 28H | HDMI IN 4 EQ Mid | 00H–1EH | -15–15dB |
| 71H 01H 29H | HDMI IN 4 EQ Mid FREQ | 00H–1BH | 20.0Hz–10.0KHz |
| 71H 01H 2AH | HDMI IN 4 EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 01H 2BH | HDMI IN 4 EQ Lo | 00H–1EH | -15–15dB |
| 71H 01H 2CH | HDMI IN 4 EQ Lo FREQ | 00H–09H | 55–800Hz |
| 71H 01H 2DH | Reserved | | |
| #71H 01H 2EH / 2FH | HDMI IN 4 DELAY | 00 00H–27 08H | 0.0–500.0msec |

### H. Audio Parameter-2（71H 02H xx、行 1085–1141）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 71H 02H 00H | AUDIO IN EQ Hi | 00H–1EH | -15–15dB |
| 71H 02H 01H | AUDIO IN EQ Hi FREQ | 00H–08H | 700Hz–11.0KHz |
| 71H 02H 02H | AUDIO IN EQ Mid | 00H–1EH | -15–15dB |
| 71H 02H 03H | AUDIO IN EQ Mid FREQ | 00H–1BH | 20.0Hz–10.0KHz |
| 71H 02H 04H | AUDIO IN EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 02H 05H | AUDIO IN EQ Lo | 00H–1EH | -15–15dB |
| 71H 02H 06H | AUDIO IN EQ Lo FREQ | 00H–09H | 55Hz–800Hz |
| 71H 02H 07H | Reserved | | |
| #71H 02H 08H / 09H | AUDIO IN DELAY | 00 00H–27 08H | 0.0–500.0msec |
| 71H 02H 0AH | MIC EQ Hi | 00H–1EH | -15–15dB |
| 71H 02H 0BH | MIC EQ Hi FREQ | 00H–08H | 700Hz–11.0KHz |
| 71H 02H 0CH | MIC EQ Mid | 00H–1EH | -15–15dB |
| 71H 02H 0DH | MIC EQ Mid FREQ | 00H–1BH | 20.0Hz–10.0KHz |
| 71H 02H 0EH | MIC EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 02H 0FH | MIC EQ Lo | 00H–1EH | -15–15dB |
| 71H 02H 10H | MIC EQ Lo FREQ | 00H–09H | 55Hz–800Hz |
| 71H 02H 11H | Reserved | | |
| #71H 02H 12H / 13H | MIC DELAY | 00 00H–27 08H | 0.0–500.0msec |
| 71H 02H 14H | MIC COMP | 00H–01H | OFF, ON |
| 71H 02H 15H | MIC COMP-THRESHOLD | 00H–32H | -50–0dB |
| 71H 02H 16H | MIC COMP-RATIO | 00H–08H | 1.0:1–INF:1 |
| 71H 02H 17H | MIC COMP-ATTACK | 00H–19H | 0.2–100ms |
| 71H 02H 18H | MIC COMP-RELEASE | 00H–7FH | 30–5000ms |
| 71H 02H 19H | MIC GATE | 00H–01H | OFF, ON |
| 71H 02H 1AH | MIC GATE-THRESHOLD | 00H–32H | -50–0dB |
| 71H 02H 1BH | MIC GATE-RELEASE | 00H–7FH | 30–5000ms |
| 71H 02H 1CH | MIC HPF | 00H–01H | OFF, ON |
| 71H 02H 1DH | MAIN EQ Hi | 00H–1EH | -15–15dB |
| 71H 02H 1EH | MAIN EQ Hi FREQ | 00H–08H | 700Hz–11.0KHz |
| 71H 02H 1FH | MAIN EQ Mid | 00H–1EH | -15–15dB |
| 71H 02H 20H | MAIN EQ Mid FREQ | 00H–1BH | 20.0Hz–10.0KHz |
| 71H 02H 21H | MAIN EQ Mid Q | 00H–05H | 0.5–16.0 |
| 71H 02H 22H | MAIN EQ Lo | 00H–1EH | -15–15dB |
| 71H 02H 23H | MAIN EQ Lo FREQ | 00H–09H | 55Hz–800Hz |
| 71H 02H 24H | HDMI IN 1 REV SEND | 00H–7FH | 0–127 |
| 71H 02H 25H | HDMI IN 2 REV SEND | 00H–7FH | 0–127 |
| 71H 02H 26H | HDMI IN 3 REV SEND | 00H–7FH | 0–127 |
| 71H 02H 27H | HDMI IN 4 REV SEND | 00H–7FH | 0–127 |
| 71H 02H 28H | AUDIO IN REV SEND | 00H–7FH | 0–127 |
| 71H 02H 29H | MIC REV SEND | 00H–7FH | 0–127 |
| 71H 02H 2AH | REVERB LEVEL | 00H–7FH | 0–127 |
| 71H 02H 2BH | REVERB TIME | 00H–32H | 0.0–5.0sec |
| 71H 02H 2CH | REVERB TYPE | 00H–01H | ROOM, HALL |
| 71H 02H 2DH | MASTERING | 00H–01H | OFF, ON |
| 71H 02H 2EH | MASTERING NS | 00H–7FH | 0–127 |
| 71H 02H 2FH | MASTERING ENHANCER | 00H–7FH | 0–127 |
| 71H 02H 30H | MASTERING Hi | 00H–7FH | 0–127 |
| 71H 02H 31H | MASTERING Mid | 00H–7FH | 0–127 |
| 71H 02H 32H | MASTERING Lo | 00H–7FH | 0–127 |
| 71H 02H 33H | A.FOLLOW AUDIO IN | 00H–04H | HDMI 1–4, OFF |
| 71H 02H 34H | A.FOLLOW MIC | 00H–04H | HDMI 1–4, OFF |

### I. 3-1-3 Panel Parameter Area（73H xx xx、行 1151–1222）

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 73H 01H 00H | Memory Select | 00H–07H | Memory 1–8 |
| 73H 01H 00H | Memory PANEL Save | 10H–17H | Memory 1–8 |
| 73H 02H 00H | LED OUTFADER BLACK | 00H–01H | OFF, Green (Read Only) |
| 73H 02H 01H | LED OUTFADER WHITE | 00H–01H | OFF, Green (Read Only) |
| 73H 02H 02H | LED FREEZE | 00H–01H | OFF, Red (Read Only) |
| 73H 02H 03H | LED MEMORY | 00H–01H | OFF, Blue (Read Only) |
| 73H 02H 04H | LED AUDIO | 00H–03H | OFF, Red, Green, Orange (Read Only) |
| 73H 02H 05H | LED PEKSIG | 00H–03H | OFF, Red, Green, Orange (Read Only) |
| 73H 02H 06H | LED TAP | 00H–01H | OFF, Green (Read Only) |
| 73H 02H 07H | Reserved | | |
| 73H 02H 08H | LED EFFECTS A | 00H–01H | OFF, Green (Read Only) |
| 73H 02H 09H | LED EFFECTS B | 00H–01H | OFF, Green (Read Only) |
| 73H 02H 0AH | LED HDCP | 00H–01H | OFF, Red (Read Only) |
| 73H 02H 0BH | LED BPM SYNC | 00H–01H | OFF, Red (Read Only) |
| 73H 02H 0CH | LED WIPE | 00H–01H | OFF, Green (Read Only) |
| 73H 02H 0DH | LED MIX | 00H–01H | OFF, Green (Read Only) |
| 73H 02H 0EH | LED CUT | 00H–01H | OFF, Green (Read Only) |
| 73H 02H 0FH | LED TRANSFRMER A | 00H–07H | OFF, Red, Green, Yellow, Blue, Mazenta, Cyan, White (Read Only) |
| 73H 02H 10H | LED TRANSFRMER B | 00H–07H | OFF, Red, Green, Yellow, Blue, Mazenta, Cyan, White (Read Only) |
| 73H 02H 11H | LED VDOSELA-1 | 00H–07H | OFF, Red, Green, Yellow, Blue, Mazenta, Cyan, White (Read Only) |
| 73H 02H 12H | LED VDOSELA-2 | 00H–07H | OFF, Red, Green, Yellow, Blue, Mazenta, Cyan, White (Read Only) |
| 73H 02H 13H | LED VDOSELA-3 | 00H–07H | OFF, Red, Green, Yellow, Blue, Mazenta, Cyan, White (Read Only) |
| 73H 02H 14H | LED VDOSELA-4 | 00H–07H | OFF, Red, Green, Yellow, Blue, Mazenta, Cyan, White (Read Only) |
| 73H 02H 15H | LED VDOSELB-1 | 00H–07H | OFF, Red, Green, Yellow, Blue, Mazenta, Cyan, White (Read Only) |
| 73H 02H 16H | LED VDOSELB-2 | 00H–07H | OFF, Red, Green, Yellow, Blue, Mazenta, Cyan, White (Read Only) |
| 73H 02H 17H | LED VDOSELB-3 | 00H–07H | OFF, Red, Green, Yellow, Blue, Mazenta, Cyan, White (Read Only) |
| 73H 02H 18H | LED VDOSELB-4 | 00H–07H | OFF, Red, Green, Yellow, Blue, Mazenta, Cyan, White (Read Only) |
| 73H 03H 00H | Audio Level Master L | 00H–7FH | output level (Read Only) |
| 73H 03H 01H | Audio Level Master R | 00H–7FH | output level (Read Only) |
| 73H 03H 02H | Audio Level HDMI 1 | 00H–7FH | input level (Read Only) |
| 73H 03H 04H | Audio Level HDMI 2 | 00H–7FH | input level (Read Only) |
| 73H 03H 06H | Audio Level HDMI 3 | 00H–7FH | input level (Read Only) |
| 73H 03H 08H | Audio Level HDMI 4 | 00H–7FH | input level (Read Only) |
| 73H 03H 0AH | Audio Level Line | 00H–7FH | input level (Read Only) |
| 73H 03H 0CH | Audio Level MIC | 00H–7FH | input level (Read Only) |
| 73H 04H 00H | Ctrl Button | ON, OFF | 値に応じて各ボタンの on/off 状態が変わる。「on」を実行した後は必ず「off」を入れること |
| 73H 04H 00H | [FREEZE] | 00H, 40H | [FREEZE] button on/off |
| 73H 04H 00H | [MEMORY] | 01H, 41H | [MEMORY] button on/off |
| 73H 04H 00H | [AUDIO] | 02H, 42H | [AUDIO] button on/off |
| 73H 04H 00H | [TAP (BPM)] | 03H, 43H | [(TAP) BPM] button on/off |
| 73H 04H 00H | [EFFECTS A] | 04H, 44H | EFFECTS A [ON] button on/off |
| 73H 04H 00H | [EFFECTS B] | 05H, 45H | EFFECTS B [ON] button on/off |
| 73H 04H 00H | [VIDEO SELECT 1A] | 06H, 46H | [A-1] button on/off |
| 73H 04H 00H | [VIDEO SELECT 2A] | 07H, 47H | [A-2] button on/off |
| 73H 04H 00H | [VIDEO SELECT 3A] | 08H, 48H | [A-3] button on/off |
| 73H 04H 00H | [VIDEO SELECT 4A] | 09H, 49H | [A-4] button on/off |
| 73H 04H 00H | [VIDEO SELECT 1B] | 0AH, 4AH | [B-1] button on/off |
| 73H 04H 00H | [VIDEO SELECT 2B] | 0BH, 4BH | [B-2] button on/off |
| 73H 04H 00H | [VIDEO SELECT 3B] | 0CH, 4CH | [B-3] button on/off |
| 73H 04H 00H | [VIDEO SELECT 4B] | 0DH, 4DH | [B-4] button on/off |
| 73H 04H 00H | [BPM SYNC] | 0EH, 4EH | [BPM SYNC] button on/off |
| 73H 04H 00H | [WIPE] | 0FH, 4FH | [WIPE] button on/off |
| 73H 04H 00H | [MIX] | 10H, 50H | [MIX] button on/off |
| 73H 04H 00H | [CUT] | 11H, 51H | [CUT] button on/off |
| 73H 04H 00H | [TRANSFORMER A] | 12H, 52H | TRANSFORMER [A] button on/off |
| 73H 04H 00H | [TRANSFORMER B] | 13H, 53H | TRANSFORMER [B] button on/off |

### J. 3-2 MIDI Visual Control（Universal SysEx 7EH 側、行 1230–1278。本アプリでは未使用、参考）

| Start Address | Description |
|---|---|
| 10H 00H 00H | System Preference Area (See 3-2-1) |
| 10H 10H 00H | Clip Control Assignment Area (See 3-2-2) |
| 10H 30H 00H | Clip Control Preference Area (See 3-2-3) |

注記（行 1236–1254）：MVC OFF 中の MVC メッセージは無視（MVC ON 以外）。MVC OFF 受信で Standard モードへ。V-LINK ON の後に MVC ON を受けると MVC モードへ。MVC で設定した内容は内部メモリーに保存されない。既定：Clip Control Ch.=1、Color Control Ch.=1、Note Control=OFF、Transition Time=CC#05 (0)、Keyboard Range Lower=36、Upper=84。「#」付きはニブル分割（BCH → 0BH, 0CH）。

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 10H 00H 00H | MIDI Visual Control ON/OFF | 00H–01H | OFF, ON |
| 10H 00H 01H | Clip Control Rx MIDI Ch. | 00H–10H | 1–16 Ch., OFF |
| 10H 00H 02H | Effect Control Rx MIDI Ch. | 00H–10H | 1–16 Ch., OFF |
| 10H 00H 03H | Note Mode Enabled | 00H–01H | OFF, ON |
| #10H 10H 02H | Dissolve Time Ctrl Assign | 01H-1FH, 40H-5FH, D0H, E0H, FFH | Transition Time: Control Change, After touch, Pitch Bend, OFF |
| 10H 30H 02H | Keyboard Range Lower | 00H–7FH | Note Number |
| 10H 30H 03H | Keyboard Range Upper | 00H–7FH | Note Number |

### K. 3-3 V-LINK（Model ID 00H 51H 側、行 1286–1357。本アプリでは未使用、参考）

| Start | Description |
|---|---|
| 10H 00H 00H | System Preference Area (See 3-3-1) |
| 10H 10H 00H | Clip Control Assignment Area (See 3-3-2) |
| 10H 20H 00H | Color Control Assignment Area (See 3-3-3) |
| 10H 30H 00H | Clip Control Preference Area (See 3-3-4) |

注記（行 1293–1312）：V-LINK OFF 中の V-LINK メッセージは無視。MVC ON の後に V-LINK ON を受けると V-LINK モードへ。V-LINK で設定した内容は内部メモリーに保存されない。既定：Clip Control Ch.=1、Color Control Ch.=1、Note Control=OFF、Transition Time=CC#05 (0)、Transition Type Sel.=OFF、Audio Level=OFF、Output Fade=OFF、Keyboard Range Lower=36、Upper=84。「#」付きはニブル分割。

| Address | Parameter Name | Sys.Ex.Value | Meaning of Value |
|---|---|---|---|
| 10H 00H 00H | V-LINK Enabled | 00H–01H | OFF, ON |
| 10H 00H 01H | V-LINK Rx MIDI Channel (Clip) | 00H–10H | 1–16 Ch., OFF |
| 10H 00H 02H | V-LINK Rx MIDI Channel (Color) | 00H–10H | 1–16 Ch., OFF |
| 10H 00H 03H | V-LINK Note Mode | 00H, 02H | OFF, Assignable |
| #10H 10H 02H | V-LINK Rx Setting (Dissolve Time) | 01H-05H, 07H-1FH, 40H-5FH, D0H, E0H, FFH | Transition Time: Control Change, Channel Press, Pitch Bend, OFF |
| #10H 10H 04H | V-LINK Rx Setting (Audio Level) | 01H-05H, 07H-1FH, 40H-5FH, D0H, E0H, FFH | Audio Level: Control Change, Channel Press, Pitch Bend, OFF |
| #10H 10H 10H | V-LINK Rx Setting (Transition Type) | 01H-05H, 07H-1FH, 40H-5FH, D0H, E0H, FFH | Transition Type: Control Change, Channel Press, Pitch Bend, OFF |
| #10H 20H 20H | V-LINK Rx Setting (Output Fader) | 01H-05H, 07H-1FH, 40H-5FH, D0H, E0H, FFH | Output Fader: Control Change, Channel Press, Pitch Bend, OFF |
| 10H 30H 02H | V-LINK Rx Setting (Assignable Note Mode: Lower Key) | 00H–7FH | Note Number |
| 10H 30H 03H | V-LINK Rx Setting (Assignable Note Mode: Upper Key) | 00H–7FH | Note Number |

V-LINK 49 Keys モードのノート→入力対応（行 392–402）：24H=A Ch.1、26H=A Ch.2、28H=A Ch.3、29H=A Ch.4、2BH=B Ch.1、2DH=B Ch.2、2FH=B Ch.3、30H=B Ch.4。

### L. MIDI Implementation Chart（p.22 行 1467–1531）要点

- Basic Channel：Transmitted/Recognized とも 1–16（電源 OFF 時に保存）
- Note On/Off：X / X（MVC/V-LINK の Note On は本文で受信規定あり）
- After Touch Channel's：X / O *1、Pitch Bend：O / O *1
- Control Change：0,32 O/O；1–9 X/O *1；10–26 O/O；28–31 X/O *1；33–63 X/X；64–95 X/O *1；96–119 X/X
- Program Change：O / O（Channel select）、True Number 0–127
- System Exclusive：O / O
- Active Sensing：O / O。Clock・Commands は X / X（本文では Rx TEMPO CLOCK ON で F8/FA/FB を受ける旨あり、行 471–488）
- *1 Only while the MVC Mode or V-LINK Mode is activated
