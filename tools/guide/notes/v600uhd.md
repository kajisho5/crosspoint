# V-600UHD 抽出メモ（SW CROSSPOINT 機種追加用）

資料：
- R = `pdf/v-600uhd/V-600UHD_reference_eng07_W.txt`（Reference Manual 第 7 版・Ver.3.00 対応、pdftotext -layout、全 4079 行）。LAN/RS-232 Command Reference は p.57–59 ＝ txt 行 3163–3359（p.57–58 は 2 段組で左右混在、p.59 の List of Commands は 1 段組）。Main Specifications は p.66–67 ＝ 行 3759–3900。
- 行番号は txt の行、p. は PDF 紙面のノンブル。
- Remote Connection ガイド（iPad 用）は V-600UHD には**存在しない**（本資料のみ）。公式の iPad/iPhone アプリの記載も無い。

**結論（先に）**：V-600UHD は **MIDI SysEx を持たない**（Model ID / DT1 / RQ1 / MIDI Implementation の記載が資料に皆無）。制御は **LAN（TCP 8023・Telnet 相当のテキストコマンド）** と **RS-232（DB-9）** の 2 系統で、コマンド書式は V-160HD 系の `DTH:/RQH:` とは**別物**（`PGM:a;` のような 3 文字コマンド）。iPhone から使えるのは **LAN のみ**。USB MIDI・BLE MIDI は無い。

## 1. 接続手段

| 手段 | 有無 | 根拠 |
|---|---|---|
| LAN | **有り**。LAN port RJ45、100BASE-TX「for Remote Control」。Telnet（TCP/IP）で遠隔操作、**TCP ポート 8023**。加えて内蔵 WebRCS（Web アプリ、`http://<IP>:8080/`） | R 行 3866（p.67）、行 3169–3178（p.57）、行 2814（p.50） |
| USB | **無し**（制御用途）。USB は USB MEMORY port（USB A、USB フラッシュドライブ用）のみ。「USB MIDI」「REMOTE(USB)」「class compliant」の記載無し | R 行 3863（p.67）、行 313–319（p.4） |
| Bluetooth | **無し**（BLE MIDI も音声も記載無し。grep「Bluetooth」ヒット 0） | R 全文 |
| RS-232 | **有り**。DB-9 Male「for Remote Control」。9600/38400 bps、8bit、パリティ無し、ストップ 1、ASCII、フロー制御 XON/XOFF、クロスケーブル | R 行 3864、行 3223–3263（p.58） |
| MIDI DIN | **無し**（「MIDI」の語は資料に 1 件も無い） | R 全文 grep |
| TALLY/GPI | DB-25 Female（Tally 出力 16、GPI 入力 8）— iPhone からは使えない | R 行 3867、行 3361–3407（p.60） |
| Wi-Fi | 記載無し（LAN は有線 RJ45 のみ） | R 行 3866 |

リアパネル説明（R 行 563–570、p.7）：「LAN connector, RS-232 connector：Web ブラウザまたは**ターミナルソフト**で本機を遠隔操作できる／RS-232 端子付きの PC を接続して遠隔操作できる」。

iPad/iPhone との接続：公式ガイド無し。WebRCS は「ネットワーク上の PC またはタブレットの Web ブラウザから」操作（R 行 3170–3176）とあり、タブレット＝ブラウザ経由のみ。SW CROSSPOINT としては **LAN（TCP 8023）トランスポートだけ**を capabilities で有効にし、USB MIDI・BLE MIDI は無効にする。

