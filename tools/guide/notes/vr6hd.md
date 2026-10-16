# VR-6HD 抽出メモ（SW CROSSPOINT 機種追加用）

資料（すべて `pdf/vr-6hd/`、pdftotext -layout 済み。行番号は txt の行、p. は PDF 紙面のノンブル）：
- G = `VR-6HD_Control_eng03_W.txt`（Remote Control Guide eng03。MIDI Implementation Version 2.00 / Sep 27 2024 = p.2–33 行 23–2428、LAN/RS-232 Command Reference = p.34–35 行 2429–2554）
- C = `VR-6HD_Remote_Connection_eng02_W.txt`（VR-6HD Remote（iPad）Connection Guide、201 行）
- R = `VR-6HD_Reference_eng05_W.txt`（Reference Manual eng05、9944 行。リモート制御 p.100 行 6325–6400、NETWORK メニュー p.153 行 9200–9235、Main Specifications p.155–157 行 9684–9890）
- B = `LAN_RS-232_Basic_Control_Commands_eng02_W.txt`（V-160HD/V-80HD/VR-120HD/VR-6HD/V-1-4K 共通の簡易制御コマンド、3403 行）

## 1. 接続手段

| 手段 | 有無 | 根拠 |
|---|---|---|
| LAN | **有り**。DIRECT STREAM ポート（RJ45、1000BASE-TX「for Live Streaming and Remote Control」）。Telnet（TCP/IP）で **TCP 8023**。配信用ポートと兼用 | G 行 2435–2443（p.34）、R 行 422–431, 9878 |
| USB | **有り**。USB STREAM 端子（USB Type-C）「for remote control from PC and iPad」。PC からは USB video class / USB audio class デバイスとして認識、OS 標準ドライバが自動導入（R 行 3775–3790）。**USB MIDI クラス／MIDI デバイスとして見えるかの明記は無し【不明】**。iPad アプリは USB-C ケーブル（または Lightning-USB カメラアダプタ）で直結し「USB」ボタンで接続（C 行 86–116）。ドライバ導入手順が無いことから USB MIDI クラスコンプライアント【推測】。実機で iPhone の CoreMIDI に見えるか確認 | R 行 407–420, 9833, 9873、C 行 86–128 |
| Bluetooth | **有り（BLE MIDI）**。仕様「Bluetooth Ver 5.0、Profile: A2DP (Audio), **GATT (MIDI over Bluetooth Low Energy)**、Codec SBC」「Bluetooth connection: for remote control from iPad」。iPad アプリの手順：VR-6HD 側 MENU→SYSTEM→Bluetooth→ON、iPad 側はアプリの CONNECT [SETUP]→[Bluetooth]→**[Bluetooth MIDI Device] で「Roland VR-6HD」を選びペアリング**→STEP 3 の欄で「Roland VR-6HD (Bluetooth)」を選択→[CONNECT]。「iPad の Bluetooth 設定の一覧に Roland VR-6HD が出ても、そこではタップしない」。複数台ペアリング可だが同時接続は 1 台 | R 行 9867–9870, 9874、C 行 30–80 |
| RS-232 | 有り。DB-9 オス、9600/38400/115200 bps、8N1、ASCII、クロスケーブル。MENU→SYSTEM→RS-232 を ON（02 10 00）。iPhone からは使えない | G 行 2435–2483、R 行 8825–8829 |
| MIDI DIN | 無し（MIDI IN/OUT 端子の記載無し。MIDI Implementation Chart は SysEx のみ O、CC/PC は x） | G 行 2369–2427、R 行 9870–9878 |
| その他 | USB HOST（USB A：USB メモリ・テンキー）、CTL/EXP 1–2（1/4" TRS）、TALLY/GPIO（DB-25：Tally/GPO 16、GPI 8）— iPhone からは使えない | R 行 9872–9876 |

iPad アプリ（VR-6HD Remote）の接続（C 全文）：
- 「VR-6HD Remote は VR-6HD 専用 iPad アプリ。**Bluetooth、USB、無線 LAN（Wi-Fi）** で iPad と接続」（C 行 6–8）
- 他アプリへ切替／自動ロックで切断、戻ると自動再接続（数秒）。自動ロック OFF 推奨（C 行 11–17）
- 「本アプリは VR-6HD **システムプログラム 2.00 以降**に対応」（C 行 19–20）
- Wi-Fi 経由：VR-6HD の DIRECT STREAM を無線 LAN 親機の LAN ポートへ、DHCP で IP 取得、MENU→NETWORK→**NETWORK PASSWORD（4 文字）** を設定。アプリ側は [LAN]→「IP ADDRESS」と「NETWORK PASSWORD」を入力→[CONNECT]。ステータスアイコンが「LAN」で接続（C 行 134–200）
- USB 経由：USB STREAM に接続→電源 ON→アプリ [USB]。USB MONITOR 機能は M1 以降・iPadOS 17 以降・USB-C・USB 3.0 ケーブルが条件（C 行 86–128）
- iPhone の記載は無し（iPad のみ）。R p.100 も「iPad（VR-6HD Remote）」「PC（VR-6HD RCS：USB/LAN/RS-232/Wi-Fi）」（R 行 6325–6400）

→ iPhone から使えるのは **LAN（TCP 8023）・USB（MIDI、要実機確認）・BLE MIDI** の 3 つ。V-160HD 系で初めて BLE MIDI が公式に明記されている機種。

## 2. SysEx（G p.2 行 23–108、チェックサム p.32 行 2296–2351）

| 項目 | 値 | 根拠 |
|---|---|---|
| Manufacturer ID | 41H（Roland） | 行 30, 36–38, 81 |
| Device ID | **10H**（既定）。範囲の記載無し【不明】。R のメニューに Device ID 設定項目は無い（SYSTEM メニュー 行 9380–9430 に無し） | 行 30, 39, 82 |
| Model ID | **00H 00H 00H 00H 2CH**（5 バイト） | 行 30, 43–48, 83–87 |
| DT1 Command ID | 12H | 行 30, 49 |
| RQ1 Command ID | 11H | 行 75, 88 |
| DT1 書式 | `F0 41 10 00 00 00 00 2C 12 aa bb cc dd … ee sum F7` | 行 29–31 |
| RQ1 書式 | `F0 41 10 00 00 00 00 2C 11 aa bb cc ss tt uu sum F7`（サイズ 3 バイト） | 行 75–96 |
| RQ1 応答 | 送信可能な状態でアドレス・サイズが適切なら DT1 で返す。不適切なら**何も返さない** | 行 65–71 |
| チェックサム | アドレス＋データ（RQ1 はサイズ）の合計 ÷ 128 の余り r、checksum = 128 − r（r = 0 なら 0） | 行 2305–2314 |
| 計算例 | PGM Select を INPUT 2（18H）にする：`F0 41 10 00 00 00 00 2C 12 00 0F 00 18 59 F7` | 行 2319–2346 |
| 分割サイズ | 256 バイトを超えるデータは **256 バイト以下**のパケットに分割 | 行 68–69 |
| 送信間隔 | DT1 を連続送信する時は **20 ms 以上**の間隔 | 行 69 |
| MIDI ch | n = 00H 固定 | 行 30 |
| 版 | MIDI Implementation Version 2.00（Sep 27, 2024）。MIDI Implementation Chart Version 1.10（November 8, 2023） | 行 24–27, 2369–2370 |

値のエンコード（行 2344–2351）：7bit/バイト。複数バイトは aa×128+bb（連続アドレスに上位から）。「nibbled」の説明はあるが VR-6HD の Address Map に nibbled と明記された項目は無い。負値は 7bit の 2 の補数：1 バイト 60H = −32、2 バイト 70H 30H = −2000、3 バイト 7FH 79H 60H = −800（= −80.0 dB）、7EH 00H 00H = −INF。「#」付きアドレスは無く、2 バイト以上の値は下の行に 2 番目以降のアドレス（05H, 06H …）を書く形式。

## 3. LAN プロトコル（G p.34–35 行 2429–2554、B 全文、R 行 9200–9235）

| 項目 | 値 | 根拠 |
|---|---|---|
| ポート | DIRECT STREAM ポート、**TCP 8023**、Telnet で操作 | G 行 2436–2443 |
| 認証 | **NETWORK PASSWORD 4 文字**（MENU→NETWORK→NETWORK PASSWORD。「Password not set ––––／Password set」表示あり。「同一ネットワーク上の PC 等から VR-6HD にアクセスする時に入力」）。iPad アプリも IP ADDRESS＋NETWORK PASSWORD（4 文字）で接続。NETWORK メニューに **USER NAME（値「user」、「Shows the user name required to connect to the network」）** がある → ログインにユーザー名「user」を使う可能性【推測】 | G 行 2488–2493、R 行 9217–9224、C 行 175–181, 195–198 |
| ハンドシェイク文字列 | **記載無し**【不明】（接続直後のプロンプト、パスワードの送り方、成功/失敗応答が G/B/R に無い） | — |
| コマンド書式 | ASCII。`stx コマンドコード:パラメータ,パラメータ;`。stx = 02H。コマンドコードは 3 文字英数字（G）。**LAN（Telnet）では stx を省略可**。`;` が終端。LAN と RS-232 で共通 | G 行 2485–2508, 2514 |
| 書込 | `stxDTH:a,b;`（a: SysEx アドレス 3 バイト 16 進、b: 値 16 進）例 `DTH:123456,01;` → 応答 **ack** | G 行 2518–2521 |
| 読出 | `stxRQH:a,b;`（b: サイズ 3 バイト 16 進）→ 応答 `stxDTH:a,c;` | G 行 2523–2525 |
| バージョン | `stxVER;` → `stxVER:a,b;`（a = VR-6HD、b = 例 1.00）。B では `VER;` → `VER:a,b;ACK;` | G 行 2527–2528、B 行 3263–3281 |
| ACK 形式 | **G（DTH/RQH/VER）：「ack」＝制御コード 06H の 1 バイト**（「The codes of stx (02H), ack (06H), xon (11H), and xoff (13H) are the control codes」）。**B（簡易制御コマンド）：文字列 `ACK;` の後に LF（0x0A）**。両方式が同一ポート上に共存（B「簡易コマンドは通常コマンドと同時に使える」）。→ V-160HD/VR-120HD 系と同じ | G 行 2507–2508, 2518、B 行 49, 73–76, 3394 |
| エラー | `stxERR:a;` a = 0 syntax error、4 invalid（他の設定に支配されて効かない）、5 out of range、6 no stx error（**RS-232 のみ**）。B では `ERR:a;`（0/4/5） | G 行 2541–2545、B 行 3396–3398 |
| フロー制御 | xon（11H）/ xoff（13H）を双方向で使う | G 行 2507, 2530–2532, 2547–2549 |
| キープアライブ | 記載無し【不明】。`ACS;` → `ACK;` を疎通確認に使える | B 行 3252–3259 |
| 自発送信 | G「Commands spontaneously sent from the VR-6HD」= ERR / xon / xoff のみ。タリー等の自動送信は無い | G 行 2537–2549 |
| 簡易制御コマンドの対応版 | B 表紙 4 行目「Version 2.2 and later」が VR-6HD【推測：掲載順 V-160HD/V-80HD/VR-120HD/VR-6HD/V-1-4K】 | B 行 3–23, 44 |
| 同一ポートの別機能 | Smart Tally（ブラウザで IP アドレスへ HTTP アクセス）、カメラ制御（6 台）、配信（RTMP/SRT） | R 行 422–431, 6177–6245 |

V-160HD 系（DTH/RQH）との比較：**同じ**（TCP 8023、4 文字パスワード、`DTH:aabbcc,vv;` / `RQH:aabbcc,ssssss;` / `VER;`、ack = 06H、簡易コマンドは `ACK;`）。VR-120HD と同じ扱いでよい。Model ID のみ 5 バイト目が 2CH。

### 3-1. 簡易制御コマンドのうち VR-6HD で使えるもの（B。ROISW/QROISW/ROIZM/QROIZM/ROIPT/QROIPT は V-1-4K 専用で VR-6HD 非対応）

| コマンド | 書式 | VR-6HD の引数 | 根拠 |
|---|---|---|---|
| QVISRC | `QVISRC:a;` → `VISRC:a,b;ACK;` | a 0–28、b HDMI1–6, STILL1–16, V.PLAYER, SRT, INPUT1–6 | B 行 84–114 |
| QVIST | `QVIST:a;` → `VIST:a,b;ACK;` | a HDMI1–6、b NOSIGNAL/DETECTED/UNSUPPORTED | B 行 118–144 |
| VFL / QVFL | `VFL:a;` / `QVFL;` → `VFL:a;ACK;` | a 0–2047 | B 行 152–200 |
| PGM / QPGM | `PGM:a;` / `QPGM;` → `PGM:a,b;ACK;` | a HDMI1–6, STILL1–16, V.PLAYER, SRT, INPUT1–6。応答 a は物理（HDMI1–6, STILL1–16, V.PLAYER, SRT）、b は INPUT1–6（INPUT 経由で選ばれている時のみ） | B 行 204–263 |
| PST / QPST | `PST:a;` / `QPST;` → `PST:a,b;ACK;` | 同上 | B 行 267–298 |
| AUX / QAUX | `AUX:a,b;` / `QAUX:a;` → `AUX:a,b,c;ACK;` | a AUX1、b HDMI1–6, STILL1–16, V.PLAYER, SRT, INPUT1–6, PGMLINK（AUX Linked PGM 有効時） | B 行 306–354 |
| ATO | `ATO;` / `ATO:a;` / `ATO:a,b;` | a 上記ソース、b −1（TRANSITION TIME 設定を使う）/ 0–40（0.0–4.0 s）。SPLIT OFF 時のみ | B 行 358–412 |
| CUT | `CUT;` / `CUT:a;` | a 上記ソース。SPLIT OFF 時のみ | B 行 416–438 |
| QATG | `QATG;` → `ATG:a;ACK;` | OFF/ON（AUTO トランジション実行中か） | B 行 442–459 |
| FRZ / QFRZ | `FRZ;`（トグル）/ `FRZ:a;` / `QFRZ;` → `FRZ:a;ACK;` | OFF/ON | B 行 463–496 |
| FTB / QFTB | `FTB;` / `FTB:a;` / `QFTB;` → `FTB:a;ACK;` | OFF/ON（応答は OFF/ON/FADEIN/FADEOUT） | B 行 500–529 |
| VIS / QVIS | `VIS:a,b;` / `QVIS:a;` → `VIS:a,b;ACK;` | a INPUT1–6、b HDMI1–6, STILL1–16, V.PLAYER, SRT, N/A | B 行 533–597 |
| VOS / QVOS | `VOS:a,b;` / `QVOS:a;` → `VOS:a,b;ACK;` | a HDMI1–3, USB, STREAM, LCD、b PGM, SUB, PVW, AUX1, DSK1, MULTIVIEW, STILLVIEW | B 行 601–648 |
| TRS / QTRS | `TRS:a;` / `QTRS;` → `TRS:a;ACK;` | MIX, WIPE | B 行 652–670 |
| TIM / QTIM | `TIM:a,b;` / `QTIM:a;` → `TIM:a,b;ACK;` | a MIX, WIPE, PinP1–2, DSK1, OUTPUTFADE、b 0–40（0.0–4.0 s） | B 行 674–733 |
| PIS / QPIS | `PIS:a,b;` / `QPIS:a;` → `PIS:a,b;ACK;` | a PinP1–2、b HDMI1–6, STILL1–16, V.PLAYER, SRT, INPUT1–6 | B 行 737–772 |
| PPS / QPPS | `PPS:a;`（トグル）/ `PPS:a,b;` / `QPPS:a;` → `PPS:a,b;ACK;` | a PinP1–2、b OFF/ON（PGM） | B 行 776–827 |
| PPW / QPPW | `PPW:a;` / `PPW:a,b;` / `QPPW:a;` → `PPW:a,b;ACK;` | a PinP1–2、b OFF/ON（PVW） | B 行 831–882 |
| PIP / QPIP | `PIP:a,h,v;` / `QPIP:a;` → `PIP:a,h,v;ACK;` | a PinP1–2、h/v −500–0–500（−50.0–50.0%） | B 行 886–920 |
| DSK / QDSK | `DSK:a;` / `DSK:a,b;` / `QDSK:a;` → `DSK:a,b;ACK;` | a DSK1、b OFF/ON（PGM） | B 行 924–974 |
| DVW / QDVW | `DVW:a;` / `DVW:a,b;` / `QDVW:a;` → `DVW:a,b;ACK;` | a DSK1、b OFF/ON（PVW） | B 行 978–1029 |
| DSS / QDSS | `DSS:a,b;` / `QDSS:a;` → `DSS:a,b,c;ACK;` | a DSK1、b HDMI1–6, STILL1–16, V.PLAYER, SRT, INPUT1–6（応答 b 物理、c INPUT1–6） | B 行 1033–1078 |
| KYL / QKYL | `KYL:a,b;` / `QKYL:a;` → `KYL:a,b;ACK;` | a DSK1、b 0–255 | B 行 1086–1118 |
| KYG / QKYG | `KYG:a,b;` / `QKYG:a;` → `KYG:a,b;ACK;` | a DSK1、b 0–255 | B 行 1122–1154 |
| SPS / QSPS | `SPS:a;` / `SPS:a,b;` / `QSPS:a;` → `SPS:a,b;ACK;` | a SPLIT1、b OFF/ON | B 行 1162–1209 |
| SPT / QSPT | `SPT:a,b,c;` / `SPT:a,b,c,d;` / `QSPT:a;` → `SPT:a,b,c,d;ACK;` | a SPLIT1、b/c/d −500–0–500 | B 行 1213–1270 |
| STO / QSTO | `STO:a;` / `QSTO;` → `STO:a;ACK;` | OFF, STILL1–16, V.PLAYER, SRT | B 行 1274–1298 |
| AOS / QAOS | `AOS:a,b;` / `QAOS:a;` → `AOS:a,b;ACK;` | a HDMI1–3, XLR1, RCA1, USB, STREAM, REC, PHONES、b MAIN, AUX1–2, MONITOR（HDMI1–3/XLR1/RCA1）または MAIN, AUX1–2（USB/STREAM/REC/PHONES） | B 行 1379–1470 |
| IAL / QIAL | `IAL:a,b;` / `QIAL:a;` → `IAL:a,b;ACK;` | a XLR1–6, RCA1, USB, BLUETOOTH, A.PLAYER, HDMI1–6, V.PLAYER, SRT、b −INF, −800–0–100（−80.0–10.0 dB） | B 行 1474–1530 |
| IAM / QIAM | `IAM:a;` / `IAM:a,b;` / `QIAM:a;` → `IAM:a,b;ACK;` | a 同上、b OFF/ON | B 行 1534–1581 |
| IAS / QIAS | `IAS:a;` / `IAS:a,b;` / `QIAS:a;` → `IAS:a,b;ACK;` | ソロ。同上 | B 行 1585–1636 |
| ADT / QADT | `ADT:a,b;` / `QADT:a;` → `ADT:a,b;ACK;` | b 0–5000（0.0–500.0 ms） | B 行 1640–1672 |
| HPF / QHPF | `HPF:a,b;` / `QHPF:a;` | OFF/ON | B 行 1680–1712 |
| GATE / QGATE | `GATE:a,b;` / `QGATE:a;` | OFF/ON | B 行 1716–1748 |
| STLK / QSTLK | `STLK:a;` / `STLK:a,b;` / `QSTLK:a;` | a XLR1–6、b OFF/ON | B 行 1756–1799 |
| VOCH / QVOCH | `VOCH:a;` / `VOCH:a,b;` / `QVOCH:a;` | a XLR1–2（機種別記載無し）、b OFF/ON | B 行 1803–1841 |
| OAL / QOAL | `OAL:a,b;` / `QOAL:a;` → `OAL:a,b;ACK;` | a MAIN, AUX1–2, USB, STREAM, REC、b −INF, −800–0–100 | B 行 1845–1877 |
| OAM / QOAM | `OAM:a,b;` / `QOAM:a;` → `OAM:a,b;ACK;` | a 同上、b OFF/ON | B 行 1881–1920 |
| RVB / QRVB | `RVB;` / `RVB:a;` / `QRVB;` | OFF/ON | B 行 1924–1953 |
| ATM / QATM | `ATM;` / `ATM:a;` / `QATM;` | Auto Mixing OFF/ON | B 行 1957–1986 |
| MTRLV / MTRCH | `MTRLV:a;`（a PFL/AFL）→ `MTRLV:a0,…;ACK;`；`MTRCH:a;` → `MTRCH:a,b;ACK;` | a0–a39：IN-XLR1–6, IN-RCA1-L–1-R, IN-USB-L–R, IN-BLUETOOTH-L–R, IN-A.PLAYER-L–R, IN-HDMI1-L–6-R, IN-V.PLAYER-L–R, OUT-MAIN-L–R, OUT-AUX1-L–2-R, OUT-USB-L–R, OUT-STREAM-L–R, OUT-MONITOR-L–R。値 −INF, −80–0–10 | B 行 1995–2069 |
| GRLV / GRCH | `GRLV;` → `GRLV:a0,…;ACK;`；`GRCH:a;` → `GRCH:a,b;` | a0–a19：IN-XLR1–6, IN-RCA1, IN-USB, IN-BLUETOOTH, IN-A.PLAYER, IN-HDMI1–6, IN-V.PLAYER, OUT-MAIN, OUT-AUX1–2 | B 行 2076–2119 |
| AMLV / AMCH | `AMLV;` / `AMCH:a;` | a0–a16：IN-XLR1–6, IN-RCA1, IN-USB, IN-BLUETOOTH, IN-A.PLAYER, IN-HDMI1–6, IN-V.PLAYER | B 行 2123–2170 |
| SPLV / SPCH | `SPLV;` / `SPCH:a;` | a0–a22：上記 17 入力＋OUT-MAIN, OUT-AUX1–2, OUT-USB, OUT-STREAM, OUT-MONITOR | B 行 2174–2217 |
| AUXLV / AUXCH | `AUXLV:a;`（a AUX1–2）→ `QAUXLV:a0,…;ACK;`（原文ママ）；`AUXCH:a;` → `QAUXCH:a,b;` | a0–a27：IN-XLR1–6, IN-RCA1-L–1-R, IN-USB-L–R, IN-BLUETOOTH-L–R, IN-A.PLAYER-L–R, IN-HDMI1-L–6-R, IN-V.PLAYER-L–R | B 行 2225–2280 |
| MEM / QMEM | `MEM:a;` / `QMEM;` → `MEM:a;ACK;` | MEMORY1–32（応答は N/A, MEMORY1–32） | B 行 2289–2315 |
| GPO / QGPO | `GPO:a;`（ワンショット）/ `GPO:a,b;` / `QGPO:a;` | a GPO1–16、b OFF/ON | B 行 2319–2350 |
| TLY | `TLY;` → `TLY:a0,…,a28;ACK;` | 0 OFF / 1 PGM / 2 PST / 3 PGM&PST。順序：HDMI1–6, STILL1–16, V.PLAYER or SRT, INPUT1–6（29 個） | B 行 2354–2382 |
| ASW / QASW | `ASW;` / `ASW:a;` / `QASW;` | Auto Switching OFF/ON | B 行 2386–2415 |
| INSC | `INSC:a;` | NORMAL/REVERSE/RANDOM（Input Scan 実行） | B 行 2419–2426 |
| MEMSC | `MEMSC:a;` | NORMAL/REVERSE/RANDOM | B 行 2430–2437 |
| PPSC | `PPSC:a,b;` | a PinP1–2、b NORMAL/REVERSE/RANDOM | B 行 2441–2456 |
| DSKSC | `DSKSC:a,b;` | a DSK1 | B 行 2460–2471 |
| STRTY / QSTRTY | `STRTY:a;` / `QSTRTY;` | RTMP, SRT | B 行 2475–2493 |
| STROA | `STROA:a;` | STOP/START（Type=RTMP 時） | B 行 2497–2504 |
| SRTOSS | `SRTOSS:a;` | STOP/START（Type=SRT 時） | B 行 2508–2515 |
| QSTRST | `QSTRST;` → `STRST:a;ACK;` | STOP, STOPPING, STARTING, ONAIR | B 行 2519–2526 |
| QSTRTM | `QSTRTM;` → `STRTM:a;ACK;` | 経過秒 | B 行 2530–2551 |
| SFIM / QSFIM | `SFIM:a;` / `QSFIM;` | OFF/ON（応答 OFF/ON/DELAYED）。オンエア中のみ | B 行 2555–2573 |
| EXRC / QEXRC | `EXRC:a;` / `QEXRC;` | OFF/ON | B 行 2577–2595 |
| APL / QAPS / QAPE / QAPD / QAPC / APR / QAPR | `APL:a,b;` 等 | a A-1–A-6, B-1–B-6、b STOP/PLAY/PAUSE/RESUME（QAPS 応答 STOP/PLAY/PAUSE/FADEIN/FADEOUT） | B 行 2599–2713 |
| PBTY / QPBTY | `PBTY:a;` / `QPBTY;` | V.PLAYER, SRT | B 行 2717–2735 |
| VPL / QVPS / QVPE / QVPD / QVPC | `VPL:a;`（STOP/PLAY/PAUSE/RESUME）等 | Type=V.PLAYER 時 | B 行 2739–2790 |
| SRTISS / QSRTIST | `SRTISS:a;` / `QSRTIST;` → `SRTIST:a;` | STOP/START、応答 STOPPED/STOPPING/STARTING/STARTED | B 行 2798–2816 |
| STRSTB / VPSTB / SRTISTB | `STRSTB;` 等 | OK / ERROR_* | B 行 2820–2849 |
| CAMPT / CAMPTS / QCAMPTS / CAMZM / CAMZMR / CAMFC / CAMAFC / QCAMAFC / CAMAEP / QCAMAEP / CAMPR / QCAMPR | `CAMPT:a,b,c;` 等 | a CAMERA1–6、CAMPR b PRESET1–100 | B 行 2858–3070 |
| MCREX | `MCREX:a;` | **MACRO1–100** | B 行 3079–3086 |
| QMCRST | `QMCRST:a;` → `MCRST:a,b;ACK;` | a MACRO1–100、b OFF/ON | B 行 3090–3098 |
| SEQSW / QSEQSW | `SEQSW:a;` / `QSEQSW;` → `SQS:a;ACK;` | OFF/ON | B 行 3102–3120 |
| SEQAS / QSEQAS | `SEQAS:a;` / `QSEQAS;` → `SQA:a;ACK;` | OFF/ON | B 行 3124–3142 |
| SEQPV / SEQNX / SEQJP | `SEQPV;` / `SEQPV:a;`（0 ひとつ戻る、1 先頭）/ `SEQNX;` / `SEQJP:a;`（START, SEQ1–1000） | | B 行 3146–3188 |
| GPNC / GPSC / GPHF / GPHB / GPOA | Graphics Presenter（`GPSC:a;` CONTENT1–124） | 機種限定の記載無し | B 行 3192–3243 |
| ACS | `ACS;` → `ACK;` | | B 行 3252–3259 |
| VER | `VER;` → `VER:a,b;ACK;` | a VR-6HD、b 1.00– | B 行 3263–3281 |
| QBSY | `QBSY;` → `BSY:a;` | OFF/ON | B 行 3285–3292 |
| HDCP / QHDCP | `HDCP:a;` / `QHDCP;` → `HCP:a;ACK;` | OFF/ON | B 行 3296–3314 |
| TPT / QTPT | `TPT:a;` / `QTPT;` | OFF, COLORBAR75, COLORBAR100, RAMP, STEP, HATCH, DIAMOND, CIRCLE, COLORBAR75-SP, COLORBAR100-SP, RAMP-SP, STEP-SP, HATCH-SP | B 行 3318–3348 |
| TTN / QTTN | `TTN:a;` / `TTN:a,b,c;` / `QTTN;` | a OFF, −20, −10, 0dB、b/c 500, 1k, 2kHz | B 行 3352–3385 |

