# VR-50HD MK II 抽出メモ（SW CROSSPOINT 機種追加用）

資料：
- R = `pdf/vr-50hd_mk_ii/VR-50HD-MK2_reference_eng02_W.txt`（Reference Manual "Version 2.0 and later"、pdftotext -layout、全 4236 行）
- 行番号は txt の行、p. は PDF 紙面のノンブル。LAN/RS-232C Command Reference は p.60–62 ＝ txt 行 3632–3805（p.60 は LAN と RS-232C の 2 段組で左右が混在、p.61–62 の List of Commands は 1 段組）。Main Specifications は p.64–65 ＝ 行 3904–4058。Setup 画面 p.57 ＝ 行 3463–3519、LAN 画面 p.58 ＝ 行 3537–3557、Memory 画面 p.56 ＝ 行 3419–3458。
- 結論先出し：**VR-50HD MK II は MIDI（SysEx / USB MIDI / BLE MIDI）を持たない。制御は LAN（TCP 8023、Telnet 形式の ASCII テキストコマンド）と RS-232C のみ。** V-160HD 系の `DTH:`/`RQH:` とは書式が別（stx 02H 先頭、3 文字コマンド、`;` 終端、応答は ack 06H 1 バイト）。

## 1. 接続手段

| 手段 | 有無 | 根拠 |
|---|---|---|
| LAN | **有り**。RJ45 100BASE-TX。「Lets you remotely control this unit by using terminal software, etc.」。プロトコル TCP、ポート番号 **8023**、「You use Telnet to operate this unit remotely over a LAN (TCP/IP protocol)」 | 行 292–293（p.6 リアパネル 2 LAN port）、行 3639–3647（p.60）、行 4037（p.65 Remote Control: LAN port RJ45 100BASE-TX） |
| USB | **USB MIDI 無し**。USB は 3 口：USB port (HOST, USB A, system program update 用／「Use for future expansion」)、USB MEMORY port (HOST, USB A, USB メモリ用)、USB STREAMING port (DEVICE, USB B, USB-VIDEO SuperSpeed/Hi-Speed ＋ USB-AUDIO Full-Speed ＝ UVC/UAC 相当の配信出力)。「MIDI」「class compliant」の語は資料全文に 0 件（grep 済） | 行 288–290, 296–302（p.6）、行 4038–4040（p.65 USB Interface）、行 3386–3411（p.56 USB Streaming 画面） |
| Bluetooth | **無し**（BLE MIDI も音声も記載無し。「Bluetooth」「wireless」「Wi-Fi」grep ヒット 0） | 全文 grep |
| RS-232C | **有り**。D-sub 9 pin（DB-9 male）、9,600/38,400 bps、パリティ無し、8 bit、stop 1 bit、ASCII、クロスケーブル。Setup 画面「232C: OFF/ON（ON で RS-232C コマンド送受信可）」「Rate: 9600/38400」 | 行 295–297（p.6）、行 3639–3681（p.60 RS-232C Interface）、行 3502–3504（p.57）、行 4035（p.65） |
| MIDI DIN | **無し**（MIDI IN/OUT の記載無し。MIDI Implementation 章も無い） | 全文 grep「MIDI」0 件 |
| iPad/iPhone 接続ガイド | 資料内に iPad/iPhone/公式リモートアプリの記載は**無し**（grep 0 件）。別紙 *Remote_Connection* 系の資料も scratchpad に無い | — |

→ iPhone から使えるのは **LAN（TCP 8023 テキストコマンド）だけ**。USB MIDI / BLE MIDI トランスポートは capabilities で無効。RS-232C は iPhone からは使えない（USB-シリアルは対象外）。