LAN 制御の前提条件（R 行 3180–3218、p.57、Menu p.50 行 2789–2817）：
- `[MENU] → Remote Control → LAN Control`：Configure = DHCP Server / DHCP Client / Manually（変更は**次回起動時に反映**）、IP Address（既定 **192.168.2.254**）、Subnet Mask（既定 255.255.255.0）、MAC Address 表示、Password、Remote Control URL（既定 `http://192.168.2.254:8080/`、ネットワーク未接続時は表示されない）
- Password：「ネットワーク接続に必要なパスワードを **4 文字**で設定」。「Password not set / Password set」の表示、Reset Execute で未設定へ戻す。「同じネットワーク上の PC 等から V-600UHD にアクセスする時にここで設定したパスワードを入力する」（行 2804–2812）
- パスワードは **Ver.3.00 で追加**（「Added Password for LAN command control and WebRCS function」行 90）。→ Ver.3.00 未満の個体はパスワード無しで接続できる【推測：Ver.3.00 未満の挙動は資料に明記無し】
- RS-232 側は `Remote Control → RS-232 = Off/On`（既定 Off）、Baudrate 9600/38400（行 2780–2781）。LAN 側に「LAN コマンド制御 On/Off」の項目は**無い**（LAN Control メニューに無い）→ 常時有効【推測】
- LAN/RS-232 コマンドと WebRCS は **Ver.1.07 で追加**された機能（行 248–253）

## 2. SysEx

**無し**。Manufacturer ID / Device ID / Model ID / DT1 / RQ1 / チェックサム / MIDI Implementation Chart のいずれも資料に存在しない（grep「MIDI」「SysEx」「F0」「41H」「Device ID」ヒット 0。目次 p.2–3 にも MIDI Implementation の章が無い）。
→ SW CROSSPOINT の SysEx 経路（USB MIDI / BLE MIDI）は V-600UHD では**使えない**。`lib/features.ts` の経路判定は「LAN 簡易制御コマンド」側に全振りする。

## 3. LAN プロトコル（R p.57–59、行 3163–3359）

| 項目 | 値 | 根拠 |
|---|---|---|
| トランスポート | TCP（「Telnet を使って LAN（TCP/IP）越しに遠隔操作」） | 行 3171–3177 |
| ポート | **8023** | 行 3178 |
| 認証 | 「ネットワーク接続時に必要なパスワード（**4 文字**）」。LAN コマンド制御にも適用（Ver.3.00 追加）。**TCP 8023 上でのパスワード送信のハンドシェイク文字列・プロンプト形式は資料に記載無し【不明】**（p.57 右段の Username `user` / Password の手順は WebRCS のブラウザ sign-in ダイアログの説明） | 行 3202–3213、行 90、行 2804–2812 |
| コマンド書式（共通） | `stx` + コマンドコード（英字 3 文字）+ `:` + パラメータ（複数は `,` 区切り）+ `;`。全て ASCII。stx = 02H | 行 3267–3284 |
| LAN での差分 | **LAN（TCP/IP）では送信コマンドの stx(02H) を省略する**。応答も stx を省略 | 行 3299、3301–3302 |
| ACK 形式（LAN） | **`ACK` + LF ＝ 41H 43H 4BH 0AH**（文字列 "ACK\n"）。V-160HD 系の 1 バイト 06H とは違う | 行 3300–3302 |
| ACK 形式（RS-232） | 制御コード ACK（**06H**）（「stx(02H)、ACK(06H)、XON(11H)/XOFF(13H) は制御コード」） | 行 3286–3287 |
| エラー形式 | 本機から自発送信 `ERR:a;`（RS-232 では `stxERR:a;`）。a = **0**：syntax error（受信コマンドに誤り）、**5**：out of range error（引数が範囲外） | 行 3349–3353 |
| フロー制御 | XON(11H)/XOFF(13H) を本機が自発送信（RS-232 の XON/XOFF フロー制御。LAN でも表に載っているが LAN で来るかは【不明】） | 行 3286–3287、3344–3345、3354–3355 |
| 送信ルール | 「コントローラから連続してコマンドを送る時は、**各コマンドごとに ACK が返るのを確認してから次を送る**」 | 行 3296–3298 |
| キープアライブ | 記載無し【不明】 | — |
| 読出（RQ 相当） | `RQH:` のような汎用読出は**無い**。読めるのは `VER;`（バージョン文字列）のみ。`ACS;`（Acquire status）は応答が ACK としか書かれておらず、状態の中身は【不明】 | 行 3340–3343 |
| 自発通知 | ERR / XON / XOFF のみ（タリー・PGM 変更の自発通知は記載無し） | 行 3349–3355 |
| 複数接続・切断 | 記載無し【不明】 | — |

