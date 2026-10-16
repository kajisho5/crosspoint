# V-8HD 抽出メモ（SW CROSSPOINT 機種追加用）

資料：
- R = `pdf/v-8hd/V-8HD_reference_v3_eng01_W.txt`（Reference Manual v3、pdftotext -layout。MIDI Implementation は p.99–117 ＝ txt 行 6222–7695。p.99–102 は 2 段組で左右が混在、p.103 以降の Parameter Address Map は 1 段組で転記しやすい）
- C = `pdf/v-8hd/V-8HD_Remote_Connection_v2_eng01_W.txt`（V-8HD Remote（iPad）接続ガイド、62 行）
- 行番号は txt の行、p. は PDF のページ番号（紙面のノンブル）。

## 1. 接続手段

| 手段 | 有無 | 根拠 |
|---|---|---|
| LAN | **無し**。LAN/Ethernet/Wi-Fi/RJ45 の記載が資料のどこにも無い（Specifications p.96–97 の Other Connectors は USB MEMORY / REMOTE / CTL/EXP のみ） | R 行 6155–6157 |
| USB | **有り**。REMOTE 端子＝USB B type「for remote control from PC and iPad, Graphics Presenter」 | R 行 6156（p.97）、行 292–307（p.4 パネル説明：「市販のケーブル／Lightning-USB camera adaptor で iPad を接続して V-8HD をリモート操作できる」） |
| USB MIDI か・クラスコンプライアントか | 資料に「USB MIDI」「class compliant」「driver」の語は**無し**【不明】。MIDI Implementation（p.99）の見出しは「MIDI Messages Received at MIDI IN」で、物理 MIDI DIN は無いので REMOTE(USB) 経由の MIDI を指す【推測】。iPad 接続ガイドはドライバ導入の手順が無く、ケーブル接続→アプリ起動で ONLINE になる（C 行 34–47）→ USB MIDI クラスコンプライアント【推測】。実機で iPhone の CoreMIDI にデバイスが見えるか確認 |
| Bluetooth | **無し**（BLE MIDI も音声も記載無し） | R/C 全文 grep「Bluetooth」ヒット 0 |
| RS-232 | 無し | 同上 |
| MIDI DIN | 無し（MIDI IN/OUT 端子の記載無し。MIDI Implementation Chart p.117 で Transmitted は SysEx のみ O） | R 行 6639–6672 |
| CTL/EXP | 1/4" TRS（フットスイッチ／エクスプレッションペダル）— iPhone からは使えない | R 行 6157 |
| USB MEMORY | USB A（USB メモリ、USB テンキー）— iPhone からは使えない | R 行 6155 |

iPad との接続（C 行 10–57、Connection Guide "Version 2.0 and later"）：
- 「V-8HD Remote は V-8HD 専用 iPad アプリ。iPad を **USB** で V-8HD に接続して使う」（C 行 10–12）
- ケーブル：USB Type-B→Type-C ケーブル（USB-C iPad）／USB Type-B→Type-A ケーブル＋Lightning-USB カメラアダプタ／USB Type-B→Lightning ケーブル（C 行 44–53）
- 手順：iPad を REMOTE 端子へ → V-8HD 電源 ON → iPad で V-8HD Remote 起動 → ステータスアイコンが「ONLINE」で接続（C 行 39–57）
- 注意：他アプリへ切替／iPad のスリープ（自動ロック）で切断。戻ると自動再接続するが数秒かかる。長時間使うなら自動ロック OFF 推奨（C 行 15–21）
- 「本アプリは V-8HD システムプログラム **2.0 以降**に対応」（C 行 23–24）
- iPhone の記載は無し（iPad のみ）【iPhone でも USB MIDI として同様に使えるかは不明】

→ iPhone から使えるのは **USB（MIDI）だけ**。LAN トランスポート・BLE MIDI は capabilities で無効にする。

## 2. SysEx（R p.102 行 6453–6511、チェックサム p.116 行 7549–7609）

| 項目 | 値 | 根拠 |
|---|---|---|
| Manufacturer ID | 41H（Roland） | 行 6462, 6467 |
| Device ID | **10H**（既定）。範囲の記載無し【不明】（V-160HD 系と同じ 10H 固定と推測。メニューに Device ID 設定項目は見当たらない） | 行 6469, 6492 |
| Model ID | **00H 00H 00H 68H**（4 バイト） | 行 6470–6473, 6493–6496 |
| DT1 Command ID | 12H | 行 6474 |
| RQ1 Command ID | 11H | 行 6497 |
| DT1 書式 | `F0 41 10 00 00 00 68 12 aa bb cc dd … ee sum F7` | 行 6458–6460 |
| RQ1 書式 | `F0 41 10 00 00 00 68 11 aa bb cc ss tt uu sum F7`（サイズ 3 バイト） | 行 6486–6487, 6501–6503 |
| RQ1 応答 | 送信可能な状態で、アドレス・サイズが適切なら DT1 で返す。不適切なら**何も返さない** | 行 6480–6483 |
| チェックサム | アドレス＋データ（RQ1 はサイズ）の合計を 128 で割った余り r、checksum = 128 − r（r=0 なら 0） | 行 7564–7575 |
| 分割サイズ | **256 バイト以下**のパケットに分割 | 行 6492 |
| 送信間隔 | DT1 を連続送信する時は **20 ms 以上**の間隔 | 行 6493 |
| MIDI ch | n = 00H 固定（CC / PC 用） | 行 6229 |
| 実装バージョン | MIDI Implementation Version 3.00（2024-11-20）。MIDI Implementation Chart は Version 2.00（2021-10-08） | 行 6224–6225, 7635–7636 |

備考：p.116 のチェックサム計算例は MIDI Visual Control（F0 7E …）の例で、V-8HD のアドレスではない（他機種と共通の定型文）。

## 3. LAN プロトコル

**無し**。TCP ポート／パスワード／`DTH:`/`RQH:`/`VER;` のような簡易制御コマンドの記載は資料のどこにも無い。V-160HD 系（DTH/RQH）とは**まったく別**で、V-8HD は SysEx（USB MIDI）＋CC/PC のみ。

## 4. アドレスマップの要点（SysEx 3 バイトアドレス）

（値は 7bit/バイト。複数バイト値は aa×128+bb（行 7596–7598）。「nibbled」4bit 表現の説明もあるが（行 7600–7601）、V-8HD の Address Map に nibbled と明記された項目は無い。負値は 7bit 2 の補数：1 バイト 60H=-32、2 バイト 78H 18H=-1000、3 バイト 7FH 79H 60H=-800。「#」付きアドレスは V-8HD の表には無く、2 バイト値は「00H xxH 05H / 06H」のように下の行に 2 番目のアドレスを書く形式。）

| 用途 | アドレス | サイズ | 値域 | 意味 | 根拠 |
|---|---|---|---|---|---|
| PGM 選択 | 00 12 00 | 1 | 00–07 | INPUT1–8 | 行 6912 |
| PST 選択 | 00 12 01 | 1 | 00–07 | INPUT1–8 | 行 6913 |
| AUX 選択 | 00 12 02 | 1 | 00–07 | INPUT1–8 | 行 6914 |
| フェーダー位置 | 00 12 03–04 | 2 | 00 00–0F 7F | 0–2047 | 行 6915–6917 |
| A/B バス選択 | 00 12 05 | 1 | 00–01 | A, B | 行 6918 |
| DISSOLVE TAKE TYPE | 00 12 06 | 1 | 00–01 | CUT, AUTO | 行 6919 |
| クロスポイント（INPUT n の割当） | 00 (n−1) 00（n=1–8） | 1 | 00–08 | HDMI, STILL 1–8（00=その番号の HDMI 入力、01–08=STILL 1–8） | 行 6544, 6557 |
| CUT トリガ（ボタン押下） | 0B 00 18 | 1 | 00/01 | 0:Release 1:Press（Write only） | 行 7422 |
| AUTO トリガ（ボタン押下） | 0B 00 19 | 1 | 00/01 | 同上 | 行 7423 |
| AUTO TAKE トリガ（時間指定） | 0A 20 00 | 1 | 7F, 00–28 | AUTO(=設定時間), 0.0–4.0sec | 行 7380 |
| トランジションタイプ | 00 0C 00 | 1 | 00–01 | MIX, WIPE | 行 6620 |
| MIX タイプ | 00 0C 01 | 1 | 00–02 | MIX, FAM, NAM | 行 6621 |
| WIPE タイプ | 00 0C 02 | 1 | 00–07 | HORIZONTAL…V-CENTER | 行 6623 |
| MIX/WIPE 時間 | 00 0B 00 | 1 | 00–28 | 0.0–4.0sec | 行 6612 |
| PinP n ON PGM | 00 (0C+n) 00（n=1,2 → 0D,0E） | 1 | 00–01 | OFF, ON | 行 6645 |
| PinP n ON PVW | 00 (0C+n) 01 | 1 | 00–01 | OFF, ON | 行 6646 |
| PinP n ソース | 00 (0C+n) 02 | 1 | 00–0F | HDMI 1–8, STILL 1–8 | 行 6647 |
| PinP n 時間 | 00 0B (00+n)（PinP1=0B 01, PinP2=0B 02） | 1 | 00–28 | 0.0–4.0sec | 行 6613–6614 |
| DSK ON PGM | 00 0F 00 | 1 | 00–01 | OFF, ON | 行 6747 |
| DSK ON PVW | 00 0F 01 | 1 | 00–01 | OFF, ON | 行 6748 |
| DSK ソース | 00 0F 02 | 1 | 00–0F | HDMI 1–8, STILL 1–8 | 行 6749 |
| DSK キータイプ | 00 0F 03 | 1 | 00–02 | LUMINANCE-WHITE, LUMINANCE-BLACK, CHROMA | 行 6750 |
| DSK モード | 00 0F 17 | 1 | 00–02 | SELF KEY, ALPHA KEY, EXTERNAL KEY | 行 6782 |
| DSK 時間 | 00 0B 03 | 1 | 00–28 | 0.0–4.0sec | 行 6615 |
| SPLIT/VFX A/B ON | 00 10 00 / 00 11 00 | 1 | 00–01 | OFF, ON | 行 6816 |
| SPLIT/VFX A/B タイプ | 00 10 01 / 00 11 01 | 1 | 00–11 | SPLIT_V, SPLIT_H, …（18 種） | 行 6819 |
| オーディオ入力レベル | 01 xx 00–02（xx=00–07: HDMI IN 1–8、08: AUDIO IN） | 3 | 7E 00 00 ＝ -INF、7F 79 60–00 00 00–00 00 64 | -80.0–0.0–+10.0 dB（0.1dB 単位・21bit 2 の補数） | 行 6930–6935 |
| オーディオ入力ミュート | 01 xx 03 | 1 | 00–01 | OFF, ON | 行 6937 |
| オーディオ入力 SOLO | 01 xx 04 | 1 | 00–01 | OFF, ON | 行 6938 |
| MASTER レベル | 01 11 00–02 | 3 | 同上 | -INF, -80.0–+10.0 dB | 行 6992–6996 |
| MASTER ミュート | 01 11 03 | 1 | 00–01 | OFF, ON | 行 6997 |
| AUX 出力レベル | 01 12 00–02 | 3 | 同上 | 同上 | 行 7045–7049 |
| AUX 出力ミュート | 01 12 03 | 1 | 00–01 | OFF, ON | 行 7050 |
| メモリーロード | 0A 00 00 | 1 | 00–17 | Memory 1–24（Write Only） | 行 7371 |
| メモリーセーブ | 0A 00 01 | 1 | 00–17 | Memory 1–24（Write Only） | 行 7372 |
| メモリー初期化 | 0A 00 02 | 1 | 00–17 | Memory 1–24（Write Only） | 行 7373 |
| 現在メモリー番号 | 0A 00 03 | 1 | 7F, 00–17 | Last Memory, Memory 1–24（Read Only） | 行 7374 |
| メモリー名 | 60 xx 00–07（xx=00–17） | 8 | （値域の記載無し。LABEL と同じ 00–7F と推測）| 8 文字 | 行 7513–7528 |
| メモリー数設定 | 02 03 0F | 1 | 00–01 | 8, 24 | 行 7231 |
| タリー | 0C 00 00 | **8** | 各 00–02 | OFF, PGM, PST（Read Only）、HDMI IN 1–8 の順 | 行 7452–7459 |
| タリー自動送信 | 0C 01 00 | 1 | 00–01 | OFF, ON | 行 7467 |
| ラベル（入力名 8 文字） | 02 xx 00–07（xx=10–17: HDMI 1–8、18–1F: STILL 1–8、20: PROGRAM、21: PREVIEW、22: AUX） | 8 | 00–7F | 1–8 文字目 | 行 7353–7363 |
| マクロ実行 | 50 05 04 | 1 | 00–63 | MACRO 1–100 | 行 7506 |
| マクロプレビュー | 50 05 05 | 1 | 00–63 | MACRO 1–100 | 行 7507 |
| シーケンサー | **専用アドレス無し**。USER SW ASSIGN（02 01 26–27 / 28–29）に SEQUENCER（MODE ON/OFF, NEXT, PREVIOUS, AUTO SEQUENCE）を割り当て、USER [1]/[2] ボタン押下（0B 00 21 / 22）で間接操作【推測】 | | | | 行 7152–7166, 7431–7432 |
| LAN 簡易制御コマンド | 無し | | | | |
| システムバージョン | 02 00 00 / 01 / 02 | 1×3 | 00–09 | Major / Minor(1) / Minor(2)（Read Only）。文字列ではなく数値 3 バイト | 行 7103–7105 |
| 出力フェード | 0A 20 10（OFF）/ 11（LEFT）/ 12（RIGHT）/ 18（LEFT toggle）/ 19（RIGHT toggle） | 1 | 7F, 00–28 | AUTO, 0.0–4.0sec | 行 7382–7387 |
| 出力アサイン | 00 (07+n) 00（OUTPUT 1–3 = 08–0A） | 1 | 00–03 | PROGRAM, PREVIEW, AUX, MULTI VIEW | 行 6598 |

