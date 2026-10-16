# V-60HD 抽出メモ（SW CROSSPOINT 機種追加用）

資料：
- R = `pdf/v-60hd/V-60HD_reference_v31_eng04_W.txt`（Reference Manual「Version 3.1 and later」© 2020、pdftotext -layout、全 1564 行・23 ページ。LAN/RS-232 Command Reference は p.20–23 ＝ txt 行 1291–1560。p.20 は 2 段組で LAN 側（左）と RS-232 側（右）の行が混在、p.21–23 の List of Commands は 1 段組の表）
- 行番号は txt の行、p. は PDF のページ番号（紙面のノンブル）。
- docs.json 上の V-60HD の公開資料はこの Reference Manual **1 本のみ**。Remote Connection ガイド／Smart Tally ガイド／MIDI Implementation の類は**無い**（`pdf/v-60hd/` にも無し）。
- V-60HD は **MIDI SysEx を持たない**（資料に MIDI・SysEx・DT1/RQ1・Model ID の記載が一切無い。grep「MIDI」ヒット 0）。制御は **LAN（TCP/Telnet）と RS-232 の ASCII テキストコマンド**（`stx` + `XXX:a,b;`）のみ。したがって BRIEF の 2 節（SysEx）は「無し」、4 節（アドレスマップ）は「コマンド一覧」の全転記に置き換える。

## 1. 接続手段

| 手段 | 有無 | 根拠 |
|---|---|---|
| LAN | **有り**。背面 **CONTROL ポート**（RJ45）。「You use Telnet to operate the V-60HD remotely over a LAN (TCP/IP protocol)」。Protocol **TCP**、Port number **8023** | R 行 1297–1307（p.20） |
| LAN の IP 設定 | メニュー「14: LAN CONTROL」：CONFIGURE＝**MANUALLY**（既定）/ USING DHCP、IP ADDRESS 既定 **192.168.2.254**、SUBNET MASK 既定 **255.255.255.0**、INFORMATION（STATUS / IP ADDRESS / SUBNET MASK / MAC ADDRESS / IP アドレスの URL を示す QR コード） | R 行 838–855（p.13）、行 1311–1343・1346–1365（p.20） |
| LAN 側の同じポートでカメラ制御 | 同じ LAN ポートから最大 6 台のカメラ（JVC / Panasonic / Canon / PTZOptics / Avonic / VISCA over IP）を **V-60HD が**制御する（V-60HD がクライアント側）。既定カメラ IP 192.168.2.101–106 | R 行 1071–1073（p.17）、行 745–757（p.12） |
| USB | **USB MEMORY 端子のみ**（USB フラッシュメモリの設定ファイル .V06 保存/読込・静止画 .bmp/.png 読込・静止画書出し・フォーマット）。**USB MIDI／USB でのリモート制御の記載は無し**。iPhone からは使えない | R 行 863–898（p.14） |
| Bluetooth | **無し**（BLE MIDI も音声も記載無し。grep「Bluetooth」ヒット 0） | R 全文 |
| RS-232 | **有り**。DB-9（オス）、クロスケーブル、9,600 / 38,400 bps、パリティ無し、8 bit、ストップ 1 bit、ASCII、フロー制御 XON/XOFF。メニュー「12: RS-232/GPI」で RS-232＝OFF（既定）/ ON、BAUDRATE 9600（既定）/ 38400、PANEL INFORMATION OFF（既定）/ ON。iPhone からは使えない | R 行 712–718（p.11）、行 1297–1342（p.20） |
| MIDI DIN | 無し（記載無し） | R 全文 |
| TALLY/GPI | DB-25（メス）。タリー出力 6ch×（PGM/PST）＝オープンコレクタ 12 V/200 mA、GPI 入力 8ch＝無電圧接点（フォトカプラ）。GPI 1–8 TYPE で PGM/PST CH SEL 1–8、MEMORY LOAD 1–8、DSK SRC SEL 1–8、MUTE/SOLO 各入力、DSK SW、AUTO SW、CUT SW、OUTPUT FADE SW、AUTO MIXING SW を割当。iPhone からは使えない | R 行 1212–1285（p.19）、行 719–737（p.11） |
| iPad/iPhone 接続ガイド | **無し**（公式の Remote Connection ガイドは存在しない。Reference Manual にも iPad/iPhone/スマートフォンの語は無い） | docs.json、R 全文 |
| Smart Tally | **記載無し**【不明】。LAN CONTROL > INFORMATION に「IP アドレスの URL を QR コードで表示」とあるので、本体が何らかの HTTP ページを持つ可能性はある【推測】が、その内容・ポート・用途（Smart Tally か否か）は資料に無い。実機でブラウザから `http://<IP>/` を開いて確認 | R 行 852（p.13） |