LAN のネットワーク設定（p.58 行 3537–3557、p.60 行 3651–3684）：
- `[MENU] → Network <LAN>`（p.60 の記述では `System <LAN>`）→ `<Setup>` で Config = MANUAL / DHCP、IP Address（既定 **192.168.2.1**）、Subnet Mask（既定 **255.255.255.0**）。IP/Subnet は Config=MANUAL の時のみ有効（*17）
- LAN 画面の表示項目：Status（接続状態）、IP Address、MAC Address、Subnet Mask
- p.60 の「This uses the CONTROL port on this unit.」は端子名の表記ゆれ（リアパネル・仕様は「LAN port」。CONTROL という名前の端子は他に無い）【資料内の表記不一致】
- Camera Control（Network <Camera Control>、p.58–59 行 3562–3626）は本機→PTZ カメラ（JVC / Panasonic / VISCA over IP / PTZOptics / Avonic、既定 IP 192.168.2.101–106）の制御で、本機の被制御とは無関係

## 2. SysEx

**無し**。Manufacturer ID / Device ID / Model ID / DT1 / RQ1 / チェックサムの記載は資料のどこにも無い（「exclusive」「SysEx」「MIDI」grep 0 件）。MIDI Implementation Chart も無い。本機は MIDI 非対応で、ブリーフ §2 の項目はすべて「該当なし」。

## 3. LAN プロトコル（p.60–62 行 3632–3801）

| 項目 | 値 | 根拠 |
|---|---|---|
| トランスポート | TCP。「Telnet」で操作（＝生 TCP ソケットに ASCII を流す形。Telnet ネゴシエーションの記載は無い） | 行 3641–3647 |
| ポート | **8023** | 行 3647 |
| 認証 | **記載無し**。パスワード／ハンドシェイク文字列／ログインプロンプトの記述は無い（V-160HD 系の 4 桁パスワード認証に相当するものは資料上存在しない）【不明：接続直後に何か送られてくるかは実機で確認】 | 行 3632–3706 全体 |
| コマンド書式 | `stx` + コマンドコード（英数 3 文字）+ `:` + パラメータ（複数は `,` 区切り）+ `;`。すべて ASCII。**stx = 02H**（コマンド開始を示す制御コード）、`;` がコマンド終端 | 行 3685–3706 |
| 例 | `02H "PGM:0;"` → INPUT 1 を PGM に。パラメータ無しのコマンドは `02H "VER;"` | 行 3717, 3784 |
| ACK | **ack = 06H の 1 バイト**（`ACK;` という文字列ではない。「The codes of stx (02H) and ack (06H) are the control codes.」） | 行 3706, 3711–3712 |
| 問い合わせ応答 | `stxQPG:a;` `stxUVS:a,b;` `stxVER:a,b;` のように **stx 付きのテキスト**で返る（ack ではない） | 行 3774, 3779, 3784 |
| エラー | `stxERR:a;` — a: **0** syntax error（受信コマンドに誤り）、**4** invalid（他の設定に制御されているため効果なし）、**5** out of range error（引数が範囲外）。1–3 は記載無し | 行 3798–3800 |
| 自発送信 | `stxCPG:1;` を送っておくと、VIDEO INPUT SELECT の状態変化時に本機から `stxQPG:a;` が自発的に飛ぶ（表の Sent command 欄は `stxPGM:a;`、Response 欄が `stxQPG:a;`） | 行 3791–3796 |
| 送信規則 | 「コントローラから連続してコマンドを送るときは、**各コマンドごとに ACK が返るのを確認してから次を送る**」 | 行 3711–3712 |
| キープアライブ | 記載無し【不明】 | — |
| 同時接続数 | 記載無し【不明】 | — |
| 改行 | 終端は `;` のみ。CR/LF の記載無し（送らない前提で実装し、実機で LF 付きでも通るか確認）【不明】 | 行 3703–3705 |
| V-160HD 系との関係 | **別物**。V-160HD/VR-120HD は `DTH:aabbcc,vv;` / `RQH:` / `VER;`（stx 無し、SysEx アドレス直書き）。本機は stx 02H 付き 3 文字コマンド（V-60HD / V-1HD 系の LAN/RS-232 コマンドに近い形式）。ACK がバイト 06H なのは共通 | 行 3685–3706 vs BRIEF |

RS-232C も同一コマンド体系（章題が「LAN/RS-232C Command Reference」で表が 1 つ）。RS-232C 側は Setup「232C: ON」が必要（行 3503）。LAN 側に有効/無効スイッチの記載は無い。