CC / Program Change（USB MIDI、ch 固定 00H。p.99–101 行 6236–6445。iPhone から簡易操作に使える）：

| CC# | 機能 | 値 | 根拠 |
|---|---|---|---|
| 10 | ビデオフェーダー位置 | 00–7F（00=下端、7F=上端） | 行 6240–6244 |
| 11 | TRANSITION TYPE | 00–03 (MIX, WIPE)（SysEx 側は 00–01。記載の食い違い） | 行 6246–6250 |
| 12 | MIX/WIPE TIME | 00–28 (0.0–4.0s) | 行 6252–6256 |
| 13 / 14 / 15 | PinP 1 TIME / PinP 2 TIME / DSK TIME | 00–28 | 行 6258–6274 |
| 16 / 17 / 18 / 19 / 20 | PinP 1 SOURCE(00–0F: HDMI1–8, STILL1–8) / POSITION H / POSITION V (0A–64 = -50–50%) / SIZE (0A–64 = 10–100%) / VIEW ZOOM (0A–64 = 100–1000%) | | 行 6276–6286, 6223–6241（右段） |
| 21–25 | PinP 2 の同上 | | 行 6243–6271 |
| 26 / 27 / 28 / 29 | DSK SOURCE / LEVEL / GAIN / MIX LEVEL（00–7F→0–255 換算） | | 行 6273–6303 |
| 30 / 31 / 32 / 33 | SPLIT/VFX A SW / A TYPE (00–11) / B SW / B TYPE | | 行 6306–6330 |
| 34 / 35 | OUTPUT FADE ノブ（反時計／時計）00–3F | | 行 6333–6344 |
| 36–43 | AUDIO INPUT LEVEL INPUT 1–8（00–7F、dB 対応表 p.101） | | 行 6346–6365（36–38）、6292–6323（39–43） |
| 44 / 45 | AUDIO INPUT LEVEL AUDIO IN / AUDIO OUTPUT LEVEL | | 行 6326–6337 |
| 52 / 53 | [CUT] / [AUTO] ボタン押下・離す（00/01） | | 行 6340–6344 |
| 54 / 55 | 「CUT」／「AUTO TAKE」実行（値は任意） | | 行 6353–6366 |
| 56–63 | AUDIO INPUT MUTE INPUT 1–8（OFF=00、ON= 01..08 ＝入力番号。資料の表記どおり） | | 行 6372–6432 |
| 64 / 65 | AUDIO INPUT MUTE AUDIO IN（00/09）/ AUDIO OUTPUT MUTE（00/10） | | 行 6434–6445 |
| PC 00–07 | プリセットメモリー 1–8 を呼び出し | | 行 6418–6424 |

## 5. ソース一覧

- PGM/PST/AUX Select（00 12 00/01/02）に書く値 00–07 ＝ **INPUT 1–8**（パネルのクロスポイント番号）。INPUT n が何を出すかは INPUT ASSIGN（00 (n−1) 00）：00 ＝ HDMI n（物理 HDMI 入力 n）、01–08 ＝ STILL 1–8（行 6544, 6557, 6912–6914）。
- PinP SOURCE / DSK SOURCE / DSK KEY SOURCE（00–0F）：00–07 ＝ HDMI 1–8、08–0F ＝ STILL 1–8（行 6647, 6749, 6783）。
- 入力 7, 8 はスケーラー付き（EDID/ZOOM/SCALING）、入力 1–6 は無し（行 6540–6586）。

## 6. 数

| 項目 | 数 | 根拠 |
|---|---|---|
| 入力 | 8（INPUT 1–8、全て HDMI Type A） | 行 6137 |
| HDMI / SDI | HDMI 8 / SDI 0 | 行 6137 |
| STILL | 8（STILL 1–8） | 行 6544 |
| 出力 | 3（OUTPUT 1–3 HDMI、各 PROGRAM/PREVIEW/AUX/MULTI VIEW 割当） | 行 6140, 6598 |
| AUX | 1 バス。ソース選択 00 12 02（INPUT1–8） | 行 6914 |
| PinP | 2 | 行 6643 |
| DSK | 1 | 行 6745 |
| SPLIT/VFX | 2（A, B） | 行 6814 |
| メモリー | 24（表示は 8 or 24 切替） | 行 7371, 7231 |
| マクロ | 100 | 行 6159, 7506 |
| シーケンサー | 1,000 ステップ | 行 6160 |
| オーディオ入力 | 9（HDMI IN 1–8 ＋ AUDIO IN RCA） | 行 6930 |
| オーディオ出力 | MASTER（AUDIO OUT RCA / PHONES / HDMI 埋め込み）＋ AUX バス | 行 6982–6986 |
| ラベル | HDMI 1–8、STILL 1–8、PROGRAM、PREVIEW、AUX（計 19、各 8 文字） | 行 7354 |

## 7. 機種固有の注意

- 接続は **USB（REMOTE 端子、USB-B）のみ**。LAN 無し、Bluetooth 無し。iPhone からは USB MIDI（CoreMIDI）経由【クラスコンプライアント性は推測】。
- 受信の前提設定：MIDI Rx SOURCE 等の設定項目は資料に**無し**（メニュー一覧 p.69–95 に MIDI/REMOTE 項目が無い）。電源 ON で REMOTE が有効になる【推測】。
- TALLY AUTO SEND（0C 01 00）を ON にするとタリーが自動送信される【推測：ON 時に何がどの形式で送られるかの記載無し。実機観測】。
- RQ1 が不適切（アドレス・サイズ違い）なら**無応答**（行 6480–6483）→ タイムアウト処理必須。
- DT1 は 256 バイト以下、連続送信 20 ms 間隔（行 6492–6493）。
- MIDI Implementation Chart（p.117）の Transmitted は SysEx のみ O、CC/PC は × → 機器側からの状態通知は SysEx（DT1）のみ。
- 対応 FW：V-8HD Remote アプリは **Ver.2.0 以降**（C 行 23–24）。MIDI Implementation は Ver.3.00 準拠（行 6225）。v3 で追加された項目（例：DSK MODE/KEY SOURCE、USER SW の GRAPHICS PRESENTER、Roland FILL+KEY）は 2.x 機では無応答の可能性【推測】。
- MIX/WIPE の WIPE BORDER COLOR RED/GREEN/BLUE のアドレスが資料では 00 **0D** 06–07 / 00 **0E** 08–09 / 00 **0F** 0A–0B と印字されており（行 6630–6638）、PinP 1 / PinP 2 / DSK の領域と衝突する。資料の誤植で本来は 00 0C 06–0B と思われる【推測】。実機で RQ1 して確認。
- CC#11 TRANSITION TYPE の値域が 00–03 とあるが意味は (MIX, WIPE) の 2 つ（行 6250）。SysEx は 00–01（行 6620）。
- Audio Parameter Area の INPUT MUTE は CC（56–65）では ON 値が入力番号（01–10）になっている（行 6384–6445）。SysEx 01 xx 03 は 00/01。
- プリセットメモリー領域（10H–3FH）は Video/Audio Parameter Area と 2・3 バイト目および値域が共通（行 7473–7474）。Memory n：Video = (10H + 2(n−1)) 00 00、Audio = (11H + 2(n−1)) 00 00。
- Roland ロゴ・公式アプリ画面は使わない（プロジェクト規約）。V-8HD Remote の画面構成は参照していない。

## 8. 不明・推測一覧（実機で確認）