→ iPhone から使えるのは **LAN（TCP 8023、テキストコマンド）だけ**。USB MIDI・BLE MIDI は capabilities で無効。MIDI トランスポート（`modules/crosspoint-midi`）は V-60HD では不要。

## 2. SysEx

**無し**。Manufacturer ID / Device ID / Model ID / DT1 / RQ1 / チェックサムに相当する記載は資料のどこにも無い。V-160HD 系の SysEx アドレス経路は V-60HD では使えない。

## 3. LAN プロトコル（R p.20 行 1297–1368、p.21 行 1372–1374）

| 項目 | 値 | 根拠 |
|---|---|---|
| トランスポート | TCP（「Telnet」と表記）。CONTROL ポート（LAN） | 行 1299–1305 |
| ポート | **8023** | 行 1307 |
| 認証 | **記載無し**。V-160HD 系の「パスワード 4 桁」「ハンドシェイク文字列」に相当する手順は資料に無い【不明：接続直後に何か文字列が来るか、無認証でそのままコマンドを受けるかは実機で確認】 | 行 1297–1368 に該当記載無し |
| 接続手順（資料に書かれている範囲） | ①メニュー LAN CONTROL で IP を設定（CONFIGURE/IP ADDRESS/SUBNET MASK）→ ②LAN CONTROL > INFORMATION で STATUS/IP/MAC を確認 → ③コントローラから TCP 8023 に接続し、`stx`付きコマンドを送る → ④コマンドごとに **ACK（06H）を待ってから次を送る** | 行 1311–1343、1346–1365、1373–1374 |
| コマンド書式 | `stx` + コマンドコード（英字 3 文字）+ `:` + パラメータ（複数は `,` 区切り）+ `;`。すべて ASCII。`stx`＝**02H**（コマンド開始の制御コード）。パラメータ無しのコマンドは `stxCUT;` のように `:` を付けない | 行 1347–1366 |
| 制御コード | stx（02H）、ACK（06H）、XON（11H）/ XOFF（13H） | 行 1367–1368 |
| ACK | **1 バイト 06H**（表では「ACK」と表記。`ACK;` のような文字列ではない）。V-160HD 系（ACK＝バイト 06）と**同じ** | 行 1367、1373、表の Response 列 |
| エラー形式 | 本体が自発送信：`stxERR:a;`　a: 0（syntax error：受信コマンドに誤り）、4（invalid：他の設定で制御されているため無効）、5（out of range error：引数が範囲外） | 行 1545–1551（p.23） |
| 問い合わせ応答 | 問い合わせ系（QAL / QPL / TLY / VER）は `stxXXX:…;` の応答 **＋ ACK** が返る（表の Response 列に両方並記）。順序（応答→ACK か ACK→応答か）は表から読めない【不明】 | 行 1464–1465、1511–1512、1529–1530、1535 |
| フロー制御 | XON（11H）/ XOFF（13H）を双方向で使う（表の最後に「Flow control XON / XOFF」が送信側・受信側ともに記載）。LAN で実際に XON/XOFF が来るかは【不明】（RS-232 の仕様欄に「Flow control XON/XOFF」とあるが、LAN 側の通信規格欄には記載無し） | 行 1320、1538–1540、1553–1555 |
| キープアライブ／タイムアウト | **記載無し**【不明】 | — |
| 自発送信 | `stxERR:a;`、XON、XOFF。加えて RS-232 では「PANEL INFORMATION＝ON のとき、チャンネル切替や PGM/A・PST/B の切替時などに **QPL（7: ALL）が常に送信される**」（p.23 参照とある）。LAN でも同様に流れるかは【不明】 | 行 716–718（p.11）、行 1545–1555 |
| V-160HD 系（DTH/RQH）との違い | **まったく別の体系**。DTH:/RQH:/VER; の 6 桁 16 進アドレス方式ではなく、3 文字コマンド＋10 進引数。`VER;` は V-60HD にも `stxVER;` として存在し、応答は `stxVER:V-60HD,a;`（a＝バージョン文字列） | 行 1535–1536 |
| 制御コードの実機注意 | `stx`（02H）を付けずに送った場合の挙動は記載無し【不明】。例に「TLY:1, 2, 0, 0, 0, 0, 0, 0;」とスペース入りの表記があるが、応答にスペースが入るのか紙面の都合かは【不明】 | 行 1531 |

## 4. コマンド一覧（R p.21–23 行 1372–1555、全転記）

