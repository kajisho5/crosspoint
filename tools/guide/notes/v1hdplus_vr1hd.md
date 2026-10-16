# V-1HD+ / VR-1HD — iPhone（LAN / USB MIDI / BLE MIDI）から遠隔制御できるか

判定対象資料（pdftotext -layout 済み）：
- `pdf/v-1hd_plus/V-1HD_plus_reference_eng02_W.txt`（V-1HD+ Reference Manual、4244 行）
- `pdf/v-1hd_plus/V-1HD_plus_Remote_eng01_W.txt`（V-1HD+ Remote（iPad アプリ）ガイド、155 行）
- `pdf/vr-1hd/VR-1HD_reference_v12_eng02_W.txt`（VR-1HD Reference Manual v1.2、3449 行）

結論（先出し）：**両機種とも、iPhone から使える LAN・USB MIDI・BLE MIDI のいずれの公開プロトコルも資料に無い。** V-1HD+ は RS-232（ASCII コマンド）のみ公開。VR-1HD はリモート制御コマンドの公開が一切無い。SW CROSSPOINT の現行方式（SysEx / LAN DTH・RQH）では両機種とも対応不可。

---

## 1. V-1HD+

### 接続端子一覧（根拠行）
| 端子 | 用途 | 根拠 |
|---|---|---|
| USB MEMORY（USB A） | USB フラッシュドライブ（静止画読込・設定バックアップ） | ref 4098 `USB MEMORY  USB A type (for USB flash drive)`、ref 250–253 |
| USB（USB B） | **外部機器からのリモート制御** | ref 4099 `USB  USB B type (for remote control)`、ref 251–254 `USB port … This port is used to remotely control this unit from an external device.` |
| RS-232（DB-9 オス） | リモート制御 | ref 4101 `RS-232  DB-9 type (male, for remote control)`、ref 230–232 |
| TALLY（DB-9 メス） | タリー出力（出力のみ） | ref 4102、ref 4148–4152 |
| HDMI INPUT 1–4 / OUTPUT 1, 2 | 映像 | ref 4007–4014 |
| AUDIO IN 1–2 (XLR) / LINE IN (RCA) / MIC/AUX IN / AUDIO OUT / PHONES | 音声 | ref 4076–4083 |

- **LAN / Ethernet：無し**（grep `LAN|Ethernet` 該当なし）
- **MIDI DIN：無し**（grep `MIDI` 該当なし。Reference 全文に "MIDI" という語が一度も出ない）
- **Bluetooth：無し**（grep 該当なし）
- USB B の「remote control」が USB MIDI クラスなのか独自ベンダークラスなのかは **【不明】**（Reference に "MIDI" "class compliant" "driver" いずれも記載なし）

### リモート制御の章の有無
- **有り**：「RS-232 Command Reference」（PDF p.61–64、ref 3789–3997）。RS-232 のみ。
- メニュー「16: TALLY/RS-232」（ref 3570–3576）：`RS-232 OFF/ON`、`RATE 38400/115200`
- USB B 経由の制御プロトコルの章は **無し**。

### RS-232 仕様（ref 3796–3840）
- 通信：非同期・全二重、38,400/115,200 bps、パリティ無し、8 bit、ストップ 1 bit、ASCII、フロー制御 XON/XOFF
- 書式：`stx(02H) + コマンドコード 3 文字 + ":" + パラメータ(複数は ",") + ";"`
- 制御コード：stx=02H、ack=06H、XON=11H、XOFF=13H
- クロスケーブル。4–6、7–8 は本体内で短絡
- 連続送信時は各コマンドの `ack` を待ってから次を送る（ref 3849–3850）

### RS-232 全コマンド転記（ref 3852–3997）