## 4. アドレスマップの要点（SysEx 3 バイトアドレス）

| 用途 | アドレス | サイズ | 値域 | 意味 | 根拠 |
|---|---|---|---|---|---|
| PGM 選択 | 00 0F 00 | 1 | 00–1C | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, INPUT 1–6（§5） | G 行 426 |
| PST 選択 | 00 0F 01 | 1 | 00–1C | 同上 | G 行 427 |
| クロスポイント（INPUT n の割当） | 00 00 (n−1)（n = 1–6） | 1 | 00–17 | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, N/A | G 行 132–137 |
| フェーダー位置（T-bar） | 00 0F 02–03 | 2 | 00 00–0F 7F | 0–2047 | G 行 428–430 |
| フェーダーベース | 00 0F 05 | 1 | 00–01 | UPPER, LOWER | G 行 432 |
| CUT/AUTO トリガ | **SysEx に専用アドレス無し**【不明】。00 0F 04 DISSOLVE TAKE TYPE（CUT, AUTO）は DISSOLVE モード（02 01 0C = 00）で PGM を切り替えた時の挙動を選ぶ設定（R 行 1140–1200）。PGM/PST モードでは CUT/AUTO ボタン相当の SysEx が無い → LAN の `CUT;` / `ATO;` を使う。SysEx のみなら「DISSOLVE モードで 00 0F 00 を書く（CUT/AUTO は 00 0F 04 で選択）」または「00 0F 02 を 0→2047 に書く」で代用【推測】 | | | | G 行 431、B 行 358–438 |
| トランジションタイプ | 00 0B 00 | 1 | 00–02 | MIX, WIPE, SPLIT | G 行 228 |
| MIX タイプ / 時間 | 00 0B 01 / 00 0B 02 | 1 / 1 | 00–02 / 00–28 | MIX, FAM, NAM / 0.0–4.0 s | G 行 229–230 |
| WIPE タイプ / 時間 | 00 0B 03 / 00 0B 04 | 1 / 1 | 00–07 / 00–28 | 8 パターン / 0.0–4.0 s（原文は 00 0B 04 も「MIX TIME」と表記。位置から WIPE TIME【推測】） | G 行 232–234 |
| SPLIT | 00 0B 08 SW（OFF/ON）、00 0B 09 TYPE（SPLIT V/H）、00 0B 0A–0B / 0C–0D / 0E–0F 位置（−50.0–50.0%） | | | | G 行 240–250 |
| PinP&KEY n（xx = 0C/0D = PinP 1/2） | 00 xx 00 TIME（00–28 = 0.0–4.0 s）、00 xx 01 PGM SW、00 xx 02 PVW SW（OFF/ON）、00 xx 03 SOURCE（00–1C、§5 と同じ並び）、00 xx 04 TYPE（PINP, LUM-WHITE, LUM-BLACK, CHROMA） | | | | G 行 282–289 |
| DSK（1 系統） | 00 0E 00 TIME、00 0E 01 PGM SW、00 0E 02 PVW SW、00 0E 03 MODE（SELF KEY, ALPHA KEY, EXTERNAL KEY）、00 0E 04 KEY SOURCE、00 0E 05 FILL SOURCE（00–1C）、00 0E 06 TYPE（LUM-WHITE, LUM-BLACK, CHROMA） | | | | G 行 364–370 |
| オーディオ入力（xx = 01–11） | 01 xx 03–05 INPUT LEVEL（3 バイト、7E 00 00 = −INF、7F 79 60–00 00 00–00 00 64 = −80.0–0.0–10.0 dB）、01 xx 06 INPUT MUTE（OFF/ON）、01 xx 0B SOLO | | | xx: 01–06 AUDIO IN 1–6、07 AUDIO IN 7/8、08 USB IN、09 Bluetooth IN、0A AUDIO PLAYER、0B–10 VIDEO IN 1–6、11 VIDEO PLAYER/SRT IN | G 行 472–488 |
| MASTER（MAIN BUS） | 01 21 00–02 LEVEL（3 バイト、同上）、01 21 03 MUTE、01 21 04 SOLO | | | | G 行 555–559 |
| AUX 1/2 BUS、USB OUT、STREAM/RECORD、MONITOR | 01 22 / 01 24 / 01 26 / 01 27 / 01 28 の 00–02 LEVEL、03 MUTE | | | | G 行 662–665, 828–831, 999–1002, 1022–1025, 1045–1048 |
| メモリー ロード | 0A 00 00 | 1 | 7F, 00–1F | NONE, MEMORY 1–32（write only） | G 行 2200 |
| メモリー セーブ / 初期化 | 0A 00 01 / 0A 00 02 | 1 | 7F, 00–1F | write only | G 行 2201–2202 |
| 現在のメモリー番号 | 0A 00 03 | 1 | 7F, 00–1F | LAST MEMORY, MEMORY 1–32（read only） | G 行 2203 |
| メモリー存在フラグ | 02 05 00–1F | 32 | 00–01 | NOT EXIST, EXIST（read only） | G 行 1466–1497 |
| メモリー名 | 60 xx 00–07（xx = 00–1F = MEMORY 1–32） | 8 | （値域記載無し。LABEL と同様 00–7F ASCII【推測】） | 8 文字 | G 行 2278–2288 |
| メモリー数 | 32 | | | | G 行 113–124 |
| タリー | 0C 00 00 | **29**（00–1C） | 00–02 | OFF, PGM, PST（read only）。順：VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, INPUT 1–6（§5 と同じ並び）。LAN の `TLY;` は 3 = PGM&PST も返すが SysEx は 00–02 のみ | G 行 2211–2239 |
| ラベル（8 文字） | 02 xx 00–07（xx = 20H–3AH：VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER, PROGRAM, SUB PROGRAM, PREVIEW, AUX, DSK SOURCE, SRT IN） | 8 | 00–7F | 原文の範囲 20H–3AH は 27 個だが列挙は 29 個 → 末尾 2 つ（DSK SOURCE, SRT IN = 3BH, 3CH）か範囲のどちらかが誤記【不明】 | G 行 2030–2040 |
| マクロ / シーケンサー | **SysEx にトリガ無し**（VIDEO FOLLOWS AUDIO の TARGET 値に MACRO 1–100、VIDEO SWITCHER BUTTON MODE に MACRO があるのみ）。LAN 簡易コマンド `MCREX:MACROn;` `SEQ*` を使う | | | | G 行 1267, 1769、B 行 3079–3188 |
| AUX ソース | 00 00 0C | 1 | 00–1C | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, INPUT 1–6 | G 行 144 |
| 出力アサイン | 00 00 06–08 VIDEO OUT 1–3、09 USB OUT、0A STREAM/RECORD、0B LCD MONITOR | 1 each | 00–05 | PROGRAM, SUB PROGRAM, PREVIEW, AUX, MULTI-VIEW, STILL-VIEW | G 行 138–143 |
| システムバージョン | 02 00 00–05 | 6 | 各 00–09 | Major / Minor(1) / Minor(2) / Build(1) / Build(2) / Build(3) の数字 | G 行 1167–1172 |
| パネル操作モード | 02 01 0C | 1 | 00–01 | DISSOLVE, PGM/PST | G 行 1190 |
| 出力フェード | 02 01 11 VIDEO FADE（N/A, BLACK, WHITE, AUX）、02 01 12 AUDIO FADE、02 01 13 TIME。実行トリガは SysEx 無し（LAN `FTB;`） | | | | G 行 1195–1197 |
| フリーズ | 02 08 00 FREEZE（OFF/ON） | 1 | | | G 行 1715 |
| 値のエンコード | 7bit 1 バイト。2 バイト以上は連続アドレス（aa×128+bb）。負値は 7bit 2 の補数。「#」付き・nibbled 表記は無し | | | | G 行 2344–2351 |

### 4-1. Parameter Address Map 全転記（G p.3–31 行 111–2289）

エリア（G 行 112–125）：00H 00H 00H Video Parameter Area / 01H 00H 00H Audio Parameter Area / 02H 00H 00H System Parameter Area / 0AH 00H 00H Command Area / 0CH 00H 00H Tally Area / 10H 00H 00H Video Parameter (MEMORY 1) Area / 11H 00H 00H Audio Parameter (MEMORY 1) Area / 12H–13H MEMORY 2 / 14H–15H MEMORY 3 / 16H–17H MEMORY 4 / 18H–19H MEMORY 5 / 1AH–1BH MEMORY 6 / 1CH–1DH MEMORY 7 / 1EH–1FH MEMORY 8 / … / 4EH 00H 00H Video (MEMORY 32) / 4FH 00H 00H Audio (MEMORY 32) / 60H xxH 00H Memory Name Area

表記：複数バイト値は「00 xx 04–05」のように最初と最後のアドレスを書く。値・意味は原文ママ（原文の誤記「SILL」「CANELLER」「KYEPAD」「6.3Hz」等もそのまま）。

#### Video Parameter Area — VIDEO ASSIGN（G 行 130–153）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 00 00 00 | INPUT 1 ASSIGN | 00–17 | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, N/A |
| 00 00 01 | INPUT 2 ASSIGN | 00–17 | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, N/A |
| 00 00 02 | INPUT 3 ASSIGN | 00–17 | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, N/A |
| 00 00 03 | INPUT 4 ASSIGN | 00–17 | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, N/A |
| 00 00 04 | INPUT 5 ASSIGN | 00–17 | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, N/A |
| 00 00 05 | INPUT 6 ASSIGN | 00–17 | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, N/A |
| 00 00 06 | VIDEO OUT 1 ASSIGN | 00–05 | PROGRAM, SUB PROGRAM, PREVIEW, AUX, MULTI-VIEW, STILL-VIEW |
| 00 00 07 | VIDEO OUT 2 ASSIGN | 00–05 | PROGRAM, SUB PROGRAM, PREVIEW, AUX, MULTI-VIEW, STILL-VIEW |
| 00 00 08 | VIDEO OUT 3 ASSIGN | 00–05 | PROGRAM, SUB PROGRAM, PREVIEW, AUX, MULTI-VIEW, STILL-VIEW |
| 00 00 09 | USB OUT ASSIGN | 00–05 | PROGRAM, SUB PROGRAM, PREVIEW, AUX, MULTI-VIEW, STILL-VIEW |
| 00 00 0A | STREAM/RECORD ASSIGN | 00–05 | PROGRAM, SUB PROGRAM, PREVIEW, AUX, MULTI-VIEW, STILL-VIEW |
| 00 00 0B | LCD MONITOR ASSIGN | 00–05 | PROGRAM, SUB PROGRAM, PREVIEW, AUX, MULTI-VIEW, STILL-VIEW |
| 00 00 0C | AUX SOURCE | 00–1C | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, INPUT 1–6 |
| 00 00 0D | PROGRAM LAYER PINP&KEY 1 | 00–01 | DISABLE, ENABLE |
| 00 00 0E | PROGRAM LAYER PINP&KEY 2 | 00–01 | DISABLE, ENABLE |
| 00 00 0F | PROGRAM LAYER DSK | 00–01 | DISABLE, ENABLE |
| 00 00 10 | SUB PROGRAM LAYER PINP&KEY 1 | 00–01 | DISABLE, ENABLE |
| 00 00 11 | SUB PROGRAM LAYER PINP&KEY 2 | 00–01 | DISABLE, ENABLE |
| 00 00 12 | SUB PROGRAM LAYER DSK | 00–01 | DISABLE, ENABLE |
| 00 00 13 | AUX LAYER PINP&KEY 1 | 00–02 | DISABLE, ENABLE, ALWAYS ON |
| 00 00 14 | AUX LAYER PINP&KEY 2 | 00–02 | DISABLE, ENABLE, ALWAYS ON |
| 00 00 15 | AUX LAYER DSK | 00–02 | DISABLE, ENABLE, ALWAYS ON |

#### Video Parameter Area — VIDEO INPUT（xx = 01H–06H: VIDEO IN 1–6。G 行 157–199）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 00 xx 00 | FLICKER FILTER | 00–01 | OFF, ON |
| 00 xx 01 | FLIP H | 00–01 | OFF, ON |
| 00 xx 02 | FLIP V | 00–01 | OFF, ON |
| 00 xx 03 | EDID | 00–0B | INTERNAL, SVGA (800 x 600), XGA (1024 x 768), WXGA (1280 x 800), FWXGA (1366 x 768), SXGA (1280 x 1024), SXGA+ (1400 x 1050), UXGA (1600 x 1200), WUXGA (1920 x 1200), 720p, 1080i, 1080p |
| 00 xx 04–05 | ZOOM | 00 64–4E 10 | 10.0–1000.0% |
| 00 xx 06 | SCALING TYPE | 00–04 | FULL, LETTER BOX, CROP, DOT BY DOT, MANUAL |
| 00 xx 07–08 | MANUAL SIZE H | 70 30–00 00–0F 50 | -2000–0–2000 |
| 00 xx 09–0A | MANUAL SIZE V | 70 30–00 00–0F 50 | -2000–0–2000 |
| 00 xx 0B–0C | POSITION H | 71 00–00 00–0F 00 | -1920–0–1920 |
| 00 xx 0D–0E | POSITION V | 76 50–00 00–09 30 | -1200–0–1200 |
| 00 xx 0F | BRIGHTNESS | 60–00–1F | -32–0–31 |
| 00 xx 10 | CONTRAST | 60–00–1F | -32–0–31 |
| 00 xx 11 | SATURATION | 60–00–1F | -32–0–31 |
| 00 xx 12 | RED | 40–00–3F | -64–0–63 |
| 00 xx 13 | GREEN | 40–00–3F | -64–0–63 |
| 00 xx 14 | BLUE | 40–00–3F | -64–0–63 |
| 00 xx 15 | COLOR SPACE | 00–04 | AUTO, RGB (0-255), RGB (16-235), YPbPr (SD), YPbPr (HD) |
| 00 xx 16 | TEST PATTERN | 00–0C | OFF, COLOR BARS 75%, COLOR BARS 100%, RAMP, STEP, HATCH, DIAMOND, CIRCLE, COLOR BARS 75%-SP, COLOR BARS 100%-SP, RAMP-SP, STEP-SP, HATCH-SP |