V-160HD 系（`DTH:aabbcc,vv;` / `RQH:` / ACK 06H）とは**全く別の書式**。アドレス指定型ではなく「3 文字コマンド＋10 進引数」の簡易コマンド。V-60HD 系（`PGM:a;` 等）に近い形【推測：V-60HD 資料は本メモの範囲外】。

### 接続手順（iPhone 側の実装として）
1. V-600UHD の `Remote Control → LAN Control` で IP を確認（既定 192.168.2.254/24。DHCP Server モードなら iPhone が本機から IP を貰える。Configure 変更後は再起動が必要：行 2792）
2. TCP で `<IP>:8023` へ接続
3. （Ver.3.00 以降でパスワード設定済みなら）パスワード入力が要るはず【推測：手順・プロンプト文字列は資料に無い。実機で Telnet 接続直後の受信バイト列を診断画面で記録する】
4. `VER;`（stx 無し）を送り、`VER:V-600UHD,<version>;` が返れば接続確認（行 3342）
5. 以後、1 コマンド送信 → `ACK\n` 受信 → 次コマンド

## 4. コマンド一覧（R p.59、行 3295–3355。全転記）

共通：LAN では先頭の stx(02H) を付けない。応答は LAN では `ACK\n`（41 43 4B 0A）、RS-232 では 06H。引数は 10 進 ASCII。

### Video-related operations（行 3304–3322）

| 項目 | 送信コマンド（RS-232 表記） | LAN で送る実バイト列 | 応答 | 引数 |
|---|---|---|---|---|
| Select PGM channel | `stxPGM:a;` | `PGM:a;` | ACK | a: 0 (XPT 1) – 7 (XPT 8) |
| Select PST channel | `stxPST:a;` | `PST:a;` | ACK | a: 0 (XPT 1) – 7 (XPT 8) |
| Select channel to send to AUX bus | `stxAUX:a;` | `AUX:a;` | ACK | a: 0 (XPT 1) – 7 (XPT 8) |
| Select transition pattern | `stxTRS:a;` | `TRS:a;` | ACK | a: 0 (WIPE 1), 1 (WIPE 2), 2 (WIPE 3), 3 (MIX) |
| Set video transition time | `stxTIM:a;` | `TIM:a;` | ACK | a: 0 (0.0 sec) – 40 (4.0 sec)（0.1 秒刻み） |
| Press the [AUTO] button | `stxATO;` | `ATO;` | ACK | （無し） |
| Press the [CUT] button | `stxCUT;` | `CUT;` | ACK | （無し） |
| Select COMPOSITION type | `stxCTY:a;` | `CTY:a;` | ACK | a: 0 (None), 1 (PinP1-1), 2 (PinP1-2), 3 (Key1), 4 (PinP1-1+Key1), 5 (PinP1-2+Key1) |
| Select DSK type | `stxDTY:a;` | `DTY:a;` | ACK | a: 0 (None), 1 (PinP2-1), 2 (PinP2-2), 3 (DSK), 4 (PinP2-1+Key2), 5 (PinP2-2+Key2) |
| Press the [COMPOSITION] button | `stxCMP;` | `CMP;` | ACK | （無し）— COMPOSITION（PinP1/KEY1）の ON/OFF トグル【推測：ボタン押下相当】 |
| Press the [DSK] button | `stxDSK;` | `DSK;` | ACK | （無し）— DSK（PinP2/KEY2）の ON/OFF トグル【推測：同上】 |
| Set output fade on/off | `stxFDE:a;` | `FDE:a;` | ACK | a: 0 (OFF), 1 (ON) |
| Set output fade time | `stxFDT:a;` | `FDT:a;` | ACK | a: 0 (0.0 sec) – 100 (10.0 sec)（0.1 秒刻み） |

### Audio-related operations（行 3326–3332）