1. REMOTE(USB-B) が USB MIDI クラスコンプライアントか、iPhone（USB-C / Lightning カメラアダプタ）で CoreMIDI デバイスとして見えるか。デバイス名・ポート名。
2. Device ID 10H 以外を受け付けるか（設定項目無し。7F ブロードキャストの可否）。
3. RQ1 の最大サイズ（Video Parameter Area をまとめて読めるか。256 バイト制限が RQ1 応答にも適用されるか）。
4. TALLY AUTO SEND=ON 時の送信内容（0C 00 00 の 8 バイト DT1 と推測）と送信タイミング。
5. パネル操作時に状態変化を自動通知するか（Chart は SysEx Transmitted O だが条件の記載無し）。
6. WIPE BORDER COLOR RGB の実アドレス（00 0C 06–0B か資料どおり 00 0D/0E/0F か）。
7. ボタン制御（0B 00 xx）の Press→Release の必要間隔、Press のみで動作するか。
8. AUTO TAKE Trigger（0A 20 00）と [AUTO] ボタン押下（0B 00 19）の違い（PANEL OPERATION A/B・PGM/PST・DISSOLVE での挙動）。
9. 0A 00 03 Loaded Memory Number の 7F（Last Memory）の意味。
10. Memory Name（60 xx）の値域（00–7F と推測）と書込可否。
11. FW 2.x 機での v3 追加アドレスの挙動。
12. ラベル（02 1x）のキャラクタコード（ASCII と推測）。

---

## 付録：Parameter Address Map 全転記（R p.103–115、行 6519–7528）

サイズは「アドレス行が 1 行＝1 バイト、2 行＝2 バイト、3 行＝3 バイト」で算出。値域は資料の Sys.Ex.Value 列そのまま。

### 先頭アドレス一覧（p.103 行 6520–6534）

| Start Address | Description |
|---|---|
| 00 00 00 | Video Parameter Area |
| 01 00 00 | Audio Parameter Area |
| 02 00 00 | System Parameter Area |
| 0A 00 00 | Other Parameter Area |
| 0B 00 00 | Panel Control Area |
| 0C 00 00 | Tally Parameter Area |
| 10 00 00 | Video Parameter (Memory 1) |
| 11 00 00 | Audio Parameter (Memory 1) |
| 12 00 00 | Video Parameter (Memory 2) |
| 13 00 00 | Audio Parameter (Memory 2) |
| 14 00 00 | Video Parameter (Memory 3) |
| 15 00 00 | Audio Parameter (Memory 3) |
| 16 00 00 | Video Parameter (Memory 4) |
| 17 00 00 | Audio Parameter (Memory 4) |
| 18 00 00 | Video Parameter (Memory 5) |
| 19 00 00 | Audio Parameter (Memory 5) |
| 1A 00 00 | Video Parameter (Memory 6) |
| 1B 00 00 | Audio Parameter (Memory 6) |
| 1C 00 00 | Video Parameter (Memory 7) |
| 1D 00 00 | Audio Parameter (Memory 7) |
| 1E 00 00 | Video Parameter (Memory 8) |
| 1F 00 00 | Audio Parameter (Memory 8) |
| : | :（Memory 9–23 は省略表記） |
| 3E 00 00 | Video Parameter (Memory 24) |
| 3F 00 00 | Audio Parameter (Memory 24) |
| 50 00 00 | Macro Area |
| 60 00 00 | Preset Memoey Name Area（原文ママ） |

### Video Parameter Area — VIDEO INPUT（xx = 00–05：INPUT 1–6）（p.103 行 6540–6549）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 00 xx 00 | 1 | 00–08 | INPUT ASSIGN | HDMI, STILL 1–8 |
| 00 xx 01 | 1 | 00–01 | FLIP H | OFF, ON |
| 00 xx 02 | 1 | 00–01 | FLIP V | OFF, ON |
| 00 xx 03 | 1 | 60–00–1F | BRIGHTNESS | -32–0–31 |
| 00 xx 04 | 1 | 60–00–1F | CONTRAST | -32–0–31 |
| 00 xx 05 | 1 | 60–00–1F | SATURATION | -32–0–31 |

### Video Parameter Area — VIDEO INPUT (SCALER)（xx = 06–07：INPUT 7–8）（p.103 行 6553–6586）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 00 xx 00 | 1 | 00–08 | INPUT ASSIGN | HDMI, STILL 1–8 |
| 00 xx 01 | 1 | 00–01 | FLICKER FILTER | OFF, ON |
| 00 xx 02 | 1 | 00–01 | FLIP H | OFF, ON |
| 00 xx 03 | 1 | 00–01 | FLIP V | OFF, ON |
| 00 xx 04 | 1 | 00–0B | EDID | INTERNAL, SVGA (800x600), XGA (1024x768), WXGA (1280x800), FWXGA (1366x768), SXGA (1280x1024), SXGA+ (1400x1050), UXGA (1600x1200), WUXGA (1920x1200), 720p, 1080i, 1080p |
| 00 xx 05–06 | 2 | 00 64–4E 10 | ZOOM | 10.0–1000.0% |
| 00 xx 07 | 1 | 00–04 | SCALING TYPE | FULL, LETTERBOX, CROP, DOT BY DOT, MANUAL |
| 00 xx 08–09 | 2 | 70 30–00 00–0F 50 | MANUAL SIZE H | -2000–0–2000 |
| 00 xx 0A–0B | 2 | 70 30–00 00–0F 50 | MANUAL SIZE V | -2000–0–2000 |
| 00 xx 0C–0D | 2 | 71 00–00 00–0F 00 | POSITION H | -1920–0–1920 |
| 00 xx 0E–0F | 2 | 76 50–00 00–09 30 | POSITION V | -1200–0–1200 |
| 00 xx 10 | 1 | 60–00–1F | BRIGHTNESS | -32–0–31 |
| 00 xx 11 | 1 | 60–00–1F | CONTRAST | -32–0–31 |
| 00 xx 12 | 1 | 60–00–1F | SATURATION | -32–0–31 |
| 00 xx 13 | 1 | 40–00–3F | RED | -64–0–63 |
| 00 xx 14 | 1 | 40–00–3F | GREEN | -64–0–63 |
| 00 xx 15 | 1 | 40–00–3F | BLUE | -64–0–63 |
| 00 xx 16 | 1 | 00–05 | TEST PATTERN | OFF, 75% COLOR BAR, 100% COLOR BAR, RAMP, STEP, HATCH |

### Video Parameter Area — VIDEO OUTPUT（xx = 08–0A：OUTPUT 1–3）（p.104 行 6594–6607）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 00 xx 00 | 1 | 00–03 | OUTPUT ASSIGN | PROGRAM, PREVIEW, AUX, MULTI VIEW |
| 00 xx 01 | 1 | 00–03 | COLOR SPACE | YPbPr 4:4:4, RGB (0–255), RGB (16–235), YPbPr 4:2:2 |
| 00 xx 02 | 1 | 00–01 | DVI-D/HDMI SIGNAL | HDMI, DVI-D |
| 00 xx 03 | 1 | 40–00–3F | BRIGHTNESS | -64–0–63 |
| 00 xx 04 | 1 | 40–00–3F | CONTRAST | -64–0–63 |
| 00 xx 05 | 1 | 40–00–3F | SATURATION | -64–0–63 |
| 00 xx 06 | 1 | 40–00–3F | RED | -64–0–63 |
| 00 xx 07 | 1 | 40–00–3F | GREEN | -64–0–63 |
| 00 xx 08 | 1 | 40–00–3F | BLUE | -64–0–63 |
| 00 xx 09 | 1 | 00–01 | REC CONTROL | OFF, ON |

### Video Parameter Area — TRANSITION TIME（p.104 行 6610–6615）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 00 0B 00 | 1 | 00–28 | MIX/WIPE TIME | 0.0–4.0sec |
| 00 0B 01 | 1 | 00–28 | PinP 1 TIME | 0.0–4.0sec |
| 00 0B 02 | 1 | 00–28 | PinP 2 TIME | 0.0–4.0sec |
| 00 0B 03 | 1 | 00–28 | DSK TIME | 0.0–4.0sec |

### Video Parameter Area — MIX/WIPE（p.104 行 6618–6638）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 00 0C 00 | 1 | 00–01 | TRANS TYPE | MIX, WIPE |
| 00 0C 01 | 1 | 00–02 | MIX TYPE | MIX, FAM, NAM |
| 00 0C 02 | 1 | 00–07 | WIPE TYPE | HORIZONTAL, VERTICAL, UPPER LEFT, UPPER RIGHT, LOWER LEFT, LOWER RIGHT, H-CENTER, V-CENTER |
| 00 0C 03 | 1 | 00–02 | WIPE DIRECTION | NORMAL, REVERSE, ROUND TRIP |
| 00 0C 04 | 1 | 00–09 | WIPE BORDER COLOR | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM, SOFT EDGE |
| 00 0C 05 | 1 | 00–0E | WIPE BORDER WIDTH | 0–14 |
| 00 **0D** 06–07（原文ママ。00 0C 06–07 の誤植と推測） | 2 | 00 00–01 7F | WIPE BORDER COLOR RED | 0–255 |
| 00 **0E** 08–09（原文ママ。00 0C 08–09 の誤植と推測） | 2 | 00 00–01 7F | WIPE BORDER COLOR GREEN | 0–255 |
| 00 **0F** 0A–0B（原文ママ。00 0C 0A–0B の誤植と推測） | 2 | 00 00–01 7F | WIPE BORDER COLOR BLUE | 0–255 |