#### Video Parameter Area — VIDEO INPUT (VIDEO PLAYER/SRT IN)（G 行 203–206）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 00 07 00 | FLIP H | 00–01 | OFF, ON |
| 00 07 01 | FLIP V | 00–01 | OFF, ON |

#### Video Parameter Area — VIDEO OUTPUT（xx = 08H–0AH: VIDEO OUT 1–3。G 行 210–222）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 00 xx 00 | COLOR SPACE | 00–03 | YPbPr (4:4:4), YPbPr (4:2:2), RGB (0-255), RGB (16-235) |
| 00 xx 01 | DVI-D/HDMI SIGNAL | 00–01 | HDMI, DVI-D |
| 00 xx 02 | BRIGHTNESS | 40–00–3F | -64–0–63 |
| 00 xx 03 | CONTRAST | 40–00–3F | -64–0–63 |
| 00 xx 04 | SATURATION | 40–00–3F | -64–0–63 |
| 00 xx 05 | RED | 40–00–3F | -64–0–63 |
| 00 xx 06 | GREEN | 40–00–3F | -64–0–63 |
| 00 xx 07 | BLUE | 40–00–3F | -64–0–63 |
| 00 xx 08 | EXTERNAL REC CONTROL | 00–01 | OFF, ON |

#### Video Parameter Area — TRANSITION, MIX, WIPE, SPLIT（G 行 226–277）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 00 0B 00 | TRANSITION | 00–02 | MIX, WIPE, SPLIT |
| 00 0B 01 | MIX TYPE | 00–02 | MIX, FAM, NAM |
| 00 0B 02 | MIX TIME | 00–28 | 0.0–4.0sec |
| 00 0B 03 | WIPE TYPE | 00–07 | HORIZONTAL, VERTICAL, UPPER LEFT, UPPER RIGHT, LOWER LEFT, LOWER RIGHT, H-CENTER, V-CENTER |
| 00 0B 04 | MIX TIME（原文ママ。WIPE TIME【推測】） | 00–28 | 0.0–4.0sec |
| 00 0B 05 | WIPE DIRECTION | 00–02 | NORMAL, REVERSE, ROUND TRIP |
| 00 0B 06 | WIPE BORDER COLOR | 00–09 | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM, SOFT EDGE |
| 00 0B 07 | WIPE BORDER WIDTH | 00–0E | 0–14 |
| 00 0B 08 | SPLIT SW | 00–01 | OFF, ON |
| 00 0B 09 | SPLIT TYPE | 00–01 | SPLIT V, SPLIT H |
| 00 0B 0A–0B | SPLIT PGM/A-CENTER | 7C 0C–00 00–03 74 | -50.0–0.0–50.0% |
| 00 0B 0C–0D | SPLIT PST/B-CENTER | 7C 0C–00 00–03 74 | -50.0–0.0–50.0% |
| 00 0B 0E–0F | SPLIT CENTER POSITION | 7C 0C–00 00–03 74 | -50.0–0.0–50.0% |
| 00 0B 10 | SPLIT BORDER COLOR | 00–08 | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM |
| 00 0B 11 | SPLIT BORDER WIDTH | 00–0E | 0–14 |
| 00 0B 12–13 | WIPE BORDER COLOR RED | 00 00–01 7F | 0–255 |
| 00 0B 14–15 | WIPE BORDER COLOR GREEN | 00 00–01 7F | 0–255 |
| 00 0B 16–17 | WIPE BORDER COLOR BLUE | 00 00–01 7F | 0–255 |
| 00 0B 18–19 | SPLIT BORDER COLOR RED | 00 00–01 7F | 0–255 |
| 00 0B 1A–1B | SPLIT BORDER COLOR GREEN | 00 00–01 7F | 0–255 |
| 00 0B 1C–1D | SPLIT BORDER COLOR BLUE | 00 00–01 7F | 0–255 |

#### Video Parameter Area — PinP&KEY（xx = 0CH–0DH: PinP&KEY 1–2。G 行 281–354）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 00 xx 00 | TIME | 00–28 | 0.0–4.0sec |
| 00 xx 01 | PGM SW | 00–01 | OFF, ON |
| 00 xx 02 | PVW SW | 00–01 | OFF, ON |
| 00 xx 03 | SOURCE | 00–1C | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, INPUT 1–6 |
| 00 xx 04 | TYPE | 00–03 | PINP, LUMINANCE-WHITE KEY, LUMINANCE-BLACK KEY, CHROMA KEY |
| 00 xx 05–06 | POSITION H | 78 18–00 00–07 68 | -100.0–0.0–100.0% |
| 00 xx 07–08 | POSITION V | 78 18–00 00–07 68 | -100.0–0.0–100.0% |
| 00 xx 09–0A | SIZE | 00 00–07 68 | 0.0–100.0% |
| 00 xx 0B–0C | CROPPING H | 00 00–07 68 | 0.0–100.0% |
| 00 xx 0D–0E | CROPPING V | 00 00–07 68 | 0.0–100.0% |
| 00 xx 0F | SHAPE | 00–02 | RECTANGLE, CIRCLE, DIAMOND |
| 00 xx 10 | BORDER COLOR | 00–09 | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM, SOFT EDGE |
| 00 xx 11 | BORDER WIDTH | 00–0E | 0–14 |
| 00 xx 12–13 | VIEW POSITION H | 7C 0C–00 00–03 74 | -50.0–0.0–50.0% |
| 00 xx 14–15 | VIEW POSITION V | 7C 0C–00 00–03 74 | -50.0–0.0–50.0% |
| 00 xx 16–17 | VIEW ZOOM | 00 64–03 10 | 100–400% |
| 00 xx 18–19 | KEY LEVEL | 00 00–01 7F | 0–255 |
| 00 xx 1A–1B | KEY GAIN | 00 00–01 7F | 0–255 |
| 00 xx 1C–1D | MIX LEVEL | 00 00–01 7F | 0–255 |
| 00 xx 1E | CHROMA COLOR | 00–01 | GREEN, BLUE |
| 00 xx 1F | HUE WIDTH | 62–00–1E | -30–0–30 |
| 00 xx 20–21 | HUE FINE | 00 00–02 68 | 0–360 |
| 00 xx 22–23 | SATURATION WIDTH | 7F 00–00 00–00 7F | -128–0–127 |
| 00 xx 24–25 | SATURATION FINE | 00 00–01 7F | 0–255 |
| 00 xx 26–27 | BORDER COLOR RED | 00 00–01 7F | 0–255 |
| 00 xx 28–29 | BORDER COLOR GREEN | 00 00–01 7F | 0–255 |
| 00 xx 2A–2B | BORDER COLOR BLUE | 00 00–01 7F | 0–255 |
| 00 xx 2C–2D | VALUE WIDTH | 7F 00–00 00–00 7F | -128–0–127 |
| 00 xx 2E–2F | VALUE FINE | 00 00–01 7F | 0–255 |
| 00 xx 30 | DESPILL | 00–01 | OFF, ON |

#### Video Parameter Area — DSK（G 行 362–420）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 00 0E 00 | TIME | 00–28 | 0.0–4.0sec |
| 00 0E 01 | PGM SW | 00–01 | OFF, ON |
| 00 0E 02 | PVW SW | 00–01 | OFF, ON |
| 00 0E 03 | MODE | 00–02 | SELF KEY, ALPHA KEY, EXTERNAL KEY |
| 00 0E 04 | KEY SOURCE | 00–1C | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, INPUT 1–6 |
| 00 0E 05 | FILL SOURCE | 00–1C | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, INPUT 1–6 |
| 00 0E 06 | TYPE | 00–02 | LUMINANCE-WHITE KEY, LUMINANCE-BLACK KEY, CHROMA KEY |
| 00 0E 07–08 | LEVEL | 00 00–01 7F | 0–255 |
| 00 0E 09–0A | GAIN | 00 00–01 7F | 0–255 |
| 00 0E 0B–0C | MIX LEVEL | 00 00–01 7F | 0–255 |
| 00 0E 0D | CHROMA COLOR | 00–01 | GREEN, BLUE |
| 00 0E 0E | HUE WIDTH | 62–00–1E | -30–0–30 |
| 00 0E 0F–10 | HUE FINE | 00 00–02 68 | 0–360 |
| 00 0E 11–12 | SATURATION WIDTH | 7F 00–00 00–00 7F | -128–0–127 |
| 00 0E 13–14 | SATURATION FINE | 00 00–01 7F | 0–255 |
| 00 0E 15 | FILL TYPE | 00–01 | BUS, MATTE |
| 00 0E 16 | MATTE COLOR | 00–08 | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM |
| 00 0E 17 | EDGE TYPE | 00–04 | OFF, BORDER, DROP, SHADOW, OUTLINE |
| 00 0E 18 | EDGE COLOR | 00–08 | WHITE, YELLOW, CYAN, GREEN, MAGENTA, RED, BLUE, BLACK, CUSTOM |
| 00 0E 19 | EDGE WIDTH | 00–07 | 0–7 |
| 00 0E 1A–1B | MATTE COLOR RED | 00 00–01 7F | 0–255 |
| 00 0E 1C–1D | MATTE COLOR GREEN | 00 00–01 7F | 0–255 |
| 00 0E 1E–1F | MATTE COLOR BLUE | 00 00–01 7F | 0–255 |
| 00 0E 20–21 | EDGE COLOR RED | 00 00–01 7F | 0–255 |
| 00 0E 22–23 | EDGE COLOR GREEN | 00 00–01 7F | 0–255 |
| 00 0E 24–25 | EDGE COLOR BLUE | 00 00–01 7F | 0–255 |
| 00 0E 26–27 | VALUE WIDTH | 7F 00–00 00–00 7F | -128–0–127 |
| 00 0E 28–29 | VALUE FINE | 00 00–01 7F | 0–255 |
| 00 0E 2A | DESPILL | 00–01 | OFF, ON |

#### Video Parameter Area — PANEL（G 行 424–432）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 00 0F 00 | PGM SELECT | 00–1C | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, INPUT 1–6 |
| 00 0F 01 | PST SELECT | 00–1C | VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, INPUT 1–6 |
| 00 0F 02–03 | FADER LEVEL | 00 00–0F 7F | 0–2047 |
| 00 0F 04 | DISSOLVE TAKE TYPE | 00–01 | CUT, AUTO |
| 00 0F 05 | FADER BASE | 00–01 | UPPER, LOWER |

#### Audio Parameter Area — AUDIO FADER ASSIGN/KNOB ASSIGN（G 行 441–468）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 00 00 | INPUT FADER 1 | 00–10 | AUDIO IN 1–6, AUDIO IN 7/8, USB IN, Bluetooth IN, AUDIO PLAYER, VIDEO IN 1–6, VIDEO PLAYER/SRT IN |
| 01 00 01 | INPUT FADER 2 | 00–10 | 同上 |
| 01 00 02 | INPUT FADER 3 | 00–10 | 同上 |
| 01 00 03 | INPUT FADER 4 | 00–10 | 同上 |
| 01 00 04 | INPUT FADER 5 | 00–10 | 同上 |
| 01 00 05 | INPUT FADER 6 | 00–10 | 同上 |
| 01 00 06 | INPUT FADER 7 | 00–10 | 同上 |
| 01 00 07 | AUX 1 KNOB | 00–05 | MAIN BUS, AUX 1 BUS, AUX 2 BUS, USB OUT, STREAM/RECORD, MONITOR BUS |
| 01 00 08 | AUX 2 KNOB | 00–05 | 同上 |
| 01 00 09 | USB STREAM KNOB | 00–05 | 同上 |
| 01 00 0A | STREAM/RECORD KNOB | 00–05 | 同上 |
| 01 00 0B | MAIN FADER | 00–05 | 同上 |

#### Audio Parameter Area — AUDIO INPUT（xx = 01H–11H: AUDIO IN 1–6, AUDIO IN 7/8, USB IN, Bluetooth IN, AUDIO PLAYER, VIDEO IN 1–6, VIDEO PLAYER/SRT IN。G 行 472–535）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 xx 00 | ANALOG GAIN | 00–44 | 0–68 dB |
| 01 xx 01–02 | DIGITAL GAIN | 7C 5C–00 00–03 24 | -42.0–0.0–42.0dB |
| 01 xx 03–05 | INPUT LEVEL | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 xx 06 | INPUT MUTE | 00–01 | OFF, ON |
| 01 xx 07 | PHANTOM +48V | 00–01 | OFF, ON |
| 01 xx 08 | PAN | 00–32–64 | LEFT–CENTER–RIGHT |
| 01 xx 09 | STEREO LINK | 00–01 | OFF, ON |
| 01 xx 0A | MONO | 00–03 | OFF, L ONLY, R ONLY, LR MIX |
| 01 xx 0B | SOLO | 00–01 | OFF, ON |
| 01 xx 0C | MAIN SEND | 00–01 | OFF, ON |
| 01 xx 0D | EFFECT PRESET | 00–04 | DEFAULT, MEETING, INTERVIEW, AMBIENT MIC, WINDY FIELD |
| 01 xx 0E–0F | DELAY | 00 00–27 08 | 0.0–500.0msec |
| 01 xx 10 | REVERB SEND | 00–7F | 0–127 |
| 01 xx 11 | HIGH PASS FILTER | 00–01 | OFF, ON |
| 01 xx 12 | ECHO CANELLER SW | 00–01 | OFF, ON |
| 01 xx 13 | ECHO CANELLER DEPTH | 01–0A | 1–10 |
| 01 xx 14 | HOWLING CANCELLER | 00–01 | OFF, ON |
| 01 xx 15 | DE-ESSER SW | 00–01 | OFF, ON |
| 01 xx 16 | DE-ESSER SENS | 00–64 | 0–100 |
| 01 xx 17 | DE-ESSER DEPTH | 00–64 | 0–100 |
| 01 xx 18 | NOISE GATE SW | 00–01 | OFF, ON |
| 01 xx 19 | NOISE GATE THRESHOLD | 30–00 | -80–0dB |
| 01 xx 1A | NOISE GATE RELEASE | 00–7F | 30–5000msec |
| 01 xx 1B | COMPRESSOR SW | 00–01 | OFF, ON |
| 01 xx 1C | COMPRESSOR THRESHOLD | 4E–00 | -50–0dB |
| 01 xx 1D | COMPRESSOR RATIO | 00–0D | 1.00:1, 1.12:1, 1.25:1, 1.40:1, 1.60:1, 1.80:1, 2.00:1, 2.50:1, 3.20:1, 4.00:1, 5.60:1, 8.00:1, 16.0:1, INF:1 |
| 01 xx 1E | COMPRESSOR ATTACK | 00–73 | 0.0–100msec |
| 01 xx 1F | COMPRESSOR RELEASE | 00–7F | 30–5000msec |
| 01 xx 20 | COMPRESSOR MAKEUP GAIN | 58–00–28 | -40–0–40dB |
| 01 xx 21 | EQUALIZER SW | 00–01 | OFF, ON |
| 01 xx 22 | EQUALIZER Hi GAIN | 04–7C | -12.0–12.0dB |
| 01 xx 23 | EQUALIZER Hi FREQUENCY | 24–3E | 1.00–20.0kHz |
| 01 xx 24 | EQUALIZER Lo-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 xx 25 | EQUALIZER Lo-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 xx 26 | EQUALIZER Lo-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 xx 27 | EQUALIZER Hi-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 xx 28 | EQUALIZER Hi-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 xx 29 | EQUALIZER Hi-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 xx 2A | EQUALIZER Lo GAIN | 04–7C | -12.0–12.0dB |
| 01 xx 2B | EQUALIZER Lo FREQUENCY | 02–2A | 20Hz–2.00kHz |
| 01 xx 2C | VOICE CHANGER SW | 00–01 | OFF, ON |
| 01 xx 2D | VOICE CHANGER PITCH | 74–00–0C | -12–0–+12 |
| 01 xx 2E | VOICE CHANGER FORMANT | 76–00–0A | -10–0–+10 |
| 01 xx 2F | VOICE CHANGER ROBOT | 00–01 | OFF, ON |
| 01 xx 30 | VOICE CHANGER MIX | 00–64 | 0–100 |
| 01 xx 31 | EMBEDDED AUDIO CHANNEL | 00–03 | 1/2, 3/4, 5/6, 7/8 |
| 01 xx 32 | HIGH PASS FILTER FREQUENCY | 01–45 | 20.0Hz–1kHz |

#### Audio Parameter Area — AUDIO OUTPUT ASSIGN（G 行 539–549）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 20 00 | AUDIO OUT 1 (XLR) | 00–03 | MAIN BUS, AUX 1 BUS, AUX 2 BUS, MONITOR BUS |
| 01 22 01（原文ママ。前後から 01 20 01 の誤記【推測】） | AUDIO OUT 2 (RCA) | 00–03 | MAIN BUS, AUX 1 BUS, AUX 2 BUS, MONITOR BUS |
| 01 20 02 | PHONES OUT / MONITOR | 00–02 | MAIN BUS, AUX 1 BUS, AUX 2 BUS |
| 01 20 03 | USB OUT | 00–02 | MAIN BUS, AUX 1 BUS, AUX 2 BUS |
| 01 20 04 | STREAM/RECORD | 00–02 | MAIN BUS, AUX 1 BUS, AUX 2 BUS |
| 01 20 05 | AUDIO RECORD | 00–02 | MAIN BUS, AUX 1 BUS, AUX 2 BUS |
| 01 20 06 | VIDEO OUT 1 | 00–03 | MAIN BUS, AUX 1 BUS, AUX 2 BUS, MONITOR BUS |
| 01 20 07 | VIDEO OUT 2 | 00–03 | MAIN BUS, AUX 1 BUS, AUX 2 BUS, MONITOR BUS |
| 01 20 08 | VIDEO OUT 3 | 00–03 | MAIN BUS, AUX 1 BUS, AUX 2 BUS, MONITOR BUS |

#### Audio Parameter Area — AUDIO MAIN BUS（G 行 553–656）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 21 00–02 | LEVEL | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 21 03 | MUTE | 00–01 | OFF, ON |
| 01 21 04 | SOLO | 00–01 | OFF, ON |
| 01 21 05–06 | DELAY | 00 00–27 08 | 0.0–500.0msec |
| 01 21 07 | COMPRESSOR/LIMITER TYPE | 00–01 | COMPRESSOR, LIMITER |
| 01 21 08 | COMPRESSOR/LIMITER SW | 00–01 | OFF, ON |
| 01 21 09 | LIMITER THRESHOLD | 58–00 | -40–0dB |
| 01 21 0A | COMPRESSOR THRESHOLD | 4E–00 | -50–0dB |
| 01 21 0B | COMPRESSOR RATIO | 00–0D | 1.00:1 … 16.0:1, INF:1（AUDIO INPUT と同じ 14 段） |
| 01 21 0C | COMPRESSOR ATTACK | 00–73 | 0.0–100msec |
| 01 21 0D | COMPRESSOR RELEASE | 00–7F | 30–5000msec |
| 01 21 0E | COMPRESSOR MAKEUP GAIN | 58–00–28 | -40–0–40dB |
| 01 21 0F | REVERB LEVEL | 00–7F | 0–127 |
| 01 21 10 | REVERB SW | 00–01 | OFF, ON |
| 01 21 11 | REVERB TYPE | 00–01 | ROOM, HALL |
| 01 21 12 | REVERB SIZE | 01–14 | 1–20 |
| 01 21 13–15 | REVERB RETURN LEVEL | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 21 16 | EQUALIZER SW | 00–01 | OFF, ON |
| 01 21 17 | EQUALIZER Hi GAIN | 04–7C | -12.0–12.0dB |
| 01 21 18 | EQUALIZER Hi FREQUENCY | 24–3E | 1.00–20.0kHz |
| 01 21 19 | EQUALIZER Lo-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 21 1A | EQUALIZER Lo-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 21 1B | EQUALIZER Lo-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 21 1C | EQUALIZER Hi-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 21 1D | EQUALIZER Hi-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 21 1E | EQUALIZER Hi-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 21 1F | EQUALIZER Lo GAIN | 04–7C | -12.0–12.0dB |
| 01 21 20 | EQUALIZER Lo FREQUENCY | 02–2A | 20Hz–2.00kHz |
| 01 21 21 | GEQ SW | 00–01 | OFF, ON |
| 01 21 22–23 | GEQ GAIN 25Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 24–25 | GEQ GAIN 40Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 26–27 | GEQ GAIN 60Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 28–29 | GEQ GAIN 100Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 2A–2B | GEQ GAIN 160Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 2C–2D | GEQ GAIN 250Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 2E–2F | GEQ GAIN 400Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 30–31 | GEQ GAIN 630Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 32–33 | GEQ GAIN 1kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 34–35 | GEQ GAIN 1.6kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 36–37 | GEQ GAIN 2.5kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 38–39 | GEQ GAIN 4kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 3A–3B | GEQ GAIN 6.3Hz（原文ママ＝6.3kHz） | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 3C–3D | GEQ GAIN 10kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 3E–3F | GEQ GAIN 16kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 21 40 | LOUDNESS AUTO GAIN CONTROL SW | 00–01 | OFF, ON |
| 01 21 41 | INTEGRATED GAIN CONTROL | 00–01 | DISABLE, ENABLE |
| 01 21 42 | INTEGRATED GAIN CONTROL SENS | 00–7F | 0–127 |
| 01 21 43 | MOMENTARY GAIN CONTROL | 00–01 | DISABLE, ENABLE |
| 01 21 44 | MOMENTARY GAIN CONTROL SENS | 00–7F | 0–127 |
| 01 21 45 | TARGET LKFS | 5E–76 | -34– -10dB |
| 01 21 46 | ADAPTIVE NOISE REDUCTION SW | 00–01 | OFF, ON |
| 01 21 47 | ADAPTIVE NOISE REDUCTION DEPTH | 00–7F | 0–127 |
| 01 21 48 | ADAPTIVE NOISE REDUCTION TALKING DETECTOR | 00–7F | 0–127 |
| 01 21 49 | ADAPTIVE NOISE REDUCTION AUTO LEARN | 00–01 | DISABLE, ENABLE |
| 01 21 4A | LO FREQUENCY CUT SW | 00–01 | OFF, ON |