| 項目 | 送信コマンド | LAN 実バイト列 | 応答 | 引数 |
|---|---|---|---|---|
| Adjust volume level of input audio | `stxIAL:a,b;` | `IAL:a,b;` | ACK | a: 0 (HDMI IN1) – 7 (TEST TONE)。b: -801 (-INF dB), -800 (-80.0 dB) – 0 (0.0 dB) – 100 (10.0 dB)（0.1 dB 刻み） |
| Adjust volume level for master out | `stxOAL:a;` | `OAL:a;` | ACK | a: -801 (-INF dB), -800 (-80.0 dB) – 0 (0.0 dB) – 100 (10.0 dB) |
| Adjust volume level for AUX-bus audio | `stxOAX:a;` | `OAX:a;` | ACK | a: -801 (-INF dB), -800 (-80.0 dB) – 0 (0.0 dB) – 100 (10.0 dB) |

`IAL` の a の並び（0=HDMI IN1 … 7=TEST TONE の中間は資料に明記無し）：Audio メニューの入力並び（HDMI IN1–4、SDI IN5–6、AUDIO IN、Test Tone：行 2546–2609、ブロック図 行 4040–4062）から **0 HDMI IN1 / 1 HDMI IN2 / 2 HDMI IN3 / 3 HDMI IN4 / 4 SDI IN5 / 5 SDI IN6 / 6 AUDIO IN / 7 TEST TONE**【推測。実機で確認】。
入力ミュート専用コマンドは**無い**（Level を -801 = -INF にするしかない）。マスターのミュートも無い。

### System-related operations（行 3336–3345）

| 項目 | 送信コマンド | LAN 実バイト列 | 応答 | 引数 |
|---|---|---|---|---|
| Set HDCP on/off | `stxHCP:a;` | `HCP:a;` | ACK | a: 0 (OFF), 1 (ON) |
| Call up memory | `stxMEM:a;` | `MEM:a;` | ACK | a: 0 (1-1) – 63 (8-8)（バンク b・番号 n → a = (b−1)×8 + (n−1)【推測：1-1=0, 8-8=63 から線形と仮定】） |
| Acquire status of V-600UHD | `stxACS;` | `ACS;` | ACK | （無し）。応答に状態が含まれるかは**資料に書かれていない**【不明】 |
| Version information | `stxVER;` | `VER;` | `stxVER:V-600UHD,a;`（LAN では `VER:V-600UHD,a;`） | a: Version（ASCII 文字列） |
| Flow control | XON | （11H） | — | — |
| Flow control | XOFF | （13H） | — | — |

### Commands spontaneously sent from the V-600UHD（行 3349–3355）

| 項目 | 本機→コントローラ | 引数 |
|---|---|---|
| Error detected | `stxERR:a;`（LAN では `ERR:a;`） | a: 0 (syntax error)：受信コマンドに誤りがある。5 (out of range error)：受信コマンドの引数が範囲外 |
| Flow control | XON（11H） | — |
| Flow control | XOFF（13H） | — |

### コマンド一覧に **無い** もの（V-160HD 系で使っている機能との差）
- PGM/PST/AUX の**現在値読出**（タリー取得）：無し
- フェーダー（T-bar）位置の設定・読出：無し
- クロスポイント割当（XPT n に Ch を割当）の変更：無し（メニューのみ：行 3060–3070）
- PinP / Key の ON PGM / ON PVW 個別制御、ソース選択、位置：無し（CTY/DTY でタイプ選択、CMP/DSK でボタン押下のみ）
- 入力ミュート、AUDIO OUT/PHONES レベル：無し
- メモリー保存、現在メモリー番号、名前：無し（ロードのみ）
- 入力ラベル（Multi-view Label XPT1–8）：無し
- マクロ / シーケンサー：機能自体が無い
- カメラ制御（PTZ）コマンド：無し（本体メニュー・パネル操作のみ）
- Still 読込、キャプチャ：無し

## 5. ソース一覧（PGM/PST/AUX の値 → 物理入力）

`PGM:a;` 等の a は**クロスポイント番号（XPT 1–8 → 0–7）**であり物理入力ではない。XPT に割り当たる Ch（入力チャンネル）は `System → Cross-point Assign`（行 3060–3070、p.54）で変更でき、既定は XPT n = Ch.n（Blank / None も可）。Ch と物理入力の対応（行 899–906、p.14、Input → Assign/Scaling 行 2043–2049）：