凡例：`stx`＝02H。「ACK」＝06H 1 バイト。a, b… は 10 進整数（負値は `-` 付き）。表記は資料のまま（誤字 "vidoe" も含め意味だけ日本語化）。

### 4-1. Video-related operations（p.21 行 1376–1444）

| コマンド | 引数 | 意味 | 応答 | 根拠 |
|---|---|---|---|---|
| `stxPGM:a;` | a: 0 (SDI IN 1), 1 (SDI IN 2), 2 (SDI IN 3), 3 (SDI IN 4), 4 (HDMI IN 5), 5 (HDMI/RGB IN 6), 6 (STILL/BKG IN 7), 7 (STILL/BKG IN 8) | 最終出力（PGM）のチャンネル選択 | ACK | 行 1380–1381 |
| `stxPST:a;` | a: 同上 0–7 | プリセット（PST/PVW）のチャンネル選択 | ACK | 行 1383–1384 |
| `stxAUX:a;` | a: 同上 0–7 | AUX バスへ送るチャンネル選択 | ACK | 行 1386–1387 |
| `stxTRS:a;` | a: 0 (MIX), 1 (WIPE 1), 2 (WIPE 2) | トランジション効果の選択（MIX/WIPE1/WIPE2 ボタン相当。MIX の内容 MIX/FAM/NAM、WIPE のパターンはメニュー側で決まる） | ACK | 行 1389 |
| `stxTIM:a;` | a: 0 (0.0 sec)–40 (4.0 sec)（0.1 秒刻み） | ビデオトランジション時間 | ACK | 行 1391 |
| `stxCUT;` | 無し | [CUT] ボタンを押す | ACK | 行 1393 |
| `stxATO;` | 無し | [AUTO] ボタンを押す | ACK | 行 1395 |
| `stxP1S;` | 無し | [PinP 1] ボタンを押す（トグル） | ACK | 行 1397 |
| `stxP2S;` | 無し | [PinP 2] ボタンを押す（トグル） | ACK | 行 1399 |
| `stxSPS;` | 無し | [SPLIT] ボタンを押す（トグル） | ACK | 行 1401 |
| `stxDSK;` | 無し | [DSK] ボタンを押す（トグル） | ACK | 行 1403 |
| `stxDVW;` | 無し | DSK [PVW] ボタンを押す（DSK の PVW OUT トグル） | ACK | 行 1405 |
| `stxATM;` | 無し | DSK [AUTO MIXING] ボタンを押す（オーディオ Auto Mixing トグル） | ACK | 行 1407 |
| `stxFDE;` | 無し | DSK [OUTPUT FADE] ボタンを押す（出力フェード トグル） | ACK | 行 1409 |
| `stxPP1:a,b;` | a: -450–450 水平位置、b: -400–400 垂直位置 | [PinP 1] に割り当てたインセット画面の表示位置 | ACK | 行 1411–1412 |
| `stxPP2:a,b;` | a: -450–450 水平位置、b: -400–400 垂直位置 | [PinP 2] に割り当てたインセット画面の表示位置 | ACK | 行 1414–1415 |
| `stxSPT:a,b;` | PATTERN＝V-CENTER のとき水平方向：a: -250–250 最終出力映像（左側）、b: -250–250 プリセット映像（右側）。PATTERN＝H-CENTER のとき垂直方向：a: -250–250 最終出力映像（上側）、b: -250–250 プリセット映像（下側） | スプリット合成中の映像表示位置 | ACK | 行 1417–1425 |
| `stxDSS:a;` | a: 0 (SDI IN 1), 1 (SDI IN 2), 2 (SDI IN 3), 3 (SDI IN 4), 4 (HDMI IN 5), 5 (HDMI/RGB IN 6), 6 (STILL/BKG IN 7), 7 (STILL/BKG IN 8) | DSK 合成で重ねるロゴ/画像のチャンネル（DSK SOURCE CH） | ACK | 行 1427–1428 |
| `stxKYL:a;` | a: 0–255 | DSK のキーレベル（抜け量） | ACK | 行 1430–1431 |
| `stxKYG:a;` | a: 0–255 | DSK のキーゲイン（半透明領域） | ACK | 行 1433–1434 |
| `stxIPS:a;` | a: 0 (HDMI), 1 (RGB/COMPONENT) | チャンネル 6 の入力コネクタ選択（INPUT 6 ASSIGN） | ACK | 行 1436 |
| `stxOS1:a;` | a: 0 (PGM), 1 (PVW), 2 (AUX) | SDI OUT 1 に割り当てるビデオバス | ACK | 行 1438 |
| `stxOS2:a;` | a: 0 (PGM), 1 (PVW), 2 (AUX) | SDI OUT 2 に割り当てるビデオバス | ACK | 行 1440 |
| `stxOH1:a;` | a: 0 (PGM), 1 (PVW), 2 (AUX) | HDMI OUT 1 に割り当てるビデオバス | ACK | 行 1442 |
| `stxOH2:a;` | a: 0 (PGM), 1 (PVW), 2 (AUX) | HDMI OUT 2 に割り当てるビデオバス | ACK | 行 1444 |