#### Audio Parameter Area — AUDIO AUX 1 BUS（G 行 660–744）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 22 00–02 | LEVEL | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 22 03 | MUTE | 00–01 | OFF, ON |
| 01 22 04 | SOLO | 00–01 | OFF, ON |
| 01 22 05–06 | DELAY | 00 00–27 08 | 0.0–500.0msec |
| 01 22 07 | COMPRESSOR/LIMITER TYPE | 00–01 | COMPRESSOR, LIMITER |
| 01 22 08 | COMPRESSOR/LIMITER SW | 00–01 | OFF, ON |
| 01 22 09 | LIMITER THRESHOLD | 58–00 | -40–0dB |
| 01 22 0A | COMPRESSOR THRESHOLD | 4E–00 | -50–0dB |
| 01 22 0B | COMPRESSOR RATIO | 00–0D | 1.00:1 … 16.0:1, INF:1 |
| 01 22 0C | COMPRESSOR ATTACK | 00–73 | 0.0–100msec |
| 01 22 0D | COMPRESSOR RELEASE | 00–7F | 30–5000msec |
| 01 22 0E | COMPRESSOR MAKEUP GAIN | 58–00–28 | -40–0–40dB |
| 01 22 0F–11 | REVERB RETURN LEVEL | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 22 12 | EQUALIZER SW | 00–01 | OFF, ON |
| 01 22 13 | EQUALIZER Hi GAIN | 04–7C | -12.0–12.0dB |
| 01 22 14 | EQUALIZER Hi FREQUENCY | 24–3E | 1.00–20.0kHz |
| 01 22 15 | EQUALIZER Lo-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 22 16 | EQUALIZER Lo-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 22 17 | EQUALIZER Lo-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 22 18 | EQUALIZER Hi-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 22 19 | EQUALIZER Hi-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 22 1A | EQUALIZER Hi-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 22 1B | EQUALIZER Lo GAIN | 04–7C | -12.0–12.0dB |
| 01 22 1C | EQUALIZER Lo FREQUENCY | 02–2A | 20Hz–2.00kHz |
| 01 22 1D | GEQ SW | 00–01 | OFF, ON |
| 01 22 1E–1F | GEQ GAIN 25Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 20–21 | GEQ GAIN 40Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 22–23 | GEQ GAIN 60Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 24–25 | GEQ GAIN 100Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 26–27 | GEQ GAIN 160Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 28–29 | GEQ GAIN 250Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 2A–2B | GEQ GAIN 400Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 2C–2D | GEQ GAIN 630Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 2E–2F | GEQ GAIN 1kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 30–31 | GEQ GAIN 1.6kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 32–33 | GEQ GAIN 2.5kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 34–35 | GEQ GAIN 4kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 36–37 | GEQ GAIN 6.3Hz（原文ママ） | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 38–39 | GEQ GAIN 10kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 22 3A–3B | GEQ GAIN 16kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |

#### Audio Parameter Area — AUDIO AUX 1 SEND（G 行 748–822）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 23 00–02 | AUDIO IN 1 SEND | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 23 03–05 | AUDIO IN 2 SEND | 同上 | 同上 |
| 01 23 06–08 | AUDIO IN 3 SEND | 同上 | 同上 |
| 01 23 09–0B | AUDIO IN 4 SEND | 同上 | 同上 |
| 01 23 0C–0E | AUDIO IN 5 SEND | 同上 | 同上 |
| 01 23 0F–11 | AUDIO IN 6 SEND | 同上 | 同上 |
| 01 23 12–14 | AUDIO IN 7/8 SEND | 同上 | 同上 |
| 01 23 15–17 | USB IN SEND | 同上 | 同上 |
| 01 23 18–1A | Bluetooth IN SEND | 同上 | 同上 |
| 01 23 1B–1D | AUDIO PLAYER SEND | 同上 | 同上 |
| 01 23 1E–20 | VIDEO IN 1 SEND | 同上 | 同上 |
| 01 23 21–23 | VIDEO IN 2 SEND | 同上 | 同上 |
| 01 23 24–26 | VIDEO IN 3 SEND | 同上 | 同上 |
| 01 23 27–29 | VIDEO IN 4 SEND | 同上 | 同上 |
| 01 23 2A–2C | VIDEO IN 5 SEND | 同上 | 同上 |
| 01 23 2D–2F | VIDEO IN 6 SEND | 同上 | 同上 |
| 01 23 30–32 | VIDEO PLAYER/SRT IN SEND | 同上 | 同上 |
| 01 23 33 | AUDIO IN 1 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 34 | AUDIO IN 2 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 35 | AUDIO IN 3 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 36 | AUDIO IN 4 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 37 | AUDIO IN 5 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 38 | AUDIO IN 6 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 39 | AUDIO IN 7/8 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 3A | USB IN SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 3B | Bluetooth IN SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 3C | AUDIO PLAYER SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 3D | VIDEO IN 1 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 3E | VIDEO IN 2 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 3F | VIDEO IN 3 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 40 | VIDEO IN 4 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 41 | VIDEO IN 5 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 42 | VIDEO IN 6 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 23 43 | VIDEO PLAYER/SRT IN SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |

#### Audio Parameter Area — AUDIO AUX 2 BUS（G 行 826–910）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 24 00–02 | LEVEL | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 24 03 | MUTE | 00–01 | OFF, ON |
| 01 24 04 | SOLO | 00–01 | OFF, ON |
| 01 24 05–06 | DELAY | 00 00–27 08 | 0.0–500.0msec |
| 01 24 07 | COMPRESSOR/LIMITER TYPE | 00–01 | COMPRESSOR, LIMITER |
| 01 24 08 | COMPRESSOR/LIMITER SW | 00–01 | OFF, ON |
| 01 24 09 | LIMITER THRESHOLD | 58–00 | -40–0dB |
| 01 24 0A | COMPRESSOR THRESHOLD | 4E–00 | -50–0dB |
| 01 24 0B | COMPRESSOR RATIO | 00–0D | 1.00:1 … 16.0:1, INF:1 |
| 01 24 0C | COMPRESSOR ATTACK | 00–73 | 0.0–100msec |
| 01 24 0D | COMPRESSOR RELEASE | 00–7F | 30–5000msec |
| 01 24 0E | COMPRESSOR MAKEUP GAIN | 58–00–28 | -40–0–40dB |
| 01 24 0F–11 | REVERB RETURN LEVEL | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 24 12 | EQUALIZER SW | 00–01 | OFF, ON |
| 01 24 13 | EQUALIZER Hi GAIN | 04–7C | -12.0–12.0dB |
| 01 24 14 | EQUALIZER Hi FREQUENCY | 24–3E | 1.00–20.0kHz |
| 01 24 15 | EQUALIZER Lo-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 24 16 | EQUALIZER Lo-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 24 17 | EQUALIZER Lo-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 24 18 | EQUALIZER Hi-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 24 19 | EQUALIZER Hi-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 24 1A | EQUALIZER Hi-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 24 1B | EQUALIZER Lo GAIN | 04–7C | -12.0–12.0dB |
| 01 24 1C | EQUALIZER Lo FREQUENCY | 02–2A | 20Hz–2.00kHz |
| 01 24 1D | GEQ SW | 00–01 | OFF, ON |
| 01 24 1E–1F | GEQ GAIN 25Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 20–21 | GEQ GAIN 40Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 22–23 | GEQ GAIN 60Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 24–25 | GEQ GAIN 100Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 26–27 | GEQ GAIN 160Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 28–29 | GEQ GAIN 250Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 2A–2B | GEQ GAIN 400Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 2C–2D | GEQ GAIN 630Hz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 2E–2F | GEQ GAIN 1kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 30–31 | GEQ GAIN 1.6kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 32–33 | GEQ GAIN 2.5kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 34–35 | GEQ GAIN 4kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 36–37 | GEQ GAIN 6.3Hz（原文ママ） | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 38–39 | GEQ GAIN 10kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |
| 01 24 3A–3B | GEQ GAIN 16kHz | 7E 6A–00 00–01 16 | -15.0–+15.0dB |

#### Audio Parameter Area — AUDIO AUX 2 SEND（G 行 914–989）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 25 00–02 | AUDIO IN 1 SEND | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 25 03–05 | AUDIO IN 2 SEND | 同上 | 同上 |
| 01 25 06–08 | AUDIO IN 3 SEND | 同上 | 同上 |
| 01 25 09–0B | AUDIO IN 4 SEND | 同上 | 同上 |
| 01 25 0C–0E | AUDIO IN 5 SEND | 同上 | 同上 |
| 01 25 0F–11 | AUDIO IN 6 SEND | 同上 | 同上 |
| 01 25 12–14 | AUDIO IN 7/8 SEND | 同上 | 同上 |
| 01 25 15–17 | USB IN SEND | 同上 | 同上 |
| 01 25 18–1A | Bluetooth IN SEND | 同上 | 同上 |
| 01 25 1B–1D | AUDIO PLAYER SEND | 同上 | 同上 |
| 01 25 1E–20 | VIDEO IN 1 SEND | 同上 | 同上 |
| 01 25 21–23 | VIDEO IN 2 SEND | 同上 | 同上 |
| 01 25 24–26 | VIDEO IN 3 SEND | 同上 | 同上 |
| 01 25 27–29 | VIDEO IN 4 SEND | 同上 | 同上 |
| 01 25 2A–2C | VIDEO IN 5 SEND | 同上 | 同上 |
| 01 25 2D–2F | VIDEO IN 6 SEND | 同上 | 同上 |
| 01 25 30–32 | VIDEO PLAYER/SRT IN SEND | 同上 | 同上 |
| 01 25 33 | AUDIO IN 1 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 34 | AUDIO IN 2 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 35 | AUDIO IN 3 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 36 | AUDIO IN 4 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 37 | AUDIO IN 5 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 38 | AUDIO IN 6 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 39 | AUDIO IN 7/8 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 3A | USB IN SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 3B | Bluetooth IN SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 3C | AUDIO PLAYER SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 3D | VIDEO IN 1 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 3E | VIDEO IN 2 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 3F | VIDEO IN 3 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 40 | VIDEO IN 4 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 41 | VIDEO IN 5 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 42 | VIDEO IN 6 SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |
| 01 25 43 | VIDEO PLAYER/SRT IN SEND POINT | 00–02 | DRY, PRE FADER, POST FADER |

#### Audio Parameter Area — AUDIO USB OUTPUT（G 行 997–1016）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 26 00–02 | LEVEL | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 26 03 | MUTE | 00–01 | OFF, ON |
| 01 26 04–05 | DELAY | 00 00–27 08 | 0.0–500.0msec |
| 01 26 06 | EQUALIZER SW | 00–01 | OFF, ON |
| 01 26 07 | EQUALIZER Hi GAIN | 04–7C | -12.0–12.0dB |
| 01 26 08 | EQUALIZER Hi FREQUENCY | 24–3E | 1.00–20.0kHz |
| 01 26 09 | EQUALIZER Lo-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 26 0A | EQUALIZER Lo-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 26 0B | EQUALIZER Lo-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 26 0C | EQUALIZER Hi-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 26 0D | EQUALIZER Hi-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 26 0E | EQUALIZER Hi-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 26 0F | EQUALIZER Lo GAIN | 04–7C | -12.0–12.0dB |
| 01 26 10 | EQUALIZER Lo FREQUENCY | 02–2A | 20Hz–2.00kHz |

#### Audio Parameter Area — AUDIO STREAM/RECORD（G 行 1020–1039）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 27 00–02 | LEVEL | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 27 03 | MUTE | 00–01 | OFF, ON |
| 01 27 04–05 | DELAY | 00 00–27 08 | 0.0–500.0msec |
| 01 27 06 | EQUALIZER SW | 00–01 | OFF, ON |
| 01 27 07 | EQUALIZER Hi GAIN | 04–7C | -12.0–12.0dB |
| 01 27 08 | EQUALIZER Hi FREQUENCY | 24–3E | 1.00–20.0kHz |
| 01 27 09 | EQUALIZER Lo-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 27 0A | EQUALIZER Lo-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 27 0B | EQUALIZER Lo-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 27 0C | EQUALIZER Hi-Mid GAIN | 04–7C | -12.0–12.0dB |
| 01 27 0D | EQUALIZER Hi-Mid FREQUENCY | 02–3E | 20Hz–20.0kHz |
| 01 27 0E | EQUALIZER Hi-Mid Q | 00–05 | 0.5, 1.0, 2.0, 4.0, 8.0, 16.0 |
| 01 27 0F | EQUALIZER Lo GAIN | 04–7C | -12.0–12.0dB |
| 01 27 10 | EQUALIZER Lo FREQUENCY | 02–2A | 20Hz–2.00kHz |

#### Audio Parameter Area — MONITOR BUS（G 行 1043–1048）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 28 00–02 | LEVEL | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 01 28 03 | MUTE | 00–01 | OFF, ON |

#### Audio Parameter Area — AUDIO EMBEDDED（G 行 1052–1086）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 29 00 | VIDEO OUT 1-3 SEND (CHANNEL 3/4) | 00–0E | N/A, AUDIO IN 1/2, AUDIO IN 3/4, AUDIO IN 5/6, AUDIO IN 7/8, USB IN, Bluetooth IN, AUDIO PLAYER, VIDEO IN 1–6, VIDEO PLAYER/SRT IN |
| 01 29 01 | VIDEO OUT 1-3 SEND (CHANNEL 5/6) | 00–0E | 同上 |
| 01 29 02 | VIDEO OUT 1-3 SEND (CHANNEL 7/8) | 00–0E | 同上 |
| 01 29 03 | AUDIO IN 1 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 04 | AUDIO IN 2 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 05 | AUDIO IN 3 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 06 | AUDIO IN 4 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 07 | AUDIO IN 5 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 08 | AUDIO IN 6 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 09 | AUDIO IN 7/8 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 0A | USB IN EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 0B | Bluetooth IN EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 0C | AUDIO PLAYER EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 0D | VIDEO IN 1 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 0E | VIDEO IN 2 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 0F | VIDEO IN 3 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 10 | VIDEO IN 4 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 11 | VIDEO IN 5 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 12 | VIDEO IN 6 EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |
| 01 29 13 | VIDEO PLAYER/SRT IN EMBEDDED POSITION | 00–03 | OFF, DRY, PRE FADER, POST FADER |

#### Audio Parameter Area — AUDIO FOLLOW（G 行 1090–1111）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 30 00 | VIDEO IN 1 | 00–01 | OFF, ON |
| 01 30 01 | VIDEO IN 2 | 00–01 | OFF, ON |
| 01 30 02 | VIDEO IN 3 | 00–01 | OFF, ON |
| 01 30 03 | VIDEO IN 4 | 00–01 | OFF, ON |
| 01 30 04 | VIDEO IN 5 | 00–01 | OFF, ON |
| 01 30 05 | VIDEO IN 6 | 00–01 | OFF, ON |
| 01 30 06 | VIDEO PLAYER/SRT IN | 00–01 | OFF, ON |
| 01 30 07 | AUDIO IN 1 | 00–1D | OFF, VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER/SRT IN, INPUT 1–6 |
| 01 30 08 | AUDIO IN 2 | 00–1D | 同上 |
| 01 30 09 | AUDIO IN 3 | 00–1D | 同上 |
| 01 30 0A | AUDIO IN 4 | 00–1D | 同上 |
| 01 30 0B | AUDIO IN 5 | 00–1D | 同上 |
| 01 30 0C | AUDIO IN 6 | 00–1D | 同上 |
| 01 30 0D | AUDIO IN 7/8 | 00–1D | 同上 |
| 01 30 0E | USB IN | 00–1D | 同上 |
| 01 30 0F | Bluetooth IN | 00–1D | 同上 |
| 01 30 10 | AUDIO PLAYER | 00–1D | 同上 |
| 01 30 11 | PinP&KEY 1 FOLLOW | 00–01 | OFF, ON |
| 01 30 12 | PinP&KEY 2 FOLLOW | 00–01 | OFF, ON |
| 01 30 13 | DSK FOLLOW | 00–01 | OFF, ON |

#### Audio Parameter Area — AUDIO AUTO MIXING（G 行 1115–1156）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 01 31 00 | AUTO MIXING SW | 00–01 | OFF, ON |
| 01 31 01 | AUDIO IN 1 | 00–01 | DISABLE, ENABLE |
| 01 31 02 | AUDIO IN 2 | 00–01 | DISABLE, ENABLE |
| 01 31 03 | AUDIO IN 3 | 00–01 | DISABLE, ENABLE |
| 01 31 04 | AUDIO IN 4 | 00–01 | DISABLE, ENABLE |
| 01 31 05 | AUDIO IN 5 | 00–01 | DISABLE, ENABLE |
| 01 31 06 | AUDIO IN 6 | 00–01 | DISABLE, ENABLE |
| 01 31 07 | AUDIO IN 7/8 | 00–01 | DISABLE, ENABLE |
| 01 31 08 | USB IN | 00–01 | DISABLE, ENABLE |
| 01 31 09 | Bluetooth IN | 00–01 | DISABLE, ENABLE |
| 01 31 0A | AUDIO PLAYER | 00–01 | DISABLE, ENABLE |
| 01 31 0B | VIDEO IN 1 | 00–01 | DISABLE, ENABLE |
| 01 31 0C | VIDEO IN 2 | 00–01 | DISABLE, ENABLE |
| 01 31 0D | VIDEO IN 3 | 00–01 | DISABLE, ENABLE |
| 01 31 0E | VIDEO IN 4 | 00–01 | DISABLE, ENABLE |
| 01 31 0F | VIDEO IN 5 | 00–01 | DISABLE, ENABLE |
| 01 31 10 | VIDEO IN 6 | 00–01 | DISABLE, ENABLE |
| 01 31 11 | VIDEO PLAYER/SRT IN | 00–01 | DISABLE, ENABLE |
| 01 31 12 | AUDIO IN 1 WEIGHT | 00–64 | 0–100% |
| 01 31 13 | AUDIO IN 2 WEIGHT | 00–64 | 0–100% |
| 01 31 14 | AUDIO IN 3 WEIGHT | 00–64 | 0–100% |
| 01 31 15 | AUDIO IN 4 WEIGHT | 00–64 | 0–100% |
| 01 31 16 | AUDIO IN 5 WEIGHT | 00–64 | 0–100% |
| 01 31 17 | AUDIO IN 6 WEIGHT | 00–64 | 0–100% |
| 01 31 18 | AUDIO IN 7/8 WEIGHT | 00–64 | 0–100% |
| 01 31 19 | USB IN WEIGHT | 00–64 | 0–100% |
| 01 31 1A | Bluetooth IN WEIGHT | 00–64 | 0–100% |
| 01 31 1B | AUDIO PLAYER WEIGHT | 00–64 | 0–100% |
| 01 31 1C | VIDEO IN 1 WEIGHT | 00–64 | 0–100% |
| 01 31 1D | VIDEO IN 2 WEIGHT | 00–64 | 0–100% |
| 01 31 1E | VIDEO IN 3 WEIGHT | 00–64 | 0–100% |
| 01 31 1F | VIDEO IN 4 WEIGHT | 00–64 | 0–100% |
| 01 31 20 | VIDEO IN 5 WEIGHT | 00–64 | 0–100% |
| 01 31 21 | VIDEO IN 6 WEIGHT | 00–64 | 0–100% |
| 01 31 22 | VIDEO PLAYER/SRT IN WEIGHT | 00–64 | 0–100% |