### Video Parameter Area — PinP（xx = 0D–0E：PinP 1, 2）（p.104–105 行 6641–6742）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 00 xx 00 | 1 | 00–01 | PGM SW | OFF, ON |
| 00 xx 01 | 1 | 00–01 | PVW SW | OFF, ON |
| 00 xx 02 | 1 | 00–0F | SOURCE | HDMI 1–8, STILL 1–8 |
| 00 xx 03 | 1 | 00–03 | TYPE | PinP, LUMINANCE-WHITE KEY, LUMINANCE-BLACK KEY, CHROMA KEY |
| 00 xx 04–05 | 2 | 78 18–00 00–07 68 | POSITION H | -100.0–0.0–100.0% |
| 00 xx 06–07 | 2 | 78 18–00 00–07 68 | POSITION V | -100.0–0.0–100.0% |
| 00 xx 08–09 | 2 | 00 00–07 68 | SIZE | 0.0–100.0% |
| 00 xx 0A–0B | 2 | 00 00–07 68 | CROPPING H | 0.0–100.0% |
| 00 xx 0C–0D | 2 | 00 00–07 68 | CROPPING V | 0.0–100.0% |
| 00 xx 0E | 1 | 00–02 | SHAPE | RECTANGLE, CIRCLE, DIAMOND |
| 00 xx 0F | 1 | 00–09 | BORDER COLOR | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM, SOFT EDGE |
| 00 xx 10 | 1 | 00–0E | BORDER WIDTH | 0–14 |
| 00 xx 11–12 | 2 | 7C 0C–00 00–03 74 | VIEW POSITION H | -50.0–0.0–50.0% |
| 00 xx 13–14 | 2 | 7C 0C–00 00–03 74 | VIEW POSITION V | -50.0–0.0–50.0% |
| 00 xx 15–16 | 2 | 00 64–03 10 | VIEW ZOOM | 100–400% |
| 00 xx 17–18 | 2 | 00 00–01 7F | KEY LEVEL | 0–255 |
| 00 xx 19–1A | 2 | 00 00–01 7F | KEY GAIN | 0–255 |
| 00 xx 1B–1C | 2 | 00 00–01 7F | MIX LEVEL | 0–255 |
| 00 xx 1D | 1 | 00–01 | CHROMA COLOR | GREEN, BLUE |
| 00 xx 1E | 1 | 62–00–1E | HUE WIDTH | -30–0–30 |
| 00 xx 1F–20 | 2 | 00 00–02 68 | HUE FINE | 0–360 |
| 00 xx 21–22 | 2 | 7F 00–00 00–00 7F | SATURATION WIDTH | -128–0–127 |
| 00 xx 23–24 | 2 | 00 00–01 7F | SATURATION FINE | 0–255 |
| 00 xx 25 | 1 | 00–01 | FILL TYPE | BUS, MATTE |
| 00 xx 26 | 1 | 00–08 | MATTE COLOR | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM |
| 00 xx 27 | 1 | 00–04 | EDGE TYPE | OFF, BORDER, DROP, SHADOW, OUTLINE |
| 00 xx 28 | 1 | 00–08 | EDGE COLOR | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM |
| 00 xx 29 | 1 | 00–0E | EDGE WIDTH | 0–14 |
| 00 xx 2A–2B | 2 | 7F 00–00 00–00 7F | VALUE WIDTH | -128–0–127 |
| 00 xx 2C–2D | 2 | 00 00–01 7F | VALUE FINE | 0–255 |
| 00 xx 2E | 1 | 00–01 | DESPILL | OFF, ON |
| 00 xx 2F–30 | 2 | 00 00–01 7F | BORDER COLOR RED | 0–255 |
| 00 xx 31–32 | 2 | 00 00–01 7F | BORDER COLOR GREEN | 0–255 |
| 00 xx 33–34 | 2 | 00 00–01 7F | BORDER COLOR BLUE | 0–255 |
| 00 xx 35–36 | 2 | 00 00–01 7F | MATTE COLOR RED | 0–255 |
| 00 xx 37–38 | 2 | 00 00–01 7F | MATTE COLOR GREEN | 0–255 |
| 00 xx 39–3A | 2 | 00 00–01 7F | MATTE COLOR BLUE | 0–255 |
| 00 xx 3B–3C | 2 | 00 00–01 7F | EDGE COLOR RED | 0–255 |
| 00 xx 3D–3E | 2 | 00 00–01 7F | EDGE COLOR GREEN | 0–255 |
| 00 xx 3F–40 | 2 | 00 00–01 7F | EDGE COLOR BLUE | 0–255 |

### Video Parameter Area — DSK（p.105–106 行 6745–6809）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 00 0F 00 | 1 | 00–01 | PGM SW | OFF, ON |
| 00 0F 01 | 1 | 00–01 | PVW SW | OFF, ON |
| 00 0F 02 | 1 | 00–0F | SOURCE | HDMI 1–8, STILL 1–8 |
| 00 0F 03 | 1 | 00–02 | TYPE | LUMINANCE-WHITE, LUMINANCE-BLACK, CHROMA |
| 00 0F 04–05 | 2 | 00 00–01 7F | DSK LEVEL | 0–255 |
| 00 0F 06–07 | 2 | 00 00–01 7F | DSK GAIN | 0–255 |
| 00 0F 08–09 | 2 | 00 00–01 7F | MIX LEVEL | 0–255 |
| 00 0F 0A | 1 | 00–01 | CHROMA COLOR | GREEN, BLUE |
| 00 0F 0B | 1 | 62–00–1E | HUE WIDTH | -30–0–30 |
| 00 0F 0C–0D | 2 | 00 00–02 68 | HUE FINE | 0–360 |
| 00 0F 0E–0F | 2 | 7F 00–00 00–00 7F | SATURATION WIDTH | -128–0–127 |
| 00 0F 10–11 | 2 | 00 00–01 7F | SATURATION FINE | 0–255 |
| 00 0F 12 | 1 | 00–01 | FILL TYPE | BUS, MATTE |
| 00 0F 13 | 1 | 00–08 | MATTE COLOR | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM |
| 00 0F 14 | 1 | 00–04 | EDGE TYPE | OFF, BORDER, DROP, SHADOW, OUTLINE |
| 00 0F 15 | 1 | 00–08 | EDGE COLOR | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM |
| 00 0F 16 | 1 | 00–0E | EDGE WIDTH | 0–14 |
| 00 0F 17 | 1 | 00–02 | MODE | SELF KEY, ALPHA KEY, EXTERNAL KEY |
| 00 0F 18 | 1 | 00–0F | KEY SOURCE | HDMI 1–8, STILL 1–8 |
| 00 0F 19 | 1 | — | (reserved) | — |
| 00 0F 1A–1B | 2 | 7F 00–00 00–00 7F | VALUE WIDTH | -128–0–127 |
| 00 0F 1C–1D | 2 | 00 00–01 7F | VALUE FINE | 0–255 |
| 00 0F 1E | 1 | 00–01 | DESPILL | OFF, ON |
| 00 0F 1F–20 | 2 | 00 00–01 7F | MATTE COLOR RED | 0–255 |
| 00 0F 21–22 | 2 | 00 00–01 7F | MATTE COLOR GREEN | 0–255 |
| 00 0F 23–24 | 2 | 00 00–01 7F | MATTE COLOR BLUE | 0–255 |
| 00 0F 25–26 | 2 | 00 00–01 7F | EDGE COLOR RED | 0–255 |
| 00 0F 27–28 | 2 | 00 00–01 7F | EDGE COLOR GREEN | 0–255 |
| 00 0F 29–2A | 2 | 00 00–01 7F | EDGE COLOR BLUE | 0–255 |

### Video Parameter Area — SPLIT/VFX（xx = 10–11：SPLIT/VFX A, B）（p.106–107 行 6812–6907）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 00 xx 00 | 1 | 00–01 | SPLIT/VFX SW | OFF, ON |
| 00 xx 01 | 1 | 00–11 | SPLIT/VFX TYPE | SPLIT_V, SPLIT_H, PART MOSAIC, BACKGROUND MOSAIC, FULL MOSAIC, WAVE, RGB REPLACE, COLOR PASS, NEGATIVE, COLORIZE, POSTERIZE, SILHOUETTE, EMBOSS, FIND EDGES, MONOCOLOR, HUE OFFSET, SATURATION OFFSET, VALUE OFFSET |
| 00 xx 02–03 | 2 | 00 00–01 7F | MIX LEVEL | 0–255 |
| 00 xx 04 | 1 | 00–07 | PART MOSAIC MODE | OFF (1x1), 4x4, 8x8, 16x16, 32x32, 64x64, 128x128, 256x256 |
| 00 xx 05–06 | 2 | 7C 0C–00 00–03 74 | PART MOSAIC POSITION H | -50.0–0.0–50.0% |
| 00 xx 07–08 | 2 | 7C 0C–00 00–03 74 | PART MOSAIC POSITION V | -50.0–0.0–50.0% |
| 00 xx 09–0A | 2 | 00 64–07 68 | PART MOSAIC AREA SIZE | 10.0–100.0% |
| 00 xx 0B–0C | 2 | 00 64–07 68 | PART MOSAIC AREA CORRECTION H | 10.0–100.0% |
| 00 xx 0D–0E | 2 | 00 64–07 68 | PART MOSAIC AREA CORRECTION V | 10.0–100.0% |
| 00 xx 0F | 1 | 00–07 | BG MOSAIC MODE | OFF (1x1), 4x4, 8x8, 16x16, 32x32, 64x64, 128x128, 256x256 |
| 00 xx 10–11 | 2 | 7C 0C–00 00–03 74 | BG MOSAIC POSITION H | -50.0–0.0–50.0% |
| 00 xx 12–13 | 2 | 7C 0C–00 00–03 74 | BG MOSAIC POSITION V | -50.0–0.0–50.0% |
| 00 xx 14–15 | 2 | 00 64–07 68 | BG MOSAIC AREA SIZE | 10.0–100.0% |
| 00 xx 16–17 | 2 | 00 64–07 68 | BG MOSAIC AREA CORRECTION H | 10.0–100.0% |
| 00 xx 18–19 | 2 | 00 64–07 68 | BG MOSAIC AREA CORRECTION V | 10.0–100.0% |
| 00 xx 1A | 1 | 00–07 | FULL MOSAIC MODE | OFF (1x1), 4x4, 8x8, 16x16, 32x32, 64x64, 128x128, 256x256 |
| 00 xx 1B–1C | 2 | 00 00–01 7F | WAVE GAIN | 0–255 |
| 00 xx 1D | 1 | 00–07 | WAVE TYPE | 0–7 |
| 00 xx 1E | 1 | 00–05 | RGB REPLACE TYPE | OFF (R.G.B), B.R.G, G.B.R, R.B.G, G.R.B, B.G.R |
| 00 xx 1F | 1 | 01–3F | COLOR PASS TYPE | 1–63 |
| 00 xx 20 | 1 | 01–07 | NEGATIVE TYPE | Pr, Pb, PbPr, Y, YPr, YPb, YPbPr |
| 00 xx 21 | 1 | 00–07 | COLORIZE TYPE | 1–8 |
| 00 xx 22 | 1 | 00–03 | POSTERIZE LEVEL | 1–4 |
| 00 xx 23 | 1 | 00–7F | SILHOUETTE TYPE | 1–128 |
| 00 xx 24 | 1 | 00–7F | EMBOSS TYPE | 1–128 |
| 00 xx 25 | 1 | 00–0F | EMBOSS CONTRAST | 0–15 |
| 00 xx 26 | 1 | 00–0F | FIND EDGES FG COLOR | 0–15 |
| 00 xx 27 | 1 | 00–0F | FIND EDGES BG COLOR | 0–15 |
| 00 xx 28 | 1 | 00–3F | MONOCOLOR Pb COLOR | 0–63 |
| 00 xx 29 | 1 | 00–3F | MONOCOLOR Pr COLOR | 0–63 |
| 00 xx 2A–2B | 2 | 00 00–02 67 | HUE OFFSET VALUE | 0–359 |
| 00 xx 2C–2D | 2 | 7E 00–00 00–01 7F | SATURATION OFFSET VALUE | -256–0–255 |
| 00 xx 2E–2F | 2 | 7E 00–00 00–01 7F | VALUE OFFSET VALUE | -256–0–255 |
| 00 xx 30–31 | 2 | 7C 0C–00 00–03 74 | SPLIT CENTER A | -50.0–0.0–50.0% |
| 00 xx 32–33 | 2 | 7C 0C–00 00–03 74 | SPLIT CENTER B | -50.0–0.0–50.0% |
| 00 xx 34–35 | 2 | 7C 0C–00 00–03 74 | SPLIT CENTER POSITION | -50.0–0.0–50.0% |
| 00 xx 36 | 1 | 00–08 | SPLIT BORDER COLOR | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM |
| 00 xx 37 | 1 | 00–0E | SPLIT BORDER WIDTH | 0–14 |
| 00 xx 38–39 | 2 | 00 00–01 7F | SPLIT BORDER COLOR RED | 0–255 |
| 00 xx 3A–3B | 2 | 00 00–01 7F | SPLIT BORDER COLOR GREEN | 0–255 |
| 00 xx 3C–3D | 2 | 00 00–01 7F | SPLIT BORDER COLOR BLUE | 0–255 |