接続手順（資料から組める範囲）：
1. 本機 `[MENU] → Network <LAN> → <Setup>` で IP を固定または DHCP にし、LAN 画面で IP Address を読む（行 3537–3557, 3687–3702）
2. iPhone から TCP で `<IP>:8023` へ接続（行 3641–3647）
3. 認証は無し（記載無し）。接続後すぐ `02 56 45 52 3B`（stx `VER;`）を送り、`02 "VER:VR-50HDMK2,<version>;"` が返れば疎通 OK（行 3784–3785）
4. 以後は 1 コマンド送るごとに 06H を待ってから次を送る（行 3711–3712）
5. 状態同期が要るなら `stxCPG:1;` を送って `stxQPG:a;` の自発通知を受ける（行 3776–3777, 3795–3796）

## 4. コマンド一覧（アドレスマップの代替。p.61–62 行 3710–3801 を全部転記。表記は原文どおり）

### 4-1. コントローラ → 本機（行 3714–3785）

| # | Item（意味） | Sent command | Response | Parameter |
|---|---|---|---|---|
| 1 | Select video input（PGM の入力選択） | `stxPGM:a;` | ack | a: 0 (INPUT 1), 1 (INPUT 2), 2 (INPUT 3), 3 (INPUT 4), 4 (STILL) |
| 2 | Select transition effect（トランジション種別） | `stxTRS:a;` | ack | a: 0 (CUT), 1 (MIX), 2 (WIPE) |
| 3 | Set video transition time（トランジション時間） | `stxTIM:a;` | ack | a: 0–40 (0.0–4.0 sec)（0.1 秒刻み） |
| 4 | Set the [PinP] button on/off | `stxPIP:a;` | ack | a: 0 (OFF), 1 (ON) |
| 5 | Set the [PinP/KEY] button on/off | `stxPKY:a;` | ack | a: 0 (OFF), 1 (ON) |
| 6 | Set the [STILL KEY] button on/off | `stxSKY:a;` | ack | a: 0 (OFF), 1 (ON) |
| 7 | Set the [OUTPUT FADE] button on/off | `stxFDE:a;` | ack | a: 0 (OFF), 1 (ON) |
| 8 | Set the [FREEZE/USER LOGO] button on/off | `stxULF:a;` | ack | a: 0 (OFF), 1 (ON) |
| 9 | Adjust volume of audio channel 1 | `stxLM1:a;` | ack | a: 0 (-Inf dB)–127 (+10 dB) |
| 10 | Adjust volume of audio channel 2 | `stxLM2:a;` | ack | a: 0 (-Inf dB)–127 (+10 dB) |
| 11 | Adjust volume of audio channel 3 | `stxLM3:a;` | ack | a: 0 (-Inf dB)–127 (+10 dB) |
| 12 | Adjust volume of audio channel 4 | `stxLM4:a;` | ack | a: 0 (-Inf dB)–127 (+10 dB) |
| 13 | Adjust volume of audio channels 5/6 | `stxLS1:a;` | ack | a: 0 (-Inf dB)–127 (+10 dB) |
| 14 | Adjust volume of audio channels 7/8 | `stxLS2:a;` | ack | a: 0 (-Inf dB)–127 (+10 dB) |
| 15 | Adjust volume of audio channels 9/10 | `stxLS3:a;` | ack | a: 0 (-Inf dB)–127 (+10 dB) |
| 16 | Adjust volume of audio channels 11/12 | `stxLS4:a;` | ack | a: 0 (-Inf dB)–127 (+10 dB) |
| 17 | Adjust volume of main output（MAIN フェーダー） | `stxLMN:a;` | ack | a: 0 (-Inf dB)–127 (+10 dB) |
| 18 | Recall memory（メモリー呼出） | `stxMEM:a;` | ack | a: 0 (Memory 1)–7 (Memory 8) |
| 19 | Select video for AUX bus（AUX バスソース） | `stxAUX:a;` | ack | a: 0 (INPUT 1), 1 (INPUT 2), 2 (INPUT 3), 3 (INPUT 4), 4 (STILL), 4 (PinP), 5 (PinP/KEY), 6 (PGM) ※原文のまま。4 が STILL と PinP で重複しており、メニューの AUX Bus Source（Input 1–4 / PinP / PinP/KEY / PGM、行 3059–3065）には STILL が無い。正しい値は実機確認【不明】 |
| 20 | Select source video for video input（INPUT n への物理入力割当＝Input Assign） | `stxVIS:a,b;` | ack | a: 0 (INPUT 1), 1 (INPUT 2), 2 (INPUT 3), 3 (INPUT 4), 4 (STILL)／b: 0 (SDI), 1 (HDMI), 2 (COMPOSITE), 3 (RGB/COMPONENT)。* a=2 (INPUT 3) または 3 (INPUT 4) のときは b は 0 (SDI) と 1 (HDMI) のみ選択可。※a=4 (STILL) のときの b の意味は記載無し【不明】 |
| 21 | Select still image of the [STILL] button | `stxSTS:a;` | ack | a: 0 (STILL 1), 1 (STILL 2), 2 (STILL 3), 3 (STILL 4) |
| 22 | Select source video for PinP | `stxPIS:a;` | ack | a: 0 (SDI 1), 1 (SDI 2), 2 (SDI 3), 3 (SDI 4), 4 (HDMI 1), 5 (HDMI 2), 6 (HDMI 3), 7 (HDM 4)[原文ママ], 8 (COMPOSITE 1), 9 (COMPOSITE 2), 10 (RGB/COMPONENT 1), 11 (RGB/COMPONENT 2) |
| 23 | Select source video for PinP/KEY | `stxPKS:a;` | ack | a: 0 (SDI 1), 1 (SDI 2), 2 (SDI 3), 3 (SDI 4), 4 (HDMI 1), 5 (HDMI 2), 6 (HDMI 3), 7 (HDM 4)[原文ママ], 8 (COMPOSITE 1), 9 (COMPOSITE 2), 10 (RGB/COMPONENT 1), 11 (RGB/COMPONENT 2) |
| 24 | Select source image for STILL KEY | `stxSKS:a;` | ack | a: 0 (STILL 1), 1 (STILL 2), 2 (STILL 3), 3 (STILL 4) |
| 25 | Recall preset memory on remote camera（PTZ カメラのプリセット呼出） | `stxCML:a,b;` | ack | a: 0 (CAMERA 1)–5 (CAMERA 6)／b: 0 (Memory 1)–7 (Memory 8) |
| 26 | Acquire status of the VIDEO INPUT SELECT buttons（現在の PGM 入力を問い合わせ） | `stxQPG;` | `stxQPG:a;` | a: 0 (INPUT 1), 1 (INPUT 2), 2 (INPUT 3), 3 (INPUT 4), 4 (STILL) |
| 27 | Enable spontaneously sending status of the VIDEO INPUT SELECT buttons（自発通知の有効化） | `stxCPG:a;` | ack | a: 0 (OFF), 1 (ON) |
| 28 | Reset USB connection（USB STREAMING 再接続） | `stxUVR;` | ack | （無し） |
| 29 | Acquire status of USB streaming | `stxUVQ;` | `stxUVS:a,b;` | a: 0 (unconnected), 1 (USB 2.0), 2 (USB 3.0)／b: Number of dropped frames |
| 30 | Acquire status of the unit | `stxACS;` | ack | （無し。応答は ack のみ＝生存確認用途）【推測：キープアライブ代わりに使える】 |
| 31 | Version information | `stxVER;` | `stxVER:a,b;` | a: VR-50HDMK2（Product name）／b: Version number。「The version info is ASCII text strings.」 |