#### System Parameter Area — Version（G 行 1165–1172）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 00 00 | System Version Major | 00–09 | 0–9 |
| 02 00 01 | System Version Minor (1) | 00–09 | 0–9 |
| 02 00 02 | System Version Minor (2) | 00–09 | 0–9 |
| 02 00 03 | System Version Build (1) | 00–09 | 0–9 |
| 02 00 04 | System Version Build (2) | 00–09 | 0–9 |
| 02 00 05 | System Version Build (3) | 00–09 | 0–9 |

#### System Parameter Area — SYSTEM（G 行 1176–1276）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 01 00 | HDCP | 00–01 | OFF, ON |
| 02 01 01 | FRAME RATE | 00–07 | 60Hz, 59.94Hz, 50Hz, 30Hz, 29.97Hz, 25Hz, 24Hz, 23.98Hz |
| 02 01 02 | FRAME RATE - USB OUT | 00–01 | HALF RATE, NORMAL |
| 02 01 03 | FRAME RATE - STREAM/RECORD | 00–01 | HALF RATE, NORMAL |
| 02 01 04 | OUTPUT FORMAT - SYSTEM FORMAT | 00–01 | 1080p, 720p |
| 02 01 05 | OUTPUT FORMAT - VIDEO OUT 1 | 00–01 | 1080p, 1080i |
| 02 01 06 | OUTPUT FORMAT - VIDEO OUT 2 | 00–01 | 1080p, 1080i |
| 02 01 07 | OUTPUT FORMAT - VIDEO OUT 3 | 00–01 | 1080p, 1080i |
| 02 01 08 | OUTPUT FORMAT - USB OUT | 00–01 | 1080p, 720p |
| 02 01 09 | OUTPUT FORMAT - STREAM/RECORD | 00–01 | 1080p, 720p |
| 02 01 0A | Bluetooth SW | 00–01 | OFF, ON |
| 02 01 0B | LANGUAGE | 00–02 | ENGLISH, JAPANESE, SIMPLIFIED CHINESE |
| 02 01 0C | PANEL OPERATION | 00–01 | DISSOLVE, PGM/PST |
| 02 01 0D | EFFECTS TRANSITION SYNC | 00–01 | OFF, ON |
| 02 01 0E | EFFECTS SPOT | 00–01 | OFF, ON |
| 02 01 0F | AUDIO FADER/KNOB MODE | 00–01 | CATCH, DIRECT |
| 02 01 10 | AUX LINKED PGM | 00–02 | OFF, AUTO LINK, MANUAL LINK |
| 02 01 11 | OUTPUT FADE ASSIGN VIDEO FADE | 00–03 | N/A, BLACK, WHITE, AUX |
| 02 01 12 | OUTPUT FADE ASSIGN AUDIO FADE | 00–01 | OFF, ON |
| 02 01 13 | OUTPUT FADE TIME | 00–28 | 0.0–4.0sec |
| 02 01 14–15 | USER 1 ASSIGN | 00 00–02 5F | See “Menu List” in the “Reference Manual” (PDF). |
| 02 01 16–17 | USER 2 ASSIGN | 00 00–02 5F | 同上 |
| 02 01 18–19 | USER 3 ASSIGN | 00 00–02 5F | 同上 |
| 02 01 1A–1B | USER 4 ASSIGN | 00 00–02 5F | 同上 |
| 02 01 1C–1D | AUDIO EFFECT 1 ASSIGN | 00 00–01 0B | See “Menu List” in the “Reference Manual” (PDF). |
| 02 01 1E–1F | AUDIO EFFECT 2 ASSIGN | 00 00–01 0B | 同上 |
| 02 01 20–21 | AUDIO EFFECT 3 ASSIGN | 00 00–01 0B | 同上 |
| 02 01 22 | MONITOR 1 ASSIGN | 00–08 | N/A, MULTI-VIEW, STILL-VIEW, PROGRAM, SUB PROGRAM, PREVIEW, AUX, DSK SOURCE, AUDIO LEVEL |
| 02 01 23 | MONITOR 2 ASSIGN | 00–08 | 同上 |
| 02 01 24 | MONITOR 3 ASSIGN | 00–08 | 同上 |
| 02 01 25 | MONITOR 4 ASSIGN | 00–08 | 同上 |
| 02 01 26 | LED DIMMER | 01–08 | 1–8 |
| 02 01 27 | LCD DIMMER | 01–08 | 1–8 |
| 02 01 28 | LCD MENU | 00–01 | LEFT, RIGHT |
| 02 01 29 | TALLY FRAME - MULTI-VIEW | 00–01 | OFF, ON |
| 02 01 2A | TALLY FRAME - STILL-VIEW | 00–01 | OFF, ON |
| 02 01 2B | AUX/SOURCE INDICATOR - MULTI-VIEW | 00–01 | OFF, ON |
| 02 01 2C | AUX/SOURCE INDICATOR - STILL-VIEW | 00–01 | OFF, ON |
| 02 01 2D | EXTERNAL REC INDICATOR - MULTI-VIEW | 00–01 | OFF, ON |
| 02 01 2E | AUDIO LEVEL METER - MULTI-VIEW | 00–01 | OFF, ON |
| 02 01 2F | PREVIEW LABEL - MULTI-VIEW | 00–01 | OFF, ON |
| 02 01 30 | PREVIEW LABEL - STILL-VIEW | 00–01 | OFF, ON |
| 02 01 31 | PREVIEW LABEL SIZE | 00–01 | SMALL, NORMAL |
| 02 01 32 | MULTI-VIEW LAYOUT - LEFT | 00–05 | PROGRAM, SUB PROGRAM, PREVIEW, AUX, DSK SOURCE, BLACK |
| 02 01 33 | MULTI-VIEW LAYOUT - RIGHT | 00–05 | PROGRAM, SUB PROGRAM, PREVIEW, AUX, DSK SOURCE, BLACK |
| 02 01 34 | AUTO INPUT DETECT | 00–01 | OFF, ON |
| 02 01 35 | AUTO FAN CONTROL | 00–01 | OFF, ON |
| 02 01 36 | TEST PATTERN | 00–0C | OFF, COLOR BARS 75%, COLOR BARS 100%, RAMP, STEP, HATCH, DIAMOND, CIRCLE, COLOR BARS 75%-SP, COLOR BARS 100%-SP, RAMP-SP, STEP-SP, HATCH-SP |
| 02 01 37 | TEST PATTERN MOTION | 00–02 | DISABLE, SLOW, FAST |
| 02 01 38 | TEST TONE LEVEL | 00–03 | Off, -20dB, -10dB, 0dB |
| 02 01 39 | TEST TONE FREQUENCY L | 00–02 | 500Hz, 1kHz, 2kHz |
| 02 01 3A | TEST TONE FREQUENCY R | 00–02 | 500Hz, 1kHz, 2kHz |
| 02 01 3B | AUTO OFF (240min.) | 00–01 | OFF, ON |
| 02 01 3C | VIDEO SWITCHER BUTTON MODE | 00–03 | INPUT SELECT, AUX, SCENE MEMORY, MACRO |
| 02 01 3D | USB OUTPUT FORMAT | 00–01 | YUY2 & MJPEG, YUY2 |
| 02 01 3E | DASHBOARD LCD ASSIGN A | 00–05 | N/A, CLOCK, STREAM/RECORD STATUS 1, STREAM/RECORD STATUS 2, USER BUTTON 1/2, USER BUTTON 3/4 |
| 02 01 3F | DASHBOARD LCD ASSIGN B | 00–05 | 同上 |
| 02 01 40 | DASHBOARD VIDEO OUT ASSIGN A | 00–03 | N/A, CLOCK, STREAM/RECORD STATUS 1, STREAM/RECORD STATUS 2 |
| 02 01 41 | DASHBOARD VIDEO OUT ASSIGN B | 00–03 | N/A, CLOCK, STREAM/RECORD STATUS 1, STREAM/RECORD STATUS 2 |

#### System Parameter Area — AUDIO LEVEL METER（G 行 1280–1333）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 02 00 | LEVEL METER POSITION - AUDIO IN 1 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 01 | LEVEL METER POSITION - AUDIO IN 2 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 02 | LEVEL METER POSITION - AUDIO IN 3 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 03 | LEVEL METER POSITION - AUDIO IN 4 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 04 | LEVEL METER POSITION - AUDIO IN 5 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 05 | LEVEL METER POSITION - AUDIO IN 6 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 06 | LEVEL METER POSITION - AUDIO IN 7/8 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 07 | LEVEL METER POSITION - USB IN | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 08 | LEVEL METER POSITION - Bluetooth IN | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 09 | LEVEL METER POSITION - AUDIO PLAYER | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 0A | LEVEL METER POSITION - VIDEO IN 1 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 0B | LEVEL METER POSITION - VIDEO IN 2 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 0C | LEVEL METER POSITION - VIDEO IN 3 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 0D | LEVEL METER POSITION - VIDEO IN 4 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 0E | LEVEL METER POSITION - VIDEO IN 5 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 0F | LEVEL METER POSITION - VIDEO IN 6 | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 10 | LEVEL METER POSITION - VIDEO PLAYER/SRT IN | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 11 | LEVEL METER POSITION - MAIN BUS | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 12 | LEVEL METER POSITION - AUX 1 BUS | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 13 | LEVEL METER POSITION - AUX 2 BUS | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 14 | LEVEL METER POSITION - USB OUT | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 15 | LEVEL METER POSITION - STREAM/RECORD | 00–01 | PRE FADER (PFL), POST FADER (AFL) |
| 02 02 16 | AUDIO LEVEL CUSTOM 1 ASSIGN | 00–16 | AUDIO IN 1–6, AUDIO IN 7/8, USB IN, Bluetooth IN, AUDIO PLAYER, VIDEO IN 1–6, VIDEO PLAYER/SRT IN, MAIN BUS, AUX 1 BUS, AUX 2 BUS, USB OUT, STREAM/RECORD, MONITOR BUS |
| 02 02 17 | AUDIO LEVEL CUSTOM 2 ASSIGN | 00–16 | 同上 |
| 02 02 18 | AUDIO LEVEL CUSTOM 3 ASSIGN | 00–16 | 同上 |
| 02 02 19 | AUDIO LEVEL CUSTOM 4 ASSIGN | 00–16 | 同上 |
| 02 02 1A | AUDIO LEVEL CUSTOM 5 ASSIGN | 00–16 | 同上 |
| 02 02 1B | AUDIO LEVEL CUSTOM 6 ASSIGN | 00–16 | 同上 |
| 02 02 1C | AUDIO LEVEL CUSTOM 7 ASSIGN | 00–16 | 同上 |
| 02 02 1D | AUDIO LEVEL CUSTOM 8 ASSIGN | 00–16 | 同上 |
| 02 02 1E | LEVEL METER POSITION - MONITOR BUS | 00–01 | PRE FADER(PFL), POST FADER(AFL) |

#### System Parameter Area — PANEL LOCK（G 行 1337–1419）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 03 00 | TOUCH SCREEN | 00–01 | OFF, ON |
| 02 03 01 | VIDEO SWITCHER BUTTON 1 | 00–01 | OFF, ON |
| 02 03 02 | VIDEO SWITCHER BUTTON 2 | 00–01 | OFF, ON |
| 02 03 03 | VIDEO SWITCHER BUTTON 3 | 00–01 | OFF, ON |
| 02 03 04 | VIDEO SWITCHER BUTTON 4 | 00–01 | OFF, ON |
| 02 03 05 | VIDEO SWITCHER BUTTON 5 | 00–01 | OFF, ON |
| 02 03 06 | VIDEO SWITCHER BUTTON 6 | 00–01 | OFF, ON |
| 02 03 07 | CUT BUTTON | 00–01 | OFF, ON |
| 02 03 08 | AUTO BUTTON | 00–01 | OFF, ON |
| 02 03 09 | MODE - INPUT SELECT BUTTON | 00–01 | OFF, ON |
| 02 03 0A | MODE - AUX BUTTON | 00–01 | OFF, ON |
| 02 03 0B | MODE - SCENE MEMORY BUTTON | 00–01 | OFF, ON |
| 02 03 0C | MODE - MACRO BUTTON | 00–01 | OFF, ON |
| 02 03 0D | TRANSITION - MIX BUTTON | 00–01 | OFF, ON |
| 02 03 0E | TRANSITION - WIPE BUTTON | 00–01 | OFF, ON |
| 02 03 0F | TRANSITION - SPLIT BUTTON | 00–01 | OFF, ON |
| 02 03 10 | PinP&KEY 1 - POSITION H | 00–01 | OFF, ON |
| 02 03 11 | PinP&KEY 1 - POSITION V | 00–01 | OFF, ON |
| 02 03 12 | PinP&KEY 1 - PVW BUTTON | 00–01 | OFF, ON |
| 02 03 13 | PinP&KEY 1 - PGM BUTTON | 00–01 | OFF, ON |
| 02 03 14 | PinP&KEY 2 - POSITION H | 00–01 | OFF, ON |
| 02 03 15 | PinP&KEY 2 - POSITION V | 00–01 | OFF, ON |
| 02 03 16 | PinP&KEY 2 - PVW BUTTON | 00–01 | OFF, ON |
| 02 03 17 | PinP&KEY 2 - PGM BUTTON | 00–01 | OFF, ON |
| 02 03 18 | DSK - PVW BUTTON | 00–01 | OFF, ON |
| 02 03 19 | DSK - PGM BUTTON | 00–01 | OFF, ON |
| 02 03 1A | MONITOR BUTTON | 00–01 | OFF, ON |
| 02 03 1B | PANEL SETUP BUTTON | 00–01 | OFF, ON |
| 02 03 1C | OUTPUT FADE BUTTON | 00–01 | OFF, ON |
| 02 03 1D | AUDIO MIXER 1 - SETUP BUTTON | 00–01 | OFF, ON |
| 02 03 1E | AUDIO MIXER 1 - SOLO BUTTON | 00–01 | OFF, ON |
| 02 03 1F | AUDIO MIXER 1 - MUTE BUTTON | 00–01 | OFF, ON |
| 02 03 20 | AUDIO MIXER 1 - LEVEL FADER | 00–01 | OFF, ON |
| 02 03 21 | AUDIO MIXER 2 - SETUP BUTTON | 00–01 | OFF, ON |
| 02 03 22 | AUDIO MIXER 2 - SOLO BUTTON | 00–01 | OFF, ON |
| 02 03 23 | AUDIO MIXER 2 - MUTE BUTTON | 00–01 | OFF, ON |
| 02 03 24 | AUDIO MIXER 2 - LEVEL FADER | 00–01 | OFF, ON |
| 02 03 25 | AUDIO MIXER 3 - SETUP BUTTON | 00–01 | OFF, ON |
| 02 03 26 | AUDIO MIXER 3 - SOLO BUTTON | 00–01 | OFF, ON |
| 02 03 27 | AUDIO MIXER 3 - MUTE BUTTON | 00–01 | OFF, ON |
| 02 03 28 | AUDIO MIXER 3 - LEVEL FADER | 00–01 | OFF, ON |
| 02 03 29 | AUDIO MIXER 4 - SETUP BUTTON | 00–01 | OFF, ON |
| 02 03 2A | AUDIO MIXER 4 - SOLO BUTTON | 00–01 | OFF, ON |
| 02 03 2B | AUDIO MIXER 4 - MUTE BUTTON | 00–01 | OFF, ON |
| 02 03 2C | AUDIO MIXER 4 - LEVEL FADER | 00–01 | OFF, ON |
| 02 03 2D | AUDIO MIXER 5 - SETUP BUTTON | 00–01 | OFF, ON |
| 02 03 2E | AUDIO MIXER 5 - SOLO BUTTON | 00–01 | OFF, ON |
| 02 03 2F | AUDIO MIXER 5 - MUTE BUTTON | 00–01 | OFF, ON |
| 02 03 30 | AUDIO MIXER 5 - LEVEL FADER | 00–01 | OFF, ON |
| 02 03 31 | AUDIO MIXER 6 - SETUP BUTTON | 00–01 | OFF, ON |
| 02 03 32 | AUDIO MIXER 6 - SOLO BUTTON | 00–01 | OFF, ON |
| 02 03 33 | AUDIO MIXER 6 - MUTE BUTTON | 00–01 | OFF, ON |
| 02 03 34 | AUDIO MIXER 6 - LEVEL FADER | 00–01 | OFF, ON |
| 02 03 35 | AUDIO MIXER 7 - SETUP BUTTON | 00–01 | OFF, ON |
| 02 03 36 | AUDIO MIXER 7 - SOLO BUTTON | 00–01 | OFF, ON |
| 02 03 37 | AUDIO MIXER 7 - MUTE BUTTON | 00–01 | OFF, ON |
| 02 03 38 | AUDIO MIXER 7 - LEVEL FADER | 00–01 | OFF, ON |
| 02 03 39 | MAIN - SETUP BUTTON | 00–01 | OFF, ON |
| 02 03 3A | MAIN - MUTE BUTTON | 00–01 | OFF, ON |
| 02 03 3B | MAIN - LEVEL FADER | 00–01 | OFF, ON |
| 02 03 3C | AUX 1 KNOB | 00–01 | OFF, ON |
| 02 03 3D | AUX 2 KNOB | 00–01 | OFF, ON |
| 02 03 3E | USB STREAM KNOB | 00–01 | OFF, ON |
| 02 03 3F | STREAM/RECORD KNOB | 00–01 | OFF, ON |
| 02 03 40 | AUDIO EFFECT - SETUP BUTTON | 00–01 | OFF, ON |
| 02 03 41 | AUDIO EFFECT - AUDIO EFFECT 1 BUTTON | 00–01 | OFF, ON |
| 02 03 42 | AUDIO EFFECT - AUDIO EFFECT 2 BUTTON | 00–01 | OFF, ON |
| 02 03 43 | AUDIO EFFECT - AUDIO EFFECT 3 BUTTON | 00–01 | OFF, ON |
| 02 03 44 | AUDIO PLAYER - SETUP BUTTON | 00–01 | OFF, ON |
| 02 03 45 | AUDIO PLAYER - AUDIO PLAYER 1 PAD | 00–01 | OFF, ON |
| 02 03 46 | AUDIO PLAYER - AUDIO PLAYER 2 PAD | 00–01 | OFF, ON |
| 02 03 47 | AUDIO PLAYER - AUDIO PLAYER 3 PAD | 00–01 | OFF, ON |
| 02 03 48 | AUDIO PLAYER - AUDIO PLAYER 4 PAD | 00–01 | OFF, ON |
| 02 03 49 | AUDIO PLAYER - AUDIO PLAYER 5 PAD | 00–01 | OFF, ON |
| 02 03 4A | AUDIO PLAYER - AUDIO PLAYER 6 PAD | 00–01 | OFF, ON |
| 02 03 4B | AUDIO PLAYER - LEVEL KNOB | 00–01 | OFF, ON |