### Video Parameter Area — Panel（p.107 行 6910–6919）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 00 12 00 | 1 | 00–07 | PGM Select | INPUT1–8 |
| 00 12 01 | 1 | 00–07 | PST Select | INPUT1–8 |
| 00 12 02 | 1 | 00–07 | AUX Select | INPUT1–8 |
| 00 12 03–04 | 2 | 00 00–0F 7F | AB Fader Level | 0–2047 |
| 00 12 05 | 1 | 00–01 | AB Bus Select | A, B |
| 00 12 06 | 1 | 00–01 | DISSOLVE TAKE TYPE | CUT, AUTO |

### Audio Parameter Area — AUDIO INPUT（xx = 00–08：HDMI IN 1–8, AUDIO IN）（p.108 行 6927–6978）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 01 xx 00–02 | 3 | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | INPUT LEVEL | -INFdB, -80.0–0.0–10.0dB |
| 01 xx 03 | 1 | 00–01 | INPUT MUTE | OFF, ON |
| 01 xx 04 | 1 | 00–01 | SOLO | OFF, ON |
| 01 xx 05 | 1 | 00–06 | EFFECT PRESET | DEFAULT, MEETING, INTERVIEW, AMBIENT MIC, WINDY FIELD, DE-ESS/POPS SOFT, DE-ESS/POPS HARD |
| 01 xx 06–07 | 2 | 00 00–27 08 | DELAY | 0.0–500.0ms |
| 01 xx 08 | 1 | 00–01 | HIGH PASS FILTER 75Hz | OFF, ON |
| 01 xx 09 | 1 | 00–01 | NOISE GATE SW | OFF, ON |
| 01 xx 0A–0B | 2 | 79 60–00 00 | NOISE GATE THRESHOLD | -80.0–0.0dB |
| 01 xx 0C | 1 | 00–7F | NOISE GATE RELEASE | 30–5000ms |
| 01 xx 0D | 1 | 00–01 | COMPRESSOR SW | OFF, ON |
| 01 xx 0E–0F | 2 | 7B 28–00 00 | COMPRESSOR THRESHOLD | -60.0–0.0dB |
| 01 xx 10 | 1 | 00–0D | COMPRESSOR RATIO | 1.00:1, 1.12:1, 1.25:1, 1.40:1, 1.60:1, 1.80:1, 2.00:1, 2.50:1, 3.20:1, 4.00:1, 5.60:1, 8.00:1, 16.0:1, INF:1 |
| 01 xx 11 | 1 | 00–19 | COMPRESSOR ATTACK | 0.2–100ms |
| 01 xx 12 | 1 | 00–7F | COMPRESSOR RELEASE | 30–5000ms |
| 01 xx 13 | 1 | 00–01 | COMPRESSOR AUTO GAIN | OFF, ON |
| 01 xx 14–15 | 2 | 7C 70–00 00–03 10 | COMPRESSOR MAKEUP GAIN | -40.0–0.0–40.0dB |
| 01 xx 16 | 1 | 00–01 | EQUALIZER SW | OFF, ON |
| 01 xx 17–18 | 2 | 7E 6A–00 00–01 16 | EQUALIZER Hi GAIN | -15.0–0.0–15.0dB |
| 01 xx 19 | 1 | 44–78 | EQUALIZER Hi FREQUENCY | 1.00–20.0kHz |
| 01 xx 1A–1B | 2 | 7E 6A–00 00–01 16 | EQUALIZER Mid GAIN | -15.0–0.0–15.0dB |
| 01 xx 1C | 1 | 00–78 | EQUALIZER Mid FREQUENCY | 20Hz–20.0kHz |
| 01 xx 1D | 1 | 00–05 | EQUALIZER Mid Q | 0.5–16.0 |
| 01 xx 1E–1F | 2 | 7E 6A–00 00–01 16 | EQUALIZER Lo GAIN | -15.0–0.0–15.0dB |
| 01 xx 20 | 1 | 00–38 | EQUALIZER Lo FREQUENCY | 20–500Hz |
| 01 xx 21 | 1 | 00–03 | MONO | OFF, L ONLY, R ONLY, LR MIX |

### Audio Parameter Area — AUDIO OUTPUT ASSIGN（p.108 行 6980–6986）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 01 10 00 | 1 | 00–01 | AUDIO OUT | MASTER OUTPUT, AUX |
| 01 10 01 | 1 | 00–01 | PHONES OUT | MASTER OUTPUT, AUX |
| 01 10 02 | 1 | 00–02 | HDMI OUTPUT 1 | AUTO, MASTER OUTPUT, AUX |
| 01 10 03 | 1 | 00–02 | HDMI OUTPUT 2 | AUTO, MASTER OUTPUT, AUX |
| 01 10 04 | 1 | 00–02 | HDMI OUTPUT 3 | AUTO, MASTER OUTPUT, AUX |

### Audio Parameter Area — AUDIO MASTER OUTPUT（p.108–109 行 6990–7039）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 01 11 00–02 | 3 | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | OUTPUT LEVEL | -INFdB, -80.0–0.0–10.0dB |
| 01 11 03 | 1 | 00–01 | OUTPUT MUTE | OFF, ON |
| 01 11 04 | 1 | 00–01 | LIMITER SW | OFF, ON |
| 01 11 05–06 | 2 | 7C 70–00 00 | LIMITER THRESHOLD | -40.0–0.0dB |
| 01 11 07 | 1 | 00–01 | EQUALIZER SW | OFF, ON |
| 01 11 08–09 | 2 | 7E 6A–00 00–01 16 | EQUALIZER Hi GAIN | -15.0–0.0–15.0dB |
| 01 11 0A | 1 | 44–78 | EQUALIZER Hi FREQUENCY | 1.00–20.0kHz |
| 01 11 0B–0C | 2 | 7E 6A–00 00–01 16 | EQUALIZER Mid GAIN | -15.0–0.0–15.0dB |
| 01 11 0D | 1 | 00–78 | EQUALIZER Mid FREQUENCY | 20Hz–20.0kHz |
| 01 11 0E | 1 | 00–05 | EQUALIZER Mid Q | 0.5–16.0 |
| 01 11 0F–10 | 2 | 7E 6A–00 00–01 16 | EQUALIZER Lo GAIN | -15.0–0.0–15.0dB |
| 01 11 11 | 1 | 00–38 | EQUALIZER Lo FREQUENCY | 20–500Hz |
| 01 11 12 | 1 | 00–01 | MULTI BAND COMPRESSOR SW | OFF, ON |
| 01 11 13–14 | 2 | 7C 70–00 00 | MB COMP Hi THRESHOLD | -40.0–0.0dB |
| 01 11 15 | 1 | 00–0D | MB COMP Hi RATIO | 1.00:1 … 16.0:1, INF:1（COMPRESSOR RATIO と同じ 14 段） |
| 01 11 16–17 | 2 | 7C 70–00 00 | MB COMP Mid THRESHOLD | -40.0–0.0dB |
| 01 11 18 | 1 | 00–0D | MB COMP Mid RATIO | 同上 |
| 01 11 19–1A | 2 | 7C 70–00 00 | MB COMP Lo THRESHOLD | -40.0–0.0dB |
| 01 11 1B | 1 | 00–0D | MB COMP Lo RATIO | 同上 |

### Audio Parameter Area — AUDIO AUX OUTPUT（p.109 行 7043–7077）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 01 12 00–02 | 3 | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | OUTPUT LEVEL | -INFdB, -80.0–0.0–10.0dB |
| 01 12 03 | 1 | 00–01 | OUTPUT MUTE | OFF, ON |
| 01 12 04 | 1 | 00–01 | LIMITER SW | OFF, ON |
| 01 12 05–06 | 2 | 7C 70–00 00 | LIMITER THRESHOLD | -40.0–0.0dB |
| 01 12 07 | 1 | 00–01 | AUX SEND VIDEO | AUTO, MANUAL |
| 01 12 08 | 1 | — | (reserved) | — |
| 01 12 09 | 1 | 00–02 | AUX EFFECT HDMI IN 1 | DRY, PRE FADER, POST FADER |
| 01 12 0A | 1 | 00–02 | AUX EFFECT HDMI IN 2 | DRY, PRE FADER, POST FADER |
| 01 12 0B | 1 | 00–02 | AUX EFFECT HDMI IN 3 | DRY, PRE FADER, POST FADER |
| 01 12 0C | 1 | 00–02 | AUX EFFECT HDMI IN 4 | DRY, PRE FADER, POST FADER |
| 01 12 0D | 1 | 00–02 | AUX EFFECT HDMI IN 5 | DRY, PRE FADER, POST FADER |
| 01 12 0E | 1 | 00–02 | AUX EFFECT HDMI IN 6 | DRY, PRE FADER, POST FADER |
| 01 12 0F | 1 | 00–02 | AUX EFFECT HDMI IN 7 | DRY, PRE FADER, POST FADER |
| 01 12 10 | 1 | 00–02 | AUX EFFECT HDMI IN 8 | DRY, PRE FADER, POST FADER |
| 01 12 11 | 1 | 00–02 | AUX EFFECT AUDIO IN | DRY, PRE FADER, POST FADER |
| 01 12 12–13 | 2 | 00 00–27 08 | AUX DELAY | 0.0–500.0ms |
| 01 12 14 | 1 | 2F–00 | AUX SEND HDMI IN 1 | -INFdB, -80–0dB |
| 01 12 15 | 1 | 2F–00 | AUX SEND HDMI IN 2 | -INFdB, -80–0dB |
| 01 12 16 | 1 | 2F–00 | AUX SEND HDMI IN 3 | -INFdB, -80–0dB |
| 01 12 17 | 1 | 2F–00 | AUX SEND HDMI IN 4 | -INFdB, -80–0dB |
| 01 12 18 | 1 | 2F–00 | AUX SEND HDMI IN 5 | -INFdB, -80–0dB |
| 01 12 19 | 1 | 2F–00 | AUX SEND HDMI IN 6 | -INFdB, -80–0dB |
| 01 12 1A | 1 | 2F–00 | AUX SEND HDMI IN 7 | -INFdB, -80–0dB |
| 01 12 1B | 1 | 2F–00 | AUX SEND HDMI IN 8 | -INFdB, -80–0dB |
| 01 12 1C | 1 | 2F–00 | AUX SEND AUDIO IN | -INFdB, -80–0dB |