### 4-2. 本機 → コントローラ（自発送信、行 3791–3800）

| Item | Sent command（表の原文） | Response command | Parameter |
|---|---|---|---|
| Send status of the VIDEO INPUT SELECT buttons | `stxPGM:a;` | `stxQPG:a;` | a: 0 (INPUT 1), 1 (INPUT 2), 2 (INPUT 3), 3 (INPUT 4), 4 (STILL)。* `stxCPG:1;` を受信していると有効 |
| Error detected | `stxTRS:a;`（原文の例示） | `stxERR:a;` | a: 0 (syntax error) 受信コマンドに誤り／4 (invalid) 他の設定に制御されているため効果なし／5 (out of range error) 受信コマンドの引数が範囲外 |

### 4-3. ブリーフ §4 の各項目との対応（無いものは明記）

| ブリーフ項目 | 本機での扱い | 根拠 |
|---|---|---|
| PGM 選択 | `PGM:a;`（0–3 = INPUT 1–4、4 = STILL）。送ると現在の TRS 種別・TIM 時間でトランジションが走る【推測：パネルの VIDEO INPUT SELECT ボタンを押した時と同じ挙動。資料は "Select video input" とだけ書いている】 | 行 3717 |
| PST/PVW 選択 | **コマンド無し**。本機は 1 バス式（VIDEO INPUT SELECT [1]–[4] [STILL]）で、PVW は「合成まで処理した映像」＝ネクスト選択バスではない | 行 446–450, 680–683 |
| クロスポイント（INPUT n の割当） | `VIS:a,b;`（INPUT 1/2 → SDI/HDMI/COMPOSITE/RGB-COMPONENT、INPUT 3/4 → SDI/HDMI） | 行 3755–3757, 3090–3099 |
| CUT/AUTO トリガ | **専用コマンド無し**。`TRS:0;`（CUT）にしてから `PGM:a;` で切替＝CUT 相当、`TRS:1/2;` で `PGM:a;` ＝ AUTO 相当【推測】 | 行 3717–3719 |
| トランジションタイプ | `TRS:a;` 0 CUT / 1 MIX / 2 WIPE | 行 3719 |
| トランジション時間 | `TIM:a;` 0–40（0.0–4.0 s） | 行 3721 |
| フェーダー位置（T-bar） | **無し**（本機に T-bar 無し） | — |
| PinP n ON PGM / ON PVW / ソース / 時間 | PinP: `PIP:a;`（ON/OFF）＋ `PIS:a;`（ソース 0–11）。PinP/KEY: `PKY:a;` ＋ `PKS:a;`。ON PVW 単独・時間の指定コマンドは無し | 行 3723–3725, 3761–3767 |
| DSK n | 本機に DSK は無い。相当は STILL KEY（静止画ロゴ/画像キー）: `SKY:a;`（ON/OFF）＋ `SKS:a;`（STILL 1–4）。キータイプ（Luminance/Chroma）指定コマンドは無し | 行 3727, 3769 |
| SPLIT | **無し**（機能自体が無い） | 仕様 行 3969–3971 |
| オーディオ 入力レベル | `LM1`–`LM4`（ch 1–4、XLR/TRS コンボ）、`LS1`–`LS4`（ch 5/6, 7/8, 9/10, 11/12 のステレオペア）。値 0 (-Inf)–127 (+10 dB) | 行 3733–3747, 3993–3997 |
| オーディオ 入力ミュート | **コマンド無し**（パネルには [MUTE] ボタンがあるが LAN からは不可） | 行 146–148 |
| MASTER レベル | `LMN:a;` 0–127 | 行 3749 |
| MASTER ミュート | **無し**（`FDE:1;` で映像＋音声のアウトプットフェードは可能） | 行 3729, 187–191 |
| メモリー ロード | `MEM:a;` 0–7 = Memory 1–8 | 行 3751 |
| メモリー 現在番号 / 名前 / 数 | 現在番号・名前の読出コマンド無し。数は 8（Preset memory 8 types） | 行 3433, 4041 |
| タリー 読出 | **ブロック無し**。`QPG;` → `QPG:a;` で PGM の入力番号 1 つ（0–4）が取れるだけ。`CPG:1;` で変化時に自発送信 | 行 3774–3777, 3795–3796 |
| ラベル（入力名 8 文字） | メニューに Label 画面（8 文字まで）はあるが**コマンド無し** | 行 3510–3512 |
| マクロ / シーケンサー | **無し**（機能自体が無い） | 全文 grep「macro」「sequence」0 件 |
| システムバージョン文字列 | `VER;` → `VER:VR-50HDMK2,<version>;` | 行 3784–3785 |
| 値のエンコード | すべて ASCII 10 進テキスト。7bit/nibble/「#」アドレスの概念は無い | 行 3685–3706 |