### 4-2. Audio-related operations（p.22 行 1449–1490）

| コマンド | 引数 | 意味 | 応答 | 根拠 |
|---|---|---|---|---|
| `stxIAL:a,b;` | a: 0 (AUDIO IN 1), 1 (AUDIO IN 2), 2 (AUDIO IN 3), 3 (AUDIO IN 4), 4 (AUDIO IN 5/6), 5 (SDI IN 1), 6 (SDI IN 2), 7 (SDI IN 3), 8 (SDI IN 4), 9 (HDMI IN 5), 10 (HDMI IN 6)。b: -801 (-INF), -800 (-80.0 dB)–0 (0.0 dB)–100 (10.0 dB)（0.1 dB 単位の 10 倍整数） | 入力オーディオの音量レベル | ACK | 行 1453–1455 |
| `stxOAL:a;` | a: -801 (-INF), -800 (-80.0 dB)–0 (0.0 dB)–100 (10.0 dB) | マスターアウトの音量レベル | ACK | 行 1457 |
| `stxOAX:a;` | a: -801 (-INF), -800 (-80.0 dB)–0 (0.0 dB)–100 (10.0 dB) | AUX バスオーディオの音量レベル | ACK | 行 1459 |
| `stxADT:a,b;` | a: 0 (AUDIO IN 1), 1 (AUDIO IN 2), 2 (AUDIO IN 3), 3 (AUDIO IN 4), 4 (AUDIO IN 5/6)。b: 0 (0.0 fps)–120 (12.0 fps)（原文表記のまま。メニューの DELAY は 0.0–500 ms ＝ 0.0–29.9/25.0 frame なので単位の対応は【不明】） | 入力オーディオのディレイ時間 | ACK | 行 1461–1462 |
| `stxQAL:a;` | 送信：a: 0 (AUDIO IN 1), 1 (AUDIO IN 2), 2 (AUDIO IN 3), 3 (AUDIO IN 4), 4 (AUDIO IN 5/6), 5 (SDI IN 1), 6 (SDI IN 2), 7 (SDI IN 3), 8 (SDI IN 4), 9 (HDMI IN 5), 10 (HDMI IN 6), 11 (MASTER OUT), 12 (AUX), 12 (ALL)（原文のまま。送信側の表は 12 が重複） | 音量レベルの取得 | `stxQAL:b;` ＋ ACK。応答：a=0→b: -801–100 AUDIO IN 1 / a=1→AUDIO IN 2 / a=2→AUDIO IN 3 / a=3→AUDIO IN 4 / a=4→AUDIO IN 5/6 / a=5→SDI IN 1 / a=6→SDI IN 2 / a=7→SDI IN 3 / a=8→SDI IN 4 / a=9→HDMI IN 1 / a=10→HDMI IN 2（原文表記。送信側では HDMI IN 5/6）/ a=11→AUX バス音量 / a=12→MASTER OUT 音量 / a=13→全レベルを送る。例：`stxQAL:100,80,70,60,50,40,30,20,100,80,70,60,50;`（13 値） | 行 1464–1484 |
| `stxIAM:a;` | a: 0 (AUDIO IN 1), 1 (AUDIO IN 2), 2 (AUDIO IN 3), 3 (AUDIO IN 4), 4 (AUDIO IN 5/6), 5 (SDI 1), 6 (SDI 2), 7 (SDI 3), 8 (SDI 4), 9 (HDMI 5), 10 (HDMI 6) | 入力オーディオのミュート指定（ON/OFF の引数は無い＝トグル【推測】。原文は "Specify the mute function"） | ACK | 行 1486–1487 |
| `stxIAS:a;` | a: 同上 0–10 | 入力オーディオのソロ指定（同上、トグル【推測】） | ACK | 行 1489–1490 |

QAL の引数の矛盾（原文のまま記録）：送信側は「11 (MASTER OUT), 12 (AUX), 12 (ALL)」、応答側は「a=11 → AUX、a=12 → MASTER OUT、a=13 → ALL」。例の応答は 13 値。実機で a=11/12/13 の意味を確認。