#### System Parameter Area — SCENE MEMORY（G 行 1423–1460）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 04 00 | START UP | 7F–00–1F | LAST MEMORY, MEMORY 1–32 |
| 02 04 01 | START UP - PRIORITY | 00–01 | MEMORY, PANEL |
| 02 04 02 | MEMORY PROTECT | 00–01 | OFF, ON |
| 02 04 03 | FADE TIME | 00–28 | 0.0–4.0sec |
| 02 04 04 | FADE - MIX/WIPE | 00–01 | OFF, ON |
| 02 04 05 | FADE - PinP&KEY 1 | 00–01 | OFF, ON |
| 02 04 06 | FADE - PinP&KEY 2 | 00–01 | OFF, ON |
| 02 04 07 | FADE - DSK | 00–01 | OFF, ON |
| 02 04 08 | LOAD PARAMETERS - VIDEO ASSIGN | 00–01 | OFF, ON |
| 02 04 09 | LOAD PARAMETERS - VIDEO INPUT | 00–01 | OFF, ON |
| 02 04 0A | LOAD PARAMETERS - VIDEO OUTPUT | 00–01 | OFF, ON |
| 02 04 0B | LOAD PARAMETERS - TRANSITION - TRANSITION TYPE | 00–01 | OFF, ON |
| 02 04 0C | LOAD PARAMETERS - TRANSITION - MIX | 00–01 | OFF, ON |
| 02 04 0D | LOAD PARAMETERS - TRANSITION - WIPE | 00–01 | OFF, ON |
| 02 04 0E | LOAD PARAMETERS - TRANSITION - SPLIT | 00–01 | OFF, ON |
| 02 04 0F | LOAD PARAMETERS - PinP&KEY - PinP&KEY 1 | 00–01 | OFF, ON |
| 02 04 10 | LOAD PARAMETERS - PinP&KEY - PinP&KEY 2 | 00–01 | OFF, ON |
| 02 04 11 | LOAD PARAMETERS - DSK - DSK | 00–01 | OFF, ON |
| 02 04 12 | LOAD PARAMETERS - INPUT SELECT | 00–01 | OFF, ON |
| 02 04 13 | LOAD PARAMETERS - AUDIO FADER/KNOB ASSIGN | 00–01 | OFF, ON |
| 02 04 14 | LOAD PARAMETERS - AUDIO INPUT | 00–01 | OFF, ON |
| 02 04 15 | LOAD PARAMETERS - AUDIO OUTPUT | 00–01 | OFF, ON |
| 02 04 16 | LOAD PARAMETERS - AUDIO FOLLOW | 00–01 | OFF, ON |
| 02 04 17 | LOAD PARAMETERS - AUDIO AUTO MIXING | 00–01 | OFF, ON |
| 02 04 18 | BUTTON ASSIGN - VIDEO SWITCHER BUTTON 1 | 00–1F | MEMORY 1–32 |
| 02 04 19 | BUTTON ASSIGN - VIDEO SWITCHER BUTTON 2 | 00–1F | MEMORY 1–32 |
| 02 04 1A | BUTTON ASSIGN - VIDEO SWITCHER BUTTON 3 | 00–1F | MEMORY 1–32 |
| 02 04 1B | BUTTON ASSIGN - VIDEO SWITCHER BUTTON 4 | 00–1F | MEMORY 1–32 |
| 02 04 1C | BUTTON ASSIGN - VIDEO SWITCHER BUTTON 5 | 00–1F | MEMORY 1–32 |
| 02 04 1D | BUTTON ASSIGN - VIDEO SWITCHER BUTTON 6 | 00–1F | MEMORY 1–32 |
| 02 04 1E | LOAD PARAMETERS - AUX SOURCE | 00–01 | OFF, ON |

#### System Parameter Area — SCENE MEMORY EXIST（G 行 1464–1497）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 05 00 | MEMORY 1 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 01 | MEMORY 2 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 02 | MEMORY 3 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 03 | MEMORY 4 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 04 | MEMORY 5 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 05 | MEMORY 6 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 06 | MEMORY 7 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 07 | MEMORY 8 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 08 | MEMORY 9 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 09 | MEMORY 10 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 0A | MEMORY 11 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 0B | MEMORY 12 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 0C | MEMORY 13 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 0D | MEMORY 14 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 0E | MEMORY 15 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 0F | MEMORY 16 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 10 | MEMORY 17 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 11 | MEMORY 18 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 12 | MEMORY 19 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 13 | MEMORY 20 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 14 | MEMORY 21 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 15 | MEMORY 22 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 16 | MEMORY 23 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 17 | MEMORY 24 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 18 | MEMORY 25 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 19 | MEMORY 26 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 1A | MEMORY 27 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 1B | MEMORY 28 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 1C | MEMORY 29 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 1D | MEMORY 30 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 1E | MEMORY 31 EXIST | 00–01 | NOT EXIST, EXIST (read only) |
| 02 05 1F | MEMORY 32 EXIST | 00–01 | NOT EXIST, EXIST (read only) |

#### System Parameter Area — SCENE MEMORY THUMBNAIL POSITION（G 行 1501–1703）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 06 00 | MEMORY 1 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 01 | MEMORY 2 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 02 | MEMORY 3 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 03 | MEMORY 4 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 04 | MEMORY 5 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 05 | MEMORY 6 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 06 | MEMORY 7 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 07 | MEMORY 8 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 08 | MEMORY 9 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 09 | MEMORY 10 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 0A | MEMORY 11 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 0B | MEMORY 12 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 0C | MEMORY 13 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 0D | MEMORY 14 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 0E | MEMORY 15 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 0F | MEMORY 16 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 10 | MEMORY 17 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 11 | MEMORY 18 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 12 | MEMORY 19 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 13 | MEMORY 20 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 14 | MEMORY 21 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 15 | MEMORY 22 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 16 | MEMORY 23 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 17 | MEMORY 24 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 18 | MEMORY 25 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 19 | MEMORY 26 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 1A | MEMORY 27 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 1B | MEMORY 28 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 1C | MEMORY 29 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 1D | MEMORY 30 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 1E | MEMORY 31 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 1F | MEMORY 32 THUMBNAIL POSITION - PROGRAM OUT | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 20 | MEMORY 1 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 21 | MEMORY 2 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 22 | MEMORY 3 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 23 | MEMORY 4 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 24 | MEMORY 5 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 25 | MEMORY 6 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 26 | MEMORY 7 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 27 | MEMORY 8 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 28 | MEMORY 9 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 29 | MEMORY 10 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 2A | MEMORY 11 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 2B | MEMORY 12 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 2C | MEMORY 13 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 2D | MEMORY 14 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 2E | MEMORY 15 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 2F | MEMORY 16 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 30 | MEMORY 17 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 31 | MEMORY 18 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 32 | MEMORY 19 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 33 | MEMORY 20 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 34 | MEMORY 21 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 35 | MEMORY 22 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 36 | MEMORY 23 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 37 | MEMORY 24 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 38 | MEMORY 25 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 39 | MEMORY 26 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 3A | MEMORY 27 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 3B | MEMORY 28 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 3C | MEMORY 29 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 3D | MEMORY 30 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 3E | MEMORY 31 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |
| 02 06 3F | MEMORY 32 THUMBNAIL POSITION - DSK | 00–08 | UPPER LEFT, UPPER, UPPER RIGHT, LEFT, CENTER, RIGHT, LOWER LEFT, LOWER, LOWER RIGHT |

#### System Parameter Area — STILL IMAGE（G 行 1707–1709）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 07 00 | SAVE TO INTERNAL STORAGE | 00–01 | DISABLE, ENABLE |

#### System Parameter Area — FREEZE（G 行 1713–1722）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 08 00 | FREEZE | 00–01 | OFF, ON |
| 02 08 01 | TYPE | 00–01 | ALL, SELECT |
| 02 08 02 | FREEZE SELECT - VIDEO IN 1 | 00–01 | DISABLE, ENABLE |
| 02 08 03 | FREEZE SELECT - VIDEO IN 2 | 00–01 | DISABLE, ENABLE |
| 02 08 04 | FREEZE SELECT - VIDEO IN 3 | 00–01 | DISABLE, ENABLE |
| 02 08 05 | FREEZE SELECT - VIDEO IN 4 | 00–01 | DISABLE, ENABLE |
| 02 08 06 | FREEZE SELECT - VIDEO IN 5 | 00–01 | DISABLE, ENABLE |
| 02 08 07 | FREEZE SELECT - VIDEO IN 6 | 00–01 | DISABLE, ENABLE |

#### System Parameter Area — AUTO SWITCHING（G 行 1726–1762。02 09 0C–2B は原文「:」省略を展開）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 09 00 | AUTO SWITCHING | 00–01 | OFF, ON |
| 02 09 01 | AUTO SWITCHING TYPE | 00–06 | INPUT SCAN, SCENE MEMORY SCAN, BEAT SYNC, VIDEO FOLLOWS AUDIO, PinP&KEY 1 SCAN–PinP&KEY 2 SCAN, DSK SCAN |
| 02 09 02 | INPUT SCAN - SCAN SEQUENCE | 00–02 | NORMAL, REVERSE, RANDOM |
| 02 09 03 | INPUT SCAN - SCAN TRANSITION TIME | 00–28 | 0.0–4.0sec |
| 02 09 04 | INPUT SCAN - SCAN TARGET | 00–03 | PGM/A & PST/B, PinP&KEY 1–2, DSK |
| 02 09 05 | INPUT SCAN - INPUT 1 TIME | 00–78 | OFF, 1–120sec |
| 02 09 06 | INPUT SCAN - INPUT 2 TIME | 00–78 | OFF, 1–120sec |
| 02 09 07 | INPUT SCAN - INPUT 3 TIME | 00–78 | OFF, 1–120sec |
| 02 09 08 | INPUT SCAN - INPUT 4 TIME | 00–78 | OFF, 1–120sec |
| 02 09 09 | INPUT SCAN - INPUT 5 TIME | 00–78 | OFF, 1–120sec |
| 02 09 0A | INPUT SCAN - INPUT 6 TIME | 00–78 | OFF, 1–120sec |
| 02 09 0B | SCENE MEMORY SCAN - SCAN SEQUENCE | 00–02 | NORMAL, REVERSE, RANDOM |
| 02 09 0C | SCENE MEMORY SCAN - MEMORY 1 TIME | 00–78 | OFF, 1–120sec |
| 02 09 0D | SCENE MEMORY SCAN - MEMORY 2 TIME | 00–78 | OFF, 1–120sec |
| 02 09 0E | SCENE MEMORY SCAN - MEMORY 3 TIME | 00–78 | OFF, 1–120sec |
| 02 09 0F | SCENE MEMORY SCAN - MEMORY 4 TIME | 00–78 | OFF, 1–120sec |
| 02 09 10 | SCENE MEMORY SCAN - MEMORY 5 TIME | 00–78 | OFF, 1–120sec |
| 02 09 11 | SCENE MEMORY SCAN - MEMORY 6 TIME | 00–78 | OFF, 1–120sec |
| 02 09 12 | SCENE MEMORY SCAN - MEMORY 7 TIME | 00–78 | OFF, 1–120sec |
| 02 09 13 | SCENE MEMORY SCAN - MEMORY 8 TIME | 00–78 | OFF, 1–120sec |
| 02 09 14 | SCENE MEMORY SCAN - MEMORY 9 TIME | 00–78 | OFF, 1–120sec |
| 02 09 15 | SCENE MEMORY SCAN - MEMORY 10 TIME | 00–78 | OFF, 1–120sec |
| 02 09 16 | SCENE MEMORY SCAN - MEMORY 11 TIME | 00–78 | OFF, 1–120sec |
| 02 09 17 | SCENE MEMORY SCAN - MEMORY 12 TIME | 00–78 | OFF, 1–120sec |
| 02 09 18 | SCENE MEMORY SCAN - MEMORY 13 TIME | 00–78 | OFF, 1–120sec |
| 02 09 19 | SCENE MEMORY SCAN - MEMORY 14 TIME | 00–78 | OFF, 1–120sec |
| 02 09 1A | SCENE MEMORY SCAN - MEMORY 15 TIME | 00–78 | OFF, 1–120sec |
| 02 09 1B | SCENE MEMORY SCAN - MEMORY 16 TIME | 00–78 | OFF, 1–120sec |
| 02 09 1C | SCENE MEMORY SCAN - MEMORY 17 TIME | 00–78 | OFF, 1–120sec |
| 02 09 1D | SCENE MEMORY SCAN - MEMORY 18 TIME | 00–78 | OFF, 1–120sec |
| 02 09 1E | SCENE MEMORY SCAN - MEMORY 19 TIME | 00–78 | OFF, 1–120sec |
| 02 09 1F | SCENE MEMORY SCAN - MEMORY 20 TIME | 00–78 | OFF, 1–120sec |
| 02 09 20 | SCENE MEMORY SCAN - MEMORY 21 TIME | 00–78 | OFF, 1–120sec |
| 02 09 21 | SCENE MEMORY SCAN - MEMORY 22 TIME | 00–78 | OFF, 1–120sec |
| 02 09 22 | SCENE MEMORY SCAN - MEMORY 23 TIME | 00–78 | OFF, 1–120sec |
| 02 09 23 | SCENE MEMORY SCAN - MEMORY 24 TIME | 00–78 | OFF, 1–120sec |
| 02 09 24 | SCENE MEMORY SCAN - MEMORY 25 TIME | 00–78 | OFF, 1–120sec |
| 02 09 25 | SCENE MEMORY SCAN - MEMORY 26 TIME | 00–78 | OFF, 1–120sec |
| 02 09 26 | SCENE MEMORY SCAN - MEMORY 27 TIME | 00–78 | OFF, 1–120sec |
| 02 09 27 | SCENE MEMORY SCAN - MEMORY 28 TIME | 00–78 | OFF, 1–120sec |
| 02 09 28 | SCENE MEMORY SCAN - MEMORY 29 TIME | 00–78 | OFF, 1–120sec |
| 02 09 29 | SCENE MEMORY SCAN - MEMORY 30 TIME | 00–78 | OFF, 1–120sec |
| 02 09 2A | SCENE MEMORY SCAN - MEMORY 31 TIME | 00–78 | OFF, 1–120sec |
| 02 09 2B | SCENE MEMORY SCAN - MEMORY 32 TIME | 00–78 | OFF, 1–120sec |
| 02 09 2C | BEAT SYNC - SYNC SOURCE | 00–10 | AUDIO IN 1–6, AUDIO IN 7/8, USB IN, Bluetooth IN, AUDIO PLAYER, VIDEO IN 1–6, VIDEO PLAYER/SRT IN |
| 02 09 2D | BEAT SYNC - SCAN SEQUENCE | 00–02 | NORMAL, REVERSE, RANDOM |
| 02 09 2E | BEAT SYNC - SCAN TRANSITION TIME | 00–28 | 0.0–4.0sec |
| 02 09 2F | BEAT SYNC - SCAN CYCLE | 01–0A | 1–10 |
| 02 09 30 | BEAT SYNC - SCAN TARGET | 00–03 | PGM/A & PST/B, PinP&KEY 1–2, DSK |
| 02 09 31 | BEAT SYNC - INPUT 1 | 00–01 | OFF, ON |
| 02 09 32 | BEAT SYNC - INPUT 2 | 00–01 | OFF, ON |
| 02 09 33 | BEAT SYNC - INPUT 3 | 00–01 | OFF, ON |
| 02 09 34 | BEAT SYNC - INPUT 4 | 00–01 | OFF, ON |
| 02 09 35 | BEAT SYNC - INPUT 5 | 00–01 | OFF, ON |
| 02 09 36 | BEAT SYNC - INPUT 6 | 00–01 | OFF, ON |

#### System Parameter Area — AUTO SWITCHING - VIDEO FOLLOWS AUDIO（G 行 1766–1853）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 0A 00–01 | VIDEO FOLLOWS AUDIO - AUDIO IN 1 TARGET | 00 00–01 0A | OFF, INPUT 1–6, MEMORY 1–32, MACRO 1–100 |
| 02 0A 02–03 | VIDEO FOLLOWS AUDIO - AUDIO IN 2 TARGET | 00 00–01 0A | 同上 |
| 02 0A 04–05 | VIDEO FOLLOWS AUDIO - AUDIO IN 3 TARGET | 00 00–01 0A | 同上 |
| 02 0A 06–07 | VIDEO FOLLOWS AUDIO - AUDIO IN 4 TARGET | 00 00–01 0A | 同上 |
| 02 0A 08–09 | VIDEO FOLLOWS AUDIO - AUDIO IN 5 TARGET | 00 00–01 0A | 同上 |
| 02 0A 0A–0B | VIDEO FOLLOWS AUDIO - AUDIO IN 6 TARGET | 00 00–01 0A | 同上 |
| 02 0A 0C–0D | VIDEO FOLLOWS AUDIO - AUDIO IN 7/8 TARGET | 00 00–01 0A | 同上 |
| 02 0A 0E–0F | VIDEO FOLLOWS AUDIO - USB IN TARGET | 00 00–01 0A | 同上 |
| 02 0A 10–11 | VIDEO FOLLOWS AUDIO - Bluetooth IN TARGET | 00 00–01 0A | 同上 |
| 02 0A 12–13 | VIDEO FOLLOWS AUDIO - AUDIO PLAYER TARGET | 00 00–01 0A | 同上 |
| 02 0A 14–15 | VIDEO FOLLOWS AUDIO - VIDEO IN 1 TARGET | 00 00–01 0A | 同上 |
| 02 0A 16–17 | VIDEO FOLLOWS AUDIO - VIDEO IN 2 TARGET | 00 00–01 0A | 同上 |
| 02 0A 18–19 | VIDEO FOLLOWS AUDIO - VIDEO IN 3 TARGET | 00 00–01 0A | 同上 |
| 02 0A 1A–1B | VIDEO FOLLOWS AUDIO - VIDEO IN 4 TARGET | 00 00–01 0A | 同上 |
| 02 0A 1C–1D | VIDEO FOLLOWS AUDIO - VIDEO IN 5 TARGET | 00 00–01 0A | 同上 |
| 02 0A 1E–1F | VIDEO FOLLOWS AUDIO - VIDEO IN 6 TARGET | 00 00–01 0A | 同上 |
| 02 0A 20–21 | VIDEO FOLLOWS AUDIO - VIDEO PLAYER/SRT IN TARGET | 00 00–01 0A | 同上 |
| 02 0A 22 | VIDEO FOLLOWS AUDIO - AUDIO IN 1 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 23 | VIDEO FOLLOWS AUDIO - AUDIO IN 2 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 24 | VIDEO FOLLOWS AUDIO - AUDIO IN 3 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 25 | VIDEO FOLLOWS AUDIO - AUDIO IN 4 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 26 | VIDEO FOLLOWS AUDIO - AUDIO IN 5 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 27 | VIDEO FOLLOWS AUDIO - AUDIO IN 6 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 28 | VIDEO FOLLOWS AUDIO - AUDIO IN 7/8 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 29 | VIDEO FOLLOWS AUDIO - USB IN THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 2A | VIDEO FOLLOWS AUDIO - Bluetooth IN THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 2B | VIDEO FOLLOWS AUDIO - AUDIO PLAYER THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 2C | VIDEO FOLLOWS AUDIO - VIDEO IN 1 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 2D | VIDEO FOLLOWS AUDIO - VIDEO IN 2 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 2E | VIDEO FOLLOWS AUDIO - VIDEO IN 3 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 2F | VIDEO FOLLOWS AUDIO - VIDEO IN 4 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 30 | VIDEO FOLLOWS AUDIO - VIDEO IN 5 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 31 | VIDEO FOLLOWS AUDIO - VIDEO IN 6 THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 32 | VIDEO FOLLOWS AUDIO - VIDEO PLAYER/SRT IN THRESHOLD | 4E–00 | -50–0 dB |
| 02 0A 33–34 | VIDEO FOLLOWS AUDIO - MIX TARGET | 00 00–01 0A | OFF, INPUT 1–6, MEMORY 1–32, MACRO 1–100 |
| 02 0A 35–36 | VIDEO FOLLOWS AUDIO - SILENT TARGET | 00 00–01 0A | OFF, INPUT 1–6, MEMORY 1–32, MACRO 1–100 |
| 02 0A 37–38 | VIDEO FOLLOWS AUDIO - REDETECTION TIME | 00 00–02 2C | 0.0–30.0sec |
| 02 0A 39 | VIDEO FOLLOWS AUDIO - SCAN TRANSITION TIME | 00–28 | 0.0–4.0sec |

#### System Parameter Area — AUTO SWITCHING - PINP&KEY 1 SCAN（G 行 1857–1882）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 0B 00 | PINP&KEY 1 SCAN - SCAN SEQUENCE | 00–02 | NORMAL, REVERSE, RANDOM |
| 02 0B 01 | PINP&KEY 1 SCAN - VIDEO IN 1 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 02 | PINP&KEY 1 SCAN - VIDEO IN 2 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 03 | PINP&KEY 1 SCAN - VIDEO IN 3 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 04 | PINP&KEY 1 SCAN - VIDEO IN 4 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 05 | PINP&KEY 1 SCAN - VIDEO IN 5 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 06 | PINP&KEY 1 SCAN - VIDEO IN 6 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 07 | PINP&KEY 1 SCAN - STILL 1 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 08 | PINP&KEY 1 SCAN - STILL 2 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 09 | PINP&KEY 1 SCAN - STILL 3 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 0A | PINP&KEY 1 SCAN - STILL 4 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 0B | PINP&KEY 1 SCAN - STILL 5 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 0C | PINP&KEY 1 SCAN - STILL 6 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 0D | PINP&KEY 1 SCAN - STILL 7 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 0E | PINP&KEY 1 SCAN - STILL 8 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 0F | PINP&KEY 1 SCAN - STILL 9 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 10 | PINP&KEY 1 SCAN - STILL 10 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 11 | PINP&KEY 1 SCAN - STILL 11 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 12 | PINP&KEY 1 SCAN - STILL 12 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 13 | PINP&KEY 1 SCAN - STILL 13 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 14 | PINP&KEY 1 SCAN - STILL 14 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 15 | PINP&KEY 1 SCAN - STILL 15 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 16 | PINP&KEY 1 SCAN - STILL 16 TIME | 00–78 | OFF, 1–120sec |
| 02 0B 17 | PINP&KEY 1 SCAN - VIDEO PLAYER/SRT IN TIME | 00–78 | OFF, 1–120sec |