**Video operations**
| 項目 | 送信 | 応答 | パラメータ |
|---|---|---|---|
| INPUT 1–4 の映像ソース選択 | `stxIPS:a,b;` | ack | a=0(INPUT 1),1(INPUT 2),2(INPUT 3),3(INPUT 4) / b=0(HDMI),1(STILL 1),2(STILL 2),3(STILL 3),4(STILL 4) |
| OUTPUT 1 の出力選択 | `stxOH1:a;` | ack | a=0(PGM),1(PVW),2(Multi-View) |
| OUTPUT 2 の出力選択 | `stxOH2:a;` | ack | a=0(PGM),1(PVW),2(Multi-View) |
| 最終出力（PGM）選択 | `stxPGM:a;` | ack | a=0(INPUT 1)–3(INPUT 4) |
| プレビュー（PST）選択 | `stxPST:a;` | ack | a=0(INPUT 1)–3(INPUT 4) |
| トランジション効果 | `stxTRS:a;` | ack | a=0(MIX),1(WIPE) |
| トランジション時間 | `stxTIM:a;` | ack | a=0(0.0 sec)–40(4.0 sec) |
| [CUT] 押下 | `stxCUT;` | ack | — |
| [AUTO] 押下 | `stxATO;` | ack | — |
| [PinP] 押下 | `stxP1S;` | ack | — |
| [SPLIT] 押下 | `stxSPS;` | ack | — |
| [DSK ON] 押下 | `stxDSK;` | ack | — |
| [DSK PVW] 押下 | `stxDVW;` | ack | — |
| PinP 位置 | `stxPP1:a,b;` | ack | a=-500–500 水平 / b=-500–500 垂直 |
| PinP サイズ | `stxPPS:a;` | ack | a=100(10.0%)–1000(100.0%) |
| PinP ズーム | `stxPPZ:a;` | ack | a=100(100.0%)–400(400.0%) |
| PinP フェード時間 | `stxPTM:a;` | ack | a=0(0.0 sec)–40(4.0 sec) |
| SPLIT 位置 | `stxSPT:a,b;` | ack | SPLIT V：a=-500–500 左(A/PGM) / b=-500–500 右(B/PST)。SPLIT H：a=上(A/PGM) / b=下(B/PST) |
| SPLIT 境界位置 | `stxSCP:a;` | ack | a=-500–500 |
| DSK キーレベル | `stxKYL:a;` | ack | a=0–255 |
| DSK キーゲイン | `stxKYG:a;` | ack | a=0–255 |
| DSK ソースのフェード時間 | `stxPTM:a;` | ack | a=0(0.0 sec)–40(4.0 sec)（PinP と同じコード PTM と記載） |
| [OUTPUT FADE] ノブ | `stxOFD:a;` | ack | a=-63–64 |

**Audio operations**
| 項目 | 送信 | 応答 | パラメータ |
|---|---|---|---|
| 入力音量 | `stxIAL:a,b;` | ack | a=0(INPUT 1),1(INPUT 2),2(INPUT 3),3(INPUT 4),4(AUDIO IN 1),5(AUDIO IN 2),6(LINE IN),7(MIC/AUX IN) / b=-801(-INF),-800(-80.0 dB)–0(0.0 dB)–100(10.0 dB) |
| 出力音量 | `stxOAL:a;` | ack | a=-801(-INF),-800–0–100 |
| アナログゲイン | `stxIAG:a,b;` | ack | a=0(INPUT 1),1(INPUT 2),2(MIC/AUX IN) / b=0–64 dB (a=0,1)、0–55 dB (a=2)（※原文 a の 0/1 は AUDIO IN 1/2 を指すと読めるが表記は "INPUT 1/2" のまま） |
| 入力ディレイ | `stxADT:a,b;` | ack | a=0–7（IAL と同じ並び） / b=0(0.0 ms)–5000(500.0 ms) |
| [LIMITER] 押下 | `stxLIM;` | ack | — |
| [SETUP] 長押し（ステレオリンク on/off） | `stxLNK;` | ack | — |
| 音量取得 | `stxQAL:a;` | `stxQAL:b;` | 送信 a=0–7（IAL と同じ並び）,8(ALL)。応答 a=0..7 に対し b=-801–100。a=8（原文は "a = 7" と誤記）で全部返す。例 `stxQAL:100,80,70,60,50,40,30,20;` |
| 入力ミュート | `stxIAM:a, b;` | ack | a=0–7（IAL と同じ並び） / b=0(MUTE OFF),1(MUTE ON) |
| 入力ソロ | `stxIAS:a, b;` | ack | a=0–7 / b=0(SOLO OFF),1(SOLO ON) |