### 4-3. System-related operations（p.23 行 1498–1540）

| コマンド | 引数 | 意味 | 応答 | 根拠 |
|---|---|---|---|---|
| `stxHCP:a;` | a: 0 (OFF), 1 (ON) | HDCP ON/OFF | ACK | 行 1502 |
| `stxTPT:a;` | a: 0 (OFF), 1 (75% COLOR BAR), 2 (100% COLOR BAR), 3 (RAMP), 4 (STEP), 5 (HATCH) | テストパターン | ACK | 行 1504 |
| `stxTTN:a;` | a: 0 (OFF), 1 (-20dB@1kHz : 1kHz), 2 (-10dB@1kHz : 1kHz), 3 (0dB@1kHz : 1kHz), 4 (-20dB@1kHz : 400Hz), 5 (-10dB@1kHz : 400Hz), 6 (0dB@1kHz : 400Hz) | テストトーン | ACK | 行 1506–1507 |
| `stxMEM:a;` | a: 0 (1), 1 (2), 2 (3), 3 (4), 4 (5), 5 (6), 6 (7), 7 (8) | プリセットメモリーの呼び出し（0 始まり） | ACK | 行 1509 |
| `stxQPL:a;` | 送信：a: 0 (PGM), 1 (PST), 2 (AUX), 3 (PinP/SPLIT), 4 (DSK), 5 (OUTPUT FADE), 6 (Video fade level), 7 (ALL) | 操作パネルのボタン状態取得 | `stxQPL:b;` ＋ ACK。応答：a=0→b: 0 (CH 1)–7 (CH 8) PGM/A バスのクロスポイントボタン状態 / a=1→b: 0–7 PST/B バス / a=2→b: 0–7 AUX/MEMORY ボタン（AUX バス選択）/ a=3→b: 0 (Off) PinP1・PinP2・SPLIT すべて off、1 (On) [PinP 1] on、2 (On) [PinP 2] on、3 (On) [SPLIT] on / a=4→b: 0 (Off), 1 (On) [DSK] / a=5→b: 0 (Off), 1 (On) [OUTPUT FADE]（消灯/点灯）/ a=6→b: 0–2047（ビデオフェーダー位置）/ a=7→上記すべてを送る。例（原文のまま）：`stxQAL:stxQPL:0,1,0,1,1,0;`（先頭の "stxQAL:" は誤植【推測】。ALL 応答は 6 値 ＝ PGM,PST,AUX,PinP/SPLIT,DSK,OUTPUT FADE の順で、フェーダー位置は例に含まれていない【不明：実機で ALL 応答が 6 値か 7 値か確認】） | 行 1511–1527 |
| `stxTLY;` | 無し | クロスポイント（タリー）状態の取得 | `stxTLY:a,b,..,h;` ＋ ACK。a–h: 0 (Dark), 1 (Red), 2 (Green)。チャンネル 1–8 のクロスポイント状態を返す。例：`TLY:1, 2, 0, 0, 0, 0, 0, 0;` | 行 1529–1531 |
| `stxACS;` | 無し | V-60HD の状態取得（"Acquire status of V-60HD"。応答は ACK のみと記載。何が返るかは【不明：実機で確認。接続確認／生存確認用と推測】） | ACK | 行 1533 |
| `stxVER;` | 無し | バージョン情報 | `stxVER:V-60HD,a;`　a: Version（ASCII 文字列） | 行 1535–1536 |
| XON（11H） | — | フロー制御 | — | 行 1538 |
| XOFF（13H） | — | フロー制御 | — | 行 1540 |

### 4-4. Commands spontaneously sent from the V-60HD（p.23 行 1545–1555）

| 本体からの送信 | 意味 | 根拠 |
|---|---|---|
| `stxERR:a;` | エラー検出。a: 0 (syntax error) 受信コマンドに誤りがある / 4 (invalid) 他の設定で制御されているため効果が無い / 5 (out of range error) 受信コマンドの引数が範囲外 | 行 1549–1551 |
| XON（11H） | フロー制御 | 行 1553 |
| XOFF（13H） | フロー制御 | 行 1555 |
| `stxQPL:…;`（7: ALL） | RS-232 の PANEL INFORMATION＝ON のとき、チャンネル切替・PGM/A↔PST/B 切替などで常に送信。LAN での自発送信は【不明】 | 行 716–718（p.11） |

### 4-5. BRIEF 4 節の項目との対応（コマンドが無いものは「無し」）