#### System Parameter Area — AUTO SWITCHING - PINP&KEY 2 SCAN（G 行 1886–1916）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 0C 00 | PINP&KEY 2 SCAN - SCAN SEQUENCE | 00–02 | NORMAL, REVERSE, RANDOM |
| 02 0C 01 | PINP&KEY 2 SCAN - VIDEO IN 1 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 02 | PINP&KEY 2 SCAN - VIDEO IN 2 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 03 | PINP&KEY 2 SCAN - VIDEO IN 3 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 04 | PINP&KEY 2 SCAN - VIDEO IN 4 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 05 | PINP&KEY 2 SCAN - VIDEO IN 5 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 06 | PINP&KEY 2 SCAN - VIDEO IN 6 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 07 | PINP&KEY 2 SCAN - STILL 1 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 08 | PINP&KEY 2 SCAN - STILL 2 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 09 | PINP&KEY 2 SCAN - STILL 3 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 0A | PINP&KEY 2 SCAN - STILL 4 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 0B | PINP&KEY 2 SCAN - STILL 5 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 0C | PINP&KEY 2 SCAN - STILL 6 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 0D | PINP&KEY 2 SCAN - STILL 7 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 0E | PINP&KEY 2 SCAN - STILL 8 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 0F | PINP&KEY 2 SCAN - STILL 9 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 10 | PINP&KEY 2 SCAN - STILL 10 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 11 | PINP&KEY 2 SCAN - STILL 11 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 12 | PINP&KEY 2 SCAN - STILL 12 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 13 | PINP&KEY 2 SCAN - STILL 13 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 14 | PINP&KEY 2 SCAN - STILL 14 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 15 | PINP&KEY 2 SCAN - STILL 15 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 16 | PINP&KEY 2 SCAN - STILL 16 TIME | 00–78 | OFF, 1–120sec |
| 02 0C 17 | PINP&KEY 2 SCAN - VIDEO PLAYER/SRT IN TIME | 00–78 | OFF, 1–120sec |

#### System Parameter Area — AUTO SWITCHING - DSK SCAN（G 行 1920–1945）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 0D 00 | DSK SCAN - SCAN SEQUENCE | 00–02 | NORMAL, REVERSE, RANDOM |
| 02 0D 01 | DSK SCAN - VIDEO IN 1 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 02 | DSK SCAN - VIDEO IN 2 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 03 | DSK SCAN - VIDEO IN 3 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 04 | DSK SCAN - VIDEO IN 4 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 05 | DSK SCAN - VIDEO IN 5 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 06 | DSK SCAN - VIDEO IN 6 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 07 | DSK SCAN - STILL 1 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 08 | DSK SCAN - STILL 2 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 09 | DSK SCAN - STILL 3 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 0A | DSK SCAN - STILL 4 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 0B | DSK SCAN - STILL 5 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 0C | DSK SCAN - STILL 6 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 0D | DSK SCAN - STILL 7 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 0E | DSK SCAN - STILL 8 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 0F | DSK SCAN - STILL 9 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 10 | DSK SCAN - STILL 10 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 11 | DSK SCAN - STILL 11 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 12 | DSK SCAN - STILL 12 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 13 | DSK SCAN - STILL 13 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 14 | DSK SCAN - STILL 14 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 15 | DSK SCAN - STILL 15 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 16 | DSK SCAN - STILL 16 TIME | 00–78 | OFF, 1–120sec |
| 02 0D 17 | DSK SCAN - VIDEO PLAYER/SRT IN TIME | 00–78 | OFF, 1–120sec |

#### System Parameter Area — CTL/EXP（xx = 0EH–0FH: CTL/EXP 1, 2。G 行 1949–1960）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 xx 00 | CTL/EXP TYPE | 00–02 | OFF, CTL A & CTL B, EXP |
| 02 xx 01–02 | CTL A ASSIGN | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 xx 03–04 | CTL B ASSIGN | 00 00–05 59 | 同上 |
| 02 xx 05 | EXP ASSIGN | 00–30 | 同上 |

#### System Parameter Area — RS-232/TALLY/GPO/GPI/KEYPAD（G 行 1964–2019。TALLY/GPO 2–15、GPI 2–7、KEYPAD 1–8 は原文「:」省略を展開）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 10 00 | RS-232 | 00–01 | OFF, ON |
| 02 10 01 | RS-232 - BAUDRATE | 00–02 | 9600, 38400, 115200 |
| 02 10 02 | TALLY/GPO - TEMPLATE | 00–02 | TALLY, GPO, TALLY/GPO |
| 02 10 03 | TALLY/GPO - TALLY/GPO 1 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 04 | TALLY/GPO - TALLY/GPO 2 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 05 | TALLY/GPO - TALLY/GPO 3 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 06 | TALLY/GPO - TALLY/GPO 4 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 07 | TALLY/GPO - TALLY/GPO 5 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 08 | TALLY/GPO - TALLY/GPO 6 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 09 | TALLY/GPO - TALLY/GPO 7 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 0A | TALLY/GPO - TALLY/GPO 8 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 0B | TALLY/GPO - TALLY/GPO 9 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 0C | TALLY/GPO - TALLY/GPO 10 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 0D | TALLY/GPO - TALLY/GPO 11 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 0E | TALLY/GPO - TALLY/GPO 12 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 0F | TALLY/GPO - TALLY/GPO 13 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 10 | TALLY/GPO - TALLY/GPO 14 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 11 | TALLY/GPO - TALLY/GPO 15 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 12 | TALLY/GPO - TALLY/GPO 16 | 00–49 | PGM VIDEO IN 1–6, PGM STILL 1–16, PGM VIDEO PLAYER/SRT IN, PGM INPUT 1–6, PST VIDEO IN 1–6, PST STILL 1–16, PST VIDEO PLAYER/SRT IN, PST INPUT 1–6, GPO 1–16 |
| 02 10 13–14 | GPI 1 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 15–16 | GPI 2 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 17–18 | GPI 3 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 19–1A | GPI 4 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 1B–1C | GPI 5 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 1D–1E | GPI 6 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 1F–20 | GPI 7 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 21–22 | GPI 8 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 23–24 | NUMERIC KYEPAD 0 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 25–26 | NUMERIC KYEPAD 1 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 27–28 | NUMERIC KYEPAD 2 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 29–2A | NUMERIC KYEPAD 3 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 2B–2C | NUMERIC KYEPAD 4 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 2D–2E | NUMERIC KYEPAD 5 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 2F–30 | NUMERIC KYEPAD 6 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 31–32 | NUMERIC KYEPAD 7 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 33–34 | NUMERIC KYEPAD 8 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 35–36 | NUMERIC KYEPAD 9 | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 37–38 | NUMERIC KYEPAD + | 00 00–05 59 | See “Menu List” in the “Reference Manual” (PDF). |
| 02 10 39–3A | NUMERIC KYEPAD - | 00 00–05 59 | 同上 |
| 02 10 3B–3C | NUMERIC KYEPAD * | 00 00–05 59 | 同上 |
| 02 10 3D–3E | NUMERIC KYEPAD / | 00 00–05 59 | 同上 |
| 02 10 3F–40 | NUMERIC KYEPAD . | 00 00–05 59 | 同上 |
| 02 10 41–42 | NUMERIC KYEPAD ENTER | 00 00–05 59 | 同上 |
| 02 10 43 | TALLY SETTINGS - AUX | 00–01 | DISABLE, ENABLE |
| 02 10 44 | TALLY SETTINGS - PinP&KEY 1 | 00–01 | DISABLE, ENABLE |
| 02 10 45 | TALLY SETTINGS - PinP&KEY 2 | 00–01 | DISABLE, ENABLE |
| 02 10 46 | TALLY SETTINGS - DSK | 00–01 | DISABLE, ENABLE |

#### System Parameter Area — Roland FILL+KEY（G 行 2023–2025）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 11 00 | MODE | 00–01 | OFF, ON |

#### System Parameter Area — PREVIEW LABEL（xx = 20H–3AH: VIDEO IN 1–6, STILL 1–16, VIDEO PLAYER, PROGRAM, SUB PROGRAM, PREVIEW, AUX, DSK SOURCE, SRT IN。G 行 2029–2040。範囲 27 個に対し列挙 29 個【不明】）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 xx 00 | LABEL (0) | 00–7F | |
| 02 xx 01 | LABEL (1) | 00–7F | |
| 02 xx 02 | LABEL (2) | 00–7F | |
| 02 xx 03 | LABEL (3) | 00–7F | |
| 02 xx 04 | LABEL (4) | 00–7F | |
| 02 xx 05 | LABEL (5) | 00–7F | |
| 02 xx 06 | LABEL (6) | 00–7F | |
| 02 xx 07 | LABEL (7) | 00–7F | |

#### System Parameter Area — CAMERA CONTROL COMMON（G 行 2044–2048）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 50 00 | CAMERA ID | 00–05 | CAMERA 1–6 |
| 02 50 01 | CAMERA CONTROL MODE | 00–01 | OFF, ON |
| 02 50 02 | ALL CAMERAS LOAD | 00–01 | OFF, ON |

#### System Parameter Area — CAMERA CONTROL（xx = 51H–56H: CAMERA 1–6。G 行 2052–2112）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 xx 00 | PROTOCOL | 00–06 | N/A, JVC, Panasonic, Canon, VISCA over IP, PTZOptics, Avonic |
| 02 xx 01–02 | IP ADDRESS 1 | 00 00–01 7F | 0–255 |
| 02 xx 03–04 | IP ADDRESS 2 | 00 00–01 7F | 0–255 |
| 02 xx 05–06 | IP ADDRESS 3 | 00 00–01 7F | 0–255 |
| 02 xx 07–08 | IP ADDRESS 4 | 00 00–01 7F | 0–255 |
| 02 xx 09 | LOGIN NAME 1 | 00–7F | |
| 02 xx 0A | LOGIN NAME 2 | 00–7F | |
| 02 xx 0B | LOGIN NAME 3 | 00–7F | |
| 02 xx 0C | LOGIN NAME 4 | 00–7F | |
| 02 xx 0D | LOGIN NAME 5 | 00–7F | |
| 02 xx 0E | LOGIN NAME 6 | 00–7F | |
| 02 xx 0F | LOGIN NAME 7 | 00–7F | |
| 02 xx 10 | LOGIN NAME 8 | 00–7F | |
| 02 xx 11 | PASSWORD 1 | 00–7F | |
| 02 xx 12 | PASSWORD 2 | 00–7F | |
| 02 xx 13 | PASSWORD 3 | 00–7F | |
| 02 xx 14 | PASSWORD 4 | 00–7F | |
| 02 xx 15 | PASSWORD 5 | 00–7F | |
| 02 xx 16 | PASSWORD 6 | 00–7F | |
| 02 xx 17 | PASSWORD 7 | 00–7F | |
| 02 xx 18 | PASSWORD 8 | 00–7F | |
| 02 xx 19 | PASSWORD 9 | 00–7F | |
| 02 xx 1A | PASSWORD 10 | 00–7F | |
| 02 xx 1B | PASSWORD 11 | 00–7F | |
| 02 xx 1C | PASSWORD 12 | 00–7F | |
| 02 xx 1D | PASSWORD 13 | 00–7F | |
| 02 xx 1E | PASSWORD 14 | 00–7F | |
| 02 xx 1F | PASSWORD 15 | 00–7F | |
| 02 xx 20 | PASSWORD 16 | 00–7F | |
| 02 xx 21 | CURRENT PRESET | 7F–00–05 | NONE, PRESET 1–6 |
| 02 xx 22 | PAN | 7F, 00, 01 | LEFT, STOP, LIGHT（原文ママ） |
| 02 xx 23 | TILT | 7F, 00, 01 | DOWN, STOP, UP |
| 02 xx 24 | PAN/TILT SPEED | 01–18 | 1–24 |
| 02 xx 25 | ZOOM | 7E–00–02 | WIDE (FAST), WIDE (SLOW), STOP, TELE (SLOW), TELE (FAST) |
| 02 xx 26 | FOCUS | 7F, 00, 01 | NEAR, STOP, FAR |
| 02 xx 27 | AUTO FOCUS | 00–01 | OFF, ON |
| 02 xx 28 | EXPOSURE | 00–01 | MANUAL, AUTO |
| 02 xx 29 | TALLY CHANNEL | 00–06 | VIDEO IN 1–6, SRT IN |
| 02 xx 2A–2C | PORT | 00 00 00–03 7F 7F | 0–65535 |

#### System Parameter Area — AUDIO PLAYER COMMON（G 行 2116–2118）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 60 00 | AUDIO PLAYER BANK | 00–01 | BANK A, BANK B |

#### System Parameter Area — AUDIO PLAYER（xx = 61H–6CH: AUDIO PLAYER A 1–6, AUDIO PLAYER B 1–6。G 行 2122–2155）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 xx 00 | AUDIO PLAYER NAME 1 | 00–7F | |
| 02 xx 01 | AUDIO PLAYER NAME 2 | 00–7F | |
| 02 xx 02 | AUDIO PLAYER NAME 3 | 00–7F | |
| 02 xx 03 | AUDIO PLAYER NAME 4 | 00–7F | |
| 02 xx 04 | AUDIO PLAYER NAME 5 | 00–7F | |
| 02 xx 05 | AUDIO PLAYER NAME 6 | 00–7F | |
| 02 xx 06 | AUDIO PLAYER NAME 7 | 00–7F | |
| 02 xx 07 | AUDIO PLAYER NAME 8 | 00–7F | |
| 02 xx 08–0A | LEVEL | 7E 00 00, 7F 79 60–00 00 00–00 00 64 | -INFdB, -80.0–0.0–10.0dB |
| 02 xx 0B | FADE IN TIME | 00–64 | 0.0–10.0sec |
| 02 xx 0C | FADE OUT TIME | 00–64 | 0.0–10.0sec |
| 02 xx 0D | REPEAT | 00–01 | OFF, ON |
| 02 xx 0E | PAD MODE | 00–03 | LATCH, PAUSE, REPLAY, MOMENTARY |
| 02 xx 0F | PAD COLOR | 00–09 | WHITE, RED, GREEN, BLUE, YELLOW, MAGENTA, CYAN, DARK ORANGE, TURQUOISE GREEN, PURPLE |
| 02 xx 10 | PLAYING MODE | 00–02 | BGM, SE, SOLO |
| 02 xx 11–15 | OFFSET TIME | 00 00 00 00 00–07 7F 7F 7F 7F | 0.0–214748364.7sec（実際の最大値は音声ファイル長による） |

#### System Parameter Area — VIDEO PLAYER（G 行 2159–2175）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 6D 00–04 | START TIME | 7F 7F 7F 7F 7F–00 00 00 00 00–07 7F 7F 7F 7F | NONE, 0.0–2147483.647sec（Read Only。実際の最大値は動画ファイル長による） |
| 02 6D 05–09 | END TIME | 7F 7F 7F 7F 7F–00 00 00 00 00–07 7F 7F 7F 7F | NONE, 0.0–2147483.647sec（Read Only） |
| 02 6D 0A | SKIP FORWARD TIME | 00–03 | 1sec, 10sec, 30sec, 60sec |
| 02 6D 0B | SKIP BACKWARD TIME | 00–03 | 1sec, 10sec, 30sec, 60sec |
| 02 6D 0C | REPEAT | 00–01 | OFF, ON |

#### System Parameter Area — DATE&TIME（G 行 2179–2189。NTP SERVER 2–31 は原文「:」省略を展開）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 02 6E 00–01 | (reserved) | | |
| 02 6E 02 | DATE FORMAT | 00–02 | MONTH/DAY/YEAR, DAY/MONTH/YEAR, YEAR/MONTH/DAY |
| 02 6E 03 | CLOCK DISPLAY TYPE | 00–01 | ANALOG, DIGITAL |
| 02 6E 04 | CONFIGURE | 00–01 | MANUAL, USING NTP |
| 02 6E 05 | NTP SERVER 1 | 00–7F | |
| 02 6E 06 | NTP SERVER 2 | 00–7F | |
| 02 6E 07 | NTP SERVER 3 | 00–7F | |
| 02 6E 08 | NTP SERVER 4 | 00–7F | |
| 02 6E 09 | NTP SERVER 5 | 00–7F | |
| 02 6E 0A | NTP SERVER 6 | 00–7F | |
| 02 6E 0B | NTP SERVER 7 | 00–7F | |
| 02 6E 0C | NTP SERVER 8 | 00–7F | |
| 02 6E 0D | NTP SERVER 9 | 00–7F | |
| 02 6E 0E | NTP SERVER 10 | 00–7F | |
| 02 6E 0F | NTP SERVER 11 | 00–7F | |
| 02 6E 10 | NTP SERVER 12 | 00–7F | |
| 02 6E 11 | NTP SERVER 13 | 00–7F | |
| 02 6E 12 | NTP SERVER 14 | 00–7F | |
| 02 6E 13 | NTP SERVER 15 | 00–7F | |
| 02 6E 14 | NTP SERVER 16 | 00–7F | |
| 02 6E 15 | NTP SERVER 17 | 00–7F | |
| 02 6E 16 | NTP SERVER 18 | 00–7F | |
| 02 6E 17 | NTP SERVER 19 | 00–7F | |
| 02 6E 18 | NTP SERVER 20 | 00–7F | |
| 02 6E 19 | NTP SERVER 21 | 00–7F | |
| 02 6E 1A | NTP SERVER 22 | 00–7F | |
| 02 6E 1B | NTP SERVER 23 | 00–7F | |
| 02 6E 1C | NTP SERVER 24 | 00–7F | |
| 02 6E 1D | NTP SERVER 25 | 00–7F | |
| 02 6E 1E | NTP SERVER 26 | 00–7F | |
| 02 6E 1F | NTP SERVER 27 | 00–7F | |
| 02 6E 20 | NTP SERVER 28 | 00–7F | |
| 02 6E 21 | NTP SERVER 29 | 00–7F | |
| 02 6E 22 | NTP SERVER 30 | 00–7F | |
| 02 6E 23 | NTP SERVER 31 | 00–7F | |
| 02 6E 24 | NTP SERVER 32 | 00–7F | |

#### Command Area — SCENE MEMORY（G 行 2197–2203）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 0A 00 00 | MEMORY LOAD TRIGGER | 7F–00–1F | NONE, MEMORY 1–32 (write only) |
| 0A 00 01 | MEMORY SAVE TRIGGER | 7F–00–1F | NONE, MEMORY 1–32 (write only) |
| 0A 00 02 | MEMORY INITIALIZE TRIGGER | 7F–00–1F | NONE, MEMORY 1–32 (write only) |
| 0A 00 03 | LOADED MEMORY NUMBER | 7F–00–1F | LAST MEMORY, MEMORY 1–32 (read only) |

#### Tally Area — TALLY INFO（G 行 2208–2239）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 0C 00 00 | VIDEO IN 1 TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 01 | VIDEO IN 2 TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 02 | VIDEO IN 3 TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 03 | VIDEO IN 4 TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 04 | VIDEO IN 5 TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 05 | VIDEO IN 6 TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 06 | SILL 1 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 07 | SILL 2 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 08 | SILL 3 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 09 | SILL 4 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 0A | SILL 5 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 0B | SILL 6 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 0C | SILL 7 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 0D | SILL 8 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 0E | SILL 9 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 0F | SILL 10 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 10 | SILL 11 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 11 | SILL 12 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 12 | SILL 13 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 13 | SILL 14 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 14 | SILL 15 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 15 | SILL 16 TALLY（原文ママ＝STILL） | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 16 | VIDEO PLAYER/SRT IN TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 17 | INPUT 1 TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 18 | INPUT 2 TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 19 | INPUT 3 TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 1A | INPUT 4 TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 1B | INPUT 5 TALLY | 00–02 | OFF, PGM, PST (read only) |
| 0C 00 1C | INPUT 6 TALLY | 00–02 | OFF, PGM, PST (read only) |

#### Video/Audio Parameter (MEMORY 1–32) Area — MEMORY（G 行 2247–2272。「xxH xxH：Video/Audio Area の 2・3 バイト目をそのまま使う」）