**Other operations**
| 項目 | 送信 | 応答 | パラメータ |
|---|---|---|---|
| [1/5]–[4/8] ボタンの機能選択 | `stxMOD:a;` | ack | a=0(STILL IMAGE),1(PinP SOURCE),2(MEMORY 1–4),3(MEMORY 5–8) |
| [1/5]–[4/8] 押下 | `stxMNS:a;` | ack | a=0(1/5)–3(4/8) |
| HDCP on/off | `stxHCP:a;` | ack | a=0(OFF),1(ON) |
| プリセットメモリー呼出 | `stxMEM:a;` | ack | a=0(1)–7(8) |
| メモリー呼出時の PinP フェードイン時間 | `stxPFT:a;` | ack | a=0(0.0sec)–10(1.0sec) |
| テストパターン | `stxTPT:a;` | ack | a=0(OFF),1(75% COLOR BAR),2(100% COLOR BAR),3(RAMP),4(STEP),5(HATCH) |
| テストトーン | `stxTTN:a;` | ack | a=0(OFF),1(-20dB@1kHz),2(-10dB@1kHz),3(0dB@1kHz),4(-20dB 500Hz),5(-10dB 500Hz),6(0dB 500Hz) |
| 操作子の状態取得 | `stxQPL:a;` | `stxQPL:b;` | 送信 a=0(PGM/A),1(PST/B),2(MODE 1/5–4/8),3(MODE),4(TRANSITION),5(SPLIT),6(PinP),7(DSK PVW),8(DSK ON),9(LIMITER),10(LINK),11(Video fade level),12(ALL)。応答：a=0→b=0(INPUT 1)–4(INPUT 4)（原文ママ）、a=1→同、a=2→b=0(1/5)–4(4/8)（原文ママ）、a=3→b=0..3(MODE)、a=4→b=0(MIX),1(WIPE)、a=5..10→b=0(Off),1(On)、a=11→b=0–2047、a=12→全部。例 `stxQPL:0,3,2,1,1,0,0,0,0,0,0;` |
| INPUT 1–4 の出力状態（タリー）取得 | `stxTLY;` | `stxTLY:a,b,c,d;` | a–d=0(Dark),1(Red: final output),2(Green: preview output)。例 `stxTLY:1,2,0,0;` |
| 本体状態取得 | `stxACS;` | ack | — |
| バージョン | `stxVER;` | `VER:V-1HD PLUS,a;` | a=バージョン番号（ASCII） |
| フロー制御 | XON / XOFF | | |

**本体から自発送信**
| 項目 | 応答 | パラメータ |
|---|---|---|
| エラー検出 | `stxERR:a;` | a=0(Syntax error),5(Out of range error) |
| フロー制御 | XON / XOFF | |

### MIDI / SysEx の有無
- **無し**。Reference 全文に MIDI・SysEx・Exclusive・Manufacturer ID・Model ID の記載が無い（grep 該当 0 件）。

### iPad アプリ（V-1HD+ Remote）の接続方式
- **USB**（Bluetooth・Wi-Fi ではない）。Remote ガイド 11–13 `Connecting the V-1HD+ and the iPad via USB lets you operate the V-1HD+ from V-1HD+ Remote.`、42–44 `Connect the V-1HD+'s USB port to the iPad. Using a commercially available connection or an adaptor cable (Lightning-USB camera adaptor), connect V-1HD+ to the iPad.`、57–58 図注 `USB Type-C port` / `Lightning-USB camera adaptor` / `Lightning port`
- 本体 FW 1.10 以降が必要（Remote 21–22）
- USB 上でどんなプロトコル（USB MIDI か独自クラスか）で話しているかは資料に **無し（【不明】）**。公式アプリの解析は禁止（CLAUDE.md / BRIEF）なので確かめない。

### 結論（V-1HD+）
- **LAN：不可**（端子なし）
- **BLE MIDI：不可**（Bluetooth なし）
- **USB MIDI：【不明】**。USB B は「remote control」用と明記され、公式 iPad アプリは USB（Lightning-USB カメラアダプタ）で接続するが、USB 上のプロトコルは未公開。公開されているコマンドは RS-232（DB-9）の ASCII コマンドのみ。
- iPhone から公開仕様だけで制御するなら、**RS-232 ↔ (LAN or BLE) ブリッジ機器を挟む**しかない（例：シリアル⇄TCP 変換器。本アプリの対象外）。
- 【実機で確かめる項目】iPhone に Lightning-USB カメラアダプタで V-1HD+ を接続し、CoreMIDI にデバイスとして現れるか（現れれば USB MIDI クラス。現れなければ独自クラスでアプリから扱えない）。