| BRIEF の項目 | V-60HD での対応 |
|---|---|
| PGM 選択 | `PGM:a;`（a=0–7）。読み出しは `QPL:0;` |
| PST/PVW 選択 | `PST:a;`。読み出しは `QPL:1;` |
| クロスポイント（INPUT n 割当） | **物理入力直指定**（チャンネル 1–8 ＝ SDI1–4 / HDMI5 / HDMI-RGB6 / STILL-BKG7 / STILL-BKG8 固定）。ch6 のみ `IPS:a;` で HDMI/RGB 切替、ch7/8 の STILL/BKG 割当（INPUT 7/8 ASSIGN）は**コマンド無し**（メニューのみ） |
| CUT / AUTO | `CUT;` / `ATO;` |
| トランジションタイプ | `TRS:a;`（0 MIX / 1 WIPE 1 / 2 WIPE 2）。MIX TYPE（MIX/FAM/NAM）や WIPE パターンの指定コマンドは無し |
| トランジション時間 | `TIM:a;`（0–40 ＝ 0.0–4.0 s） |
| フェーダー位置（T-bar） | 読み出しのみ `QPL:6;`（0–2047）。**書き込みコマンド無し** |
| PinP n ON PGM | `P1S;` / `P2S;`（ボタン押下＝トグル。ON/OFF 指定不可）。状態は `QPL:3;` |
| PinP n ON PVW | 無し |
| PinP ソース | **無し**（PinP のインセット映像は PST/B バス選択で決まる、と推測される【推測】。資料のメニューにも PinP SOURCE 項目は無い） |
| PinP 位置 | `PP1:a,b;` / `PP2:a,b;` |
| PinP 時間 | 無し |
| DSK ON PGM | `DSK;`（トグル）。状態は `QPL:4;` |
| DSK ON PVW | `DVW;`（トグル） |
| DSK ソース | `DSS:a;`（0–7） |
| DSK キータイプ | 無し（メニューのみ：LUMINANCE-WHITE / LUMINANCE-BLACK / CHROMA-GREEN / CHROMA-BLUE）。レベル `KYL:a;`、ゲイン `KYG:a;` |
| DSK 時間 | 無し |
| SPLIT | `SPS;`（トグル）、位置 `SPT:a,b;`。状態は `QPL:3;`（b=3） |
| オーディオ入力レベル | `IAL:a,b;`（a=0–10：AUDIO IN 1,2,3,4,5/6, SDI IN 1–4, HDMI IN 5,6）。読み出し `QAL:a;` |
| オーディオ入力ミュート | `IAM:a;`（引数は入力番号のみ。ON/OFF 指定無し） |
| オーディオ入力ソロ | `IAS:a;` |
| オーディオ入力ディレイ | `ADT:a,b;`（AUDIO IN 1–5/6 のみ） |
| MASTER レベル | `OAL:a;`。ミュートコマンドは**無し** |
| AUX オーディオレベル | `OAX:a;` |
| メモリー ロード | `MEM:a;`（0–7 ＝ MEMORY 1–8）。セーブ・現在番号・名前のコマンドは無し |
| タリー | `TLY;` → 8 値（0 Dark / 1 Red / 2 Green） |
| ラベル（入力名） | コマンド無し（MULTI-VIEW LABEL EDIT はメニューのみ） |
| マクロ／シーケンサー | 無し（機能自体が無い） |
| AUX ビデオソース | `AUX:a;`。読み出し `QPL:2;` |
| 出力バス割当 | `OS1/OS2/OH1/OH2:a;`（0 PGM / 1 PVW / 2 AUX） |
| 出力フェード | `FDE;`（トグル）。状態 `QPL:5;` |
| オートミキシング | `ATM;`（トグル） |
| HDCP / テストパターン / テストトーン | `HCP:a;` / `TPT:a;` / `TTN:a;` |
| システムバージョン | `VER;` → `VER:V-60HD,a;` |
| 値のエンコード | ASCII 10 進整数（符号付きは `-` 付き）。dB は 0.1 dB の 10 倍整数、-801 ＝ -INF。16 進・7bit・`#` 分割の概念は無し |

## 5. ソース一覧（PGM/PST/AUX/DSS の値 → 物理入力）