## 5. ソース一覧

`PGM:a;` / `QPG:a;` / `AUX:a;`（0–3）/ `VIS:a,…;` の a（行 3717, 3753, 3755, 3774）：

| 値 | 意味 |
|---|---|
| 0 | INPUT 1（Video Input 1。物理ソースは Input Assign で SDI 1 / HDMI 1 / COMPOSITE 1 / RGB-COMPONENT 1 のいずれか） |
| 1 | INPUT 2（同 SDI 2 / HDMI 2 / COMPOSITE 2 / RGB-COMPONENT 2） |
| 2 | INPUT 3（SDI 3 / HDMI 3 のみ） |
| 3 | INPUT 4（SDI 4 / HDMI 4 のみ） |
| 4 | STILL（[STILL] ボタンに割り当てた静止画。どの静止画かは `STS:a;` 0–3 = STILL 1–4） |

`VIS:a,b;` の b（行 3756）：0 SDI / 1 HDMI / 2 COMPOSITE / 3 RGB/COMPONENT（INPUT n に対応する同番号のコネクタ。Input Assign 画面 行 3093–3099 と一致。INPUT 3/4 は 0, 1 のみ）

`PIS:a;` / `PKS:a;` の a（行 3761–3767、Input Assign を経由せず物理入力を直指定）：0 SDI 1 / 1 SDI 2 / 2 SDI 3 / 3 SDI 4 / 4 HDMI 1 / 5 HDMI 2 / 6 HDMI 3 / 7 HDMI 4（原文 "HDM 4"）/ 8 COMPOSITE 1 / 9 COMPOSITE 2 / 10 RGB/COMPONENT 1 / 11 RGB/COMPONENT 2。※メニューの PinP Source は「SDI 1–4, ANALOG/HDMI 1, ANALOG/HDMI 2, HDMI 3, HDMI 4」の 8 択（行 3155–3157）で、コマンドの 12 値と粒度が違う（COMPOSITE/RGB は INPUT 1/2 の Input Assign 経由【推測】）。8–11 を送った時の挙動は実機確認【不明】