| Address | Parameter | Meaning |
|---|---|---|
| 10 00 00 | VIDEO PARAMETER (MEMORY 1) | Load/rewrite video parameter stored in Memory 1 |
| 11 00 00 | AUDIO PARAMETER (MEMORY 1) | Load/rewrite audio parameter stored in Memory 1 |
| 12 00 00 | VIDEO PARAMETER (MEMORY 2) | Load/rewrite video parameter stored in Memory 2 |
| 13 00 00 | AUDIO PARAMETER (MEMORY 2) | Load/rewrite audio parameter stored in Memory 2 |
| 14 00 00 | VIDEO PARAMETER (MEMORY 3) | Load/rewrite video parameter stored in Memory 3 |
| 15 00 00 | AUDIO PARAMETER (MEMORY 3) | Load/rewrite audio parameter stored in Memory 3 |
| 16 00 00 | VIDEO PARAMETER (MEMORY 4) | Load/rewrite video parameter stored in Memory 4 |
| 17 00 00 | AUDIO PARAMETER (MEMORY 4) | Load/rewrite audio parameter stored in Memory 4 |
| 18 00 00 | VIDEO PARAMETER (MEMORY 5) | Load/rewrite video parameter stored in Memory 5 |
| 19 00 00 | AUDIO PARAMETER (MEMORY 5) | Load/rewrite audio parameter stored in Memory 5 |
| 1A 00 00 | VIDEO PARAMETER (MEMORY 6) | Load/rewrite video parameter stored in Memory 6 |
| 1B 00 00 | AUDIO PARAMETER (MEMORY 6) | Load/rewrite audio parameter stored in Memory 6 |
| 1C 00 00 | VIDEO PARAMETER (MEMORY 7) | Load/rewrite video parameter stored in Memory 7 |
| 1D 00 00 | AUDIO PARAMETER (MEMORY 7) | Load/rewrite audio parameter stored in Memory 7 |
| 1E 00 00 | VIDEO PARAMETER (MEMORY 8) | Load/rewrite video parameter stored in Memory 8 |
| 1F 00 00 | AUDIO PARAMETER (MEMORY 8) | Load/rewrite audio parameter stored in Memory 8 |
| 20 00 00 | VIDEO PARAMETER (MEMORY 9) | Load/rewrite video parameter stored in Memory 9 |
| 21 00 00 | AUDIO PARAMETER (MEMORY 9) | Load/rewrite audio parameter stored in Memory 9 |
| 22 00 00 | VIDEO PARAMETER (MEMORY 10) | Load/rewrite video parameter stored in Memory 10 |
| 23 00 00 | AUDIO PARAMETER (MEMORY 10) | Load/rewrite audio parameter stored in Memory 10 |
| 24 00 00 | VIDEO PARAMETER (MEMORY 11) | Load/rewrite video parameter stored in Memory 11 |
| 25 00 00 | AUDIO PARAMETER (MEMORY 11) | Load/rewrite audio parameter stored in Memory 11 |
| 26 00 00 | VIDEO PARAMETER (MEMORY 12) | Load/rewrite video parameter stored in Memory 12 |
| 27 00 00 | AUDIO PARAMETER (MEMORY 12) | Load/rewrite audio parameter stored in Memory 12 |
| 28 00 00 | VIDEO PARAMETER (MEMORY 13) | Load/rewrite video parameter stored in Memory 13 |
| 29 00 00 | AUDIO PARAMETER (MEMORY 13) | Load/rewrite audio parameter stored in Memory 13 |
| 2A 00 00 | VIDEO PARAMETER (MEMORY 14) | Load/rewrite video parameter stored in Memory 14 |
| 2B 00 00 | AUDIO PARAMETER (MEMORY 14) | Load/rewrite audio parameter stored in Memory 14 |
| 2C 00 00 | VIDEO PARAMETER (MEMORY 15) | Load/rewrite video parameter stored in Memory 15 |
| 2D 00 00 | AUDIO PARAMETER (MEMORY 15) | Load/rewrite audio parameter stored in Memory 15 |
| 2E 00 00 | VIDEO PARAMETER (MEMORY 16) | Load/rewrite video parameter stored in Memory 16 |
| 2F 00 00 | AUDIO PARAMETER (MEMORY 16) | Load/rewrite audio parameter stored in Memory 16 |
| 30 00 00 | VIDEO PARAMETER (MEMORY 17) | Load/rewrite video parameter stored in Memory 17 |
| 31 00 00 | AUDIO PARAMETER (MEMORY 17) | Load/rewrite audio parameter stored in Memory 17 |
| 32 00 00 | VIDEO PARAMETER (MEMORY 18) | Load/rewrite video parameter stored in Memory 18 |
| 33 00 00 | AUDIO PARAMETER (MEMORY 18) | Load/rewrite audio parameter stored in Memory 18 |
| 34 00 00 | VIDEO PARAMETER (MEMORY 19) | Load/rewrite video parameter stored in Memory 19 |
| 35 00 00 | AUDIO PARAMETER (MEMORY 19) | Load/rewrite audio parameter stored in Memory 19 |
| 36 00 00 | VIDEO PARAMETER (MEMORY 20) | Load/rewrite video parameter stored in Memory 20 |
| 37 00 00 | AUDIO PARAMETER (MEMORY 20) | Load/rewrite audio parameter stored in Memory 20 |
| 38 00 00 | VIDEO PARAMETER (MEMORY 21) | Load/rewrite video parameter stored in Memory 21 |
| 39 00 00 | AUDIO PARAMETER (MEMORY 21) | Load/rewrite audio parameter stored in Memory 21 |
| 3A 00 00 | VIDEO PARAMETER (MEMORY 22) | Load/rewrite video parameter stored in Memory 22 |
| 3B 00 00 | AUDIO PARAMETER (MEMORY 22) | Load/rewrite audio parameter stored in Memory 22 |
| 3C 00 00 | VIDEO PARAMETER (MEMORY 23) | Load/rewrite video parameter stored in Memory 23 |
| 3D 00 00 | AUDIO PARAMETER (MEMORY 23) | Load/rewrite audio parameter stored in Memory 23 |
| 3E 00 00 | VIDEO PARAMETER (MEMORY 24) | Load/rewrite video parameter stored in Memory 24 |
| 3F 00 00 | AUDIO PARAMETER (MEMORY 24) | Load/rewrite audio parameter stored in Memory 24 |
| 40 00 00 | VIDEO PARAMETER (MEMORY 25) | Load/rewrite video parameter stored in Memory 25 |
| 41 00 00 | AUDIO PARAMETER (MEMORY 25) | Load/rewrite audio parameter stored in Memory 25 |
| 42 00 00 | VIDEO PARAMETER (MEMORY 26) | Load/rewrite video parameter stored in Memory 26 |
| 43 00 00 | AUDIO PARAMETER (MEMORY 26) | Load/rewrite audio parameter stored in Memory 26 |
| 44 00 00 | VIDEO PARAMETER (MEMORY 27) | Load/rewrite video parameter stored in Memory 27 |
| 45 00 00 | AUDIO PARAMETER (MEMORY 27) | Load/rewrite audio parameter stored in Memory 27 |
| 46 00 00 | VIDEO PARAMETER (MEMORY 28) | Load/rewrite video parameter stored in Memory 28 |
| 47 00 00 | AUDIO PARAMETER (MEMORY 28) | Load/rewrite audio parameter stored in Memory 28 |
| 48 00 00 | VIDEO PARAMETER (MEMORY 29) | Load/rewrite video parameter stored in Memory 29 |
| 49 00 00 | AUDIO PARAMETER (MEMORY 29) | Load/rewrite audio parameter stored in Memory 29 |
| 4A 00 00 | VIDEO PARAMETER (MEMORY 30) | Load/rewrite video parameter stored in Memory 30 |
| 4B 00 00 | AUDIO PARAMETER (MEMORY 30) | Load/rewrite audio parameter stored in Memory 30 |
| 4C 00 00 | VIDEO PARAMETER (MEMORY 31) | Load/rewrite video parameter stored in Memory 31 |
| 4D 00 00 | AUDIO PARAMETER (MEMORY 31) | Load/rewrite audio parameter stored in Memory 31 |
| 4E 00 00 | VIDEO PARAMETER (MEMORY 32) | Load/rewrite video parameter stored in Memory 32 |
| 4F 00 00 | AUDIO PARAMETER (MEMORY 32) | Load/rewrite audio parameter stored in Memory 32 |

#### Memory Name Area（xx = 00H–1FH: MEMORY 1–32。G 行 2277–2288）

| Address | Parameter | Sys.Ex.Value | Meaning |
|---|---|---|---|
| 60 xx 00 | NAME (0) | （記載無し） | Name of preset memory number xx (1st character) |
| 60 xx 01 | NAME (1) | | 2nd character |
| 60 xx 02 | NAME (2) | | 3rd character |
| 60 xx 03 | NAME (3) | | 4th character |
| 60 xx 04 | NAME (4) | | 5th character |
| 60 xx 05 | NAME (5) | | 6th character |
| 60 xx 06 | NAME (6) | | 7th character |
| 60 xx 07 | NAME (7) | | 8th character |

## 5. ソース一覧（PGM/PST SELECT 00 0F 00 / 01 の値。G 行 426–427、計算例 行 2321–2322 で INPUT 2 = 18H を確認）

| 値 | ソース | 備考 |
|---|---|---|
| 00 | VIDEO IN 1 | 物理入力直指定（HDMI） |
| 01 | VIDEO IN 2 | |
| 02 | VIDEO IN 3 | |
| 03 | VIDEO IN 4 | |
| 04 | VIDEO IN 5 | |
| 05 | VIDEO IN 6 | |
| 06 | STILL 1 | |
| 07 | STILL 2 | |
| 08 | STILL 3 | |
| 09 | STILL 4 | |
| 0A | STILL 5 | |
| 0B | STILL 6 | |
| 0C | STILL 7 | |
| 0D | STILL 8 | |
| 0E | STILL 9 | |
| 0F | STILL 10 | |
| 10 | STILL 11 | |
| 11 | STILL 12 | |
| 12 | STILL 13 | |
| 13 | STILL 14 | |
| 14 | STILL 15 | |
| 15 | STILL 16 | |
| 16 | VIDEO PLAYER/SRT IN | 内蔵ビデオプレーヤー または SRT IN（LAN では V.PLAYER / SRT を区別、PBTY で切替） |
| 17 | INPUT 1 | クロスポイント [1]（割当は 00 00 00） |
| 18 | INPUT 2 | 割当 00 00 01 |
| 19 | INPUT 3 | 割当 00 00 02 |
| 1A | INPUT 4 | 割当 00 00 03 |
| 1B | INPUT 5 | 割当 00 00 04 |
| 1C | INPUT 6 | 割当 00 00 05 |

同じ並び（00–1C）を AUX SOURCE（00 00 0C）、PinP&KEY SOURCE（00 xx 03）、DSK KEY/FILL SOURCE（00 0E 04/05）、タリー（0C 00 00–1C）、LAN の TLY 応答順・QVISRC（0–28）が使う。INPUT n ASSIGN（00 00 00–05）と LAN STO は 00–16＋N/A（17H）。AUDIO FOLLOW（01 30 07–10）は 00 = OFF で 1 ずれ（01–1D）。

## 6. 数

| 項目 | 値 | 根拠 |
|---|---|---|
| 入力数（クロスポイント） | 6（INPUT 1–6、VIDEO SWITCHER [1]–[6] ボタン） | G 行 132–137 |
| HDMI 入力 | 6（VIDEO IN 1–6、HDMI type A × 6） | R 行 9835 |
| SDI | 0 | R 行 9830–9841 |
| STILL | 16 | G 行 132 |
| ビデオプレーヤー / SRT IN | 1（共用。V.PLAYER か SRT を選択） | G 行 132、B 行 2717–2735 |
| PinP | 2（PinP&KEY 1–2。PinP / ルミナンス / クロマ） | G 行 282 |
| DSK | 1（SELF/ALPHA/EXTERNAL KEY、ルミナンス/クロマ） | G 行 362–370 |
| SPLIT | 1（V/H） | G 行 240–241 |
| メモリー | 32 | G 行 2200、R 行 9879 |
| マクロ | 100（LAN `MCREX`。SysEx トリガ無し） | B 行 3083、R 行 9879 |
| シーケンサー | 1000（LAN `SEQJP` SEQ1–1000） | B 行 3185、R 行 9879 |
| オーディオ入力 | 17（AUDIO IN 1–6 XLR/TRS、AUDIO IN 7/8 RCA、USB IN、Bluetooth IN、AUDIO PLAYER、VIDEO IN 1–6、VIDEO PLAYER/SRT IN）。28ch 処理 | G 行 473、R 行 9808–9810 |
| オーディオバス | MAIN、AUX 1、AUX 2、USB OUT、STREAM/RECORD、MONITOR | G 行 464–468 |
| オーディオプレーヤー | 6 パッド × バンク A/B = 12、内蔵 16 トラック | G 行 2118–2123、R 行 9818 |
| 映像出力 | VIDEO OUT 1–3（HDMI）、USB OUT（USB STREAM）、STREAM/RECORD（DIRECT STREAM）、LCD MONITOR。各 PROGRAM/SUB PROGRAM/PREVIEW/AUX/MULTI-VIEW/STILL-VIEW を選択 | G 行 138–143 |
| AUX（映像） | 1（AUX SOURCE 00 00 0C。LAN は AUX1） | G 行 144、B 行 313 |
| オーディオ出力端子 | AUDIO OUT 1/L 2/R（XLR）、AUDIO OUT 3/L 4/R（RCA）、PHONES、USB STREAM、VIDEO OUT 1–3 エンベデッド | R 行 9836–9841 |
| カメラ制御 | 6 台（JVC/Panasonic/Canon/VISCA over IP/PTZOptics/Avonic、プリセット 1–100） | G 行 2046, 2056、B 行 2865, 3047 |
| TALLY/GPO / GPI | 16 / 8 | R 行 9876 |
| USER ボタン / AUDIO EFFECT ボタン | 4 / 3 | G 行 1198–1219 |

## 7. 機種固有の注意

- 受信の前提設定：MIDI Rx / Device ID / MVC のようなメニュー項目は **無い**（R SYSTEM メニュー 行 9380–9430）。LAN は NETWORK PASSWORD（4 文字）設定が必要。RS-232 は 02 10 00 を ON にしないと動かない（R 行 8827–8828）。Bluetooth は 02 01 0A（SYSTEM→Bluetooth）を ON にしてからペアリング
- 対応 FW：Remote Control Guide eng03 の MIDI Implementation は Version 2.00（2024-09-27）。iPad アプリは **システムプログラム 2.00 以降**（C 行 19–20）。B の VR-6HD 行は「Version 2.2 and later」【推測：表紙 4 行目】。VER 応答例の書式は `VER:VR-6HD,x.xx;ACK;`
- **CUT/AUTO の SysEx トリガが無い**（§4）。PGM/PST モードで AUTO を SysEx だけで実行するには 00 0F 02 FADER LEVEL を 0→2047（または 2047→0、FADER BASE 00 0F 05 に依存）に書く方法が考えられる【推測】。LAN なら `CUT;` / `ATO;` / `ATO:src,time;` が確実。DISSOLVE モード（02 01 0C = 00、工場出荷値）では 00 0F 00 PGM SELECT を書くだけで 00 0F 04（CUT/AUTO）に従って切り替わる【推測：R 行 1148–1152 のパネル動作からの類推】
- `CUT;` / `ATO;` は **SPLIT OFF 時のみ有効**（B 行 358, 416）
- マクロ / シーケンサー / Graphics Presenter / ストリーム開始停止 / オーディオ・ビデオプレーヤー / カメラ PTZ は LAN 簡易コマンドのみ。SysEx 側にトリガ無し → `lib/features.ts` で「VR-6HD × LAN」のみ有効にする
- PinP の ON PGM/ON PVW/ソース/時間は SysEx 00 0C/0D 00–03 と LAN PPS/PPW/PIS/TIM:PinPn の両方で可能。DSK は 00 0E 00–06 と DSK/DVW/DSS/TIM:DSK1
- 出力フェード（FTB）実行は LAN のみ。SysEx は 02 01 11–13 の設定だけ
- タリー自動送信（V-1-4K の 0C 01 00 相当）は **無い**。ポーリング（RQ1 0C 00 00 サイズ 00 00 1D、または LAN `TLY;`）で取る。SysEx は PGM&PST 同時（LAN の 3）を表せない【不明：PGM 優先か】
- 「Commands spontaneously sent」は ERR / xon / xoff のみ（G 行 2537–2549）。xon/xoff（11H/13H）が来たら送信を止める実装が必要【実機確認】
- LAN の RQH 応答は `stxDTH:aabbcc,vv;`（stx = 02H 付き）。LAN では stx 省略可とあるが応答側に付くかは実機確認（VR-120HD と同じ想定）
- DIRECT STREAM ポートは配信（RTMP/SRT）・Smart Tally（HTTP）・カメラ制御と共用。配信中の Telnet 制御が遅延するかは不明【不明】
- G の誤記：00 0B 04 が「MIX TIME」（WIPE TIME のはず）、01 22 01 AUDIO OUT 2 (RCA)（01 20 01 のはず）、GEQ「6.3Hz」、TALLY「SILL」、「ECHO CANELLER」「KYEPAD」、PAN「LIGHT」。PREVIEW LABEL の xx 範囲 20H–3AH と 29 項目の不一致
- B の応答コマンド名が `QAUXLV:` / `QAUXCH:`（原文ママ）、GRCH/AMCH/SPCH/QBSY/QSRTIST の応答に `ACK;` が付かない（B 行 2104, 2155, 2202, 2290, 2814）
- USB MONITOR（iPad で USB 映像を見る機能）は M1 以降・iPadOS 17 以降限定（C 行 120–128）。制御だけなら条件は書かれていない
- USB STREAM は USB video class + audio class のコンポジットデバイス（R 行 3775–3790）。USB MIDI も同じコンポジットに含まれるか【不明】。iPhone 接続時の CoreMIDI デバイス名も不明
- BLE MIDI のデバイス名は「Roland VR-6HD」（C 行 37–39, 57–58）。iPad 設定アプリの Bluetooth 一覧（A2DP 側）ではなく、アプリ内の Bluetooth MIDI Device 画面（CoreMIDI の CABTMIDICentralViewController 相当）でペアリングする手順
- 応答しないコマンド：RQ1 で不正アドレス/サイズは無応答（G 行 70–71）。LAN は ERR:4（invalid）が「他の設定に支配されて効かない」時に返る

## 8. 不明・推測一覧（実機で確かめる）

1. 【不明】LAN 認証のハンドシェイク：Telnet 接続後のプロンプト文字列、ユーザー名「user」（NETWORK メニュー USER NAME）を送るか、4 文字パスワードの送り方、成功/失敗応答。VR-120HD の実装がそのまま通るか
2. 【不明】ACK：DTH に対する 06H 1 バイトと簡易コマンドの `ACK;`+LF が混在する前提で、受信パーサが両方を扱えるか。RQH 応答の `stxDTH:` に 02H が付くか、`;` の後に LF が来るか、複数バイト値の桁（6 桁連結か）
3. 【不明】xon/xoff（11H/13H）フロー制御を本当に送ってくるか
4. 【不明】USB STREAM 接続時に iPhone の CoreMIDI に MIDI デバイスとして見えるか（USB MIDI クラスか）。見えるならデバイス名・エンドポイント名
5. 【不明】BLE MIDI 接続時の CoreMIDI デバイス名（「Roland VR-6HD」想定）、SysEx の最大長・256 バイト分割が BLE MTU でも通るか、20 ms 間隔で足りるか
6. 【不明】iPhone（iPad 以外）で USB / BLE / LAN が iPad と同様に使えるか（公式は iPad のみ記載）
7. 【推測】B の VR-6HD 対応版「Version 2.2 and later」（表紙の掲載順から）。実機の VER 応答で確認
8. 【推測】CUT/AUTO：DISSOLVE モードで 00 0F 00 を書くと 00 0F 04 の設定でトランジションするか。PGM/PST モードで 00 0F 02 FADER LEVEL の書込みでトランジションが走るか（走るなら AUTO 相当、走らないなら LAN 専用）
9. 【推測】00 0B 04 = WIPE TIME、01 20 01 = AUDIO OUT 2 (RCA)
10. 【不明】PREVIEW LABEL の xx：DSK SOURCE / SRT IN が 3BH / 3CH か、それとも 20H–3AH の中に収まる別の並びか
11. 【不明】SysEx タリー（0C 00 xx）が PGM&PST 同時の時に何を返すか（PGM 優先か）。LAN TLY の 3 との対応
12. 【不明】メモリー名（60 xx 00–07）の文字コード・値域（記載無し。LABEL と同じ 00–7F ASCII と推測）、空き文字の値
13. 【不明】RQ1 で 1 回に要求できる最大サイズ（Video Parameter Area 全体を 1 回で読めるか）。「データ型ごとに 1 回の送信量が決まっている」（G 行 62–63, 99–101）の具体値
14. 【不明】配信（RTMP/SRT）中・Smart Tally 使用中の Telnet 制御の応答遅延
15. 【不明】02 00 00–05 System Version の桁の意味（例：2.00 → Major 2, Minor 0,0, Build ?,?,?）