| 値 | 入力 | 根拠 |
|---|---|---|
| 0 | SDI IN 1 | 行 1380 |
| 1 | SDI IN 2 | 行 1380 |
| 2 | SDI IN 3 | 行 1380 |
| 3 | SDI IN 4 | 行 1380 |
| 4 | HDMI IN 5 | 行 1380 |
| 5 | HDMI/RGB IN 6（INPUT 6 ASSIGN ＝ HDMI または RGB/COMPONENT。`IPS:a;` で切替） | 行 1381、1436、102 |
| 6 | STILL/BKG IN 7（INPUT 7 ASSIGN ＝ STILL IMAGE 1 / STILL IMAGE 2 / BACKGROUND） | 行 1381、140–144 |
| 7 | STILL/BKG IN 8（INPUT 8 ASSIGN ＝ STILL IMAGE 1 / STILL IMAGE 2 / BACKGROUND） | 行 1381、145–149 |

`QPL:0/1/2;` と `TLY;` の添字も同じ 0–7（CH 1–8）順。

オーディオ入力の添字（IAL / QAL / IAM / IAS）：0 AUDIO IN 1、1 AUDIO IN 2、2 AUDIO IN 3、3 AUDIO IN 4、4 AUDIO IN 5/6、5 SDI IN 1、6 SDI IN 2、7 SDI IN 3、8 SDI IN 4、9 HDMI IN 5、10 HDMI IN 6（行 1453–1454）。`ADT` は 0–4 のみ（行 1461）。

## 6. 数

| 項目 | 数 | 根拠 |
|---|---|---|
| ビデオ入力チャンネル | 8（CH 1–8） | 行 1380–1381 |
| SDI 入力 | 4（SDI IN 1–4） | 行 49 |
| HDMI 入力 | 2（HDMI IN 5、HDMI IN 6。IN 6 は RGB/COMPONENT と排他） | 行 55、98–102 |
| RGB/COMPONENT 入力 | 1（IN 6 と共用） | 行 102 |
| STILL（静止画メモリー） | 2（STILL IMAGE 1 / 2。.bmp 24bit 非圧縮 / .png 24bit）＋ BACKGROUND（単色：BLACK/WHITE/GRAY/RED/GREEN/BLUE/YELLOW、ch7/8 共通） | 行 141–152、879–882 |
| STILL/BKG チャンネル | 2（CH 7、CH 8） | 行 139 |
| PinP | 2（PinP 1 / 2。SIZE 1/4・1/3・1/2、SHAPE SQUARE/CIRCLE/HEART/DIAMOND） | 行 235–258 |
| SPLIT | 1（PATTERN V-CENTER / H-CENTER / V-STRETCH / H.STRETCH） | 行 259–280 |
| DSK | 1 | 行 302–326 |
| トランジション | MIX（MIX/FAM/NAM）、WIPE 1、WIPE 2（各 30 パターン、s＝ソフトエッジ）。時間 0.0–4.0 s | 行 216–227 |
| プリセットメモリー | 8（MEMORY 1–8） | 行 679–702 |
| マクロ／シーケンサー | 無し | — |
| オーディオ入力 | アナログ AUDIO IN 1–4（XLR/TRS、HA GAIN 0–64 dB、+48V）＋ AUDIO IN 5/6（ステレオ）＋ SDI IN 1–4 エンベデッド ＋ HDMI IN 5/6 エンベデッド ＝ コマンド上 11 系統 | 行 333–467、1453–1454 |
| オーディオ出力 | AUDIO OUT (XLR)、AUDIO OUT (RCA)、PHONES、SDI OUT 1/2 エンベデッド（CH1–2 / CH1–8）、HDMI OUT 1/2 エンベデッド。バスは MASTER OUTPUT と AUX | 行 531–560、654–661 |
| ビデオ出力 | SDI OUT 1/2、HDMI OUT 1/2（各 PGM/PVW/AUX 割当）、HDMI MULTI-VIEW（1080p 固定） | 行 166–211 |
| AUX | 1 バス（ビデオ：`AUX:a;`、オーディオ：`OAX:a;`）。AUX LINKED PGM（OFF/AUTO LINK/MANUAL LINK）あり | 行 1386、1459、1037–1050 |
| カメラ制御 | 最大 6 台（LAN、V-60HD がクライアント）。カメラプリセット 8 | 行 1072、747、786 |
| GPI 入力 / タリー出力 | GPI 8ch、タリー 6ch×PGM/PST | 行 1242–1266 |
| システムフォーマット | 720p / 1080i / 1080p、59.94 / 50 Hz | 行 929–938 |

## 7. 機種固有の注意