`AUX:a;` の 5 (PinP/KEY), 6 (PGM) と「4 (STILL), 4 (PinP)」の重複は §4-1 #19 参照。

`STS/SKS:a;`：0–3 = STILL 1–4。`MEM:a;`：0–7 = Memory 1–8。`CML:a,b;`：a 0–5 = CAMERA 1–6、b 0–7 = Memory 1–8。

## 6. 数（p.64–65 行 3904–4041、p.6 行 288–337）

| 項目 | 数 | 根拠 |
|---|---|---|
| 映像入力バス（INPUT n） | 4 ＋ STILL | 行 3717, 4088–4092 |
| SDI IN | 4（BNC） | 行 3909–3911 |
| HDMI IN | 4（Type A、HDCP 対応） | 行 3912–3914 |
| RGB/COMPONENT IN | 2（HD DB-15） | 行 3915 |
| COMPOSITE IN | 2（BNC） | 行 3916 |
| STILL | 4（USB メモリから .bmp、最大 1920×1080、24bit 非圧縮）。出力キャプチャも可 | 行 3966–3968, 3977 |
| PinP | 1 層（PinP）＋ 1 層（PinP/KEY：PinP にルミナンス/クロマキー付き） | 行 3723–3725, 3970 |
| DSK | 0（代わりに STILL KEY 1 層） | 行 3727 |
| SPLIT | 0 | 行 3969–3971 |
| メモリー | 8 | 行 3433, 4041 |
| マクロ | 0 | — |
| オーディオ入力 | 12 ch：AUDIO IN 1–4（XLR/TRS コンボ、+48V）、5–8（TRS LINE 1–2、5/7 はマイクレベル可）、9–12（RCA LINE 3–4）。コマンドは 1–4 がモノ 4 本、5/6・7/8・9/10・11/12 がペア 4 本 ＝ 8 フェーダー ＋ MAIN | 行 3993–3997, 3733–3749 |
| オーディオ出力 | MAIN (XLR L/R)、AUX 1 (RCA L/R)、AUX 2/MONITOR (TRS L/R)、PHONES ×2（1/4" とミニ）、USB AUDIO | 行 3998–4002 |
| 映像出力 | SDI OUT PGM / AUX（BNC ×2）、HDMI OUT PGM / AUX / MULTI-VIEW（×3）、RGB/COMPONENT OUT PGM / AUX（×2）、USB STREAMING。PGM/AUX 各コネクタは Video Output 画面で PGM/PVW/AUX バスを割当可 | 行 3917–3927, 3042–3047 |
| AUX ソース選択 | `AUX:a;`（§4-1 #19） | 行 3753–3754 |
| PTZ カメラ制御 | 6 台（CAMERA 1–6）、プリセット 8 | 行 3567–3574, 3771–3772 |