### Audio Parameter Area — AUDIO FOLLOW（p.109 行 7081–7094）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 01 20 00 | 1 | 00–01 | INPUT 1 | OFF, ON |
| 01 20 01 | 1 | 00–01 | INPUT 2 | OFF, ON |
| 01 20 02 | 1 | 00–01 | INPUT 3 | OFF, ON |
| 01 20 03 | 1 | 00–01 | INPUT 4 | OFF, ON |
| 01 20 04 | 1 | 00–01 | INPUT 5 | OFF, ON |
| 01 20 05 | 1 | 00–01 | INPUT 6 | OFF, ON |
| 01 20 06 | 1 | 00–01 | INPUT 7 | OFF, ON |
| 01 20 07 | 1 | 00–01 | INPUT 8 | OFF, ON |
| 01 20 08 | 1 | 00–08 | AUDIO IN | OFF, INPUT 1–8 |
| 01 20 09 | 1 | 00–01 | PinP 1 FOLLOW | OFF, ON |
| 01 20 0A | 1 | 00–01 | PinP 2 FOLLOW | OFF, ON |
| 01 20 0B | 1 | 00–01 | DSK FOLLOW | OFF, ON |

### System Parameter Area — Version（p.110 行 7101–7105）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 02 00 00 | 1 | 00–09 | System Version Major | Version Number (Read Only) |
| 02 00 01 | 1 | 00–09 | System Version Minor (1) | Version Number (Read Only) |
| 02 00 02 | 1 | 00–09 | System Version Minor (2) | Version Number (Read Only) |

### System Parameter Area — SYSTEM（p.110 行 7109–7166）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 02 01 00 | 1 | 00–01 | HDCP | OFF, ON |
| 02 01 01 | 1 | 00–07 | FRAME RATE | 60, 59.94, 50, 30, 29.97, 25, 24, 23.98 Hz |
| 02 01 02 | 1 | 00–02 | SYSTEM FORMAT | 1080p, 1080i, 720p |
| 02 01 03 | 1 | 00–04 | CUT SW ASSIGN | [AUTO TAKE], [AUTO TAKE], [CUT], [CUT], [TRANSFORM]（原文は記号付き「HAUTO TAKE, HAUTO TAKEI, HCUT, HCUTI, HTRANSFORM」。H/I は PDF の矢印記号の文字化け） |
| 02 01 04 | 1 | 00–04 | AUTO SW ASSIGN | 「AUTO TAKEI, HAUTO TAKEI, CUTI, HCUTI, TRANSFORMI」（同上） |
| 02 01 05 | 1 | 00–02 | PANEL OPERATION | A/B, PGM/PST, DISSOLVE |
| 02 01 06 | 1 | 00–02 | AUX LINKED PGM | OFF, AUTO, MANUAL |
| 02 01 07 | 1 | 00–0C | OUTPUT FADE LEFT ASSIGN | BLACK, WHITE, AUDIO, BLACK&AUDIO, WHITE&AUDIO, STILL 1–8 OUTPUT |
| 02 01 08 | 1 | 00–0C | OUTPUT FADE RIGHT ASSIGN | BLACK, WHITE, AUDIO, BLACK&AUDIO, WHITE&AUDIO, STILL 1–8 OUTPUT |
| 02 01 09 | 1 | — | (reserved) | — |
| 02 01 0A | 1 | — | (reserved) | — |
| 02 01 0B | 1 | 01–08 | LED DIMMER | 1–8 |
| 02 01 0C | 1 | 01–08 | LCD DIMMER | 1–8 |
| 02 01 0D | 1 | 00–03 | ON SCREEN MENU | UPPER LEFT, UPPER RIGHT, LOWER LEFT, LOWER RIGHT |
| 02 01 0E | 1 | 00–01 | TALLY FRAME | OFF, ON |
| 02 01 0F | 1 | 00–01 | AUX/PinP MARK | OFF, ON |
| 02 01 10 | 1 | 00–01 | REC MARK | OFF, ON |
| 02 01 11 | 1 | 00–01 | AUDIO LEVEL METER SW | OFF, ON |
| 02 01 12 | 1 | 00–02 | AUDIO LEVEL METER AUDIO IN | OFF, LOWER, UPPER |
| 02 01 13 | 1 | 00–01 | MULTI-VIEW LABEL | OFF, ON |
| 02 01 14 | 1 | 00–01 | MULTI-VIEW LABEL AUTO HIDE | OFF, ON |
| 02 01 15 | 1 | 00–03 | MULTI-VIEW LAYOUT | PVW.PGM, PGM.PVW, BLACK.PGM, PGM.BLACK |
| 02 01 16 | 1 | 00–01 | OUTPUT 3 OSD ON SCREEN MENU | OFF, ON |
| 02 01 17 | 1 | 00–01 | OUTPUT 3 OSD TALLY FRAME | OFF, ON |
| 02 01 18 | 1 | 00–01 | OUTPUT 3 OSD LABEL/LEVEL METER/MARK | OFF, ON |
| 02 01 19 | 1 | 00–01 | AUTO INPUT DETECT | OFF, ON |
| 02 01 1A | 1 | 00–01 | AUTO OFF | OFF, ON |
| 02 01 1B | 1 | 00–05 | TEST PATTERN | OFF, 75% COLOR BAR, 100% COLOR BAR, RAMP, STEP, HATCH |
| 02 01 1C | 1 | 00–03 | TEST TONE LEVEL | OFF, -20dB, -10dB, 0dB |
| 02 01 1D | 1 | 00–01 | AUX SW MODE | OFF, ON |
| 02 01 1E | 1 | 00–01 | LABEL SIZE | SMALL, NORMAL |
| 02 01 1F | 1 | 00–02 | TEST TONE FREQUENCY L | 400Hz, 1kHz, 2kHz |
| 02 01 20 | 1 | 00–02 | TEST TONE FREQUENCY R | 400Hz, 1kHz, 2kHz |
| 02 01 21 | 1 | — | (reserved) | — |
| 02 01 22 | 1 | — | (reserved) | — |
| 02 01 23 | 1 | — | (reserved) | — |
| 02 01 24 | 1 | 00–01 | EFFECTS TRANSITION SYNC | OFF, ON |
| 02 01 25 | 1 | 00–02 | TEST PATTERN MOTION | OFF, SLOW, FAST |
| 02 01 26–27 | 2 | 00 00–01 28 | USER 1 SW ASSIGN | N/A, FREEZE, AUTO SWITCHING, BPM TAP, INPUT 1–8 ASSIGN, STILL 1–8 OUTPUT, HDMI IN 1–8 MUTE, AUDIO IN MUTE, MASTER OUTPUT MUTE, AUX MUTE, INPUT SCAN NORMAL, INPUT SCAN REVERSE, MEMORY SCAN NORMAL, MEMORY SCAN REVERSE, REC CONTROL, SEQUENCER (MODE ON/OFF, NEXT, PREVIOUS, AUTO SEQUENCE), GRAPHICS PRESENTER（各値の数値は資料に無し【不明】） |
| 02 01 28–29 | 2 | 00 00–01 28 | USER 2 SW ASSIGN | 同上 |

### System Parameter Area — PANEL LOCK（p.111 行 7174–7210）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 02 02 00 | 1 | 00–01 | A/PGM 1 SW | OFF, ON |
| 02 02 01 | 1 | 00–01 | A/PGM 2 SW | OFF, ON |
| 02 02 02 | 1 | 00–01 | A/PGM 3 SW | OFF, ON |
| 02 02 03 | 1 | 00–01 | A/PGM 4 SW | OFF, ON |
| 02 02 04 | 1 | 00–01 | A/PGM 5 SW | OFF, ON |
| 02 02 05 | 1 | 00–01 | A/PGM 6 SW | OFF, ON |
| 02 02 06 | 1 | 00–01 | A/PGM 7 SW | OFF, ON |
| 02 02 07 | 1 | 00–01 | A/PGM 8 SW | OFF, ON |
| 02 02 08 | 1 | 00–01 | B/PST 1 SW | OFF, ON |
| 02 02 09 | 1 | 00–01 | B/PST 2 SW | OFF, ON |
| 02 02 0A | 1 | 00–01 | B/PST 3 SW | OFF, ON |
| 02 02 0B | 1 | 00–01 | B/PST 4 SW | OFF, ON |
| 02 02 0C | 1 | 00–01 | B/PST 5 SW | OFF, ON |
| 02 02 0D | 1 | 00–01 | B/PST 6 SW | OFF, ON |
| 02 02 0E | 1 | 00–01 | B/PST 7 SW | OFF, ON |
| 02 02 0F | 1 | 00–01 | B/PST 8 SW | OFF, ON |
| 02 02 10 | 1 | 00–01 | CUT SW | OFF, ON |
| 02 02 11 | 1 | 00–01 | AUTO SW | OFF, ON |
| 02 02 12 | 1 | 00–01 | AUX SW | OFF, ON |
| 02 02 13 | 1 | 00–01 | PinP 1 SOURCE SW | OFF, ON |
| 02 02 14 | 1 | 00–01 | PinP 2 SOURCE SW | OFF, ON |
| 02 02 15 | 1 | 00–01 | MEMORY SW | OFF, ON |
| 02 02 16 | 1 | 00–01 | MODE SW | OFF, ON |
| 02 02 17 | 1 | 00–01 | TRANSITION SW | OFF, ON |
| 02 02 18 | 1 | 00–01 | VIDEO FADER | OFF, ON |
| 02 02 19 | 1 | 00–01 | VFX/SPLIT A BLOCK | OFF, ON |
| 02 02 1A | 1 | 00–01 | VFX/SPLIT B BLOCK | OFF, ON |
| 02 02 1B | 1 | 00–01 | PinP 1 BLOCK | OFF, ON |
| 02 02 1C | 1 | 00–01 | PinP 2 BLOCK | OFF, ON |
| 02 02 1D | 1 | 00–01 | DSK BLOCK | OFF, ON |
| 02 02 1E | 1 | 00–01 | USER 1 SW | OFF, ON |
| 02 02 1F | 1 | 00–01 | USER 2 SW | OFF, ON |
| 02 02 20 | 1 | 00–01 | CAPTURE IMAGE SW | OFF, ON |
| 02 02 21 | 1 | 00–01 | OUTPUT FADE | OFF, ON |
| 02 02 22 | 1 | 00–01 | MACRO SW | OFF, ON |

### System Parameter Area — PRESET MEMORY（p.111 行 7214–7236）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 02 03 00 | 1 | 00–18 | START UP | LAST MEMORY, MEMORY 1–24 |
| 02 03 01 | 1 | 00–01 | MEMORY PROTECT | OFF, ON |
| 02 03 02 | 1 | 00–0A | PinP FADE TIME | 0.0–1.0s |
| 02 03 03 | 1 | 00–01 | LOAD PARAMETER / VIDEO INPUT | OFF, ON |
| 02 03 04 | 1 | 00–01 | LOAD PARAMETER / VIDEO OUTPUT | OFF, ON |
| 02 03 05 | 1 | 00–01 | LOAD PARAMETER / TRANSITION TIME | OFF, ON |
| 02 03 06 | 1 | 00–01 | LOAD PARAMETER / MIX/WIPE | OFF, ON |
| 02 03 07 | 1 | 00–01 | LOAD PARAMETER / PinP | OFF, ON |
| 02 03 08 | 1 | 00–01 | LOAD PARAMETER / DSK | OFF, ON |
| 02 03 09 | 1 | 00–01 | LOAD PARAMETER / VFX/SPLIT | OFF, ON |
| 02 03 0A | 1 | 00–01 | LOAD PARAMETER / AUDIO INPUT | OFF, ON |
| 02 03 0B | 1 | 00–01 | LOAD PARAMETER / AUDIO OUTPUT | OFF, ON |
| 02 03 0C | 1 | 00–01 | LOAD PARAMETER / AUDIO FOLLOW | OFF, ON |
| 02 03 0D | 1 | 00–01 | LOAD PARAMETER / A/PGM, B/PST | OFF, ON |
| 02 03 0E | 1 | 00–01 | LOAD PARAMETER / VIDEO FADER | INITIALIZE, ON |
| 02 03 0F | 1 | 00–01 | NUM OF MEMORY SW | 8, 24 |
| 02 03 10 | 1 | 00–01 | LOAD FADE SW / MIX/WIPE | OFF, ON |
| 02 03 11 | 1 | 00–01 | LOAD FADE SW / PinP 1 | OFF, ON |
| 02 03 12 | 1 | 00–01 | LOAD FADE SW / PinP 2 | OFF, ON |
| 02 03 13 | 1 | 00–01 | LOAD FADE SW / DSK | OFF, ON |
| 02 03 14 | 1 | 00–01 | LOAD PARAMETER / AUX SOURCE | OFF, ON |