| 値 a | XPT | 既定 Ch | Ch のソース候補（既定） |
|---|---|---|---|
| 0 | XPT 1 | Ch.1 | **HDMI IN1** または RGB IN1（排他、メニュー選択）、Shared Ch.2–8 |
| 1 | XPT 2 | Ch.2 | HDMI IN2、Shared Ch.1–8 |
| 2 | XPT 3 | Ch.3 | HDMI IN3、Shared Ch.1–8 |
| 3 | XPT 4 | Ch.4 | HDMI IN4、Shared Ch.1–8 |
| 4 | XPT 5 | Ch.5 | SDI IN5、Shared Ch.1–8 |
| 5 | XPT 6 | Ch.6 | SDI IN6、Shared Ch.1–8 |
| 6 | XPT 7 | Ch.7 | STILL1、Shared Ch.1–8 |
| 7 | XPT 8 | Ch.8 | PG（パターンジェネレータ／背景色）または STILL2、Shared Ch.1–7 |

- Cross-point Assign の値域：XPT1–8 それぞれ Ch.1–8 / Blank（黒出力）/ None（行 3062–3070、1905–1909）
- Multi-view ラベル既定：PGM / PVW / CH.1–CH.8（行 3096–3107）。アプリの入力名の既定値として使える（読出コマンドは無い）

## 6. 数

| 項目 | 値 | 根拠 |
|---|---|---|
| 入力チャンネル（XPT） | 8（Ch.1–8、XPT 1–8） | 行 899–906、3062–3070 |
| 映像チャンネル（スペック表記） | 6 channels（HDMI 4 + SDI 2） | 行 3763 |
| HDMI IN | 4（HDMI IN 1–4、HDMI 2.0）。HDMI IN1 は RGB IN1（HD DB-15）と排他 | 行 3845–3849 |
| SDI IN | 2（SDI IN 5–6、12G/6G/3G/HD） | 行 3847 |
| STILL | 2（STILL1 = Ch.7、STILL2 = Ch.8 と PG 排他）。USB から読込める静止画は 8 枚（Ver.2.00 で 2→8） | 行 905–906、158–159 |
| PinP | COMPOSITION（PinP1、Position 1/2）＋ DSK（PinP2、Position 1/2）。同時に動くのは COMPOSITION 1 系統 + DSK 1 系統 | 行 2396–2404、2474–2480、3811–3812 |
| KEY | Key1（COMPOSITION 側）、Key2/DSK（DSK 側）。Luminance / Chroma | 行 3811–3812、3820 |
| DSK | 1（PinP2 / Key2 / PinP+Key） | 行 3312–3318 |
| SPLIT | 無し | — |
| AUX | 1 バス（AUX と COMPOSITION は排他、`System → Aux/Composition`）。AUX ソース選択は `AUX:a;` | 行 2997、3308 |
| トランジション | Mix、Cut、Wipe 9 パターン（パネルは WIPE 1–3 プリセット + MIX） | 行 3810、2347–2356 |
| トランジション時間 | 0.0–4.0 s（`TIM:0–40`） | 行 2349、3310 |
| メモリー | 64（8 バンク × 8、`MEM:0–63`） | 行 3839、3339、2753 |
| マクロ / シーケンサー | 無し | — |
| オーディオ入力（`IAL` の a） | 8（HDMI IN1–4、SDI IN5–6、AUDIO IN、TEST TONE） | 行 3328、2546–2609 |
| オーディオ出力 | MAIN（`OAL`）、AUX（`OAX`）。AUDIO OUT XLR、PHONES、HDMI OUT 1–3、SDI OUT、MULTI-VIEW への埋込 | 行 3331–3332、2622–2660 |
| 映像出力 | HDMI OUT 1–3、SDI OUT 1、MULTI-VIEW 1 | 行 3850–3852 |
| タリー | TALLY 1–8 PGM / PST（GPI 端子、接点出力）。LAN からは読めない | 行 3370–3384 |
| GPI | 8（PGM XPT1–8 / PST XPT1–8 / Memory Load1-1–1-8 / DSK SRC Sel1–8） | 行 2956–2969 |
| 出力フェード時間 | 0.0–10.0 s（`FDT:0–100`） | 行 3083、3322 |

## 7. 機種固有の注意