## 7. 機種固有の注意

- **MIDI 不要・MVC/V-LINK 等の前提設定は無い**。LAN は設定スイッチ無しで常時有効（記載の範囲）。RS-232C は Setup「232C: ON」が必要（行 3503）
- 「各コマンドごとに ACK を確認してから次を送る」（行 3711–3712）。SysEx の 20 ms 間隔のような時間規定は無い
- 応答が ack（06H）1 バイトか、stx 付きテキスト（`QPG:` `UVS:` `VER:` `ERR:`）かの 2 種類。受信パーサは「06H 単体」と「02H … `;`」の両方を扱う必要あり
- `stxERR:4;`（invalid）は「他の設定に制御されているため効果なし」＝例：Input Assign の制約（INPUT 3/4 に COMPOSITE）や Panel Lock 中など【推測】
- 入力ミュート・PVW 選択・ラベル・タリー一括読出・フェーダー位置の読出は**コマンドが無い**ので、アプリ側では「送ったら送りっぱなし」。状態同期できるのは PGM 入力（`QPG`）、USB 配信状態（`UVQ`）、バージョン（`VER`）だけ
- 対応 FW：資料は "Version 2.0 and later"（行 2, 7）。コマンド表に FW 条件の注記は無い。VER の product name は `VR-50HDMK2`（行 3784）
- 既定 IP 192.168.2.1/24（行 3552–3554）。PTZ カメラ既定 IP 192.168.2.101–106 と同一セグメント
- 本機は V-160HD 系の `DTH:/RQH:` を受け付けない（記載無し）。プロファイルでは transport = `lan-text`（stx 形式）として V-160HD 系と別経路にする

## 8. 不明・推測一覧（実機で確かめる項目）

1. 【不明】TCP 8023 接続直後に本機から何か（プロンプト／Telnet IAC ネゴシエーション）が送られてくるか。認証は記載無し
2. 【不明】コマンド末尾に CR/LF を付けても通るか（終端は `;` のみと記載）
3. 【不明】同時接続数、アイドル切断時間、キープアライブの要否（`ACS;` → ack を定期送信で代用できるか【推測】）
4. 【不明】`AUX:a;` の 4 が STILL か PinP か（原文で重複。メニューには STILL が無い）
5. 【不明】`VIS:4,b;`（a=STILL）の b の意味
6. 【不明】`PIS/PKS` の 8–11（COMPOSITE/RGB 直指定）が INPUT 1/2 の Input Assign と無関係に効くか
7. 【推測】`PGM:a;` は現在の TRS/TIM でトランジションして切り替わる（CUT したいなら先に `TRS:0;`）
8. 【不明】`ERR:1`–`3` の存在（表には 0/4/5 のみ）
9. 【不明】`QPG:a;` 自発通知がトランジション開始時か完了時か
10. 【不明】`LM*/LS*/LMN` の 0–127 と dB のカーブ（-Inf → +10 dB のマッピング。Priority=PANEL の時に物理フェーダーと競合しないか：行 3439–3444）
11. 【不明】Panel Lock 中に LAN コマンドが効くか（`ERR:4` になるか）
12. 【不明】iPhone からの Telnet 形式接続の実績（公式 iPad アプリ・接続ガイドの記載が無い）