### System Parameter Area — FREEZE（p.112 行 7244–7254）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 02 04 00 | 1 | 00–01 | FREEZE TYPE | ALL, SELECT |
| 02 04 01 | 1 | 00–01 | FREEZE_SELECT HDMI IN 1 | DISABLE, ENABLE |
| 02 04 02 | 1 | 00–01 | FREEZE_SELECT HDMI IN 2 | DISABLE, ENABLE |
| 02 04 03 | 1 | 00–01 | FREEZE_SELECT HDMI IN 3 | DISABLE, ENABLE |
| 02 04 04 | 1 | 00–01 | FREEZE_SELECT HDMI IN 4 | DISABLE, ENABLE |
| 02 04 05 | 1 | 00–01 | FREEZE_SELECT HDMI IN 5 | DISABLE, ENABLE |
| 02 04 06 | 1 | 00–01 | FREEZE_SELECT HDMI IN 6 | DISABLE, ENABLE |
| 02 04 07 | 1 | 00–01 | FREEZE_SELECT HDMI IN 7 | DISABLE, ENABLE |
| 02 04 08 | 1 | 00–01 | FREEZE_SELECT HDMI IN 8 | DISABLE, ENABLE |

### System Parameter Area — AUTO SWITCHING（p.112 行 7258–7289）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 02 05 00 | 1 | 00–01 | AUTO SWITCHING SW | OFF, ON |
| 02 05 01 | 1 | 00–02 | AUTO SWITCHING TYPE | INPUT SCAN, PRESET MEMORY SCAN, BPM SYNC |
| 02 05 02 | 1 | 00–02 | INPUT SCAN SEQUENCE | NORMAL, REVERSE, RANDOM |
| 02 05 03 | 1 | 00–28 | INPUT SCAN TRANSITION TIME | 0.0–4.0s |
| 02 05 04 | 1 | 00–78 | INPUT SCAN TIME / INPUT 1 | 0–120s |
| 02 05 05 | 1 | 00–78 | INPUT SCAN TIME / INPUT 2 | 0–120s |
| 02 05 06 | 1 | 00–78 | INPUT SCAN TIME / INPUT 3 | 0–120s |
| 02 05 07 | 1 | 00–78 | INPUT SCAN TIME / INPUT 4 | 0–120s |
| 02 05 08 | 1 | 00–78 | INPUT SCAN TIME / INPUT 5 | 0–120s |
| 02 05 09 | 1 | 00–78 | INPUT SCAN TIME / INPUT 6 | 0–120s |
| 02 05 0A | 1 | 00–78 | INPUT SCAN TIME / INPUT 7 | 0–120s |
| 02 05 0B | 1 | 00–78 | INPUT SCAN TIME / INPUT 8 | 0–120s |
| 02 05 0C | 1 | 00–02 | MEMORY SCAN SEQUENCE | NORMAL, REVERSE, RANDOM |
| 02 05 0D | 1 | — | (reserved) | — |
| 02 05 0E | 1 | — | (reserved) | — |
| 02 05 0F | 1 | — | (reserved) | — |
| 02 05 10 | 1 | — | (reserved) | — |
| 02 05 11 | 1 | — | (reserved) | — |
| 02 05 12 | 1 | — | (reserved) | — |
| 02 05 13 | 1 | — | (reserved) | — |
| 02 05 14 | 1 | — | (reserved) | — |
| 02 05 15–16 | 2 | 00 14–01 7A | BPM SYNC BPM | 20–250 |
| 02 05 17 | 1 | 00–01 | BPM SYNC MODE | TRANSITION, CUT |
| 02 05 18 | 1 | 00–03 | BPM SYNC SPEED | x1/4, x1/2, x1, x2 |
| 02 05 19 | 1 | 00–02 | INPUT SCAN TARGET | A/B, PinP 1–2 |
| 02 05 1A | 1 | 00–78 | MEMORY SCAN TIME / MEMORY 1 | 0–120s |
| 02 05 1B–30 | 1 each | 00–78 | MEMORY SCAN TIME / MEMORY 2–23（資料は「:」で省略。1A + (n−1)） | 0–120s |
| 02 05 31 | 1 | 00–78 | MEMORY SCAN TIME / MEMORY 24 | 0–120s |

### System Parameter Area — CTL/EXP（xx = 06–07：CTL/EXP 1, 2）（p.112 行 7293–7305）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 02 xx 00 | 1 | 00–02 | CTL/EXP TYPE | OFF, CTL A & CTL B, EXP |
| 02 xx 01–02 | 2 | 00 00–03 02 | CTL A ASSIGN | refer to p. 88（カテゴリ／値の一覧。数値対応は資料に無し） |
| 02 xx 03–04 | 2 | 00 00–03 02 | CTL B ASSIGN | refer to p. 88 |
| 02 xx 05 | 1 | 00–19 | EXP ASSIGN | refer to p. 89 |

### System Parameter Area — STILL IMAGE（p.112 行 7309–7311）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 02 08 00 | 1 | 00–01 | SAVE TO INTERNAL STORAGE | DISABLE, ENABLE |

### System Parameter Area — Roland FILL+KEY（p.112 行 7315–7317）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 02 09 00 | 1 | 00–01 | MODE | OFF, ON |

### System Parameter Area — NUMERIC KEYPAD（p.113 行 7322–7348）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 02 0A 00–01 | 2 | 00 00–03 02 | NUMERIC KEY 0 | (refer to Reference Manual) |
| 02 0A 02–03 | 2 | 00 00–03 02 | NUMERIC KEY 1 | （資料は 0 と 9 の間を「:」で省略。2 バイトずつ） |
| 02 0A 04–05 | 2 | 00 00–03 02 | NUMERIC KEY 2 | 同上 |
| 02 0A 06–07 | 2 | 00 00–03 02 | NUMERIC KEY 3 | 同上 |
| 02 0A 08–09 | 2 | 00 00–03 02 | NUMERIC KEY 4 | 同上 |
| 02 0A 0A–0B | 2 | 00 00–03 02 | NUMERIC KEY 5 | 同上 |
| 02 0A 0C–0D | 2 | 00 00–03 02 | NUMERIC KEY 6 | 同上 |
| 02 0A 0E–0F | 2 | 00 00–03 02 | NUMERIC KEY 7 | 同上 |
| 02 0A 10–11 | 2 | 00 00–03 02 | NUMERIC KEY 8 | 同上 |
| 02 0A 12–13 | 2 | 00 00–03 02 | NUMERIC KEY 9 | |
| 02 0A 14–15 | 2 | 00 00–03 02 | NUMERIC KEY + | |
| 02 0A 16–17 | 2 | 00 00–03 02 | NUMERIC KEY - | |
| 02 0A 18–19 | 2 | 00 00–03 02 | NUMERIC KEY * | |
| 02 0A 1A–1B | 2 | 00 00–03 02 | NUMERIC KEY / | |
| 02 0A 1C–1D | 2 | 00 00–03 02 | NUMERIC KEY . | |
| 02 0A 1E–1F | 2 | 00 00–03 02 | NUMERIC KEY ENTER | |

### System Parameter Area — LABEL EDIT（xx = 10–22：HDMI 1–8, STILL 1–8, PROGRAM, PREVIEW, AUX）（p.113 行 7352–7363）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 02 xx 00 | 1 | 00–7F | LABEL (0) | 1 文字目 |
| 02 xx 01 | 1 | 00–7F | LABEL (1) | 2 文字目 |
| 02 xx 02 | 1 | 00–7F | LABEL (2) | 3 文字目 |
| 02 xx 03 | 1 | 00–7F | LABEL (3) | 4 文字目 |
| 02 xx 04 | 1 | 00–7F | LABEL (4) | 5 文字目 |
| 02 xx 05 | 1 | 00–7F | LABEL (5) | 6 文字目 |
| 02 xx 06 | 1 | 00–7F | LABEL (6) | 7 文字目 |
| 02 xx 07 | 1 | 00–7F | LABEL (7) | 8 文字目 |

xx 対応：10–17 = HDMI 1–8、18–1F = STILL 1–8、20 = PROGRAM、21 = PREVIEW、22 = AUX（順序は資料の列挙順から。個別の対応表は無いため【推測】）。

### Other Parameter Area — Memory（p.113 行 7369–7374）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 0A 00 00 | 1 | 00–17 | Memory Load Trigger | Memory 1–24 (Write Only) |
| 0A 00 01 | 1 | 00–17 | Memory Save Trigger | Memory 1–24 (Write Only) |
| 0A 00 02 | 1 | 00–17 | Memory Initialize Trigger | Memory 1–24 (Write Only) |
| 0A 00 03 | 1 | 7F, 00–17 | Loaded Memory Number | Last Memory, Memory 1–24 (Read Only) |

### Other Parameter Area — Video（p.113 行 7378–7387）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 0A 20 00 | 1 | 7F, 00–28 | AUTO TAKE Trigger | AUTO, 0.0–4.0sec |
| 0A 20 01–0F | — | — | (reserved) | — |
| 0A 20 10 | 1 | 7F, 00–28 | OUTPUT FADE OFF Trigger | AUTO, 0.0–4.0sec |
| 0A 20 11 | 1 | 7F, 00–28 | OUTPUT FADE (LEFT) Trigger | AUTO, 0.0–4.0sec |
| 0A 20 12 | 1 | 7F, 00–28 | OUTPUT FADE (RIGHT) Trigger | AUTO, 0.0–4.0sec |
| 0A 20 13–17 | — | — | (reserved) | — |
| 0A 20 18 | 1 | 7F, 00–28 | OUTPUT FADE (LEFT) Toggle Trigger | AUTO, 0.0–4.0sec |
| 0A 20 19 | 1 | 7F, 00–28 | OUTPUT FADE (RIGHT) Toggle Trigger | AUTO, 0.0–4.0sec |