- **SysEx 非対応・USB/BLE 非対応**。LAN TCP 8023 のテキストコマンドのみ。SW CROSSPOINT の「SysEx アドレス」経路は全部無効、`lib/features.ts` の機種×接続判定で LAN 簡易コマンドだけを有効にする。
- ACK は **`ACK\n`（4 バイト）**。V-160HD 系の 06H と受信パーサを分ける。
- **読出コマンドが `VER;` しか無い**。PGM/PST/AUX/フェーダー/メモリー番号/タリーの現在値は取得できない → アプリ側は「送った値を表示」するしかなく、本体パネル操作で変わると追従できない（`ACS;` の応答内容を実機で確認）。
- パスワード（4 文字）は Ver.3.00 で LAN コマンド制御にも追加。**TCP 8023 でのパスワード入力手順は未記載** → 実機で接続直後の受信を観測する必要あり。
- RS-232 側は `Remote Control → RS-232 = On` にしないと効かない（既定 Off）。LAN 側の On/Off は無い。
- IP 設定変更（Configure/IP）は**再起動後**に反映。
- 対応 FW：LAN/RS-232 コマンドと WebRCS は **Ver.1.07 以降**（行 248–253）。パスワードは Ver.3.00 以降。本資料は Ver.3.00 準拠（行 87）。
- `PGM/PST/AUX` の引数は XPT 番号（0 始まり）。V-160HD 系の「INPUT n 割当」に相当するものは無く、XPT→Ch の割当はメニューのみ。
- 入力ミュート・マスターミュートのコマンドが無いので、アプリのミュートは `IAL:a,-801;` / `OAL:-801;` で代替するか、ボタンを置かない（SPEC §9-5「使えない機能はボタンを置かない」）。レベル復帰値をアプリ側で覚える必要がある。
- CUT/AUTO は `CUT;` / `ATO;`。マクロ・シーケンサー経路は無し。
- `CMP;` `DSK;` はボタン押下（トグル）であり ON/OFF の指定不可。現在状態も読めないので UI は「押す」ボタンにする。
- XON/XOFF（11H/13H）が受信ストリームに混ざり得る（RS-232 由来。LAN で来るかは不明）→ パーサで無視する実装を入れておく。
- フェーダー（T-bar）位置の制御・読出は無い。

## 8. 不明・推測一覧（実機で確認）

1. 【不明】TCP 8023 接続直後のパスワード認証：プロンプト文字列の有無、送信形式（4 文字＋改行？ `;` 終端？）、認証失敗時の応答、Ver.3.00 未満／パスワード未設定時に認証が省略されるか。
2. 【不明】`ACS;` の応答：ACK だけか、状態文字列を含むか。含むなら書式。
3. 【推測】`IAL` の a=1–6 の並び（HDMI IN2/3/4、SDI IN5/6、AUDIO IN の順）。
4. 【推測】`MEM:a;` の a とバンク・番号の対応が線形（a = (bank−1)×8 + (no−1)）。
5. 【不明】LAN で XON/XOFF が送られてくるか。
6. 【不明】同時接続数、無通信時のタイムアウト／切断、キープアライブの要否。
7. 【不明】`VER:` の実際の文字列（例：`VER:V-600UHD,3.00;`？）と応答終端（`;` の後に LF が付くか：ACK には LF が付く）。
8. 【不明】ERR 応答が ACK の代わりに返るのか、ACK の後に別途来るのか。
9. 【不明】パネル操作時や PGM 変更時の自発通知の有無（資料上は ERR/XON/XOFF のみ）。
10. 【不明】コマンド送信間隔の下限（「ACK を待ってから次を送れ」以外の数値は無し）。
11. 【不明】`CMP;` / `DSK;` が AUX モード（Aux/Composition = Aux）のとき何をするか。
12. 【不明】コマンド末尾に LF/CR を付けても受理されるか（Telnet クライアント想定なら改行が来る前提の可能性）。
13. 【不明】V-600UHD の Multi-view ラベル（入力名）を取得する手段（無さそう）。
14. 【推測】LAN 側は常時コマンド受付（RS-232 のような On/Off 項目が無い）。