- **MIDI 経路は存在しない**。SW CROSSPOINT では V-60HD を「LAN 簡易制御コマンドのみ」の機種として扱う。`lib/features.ts` の経路判定は全機能 LAN テキストコマンド側に振る。SysEx アドレス経由の機能（状態読み出しの細粒度など）は無い。
- **LAN は認証の記載が無い**。V-160HD 系のパスワード認証処理を V-60HD に流用しない（接続直後の受信データを診断画面にそのまま表示して、実機でバナー等の有無を確認する）。
- **コマンドの前に stx（02H）が必須**（書式に明記）。ACK は 06H の 1 バイト。V-160HD 系の `DTH:`/`RQH:` とは体系が違うので、トランスポート層はポート 8023 共通でもプロトコル層は別実装。
- **シーケンス送信は ACK 待ち必須**（「各コマンドの後、ACK が返ることを確認してから次を送る」）。送信間隔の数値指定は無し。
- **ボタン系（CUT/ATO/P1S/P2S/SPS/DSK/DVW/ATM/FDE/IAM/IAS）は押下＝トグル**で ON/OFF 指定ができない。現在状態は `QPL:` で取り、UI 側で差分を取る。ミュート/ソロの現在状態を返す問い合わせは**無い**（QAL は音量のみ）【不明：実機で IAM 後の状態取得方法を探す】。
- **T-bar の書き込み不可**（`QPL:6;` で 0–2047 の読み出しのみ）。
- **PinP のソース指定コマンドは無い**。
- **RS-232 の PANEL INFORMATION＝ON で QPL(7:ALL) が自発送信される**（RS-232 と明記。LAN でも同様かは不明）。LAN 受信パーサは、要求していない `QPL:`／`ERR:`／XON/XOFF（11H/13H）が任意のタイミングで届く前提で書く。
- エラーは `ERR:a;`（0 syntax / 4 invalid / 5 out of range）。「4 (invalid)」は他設定に支配されているとき（例：AUX LINKED PGM 中の `AUX:`、PANEL LOCK 中など【推測】）。
- 対応 FW：この資料は「Version 3.1 and later」。V-60HD 本体の VERSION はメニュー SYSTEM > VERSION（行 1065）または `VER;`。3.1 未満での差分は資料に無い【不明】。
- RS-232 は RS-232＝ON（既定 OFF）にしないと使えない。LAN 側に同様の ON/OFF 項目は**無い**（LAN CONTROL メニューには CONFIGURE / IP ADDRESS / SUBNET MASK / INFORMATION のみ）→ LAN コマンド受付は常時有効【推測】。
- メニュー経由の DSK ON は「トランジション時間に関係なく即時合成」（行 322–323）。`DSK;` コマンドは [DSK] ボタン押下相当なのでフェードするはず【推測】。
- プリセット呼び出し時 MEMORY LOAD FADE＝ON ならフェード・トゥ・ブラックが入る（行 704–706）。

## 8. 不明・推測一覧（実機で確認）

1. 【不明】TCP 8023 接続直後に本体から何か（バナー、プロンプト、パスワード要求）が送られるか。資料は無認証を示唆するが明記無し。
2. 【不明】`stx`（02H）を省略したコマンドを受け付けるか。
3. 【不明】問い合わせ応答（QAL/QPL/TLY/VER）と ACK の順序、および応答に空白が入るか（例 `TLY:1, 2, 0, …;`）。
4. 【不明】`QPL:7;`（ALL）の応答が 6 値か 7 値か（例は 6 値、フェーダー位置 a=6 が含まれていない）。例の先頭 "stxQAL:" は誤植【推測】。
5. 【不明】`QAL:` の a=11/12/13 の意味（送信側表と応答側表で矛盾）。a=13 ＝ ALL なら応答 13 値の順序（例は 13 値）。
6. 【不明】`ACS;` が何を返すか（表は ACK のみ）。
7. 【不明】`IAM:a;` / `IAS:a;` がトグルか ON のみか、現在のミュート/ソロ状態を読む手段があるか。
8. 【不明】LAN でも XON/XOFF（11H/13H）が送られてくるか、PANEL INFORMATION の QPL 自発送信が LAN にも流れるか。
9. 【不明】キープアライブ／無通信タイムアウト／同時接続数。
10. 【不明】`ADT:` の b（0–120 "fps"）とメニューの DELAY（0.0–500 ms / 0.0–29.9 frame）の対応。
11. 【不明】LAN CONTROL > INFORMATION の QR コード（IP の URL）が開く HTTP ページの内容。Smart Tally の有無は資料に無い。
12. 【推測】PinP のインセット映像ソースは PST/B バスの選択。
13. 【推測】LAN コマンド受付は RS-232 と違い常時有効（ON/OFF メニューが無い）。
14. 【推測】ERR:4（invalid）が返る条件（AUX LINKED PGM、PANEL LOCK 等）。
15. 【不明】システムプログラム 3.1 未満でのコマンド差分。