### Panel Control Area — Button Control（p.114 行 7395–7445）全て 00–01 ＝ 0: Release, 1: Press (Write only)

| アドレス | サイズ | 値域 | 名前 |
|---|---|---|---|
| 0B 00 00 | 1 | 00–01 | Cross-point A [1] button |
| 0B 00 01 | 1 | 00–01 | Cross-point A [2] button |
| 0B 00 02 | 1 | 00–01 | Cross-point A [3] button |
| 0B 00 03 | 1 | 00–01 | Cross-point A [4] button |
| 0B 00 04 | 1 | 00–01 | Cross-point A [5] button |
| 0B 00 05 | 1 | 00–01 | Cross-point A [6] button |
| 0B 00 06 | 1 | 00–01 | Cross-point A [7] button |
| 0B 00 07 | 1 | 00–01 | Cross-point A [8] button |
| 0B 00 08 | 1 | 00–01 | Cross-point B [1] button |
| 0B 00 09 | 1 | 00–01 | Cross-point B [2] button |
| 0B 00 0A | 1 | 00–01 | Cross-point B [3] button |
| 0B 00 0B | 1 | 00–01 | Cross-point B [4] button |
| 0B 00 0C | 1 | 00–01 | Cross-point B [5] button |
| 0B 00 0D | 1 | 00–01 | Cross-point B [6] button |
| 0B 00 0E | 1 | 00–01 | Cross-point B [7] button |
| 0B 00 0F | 1 | 00–01 | Cross-point B [8] button |
| 0B 00 10 | 1 | 00–01 | AUX [1] button |
| 0B 00 11 | 1 | 00–01 | AUX [2] button |
| 0B 00 12 | 1 | 00–01 | AUX [3] button |
| 0B 00 13 | 1 | 00–01 | AUX [4] button |
| 0B 00 14 | 1 | 00–01 | AUX [5] button |
| 0B 00 15 | 1 | 00–01 | AUX [6] button |
| 0B 00 16 | 1 | 00–01 | AUX [7] button |
| 0B 00 17 | 1 | 00–01 | AUX [8] button |
| 0B 00 18 | 1 | 00–01 | [CUT] button |
| 0B 00 19 | 1 | 00–01 | [AUTO] button |
| 0B 00 1A | 1 | 00–01 | [TRANSITION] button |
| 0B 00 1B | 1 | 00–01 | [MODE] button |
| 0B 00 1C | 1 | 00–01 | SPLIT/VFX [A] button |
| 0B 00 1D | 1 | 00–01 | SPLIT/VFX [B] button |
| 0B 00 1E | 1 | 00–01 | SPLIT/VFX [A] knob |
| 0B 00 1F | 1 | 00–01 | SPLIT/VFX [B] knob |
| 0B 00 20 | 1 | 00–01 | [CAPTURE IMAGE] button |
| 0B 00 21 | 1 | 00–01 | USER [1] button |
| 0B 00 22 | 1 | 00–01 | USER [2] button |
| 0B 00 23 | 1 | 00–01 | DSK [PVW] button |
| 0B 00 24 | 1 | 00–01 | DSK [ON] button |
| 0B 00 25 | 1 | 00–01 | PinP 1 [POSITION H] knob |
| 0B 00 26 | 1 | 00–01 | PinP 1 [POSITION V] knob |
| 0B 00 27 | 1 | 00–01 | PinP 1 [PVW] button |
| 0B 00 28 | 1 | 00–01 | PinP 1 [ON] button |
| 0B 00 29 | 1 | 00–01 | PinP 2 [POSITION H] knob |
| 0B 00 2A | 1 | 00–01 | PinP 2 [POSITION V] knob |
| 0B 00 2B | 1 | 00–01 | PinP 2 [PVW] button |
| 0B 00 2C | 1 | 00–01 | PinP 2 [ON] button |
| 0B 00 2D | 1 | 00–01 | [MENU] button |
| 0B 00 2E | 1 | 00–01 | [EXIT] button |
| 0B 00 2F | 1 | 00–01 | [VALUE] knob |

### Tally Parameter Area — Tally Info（p.114 行 7449–7459）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 0C 00 00 | 1 | 00–02 | HDMI IN 1 TALLY | OFF, PGM, PST (Read Only) |
| 0C 00 01 | 1 | 00–02 | HDMI IN 2 TALLY | OFF, PGM, PST (Read Only) |
| 0C 00 02 | 1 | 00–02 | HDMI IN 3 TALLY | OFF, PGM, PST (Read Only) |
| 0C 00 03 | 1 | 00–02 | HDMI IN 4 TALLY | OFF, PGM, PST (Read Only) |
| 0C 00 04 | 1 | 00–02 | HDMI IN 5 TALLY | OFF, PGM, PST (Read Only) |
| 0C 00 05 | 1 | 00–02 | HDMI IN 6 TALLY | OFF, PGM, PST (Read Only) |
| 0C 00 06 | 1 | 00–02 | HDMI IN 7 TALLY | OFF, PGM, PST (Read Only) |
| 0C 00 07 | 1 | 00–02 | HDMI IN 8 TALLY | OFF, PGM, PST (Read Only) |

### Tally Parameter Area — TALLY AUTO SEND（p.115 行 7465–7467）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 0C 01 00 | 1 | 00–01 | TALLY AUTO SEND | OFF, ON |

### Preset Memory Area（p.115 行 7471–7494）

「2・3 バイト目と値域は Video Parameter Area (00 00 00) / Audio Parameter Area (01 00 00) と共通」（行 7473–7474）。

| アドレス | 名前 | 意味 |
|---|---|---|
| 10 00 00 | Video Parameter (Memory 1) | Memory 1 の video parameter を Load/rewrite |
| 11 00 00 | Audio Parameter (Memory 1) | Memory 1 の audio parameter を Load/rewrite |
| 12 00 00 | Video Parameter (Memory 2) | |
| 13 00 00 | Audio Parameter (Memory 2) | |
| 14 00 00 | Video Parameter (Memory 3) | |
| 15 00 00 | Audio Parameter (Memory 3) | |
| 16 00 00 | Video Parameter (Memory 4) | |
| 17 00 00 | Audio Parameter (Memory 4) | |
| 18 00 00 | Video Parameter (Memory 5) | |
| 19 00 00 | Audio Parameter (Memory 5) | |
| 1A 00 00 | Video Parameter (Memory 6) | |
| 1B 00 00 | Audio Parameter (Memory 6) | |
| 1C 00 00 | Video Parameter (Memory 7) | |
| 1D 00 00 | Audio Parameter (Memory 7) | |
| 1E 00 00 | Video Parameter (Memory 8) | |
| 1F 00 00 | Audio Parameter (Memory 8) | |
| : | （Memory 9–23 は資料で省略。Video = 10 + 2(n−1)、Audio = 11 + 2(n−1)） | |
| 3E 00 00 | Video Parameter (Memory 24) | |
| 3F 00 00 | Audio Parameter (Memory 24) | |

### Macro Area — Macro Command（p.115 行 7499–7507）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 50 05 00 | 1 | — | (reserved) | — |
| 50 05 01 | 1 | — | (reserved) | — |
| 50 05 02 | 1 | — | (reserved) | — |
| 50 05 03 | 1 | — | (reserved) | — |
| 50 05 04 | 1 | 00–63 | EXEC MACRO TRIGGER | MACRO 1–100 |
| 50 05 05 | 1 | 00–63 | PREVIEW MACRO TRIGGER | MACRO 1–100 |

### Preset Memory Name Area（xx = 00–17：MEMORY 1–24）（p.115 行 7512–7528）

| アドレス | サイズ | 値域 | 名前 | 意味 |
|---|---|---|---|---|
| 60 xx 00 | 1 | （記載無し） | NAME (0) | プリセットメモリー xx の名前 1 文字目 |
| 60 xx 01 | 1 | （記載無し） | NAME (1) | 2 文字目 |
| 60 xx 02 | 1 | （記載無し） | NAME (2) | 3 文字目 |
| 60 xx 03 | 1 | （記載無し） | NAME (3) | 4 文字目 |
| 60 xx 04 | 1 | （記載無し） | NAME (4) | 5 文字目 |
| 60 xx 05 | 1 | （記載無し） | NAME (5) | 6 文字目 |
| 60 xx 06 | 1 | （記載無し） | NAME (6) | 7 文字目 |
| 60 xx 07 | 1 | （記載無し） | NAME (7) | 8 文字目 |

### Control Value–Input/Output Level Correspondence Table（CC#36–45 用、p.101 行 6372–6414、単位 dB）

0:-Inf 1:-80.0 2:-76.7 3:-73.3 4:-70.0 5:-66.7 6:-63.3 7:-60.0 8:-58.6 9:-57.1 10:-55.7 11:-54.3 12:-52.9 13:-51.4 14:-50.0 15:-48.9 16:-47.8 17:-46.7 18:-45.6 19:-44.4 20:-43.3 21:-42.2 22:-41.1 23:-40.0 24:-39.2 25:-38.5 26:-37.7 27:-36.9 28:-36.2 29:-35.4 30:-34.6 31:-33.8 32:-33.1 33:-32.3 34:-31.5 35:-30.8 36:-30.0 37:-29.3 38:-28.7 39:-28.0 40:-27.3 41:-26.7 42:-26.0 43:-25.3 44:-24.7 45:-24.0 46:-23.3 47:-22.7 48:-22.0 49:-21.3 50:-20.7 51:-20.0 52:-19.3 53:-18.7 54:-18.0 55:-17.3 56:-16.7 57:-16.0 58:-15.3 59:-14.7 60:-14.0 61:-13.3 62:-12.7 63:-12.0 64:-11.3 65:-10.7 66:-10.3 67:-10.0 68:-9.7 69:-9.3 70:-9.0 71:-8.7 72:-8.3 73:-8.0 74:-7.7 75:-7.3 76:-7.0 77:-6.7 78:-6.3 79:-6.0 80:-5.7 81:-5.3 82:-5.0 83:-4.7 84:-4.3 85:-4.0 86:-3.7 87:-3.3 88:-3.0 89:-2.7 90:-2.3 91:-2.0 92:-1.7 93:-1.3 94:-1.0 95:-0.7 96:-0.3 97:0.0 98:0.3 99:0.7 100:1.0 101:1.3 102:1.7 103:2.0 104:2.3 105:2.7 106:3.0 107:3.3 108:3.7 109:4.0 110:4.3 111:4.7 112:5.0 113:5.3 114:5.7 115:6.0 116:6.3 117:6.7 118:7.0 119:7.3 120:7.7 121:8.0 122:8.3 123:8.7 124:9.0 125:9.3 126:9.7 127:10.0

### MIDI Implementation Chart 要点（p.117 行 7635–7694）

- Basic Channel: 1（固定）
- Control Change Recognized: 10–31 O、32–46 O、46–51 ×、52–65 O、66–119 ×。Transmitted は全て ×
- Program Change Recognized O（True Number 1–8）、Transmitted ×
- System Exclusive: Transmitted O / Recognized O
- Note / After Touch / Pitch Bend / System Common / Real Time / Aux Messages: 全て ×