---

## 2. VR-1HD

### 接続端子一覧（根拠行）
| 端子 | 用途 | 根拠 |
|---|---|---|
| USB MEMORY port (HOST)（USB A） | USB フラッシュドライブ・静止画・オーディオプレイヤー | ref 3109、ref 262–267 |
| USB STREAM port (DEVICE)（USB B） | USB-VIDEO (USB 3.0)、USB-AUDIO (USB 2.0, stereo 1 IN/1 OUT)、**Remote control**、System update | ref 3110–3112 `USB B type (For USB-VIDEO (USB 3.0), USB-AUDIO (USB 2.0): stereo 1 IN/1 OUT, Remote control, System update)`、ref 216–232 |
| VIDEO INPUT 1–3 (HDMI) / HDMI OUTPUT / THRU / MONITOR (MENU) | 映像 | ref 221–232、243–248 |
| MIC 1/2 (XLR) / LINE / PHONES 等 | 音声 | ref 243–267 |
| DC IN | 電源 | ref 3113 |

- **RS-232：無し**（grep 該当なし）
- **TALLY / GPI：無し**（grep 該当なし）
- **LAN / Ethernet：無し**（grep 該当なし）
- **MIDI：無し**（grep 該当なし）
- **Bluetooth：無し**（grep 該当なし）

### リモート制御の章の有無
- **無し**。目次（ref 1–80 付近）にも本文にも「Remote」「Command」の章は存在しない。"Remote control" の語は仕様表 ref 3110 の USB B の用途列挙に一度出るだけ。
- USB 経由は「USB video class / USB audio class 対応ソフトで PC に取り込む」「Video Capture for VR で録画」の記述のみ（ref 1810–1849）。

### RS-232 コマンド
- **無し**（端子も章も無い）。

### MIDI / SysEx の有無
- **無し**。

### iPad アプリの接続方式
- Reference v1.2 に iPad / iPhone / スマホアプリの記載は **無し**（grep `iPad|iPhone|smartphone|tablet|App Store|application` 該当なし）。
- 【不明】Roland が VR-1HD 用のスマホアプリを出しているかどうかは本資料からは判断できない（今回の資料セットに VR-1HD の Remote ガイドは含まれていない）。

### 結論（VR-1HD）
- **LAN：不可**（端子なし）
- **BLE MIDI：不可**（Bluetooth なし）
- **USB MIDI：不可（公開仕様なし）**。USB B に「Remote control」用途は明記されるが、プロトコルは何も公開されていない。
- **iPhone から公開仕様で制御する経路は無い。** SW CROSSPOINT の対応候補から外すのが妥当。
- 【実機で確かめる項目】USB B を iPhone に繋いだとき CoreMIDI にデバイスが現れるか（現れたとしても SysEx 仕様が未公開なので、確認できるのは「MIDI デバイスとして見えるか」まで）。

---

## 3. まとめ（SW CROSSPOINT への反映）

| 機種 | LAN | USB MIDI | BLE MIDI | RS-232 | 公開コマンド | 判定 |
|---|---|---|---|---|---|---|
| V-1HD+ | 無し | 【不明】（USB B "remote control"、iPad アプリは USB 接続、プロトコル未公開） | 無し | 有り（38400/115200、ASCII `stx…;`、ack=06H） | RS-232 のみ | iPhone 直結は不可。RS-232 ブリッジ経由なら可能だがアプリ対象外 |
| VR-1HD | 無し | 無し（USB B "Remote control" 表記のみ、仕様なし） | 無し | 無し | 無し | 対応不可 |

- 両機種とも SysEx の Model ID / アドレスマップは存在しないので、`core/profiles/` に追加する根拠が無い。
- V-1HD+ の RS-232 コマンド体系（`stxPGM:a;` 等、ack=06H、`VER;`）は V-160HD 系 LAN の `DTH:`/`RQH:` 形式とは **別物**（3 文字コマンド＋ stx 前置）。将来 RS-232⇄TCP ブリッジ対応を検討するなら、これを LAN 簡易制御コマンドとは別の Transport として設計する必要がある。
