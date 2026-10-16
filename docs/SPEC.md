# SW CROSSPOINT 実装仕様書（実装担当 Claude Code 向け）v1.2

> **v1.2 変更点（2026-10-15）**：①§0 ルール8 を改訂 — 公式 iPad アプリのパッケージ内平文リソース（Info.plist・nib・Localizable.strings）に基づく **UI 構成の参考**をオーナー判断で可とした（`docs/ANALYSIS-official-app.md`）。通信仕様の根拠は従来どおり公開資料のみ（バイナリは FairPlay 暗号化で読めない）②§14 に v2 候補への参照を追加③M2〜M4 の実装に合わせ §8-2 のファイル名を実態に揃えた（`core/codec/lanParser.ts` / `ump.ts`、`core/transport/socket.ts`）。
>
> **v1.1 変更点（2026-10-15）**：①V-80HD プロファイル追加（公式 Remote Control Guide v1.03 で裏付け、LAN 先行で実機確認）②公式アプリ／RCS のバイナリ解析に由来する根拠を全削除し、公開資料と OSS 実装に置換（§0 ルール8, §14）③タブバーはシステム標準（Native Tabs）・色は semantic system color 参照（§11）④App Review 用の利用者向けデモモード（F11）⑤技術スタックのバージョンを npm で再確認（§8-1）。差分の一覧は `docs/CHANGES-v1.1.md`。

> **この文書が実装の唯一の正**。`docs/DESIGN.md`（設計の経緯）と矛盾する場合は本書を優先する。
> 画面の見た目は `docs/design/sw-crosspoint-board.svg`（PNG 同梱）に**完全準拠**。
> 表記：**【事実】**＝一次情報または実働コードで確認済み／**【推測】**＝根拠あり・実機未確認／**【不明】**＝未確認。【推測】【不明】は必ず §13 のチェックリストで実機確認できるよう、診断機能とログを残す実装にすること。

---

## 0. 実装担当へのルール

1. React Native（Expo）＋TypeScript（strict）。UI は React コンポーネント、スタイルは NativeWind（Tailwind）。素の HTML/WebView で作らない。
2. ネイティブ部分（CoreMIDI / Bluetooth MIDI）は **Expo Modules API（Swift）** で `modules/crosspoint-midi` に実装。Expo Go 非対応、Development Build 前提。
3. 省略記号（`// ...` `// 既存のコード`）を残さない。全ファイル完全な形で書く。
4. サンプル・テスト・モックに**実在の会社名・人名・会場名・案件名を使わない**。機器名は `DEMO-SW-A` 等の架空名。
5. 本書に無い仕様変更をしない。迷ったら §14 の「未決事項」に追記して実装は保守的な側（何も送らない側）に倒す。
6. 1マイルストーンごとに `npm test` と `npx tsc --noEmit` と `npx expo-doctor` が通る状態でコミット。
7. Roland のロゴ・RCS／公式アプリの画像素材を一切使わない。
8. **通信仕様（コマンド・アドレス・認証・パケット形式）の根拠は §17 の公開資料・公開 OSS・実機での観測（自分の機器に自分のアプリから送受信した結果）に限る。** 公式アプリ・RCS の復号・逆アセンブル・逆コンパイル・通信の傍受解析は行わない。公式 iPad アプリのパッケージ内**平文リソース**（Info.plist・nib・Localizable.strings）から読み取った**画面構成・用語**は、オーナー判断（2026-10-15、v1.2）により UI 設計の参考として使ってよい。内容は `docs/ANALYSIS-official-app.md` に要約済み。IPA 本体・抽出物はリポジトリに入れない。

---

## 1. ゴールとスコープ

Roland V-160HD / V-80HD を iPhone から LAN（Wi-Fi）・USB・Bluetooth の3経路で操作するアプリ「SW CROSSPOINT」。機種差は `core/profiles/` に閉じ込め、VR-120HD は将来プロファイル追加で対応する。

- **V-160HD**：v1 の主対象。本書の §2〜§12 はすべて V-160HD 基準で書かれている。
- **V-80HD**：v1 で LAN 先行対応（オーナーの手元にすぐ触れる実機があるため、実機確認はこちらが先になる）。差分は §9-4。USB/BLE は §13 の確認後に有効化。
- 機種は接続時の `VER` 応答（MIDI は RQ1 の版数読出しと SysEx モデル ID）で判定し、プロファイルを自動選択する。

### v1 機能一覧（受け入れ条件は §11）
| ID | 機能 |
|---|---|
| F1 | 接続：LAN/USB/Bluetooth、保存済みデバイス、自動再接続、切断検知 |
| F2 | クロスポイント PGM/PST：INPUT 1–20（バンク 1–10 / 11–20 切替）、ラベル表示、タリー表示 |
| F3 | CUT / AUTO（パネルスイッチのモーメンタリ送信） |
| F4 | Tバー（AB Fader 0–2047） |
| F5 | トランジション：MIX/WIPE、MIX/WIPE TIME |
| F6 | キー：PinP&KEY 1–4 / DSK 1–2 の PGM・PVW ON/OFF、SPLIT 1–2 ON/OFF、各トランジション時間表示 |
| F7 | オーディオ：AUDIO IN 1, 2, 3/4, USB, Bluetooth, HDMI 1–8, SDI 1–8 のレベル/ミュート、MASTER レベル/ミュート |
| F8 | メモリー 1–30：名前表示、現在番号、長押し呼出し |
| F9 | 操作ロック、ハプティクス、スリープ防止 |
| F10 | 診断：送受信ログ、任意コマンド送信、アドレス読取り（RQH/RQ1）、受信通知の可視化 |
| F11 | **デモモード**：S0 と About から起動できる利用者向け機能。MockTransport（§12-2）で全画面を実機なしで操作できる。画面上部に常時「デモ」バッジ。App Review・スクリーンショット・練習用 |
| F12 | **INPUT 設定シート**（v1.2）：クロスポイント長押し → 割当ソース（HDMI/SDI/STILL）の変更と 8 文字ラベル編集（`00 00 xx` INPUT ASSIGN と LABEL EDIT） |
| F13 | **メニュー（全パラメータ）**（v1.2）：Remote Control Guide の Parameter Address Map 全項目。`tools/guide/parse_guide.py` → `normalize.py` で `core/params/*.params.json` を生成し、`components/params/ParamRow` が種別（bool/enum/int/level/text/exec）ごとの UI を出す。CAMERA CONTROL は PTZ パッド（押下で方向、離すと STOP）。表示中グループは `SyncEngine.setExtraPoll` で追加ポーリング |
| F14 | **クイック操作**（v1.2）：①HDMI OUT 3 の出力割当を PROGRAM / PREVIEW / MULTI-VIEW の 3 ボタンで切替（VIDEO ASSIGN `00 00 0C`、V-80HD は `00 00 12`）②一括設定「HDMI/SDI 入力音声を −16.8 dB・LR MIX に」（AUDIO INPUT の HDMI IN / SDI IN 全系統：DIGITAL GAIN `01 xx 01` = 7EH 58H、MONO `01 xx 0A` = 03H）③一括設定「SDI OUT をすべて LEVEL-A に」（VIDEO OUTPUT (SDI) `00 xx 00` = 00H）。一括設定は確認ダイアログ後に CommandQueue 経由で順次書込み。定義は `core/params/quick.ts` がカタログから組み立て、該当パラメータが無い機種では出さない（§9-5） |
| F15 | **AUX**（v1.2）：AUX バスのソースをクロスポイント風ボタンで切替（VIDEO ASSIGN の AUX SOURCE `00 00 11`。V-80HD は Aux 1/2 `00 00 18/19` を Segmented で切替）。HDMI / SDI / STILL / INPUT / その他に分けて 4 列、8 文字ラベルがあれば併記。そのバスを出している出力割当（OUTPUT ASSIGN が AUX のもの）をフッターに表示。`core/params/quick.ts` の `auxBuses()` がカタログから組み立てる |
| F16 | **マクロ・シーケンサー**（v1.2）：マクロ 1–100 をタップで実行、シーケンサー ON/OFF・Auto Sequence・先頭へ・PREV・NEXT。経路は `lib/features.ts`：LAN（対応 FW）は簡易制御コマンド `MCREX` / `SEQ*`（§3-8、3 機種共通）、V-160HD の USB/BLE は `addrs.macroTrigger` = `50 05 04`（番号−1。**ガイド未記載**、Companion roland-v160hd の `run_macro`【事実：公開 OSS】→ §13）と §9-2 のパネルスイッチ `0B004F–52`（モーメンタリ）。V-80HD / VR-120HD の USB/BLE では出さない。マクロ名の取得手段は公開資料に無いので番号のみ |

### v1 非対象
映像モニター（USB UVC）、マクロ／シーケンサーの**編集**（アドレスが無い。実行は F16）、RS-232、iPad 専用レイアウト（iPad でも動くが iPhone UI を拡大表示で可）。PTZ と全設定メニューは v1.2 で F13 として対象に入れた。

---

## 2. プロトコル共通：アドレス空間と値エンコード

V-160HD / V-80HD とも全パラメータを **3バイトアドレス（各 00–7F）** で管理（アドレスの割当は機種ごとに異なる。V-80HD は §9-4）。LAN は ASCII（DTH/RQH）、USB/BLE は MIDI SysEx（DT1/RQ1）で**同じアドレス・同じ値**を読み書きする。【事実：Remote Control Guide】

### 2-1. 値エンコード（全 transport 共通）
| 種類 | エンコード | 例 |
|---|---|---|
| 1byte | 00–7F | `01` |
| 2byte 符号なし | `hi*128 + lo` | Tバー 1024 → `08 00` |
| 2byte 符号付き（14bit 2の補数） | `v & 0x3FFF` を 7bit×2 | DIGITAL GAIN −42.0dB（−420）→ `7C 5C` 【事実：ガイド記載値と一致】 |
| 3byte 符号付き（21bit 2の補数） | `v & 0x1FFFFF` を 7bit×3 | LEVEL −80.0dB（−800）→ `7F 79 60` 【事実：ガイド記載値と一致】、−6.0dB → `7F 7F 44` |
| −INF | `7E 00 00`（LEVEL のみ） | |
| テキスト | 1byte×8（00–7F）、ASCII として扱う【推測】、末尾スペース除去 | |

`core/codec/value.ts` に `encodeU7/decodeU7`, `encodeU14/decodeU14`, `encodeS14/decodeS14`, `encodeS21/decodeS21`, `encodeAscii8/decodeAscii8` を実装し、上記例を単体テストの期待値にする。

---

## 3. LAN（Wi-Fi）プロトコル完全仕様

### 3-1. 接続【事実】
- TCP、ポート **8023**（設定で変更可、既定 8023）。V-80HD も 8023【事実：V-80HD Guide】。Telnet 扱いだがネゴシエーション不要（実働実装は生 TCP で送受信）。
- 本体側準備：`MENU → LAN CONTROL`。`CONFIGURE` = USING DHCP or MANUAL、`INFORMATION` で **4桁 NETWORK PASSWORD** を設定して SAVE（**V-80HD は `MENU → Network → LAN Setup → Network Password`、8文字**【事実：V-80HD Guide】）、`STATUS` が CONNECTED。LAN ケーブルは本体 **LAN CONTROL** 端子へ（ルーターの WAN/インターネット端子には挿さない）。
- 本体 FW 1.04 以上（公式 iPad アプリ 3.4.0 は FW 3.60 対応）。

### 3-2. 認証シーケンス【事実：Companion 実装＋テスト】
```
App                          V-160HD
 ── TCP connect ──────────────►
 ◄──────────── "Enter password:"     （終端文字なし。分割受信あり）
 ── "{4桁PW}\n" ──────────────►
 ◄──────── "Welcome to V-160HD."      （ピリオド付き。終端文字なし）
 ── "VER;\n" ─────────────────►
 ◄──────── "VER:V-160HD,x.xx"        （終端は "\n" または ";"）
 ── 初期同期・購読（§7）────────►
```
- パスワードは**1接続につき1回だけ**送る（`passwordSent` フラグ）。
- `Enter password:` 受信から 5s 以内に `Welcome to V-160HD.` が来なければ `AUTH_FAILED`。
- TCP 接続後 5s 以内に `Enter password:` が来ない場合 → `VER;\n` を送ってみて応答があれば認証不要として続行、無ければ `NO_RESPONSE`。【推測による防御】
- `VER` の機種名が保存済みデバイスの機種と異なる → `WRONG_DEVICE` で切断。対応プロファイルが無い機種名も `WRONG_DEVICE`。
- **V-80HD の認証文字列は【不明】**。パーサは機種名を固定せず `^Enter password:$` と `^Welcome to (.+?)\.?$` で判定する（V-80HD は `Welcome to V-80HD.` と【推測】）。パスワード長はプロファイル値（V-160HD 4／V-80HD 8）で入力欄を制限する。

### 3-3. 送信フォーマット【事実】
- `DTH:{addr6},{valueHex};\n`　例 `DTH:002100,22;\n`
- 複数バイト書込みは**1バイトずつ別アドレスで送る**（実働実装の方式）。例 Tバー 1024：`DTH:002102,08;\n` → `DTH:002103,00;\n`
- `RQH:{addr6},{size6};\n`　例 `RQH:002100,000002;\n`
- `VER;\n`
- stx(0x02) は付けない（LAN では省略可）。チェックサム不要。

### 3-4. 受信フォーマットとパーサ仕様【事実：Companion `tcpParser.js` とテスト】
受信バッファを文字列に連結し、先頭から**最も早く現れる区切り**で切り出す：
- `;` → 1メッセージ
- `\n` → 1メッセージ（VER 応答など）
- 認証プロンプト文字列 `Enter password:` / `Welcome to {機種名}.` → それ自体を1メッセージ（区切り無しで来る・TCP 分割もあり）。機種名部分は `V-160HD` に固定しない（`Welcome to ` で始まりピリオドで終わる文字列、または次の区切りまで）
- 切り出した各メッセージは trim。空は捨てる。未完の末尾は次回へ持ち越し。
- 追加の防御（実装すること）：制御文字 `0x02`(stx) `0x06`(ack) `0x11`(xon) `0x13`(xoff) `\r` は除去し、`0x06` 単体または文字列 `ACK` は **ACK イベント**として扱う。Telnet IAC（`0xFF` 始まり3byte）が来たら破棄。【推測による防御】

メッセージ種別：
| 形式 | 意味 |
|---|---|
| `DTH:{addr6},{hex...}` | 値通知。**複数バイトは区切り無しで連結**（例 `DTH:001B00,0100` = 001B00=01, 001B01=00）。RQH 応答と、本体側変更の自発通知の両方がこの形で来る【事実】 |
| `VER:{model},{version}` | バージョン |
| `ERR:{n}` | 0=構文エラー, 4=無効（他設定で無効化中）, 5=範囲外, 6=stx無し(RS-232のみ) |
| `ACK` / 0x06 | 受理 |

**単体テスト必須ケース**（Companion のテストと同等）：
```
["Enter pass","word:"]                         → ["Enter password:"]
["Welcome to V","-160HD."]                     → ["Welcome to V-160HD."]
["DTH:002100,01;Enter password:"]              → ["DTH:002100,01","Enter password:"]
["DTH:002100,01;DTH:002101,02;Welcome to V-160HD."] → ["DTH:002100,01","DTH:002101,02","Welcome to V-160HD."]
["VER:V-160HD,1.04\nEnter password:"]          → ["VER:V-160HD,1.04","Enter password:"]
["\x06DTH:0C0000,0102;"]                        → [ACK, "DTH:0C0000,0102"]
["\x02ACK;\x02DTH:001500,29;"]                  → [ACK, "DTH:001500,29"]       // V-80HD 形式（stx＋文字列 ACK）
["Welcome to V-","80HD."]                      → ["Welcome to V-80HD."]
```

### 3-5. 自発通知とタリー購読【事実：Companion 実装（V-160HD）】
> V-80HD では自発通知の有無・`0C0100` の有無とも【不明】。V-80HD Guide の Tally 領域は `0C 00 00–38`（読取り専用）のみ記載。**V-80HD では `0C0100` を送らず**、ポーリング（§10-2）で動かす。診断画面から手動で購読書込みを試せるようにし、§13 で確認後にプロファイルで有効化する。
- 本体側でパラメータが変わると `DTH:{addr},{1byte}` が**単発で自発送信される**（PGM/PVW、AUX、トランジション種別等で確認済み）。→ ポーリングは補助（取りこぼし対策）でよい。
- **タリー購読**：認証後に `DTH:0C0100,01;\n`（TALLY SEND ACTIVE）を送ると、タリー変化時に `DTH:0C0000,{2hex×N}` がまとめて届く。
  - 並び順（index）：0–7=HDMI 1–8, 8–15=SDI 1–8, 16–31=STILL 1–16, 32–41=XPT 1–10
  - 値：ビットマスク `0x00`=OFF, `0x01`=PGM, `0x02`=PVW, `0x03`=PGM+PVW
  - N は受信値の長さ/2 で決める（固定長を仮定しない）

### 3-6. 送信キュー【事実：Companion `commandQueue.js` を踏襲】
- 2優先度：HIGH（DTH 書込み）／LOW（RQH 読出し）。HIGH が常に先。
- HIGH 同士は **最小 20ms 間隔**（壁時計で管理）。
- LOW は 4件ずつ、バッチ間 5ms。
- 接続切替時は `clear()` で世代番号を進め、古いコールバックの送信を破棄。
- 連続値（Tバー・フェーダー）は**同アドレスの未送信分を最新値で上書き**（coalesce）。送信間隔 LAN 33ms。

### 3-7. 切断・再接続
- TCP `close/error` → `reconnecting`。バックオフ 1→2→4→8→15s（上限15s、手動接続で即リセット）。
- 無通信 10s → `VER;` をキープアライブ送信、5s 応答なしで切断扱い。

### 3-8. 簡易制御コマンド【事実：Roland「LAN/RS-232 簡易制御コマンド」Ver.02（2025）】（v1.2）
- 対象：**V-160HD Ver.3.5 以降 / V-80HD Ver.1.3 以降 / VR-120HD Ver.2.2 以降**（VR-6HD 2.2 / V-1-4K 1.0 は本アプリ未対応機種）。**LAN / RS-232 のみ**（MIDI SysEx には無い）。通常の DTH/RQH と併用できる。
- 形式：`CMD:param,param;`（ASCII、stx 省略可）。応答は `ACK;` または `XXX:…;ACK;`、末尾 LF。既存の LanParser は `;` 区切りで切り出すので、`ACK` トークンと未知テキスト（`SQS:ON` など）に分かれる。未知テキストは `transport.on('text')` で通知し、`core/codec/simpleCommands.ts#parseSimpleReply` が `SQS` / `SQA` / `MCRST` / `TLY` を解釈する。
- 本アプリが使うコマンド（`core/codec/simpleCommands.ts`）：

| 目的 | 送信 | 応答 | 備考 |
|---|---|---|---|
| CUT / AUTO | `CUT;` / `ATO;` | `ACK;` | SPLIT OFF のとき有効。V-80HD / VR-120HD の CUT/AUTO はこれで実装（0B 領域が不明なため） |
| マクロ実行 | `MCREX:MACROn;`（1–100） | `ACK;` | 実行中確認 `QMCRST:MACROn;` → `MCRST:MACROn,ON/OFF;ACK;` |
| シーケンサー | `SEQSW:ON/OFF;` `SEQAS:ON/OFF;` `SEQPV;` `SEQPV:1;`（先頭へ） `SEQNX;` `SEQJP:START/SEQn;` | `ACK;` | 状態 `QSEQSW;` → `SQS:ON/OFF;ACK;`、`QSEQAS;` → `SQA:…` |
| シーンメモリー | `MEM:MEMORYn;` | `ACK;` | 既存の 0A 00 00 と等価。v1.2 では未使用 |
| タリー | `TLY;` | `TLY:a0,a1,…;ACK;`（0 OFF / 1 PGM / 2 PST / 3 両方） | 0C 領域のポーリングと等価。v1.2 では未使用 |

- 経路の決定は `lib/features.ts#featureRoute(feature, profile, transport, version)`：`'sysex'`（プロファイルのアドレス）/ `'text'`（簡易制御コマンド。LAN・デモで、本体 FW が対応版以上のとき）/ `null`（出さない）。VER 応答の版で判定し、版が取れなければ使ってみる。
- モック（`MockTransport` / `tools/mock-v160hd`）は `core/transport/simpleCommandSim.ts` で CUT / ATO / MEM / MCREX / SEQ 系 / TLY を模擬する。
- 切断・アプリ非アクティブ時は**押下中モーメンタリスイッチすべてに `00` を送ってから**切断（送れなければ再接続直後に送る）。

---

## 4. MIDI（USB / Bluetooth 共通）プロトコル完全仕様

### 4-1. SysEx フォーマット【事実：Remote Control Guide】
```
DT1（書込み）: F0 41 10 {modelId…} 12  a1 a2 a3  d1 … dn  sum  F7
RQ1（読出し）: F0 41 10 {modelId…} 11  a1 a2 a3  s1 s2 s3  sum  F7
  41=Roland, 10=Device ID, 12=DT1, 11=RQ1
  modelId: V-160HD = 00 00 00 00 02（5byte）／ V-80HD = 01 05 14（3byte）【事実：各機種 Guide】
  → ヘッダ長が機種で変わる。SysExCodec はプロファイルの modelId を使い、固定長を仮定しない
  sum = (128 − (Σ(addr+data|size) mod 128)) mod 128
```
- 本体は RQ1 に対し DT1 で応答（送信可能かつアドレス・サイズが正しい場合のみ。無効なら無応答）。
- パケット間 **20ms 以上**空ける。1パケット 256byte 超は分割（v1 では発生しない）。
- MIDI チャンネル概念なし。

### 4-2. テストベクタ（単体テストの期待値。ガイド例1件＋同式で算出）
| 用途 | バイト列 |
|---|---|
| PGM=01（ガイド記載例） | `F0 41 10 00 00 00 00 02 12 00 21 00 01 5E F7` |
| PGM=0x22 (INPUT 3) | `F0 41 10 00 00 00 00 02 12 00 21 00 22 3D F7` |
| CUT 押下 / 解放 | `… 12 0B 00 1E 01 56 F7` / `… 12 0B 00 1E 00 57 F7` |
| AUTO 押下 | `… 12 0B 00 1F 01 55 F7` |
| Tバー 1024（2byte 一括） | `F0 41 10 00 00 00 00 02 12 00 21 02 08 00 55 F7` |
| RQ1 PGM/PST 2byte | `F0 41 10 00 00 00 00 02 11 00 21 00 00 00 02 5D F7` |
| RQ1 バージョン 6byte | `F0 41 10 00 00 00 00 02 11 02 00 00 00 00 06 78 F7` |
| RQ1 タリー 16byte | `F0 41 10 00 00 00 00 02 11 0C 00 00 00 00 10 64 F7` |
| タリー購読 | `F0 41 10 00 00 00 00 02 12 0C 01 00 01 72 F7` |
| メモリー7 呼出し | `F0 41 10 00 00 00 00 02 12 0A 00 00 06 70 F7` |

（`…` = `F0 41 10 00 00 00 00 02`。全行 §4-1 の式で算出済み。チェックサムは必ずコードで計算し、この表を期待値にテストする。v1.1 で全行を独立に再計算し一致を確認）

**V-80HD テストベクタ**（1行目は V-80HD Guide 記載例、他は同式で算出）
| 用途 | バイト列 |
|---|---|
| PGM=Input 2（0x2A、Guide 記載例） | `F0 41 10 01 05 14 12 00 15 00 2A 41 F7` |
| PGM=Input 1（0x29） | `F0 41 10 01 05 14 12 00 15 00 29 42 F7` |
| Tバー 1024 | `F0 41 10 01 05 14 12 00 15 02 08 00 61 F7` |
| RQ1 PGM/PST 2byte | `F0 41 10 01 05 14 11 00 15 00 00 00 02 69 F7` |
| RQ1 バージョン 6byte | `F0 41 10 01 05 14 11 02 00 00 00 00 06 78 F7` |
| RQ1 タリー 57byte | `F0 41 10 01 05 14 11 0C 00 00 00 00 39 3B F7` |
| シーン7 呼出し | `F0 41 10 01 05 14 12 0A 00 00 06 70 F7` |

### 4-3. 接続確認（LAN の VER 相当）
1. `RQ1 02 00 00 size 00 00 06`（Version 領域・読み取り専用）を送る
2. 1s 以内に `DT1 02 00 00 …` が返れば、その応答ヘッダの modelId で機種を判定（V-160HD／V-80HD）、6byte をバージョンとして保持（表示形式は実機で確認【不明】、ログに生値を残す）
3. 返らなければ `NO_RESPONSE`（端点違い or 本体設定不備）
- MIDI 経由の自発通知・タリー購読（`0C 01 00 = 01`）が LAN と同様に働くか【不明】→ 実装は「購読 DT1 を送る＋ポーリングも常時動かす」で両対応。

### 4-4. MIDI 受信処理
- SysEx 以外（Note/CC/Clock/Active Sensing 等）は捨てる。
- 接続中プロファイルのヘッダ（`41 10 {modelId} 12`）以外の SysEx は捨てる（ログには残す）。接続確認中（§4-3）だけは全対応機種のヘッダを受け付ける。
- チェックサム不一致は破棄＋ログ。

---

## 5. USB 接続 詳細

### 5-1. ハードウェア【事実：公式 Connection Guide】
- 本体側：**USB STREAM 端子**（USB Type-C）。
- iPhone（USB-C 機：iPhone 15 以降）：**USB-C ⇄ USB-C ケーブル**で直結。
- iPhone（Lightning 機）：**Lightning - USB カメラアダプタ**（推奨は電源入力付きの「Lightning - USB 3カメラアダプタ」）＋ USB A→C ケーブル。
- 本体は自己給電。iPhone が USB ホストになる。

### 5-2. iOS 側の見え方【推測：根拠＝公式仕様「USB STREAM：PC・iPad からのリモート用」＋ Remote Control Guide の制御が MIDI SysEx であること】
- USB 接続すると CoreMIDI に Source/Destination 端点が出現する想定。**端点名は【不明】**（実機で確認＝§13）。`V-160HD` / `V-80HD` の部分一致で候補上位に並べ、最終的にユーザーが選ぶ。**名前の完全一致に依存しない**こと。
- 端点判別：`kMIDIPropertyDriverOwner` が `com.apple.AppleMIDIUSBDriver` なら USB、`com.apple.AppleMIDIBluetoothDriver` なら Bluetooth、`com.apple.AppleMIDIRTPDriver` はネットワーク MIDI（v1 は非表示）【推測：実機ログで要確認。判別不能なら "other" として表示】。端点→Entity→Device の順に辿って取得する。
- 安定 ID：`kMIDIPropertyUniqueID`（Int32）。保存済みデバイスにはこれと表示名を保存し、次回はまず UniqueID、無ければ名前部分一致で再選択。

### 5-3. ホットプラグ
- `MIDIClientCreateWithBlock` の通知ブロックで `msgObjectAdded / msgObjectRemoved / msgSetupChanged` を受けて端点リストを再取得し JS へ `onEndpointsChanged` を発火。
- 接続中の端点が消えたら `onLinkLost` → UI は「USB が外れました」→ 端点再出現で自動再接続（保存済み UniqueID 一致時）。

### 5-4. 注意
- USB STREAM は映像/音声（UVC/UAC）も出しているが、本アプリは MIDI インターフェースのみ扱う。
- iPhone の USB 映像モニター（UVC 受信）は v1 対象外【不明：公式要件は iPad（M1以降・iPadOS17以降・USB-C）のみ記載】。

---

## 6. Bluetooth 接続 詳細

### 6-1. 本体側設定【事実：公式 Connection Guide の原文】
`[MENU] → "SYSTEM" → "Bluetooth" → "REC CONTROL" を "ON"` → `[MENU]` で閉じる。

### 6-2. ペアリング手順（アプリ内）【事実＋推測】
- 公式手順：iOS の「設定」の Bluetooth 一覧に `Roland V-160HD` が出ても**タップしない**。アプリ内の「Bluetooth MIDI Device」画面から `Roland V-160HD` を選び、"Connected" 表示でペアリング完了（「Bluetooth ペアリングの要求」ダイアログが出たら「ペアリング」）。【事実】
- この画面は iOS 標準の BLE-MIDI 画面 **`CABTMIDICentralViewController`（CoreAudioKit）**で実現できる【推測：公式手順の文言・挙動が標準 UI と一致】。
  - `UINavigationController(rootViewController: CABTMIDICentralViewController())` でモーダル表示し、右上に「完了」ボタンを付けて dismiss。
  - dismiss 後、CoreMIDI に BLE 端点が出る。公式手順では次の画面で `Roland V-160HD (Bluetooth)` を選ぶ → 端点名がこの形か、アプリ側で "(Bluetooth)" を付けて表示しているかは【不明】。部分一致 `V-160HD` ＋ driverOwner で判定。
- 1台の iPhone は同時に1台の V-160HD とだけペアリング可【事実】。

### 6-3. 通信
- §4 と同じ SysEx を同じネイティブモジュール経由で送る（USB と BLE はコード共通、端点が違うだけ）。
- BLE はレイテンシ・帯域が劣るため：連続値の送信間隔 50ms、ポーリング周期 300ms 以上。
- 電波干渉で不安定になりうる【事実：公式注意書き】→ 切断検知と再接続 UI を必ず実装。

### 6-4. 再接続
- アプリ切替・スリープで切断される【事実：公式注意書き（iPad アプリ）】。
- 復帰時：保存済み UniqueID の BLE 端点が CoreMIDI に online で存在すれば自動で開く。存在しなければ「Bluetooth 再接続」ボタンでピッカーを再表示。iOS が BLE-MIDI を自動再接続するかは【不明】。
- 使用中は `expo-keep-awake` で自動ロックを抑止（設定でオン/オフ、既定オン）。

---

## 7. ネイティブモジュール `crosspoint-midi` API 仕様

### 7-1. JS 側インターフェース（`modules/crosspoint-midi/src/index.ts`）
```ts
export type MidiTransportKind = 'usb' | 'ble' | 'network' | 'other';
export interface MidiEndpointInfo {
  uniqueId: number;          // kMIDIPropertyUniqueID（Destination 側の値）
  sourceUniqueId: number;    // 対になる Source の UniqueID
  name: string;              // kMIDIPropertyDisplayName
  deviceName: string;        // 親 Device 名
  transport: MidiTransportKind;
  online: boolean;           // kMIDIPropertyOffline の否定
}
export interface CrosspointMidi {
  listEndpoints(): Promise<MidiEndpointInfo[]>;              // Source と Destination を Device 単位でペアにして返す
  open(destUniqueId: number, srcUniqueId: number): Promise<void>; // 入力ポート接続、出力先保持
  close(): Promise<void>;
  sendSysEx(bytes: number[]): Promise<void>;                 // F0…F7 を含む完全メッセージ。20ms 間隔はネイティブ側でも保証
  presentBluetoothPicker(): Promise<void>;                    // CABTMIDICentralViewController を表示、閉じたら resolve
  addListener(e: 'onSysEx', cb: (ev: { bytes: number[]; ts: number }) => void): Subscription;
  addListener(e: 'onEndpointsChanged', cb: (ev: { endpoints: MidiEndpointInfo[] }) => void): Subscription;
  addListener(e: 'onLinkLost', cb: (ev: { uniqueId: number }) => void): Subscription;
  addListener(e: 'onLog', cb: (ev: { level: 'debug'|'warn'|'error'; msg: string }) => void): Subscription;
}
```

### 7-2. Swift 実装要件
- クライアント：`MIDIClientCreateWithBlock` を1回だけ作成（モジュール生存中保持）。
- 入力：`MIDIInputPortCreateWithProtocol(client, name, ._1_0, &port) { eventList, srcRef in … }` で **UMP（MIDI 1.0 プロトコル）**を受け、SysEx7（Message Type 0x3）を再結合：
  - word0 bit 28–31 = 0x3、bit 20–23 = status（0=complete, 1=start, 2=continue, 3=end）、bit 16–19 = バイト数(0–6)、続く6バイトがデータ（word0 下位16bit＋word1 32bit）
  - start〜end を連結し先頭に F0、末尾に F7 を付けて `onSysEx` 発火。end が来る前に新しい start が来たら前のバッファを破棄。
  - 他のメッセージタイプは無視。
- 出力：`MIDISendEventList` で UMP SysEx7 に分割して送る（6バイト単位、上記 status 規則、group 0）。
  - 送信テストベクタ（RQ1 PGM/PST、F0/F7 を除いた 15byte）：`30164110 00000000` / `30260211 00210000` / `30330002 5D000000`
- 送信は専用シリアル DispatchQueue。直前送信から 20ms 未満なら待つ。
- 通知ブロック：`.msgObjectAdded/.msgObjectRemoved/.msgSetupChanged/.msgPropertyChanged(kMIDIPropertyOffline)` → 端点再列挙 → `onEndpointsChanged`、開いている端点が消えた/offline → `onLinkLost`。
- BLE ピッカー：メインスレッドで最前面 VC から present。`UINavigationController` 包み＋完了ボタン。
- すべての OSStatus をチェックし、失敗は `onLog(error)` と Promise reject（コード文字列 `MIDI_OPEN_FAILED` 等）。
- Info.plist：`NSBluetoothAlwaysUsageDescription`（日本語文言：「ビデオスイッチャーと Bluetooth MIDI で接続するために使用します」）。

---

## 8. アプリ構成

### 8-1. 技術スタック（2026-10-15 時点 npm 最新を確認済み。実装時に再確認）
Expo SDK 57 / React Native 0.87 / TypeScript / expo-router 57 / NativeWind 4 / zustand 5 / react-native-reanimated 4 / react-native-gesture-handler 3 / react-native-tcp-socket 6 / expo-haptics / expo-secure-store / expo-keep-awake / @react-native-async-storage/async-storage / jest（jest-expo）。
- v1.1 再確認（`npm view`）：`expo` latest = 57.0.29（58 系は `next` タグで未安定）、`react-native` = 0.87.1、`expo-router` = 57.0.27。**SDK 58 には上げない**。
- タブは **expo-router の Native Tabs**（SDK 57 の import は `expo-router/unstable-native-tabs`。SDK 58 で `expo-router/native-tabs` に改名予定）。システムの UITabBar を使うため、iOS 26 以降の実機では自動で Liquid Glass 表示になる。

### 8-2. ディレクトリ
```
sw-crosspoint/
├─ app/
│  ├─ _layout.tsx                 Provider（DeviceController 生成、テーマ、Toast）
│  ├─ connect.tsx                 S0（modal）
│  └─ (tabs)/_layout.tsx, switcher.tsx, keys.tsx, audio.tsx, memory.tsx,
│     more/index.tsx, more/diagnostics.tsx, more/console.tsx, more/about.tsx
├─ components/   status/ switcher/ keys/ audio/ memory/ diagnostics/ ui/   （DESIGN.md §4 の一覧どおり）
├─ core/
│  ├─ transport/ Transport.ts socket.ts(ソケット抽象) rnSocket.ts(react-native-tcp-socket) LanTransport.ts MidiTransport.ts MockTransport.ts demoState.ts
│  ├─ codec/     TextCodec.ts lanParser.ts SysExCodec.ts ump.ts value.ts
│  ├─ controller/DeviceController.ts CommandQueue.ts SyncEngine.ts
│  └─ profiles/  v160hd.ts v80hd.ts types.ts index.ts
├─ stores/       connection.ts param.ts devices.ts settings.ts log.ts
├─ modules/crosspoint-midi/   ios/*.swift  src/index.ts  expo-module.config.json  package.json
├─ theme/        tokens.ts  （tailwind.config.js はルート）
├─ tools/mock-v160hd/server.ts   （`--model v80hd` で V-80HD 形式の応答に切替）
├─ __tests__/
└─ docs/
```

### 8-3. Transport 抽象
```ts
interface Transport {
  readonly kind: 'lan' | 'usb' | 'ble' | 'mock';
  connect(target: ConnectTarget): Promise<void>;     // 認証・機種確認まで含めて resolve
  disconnect(reason?: string): Promise<void>;
  writeParam(addr: Addr, bytes: number[]): void;     // LAN: 1byte ずつ DTH / MIDI: DT1 一括
  readParam(addr: Addr, size: number): void;         // LAN: RQH / MIDI: RQ1
  on(ev: 'param', cb: (addr: Addr, bytes: number[]) => void): Unsub;  // 受信 DTH/DT1 を正規化
  on(ev: 'state', cb: (s: LinkState, err?: LinkError) => void): Unsub;
  on(ev: 'log', cb: (e: LogEntry) => void): Unsub;
}
type LinkState = 'idle'|'connecting'|'authenticating'|'syncing'|'online'|'reconnecting'|'error';
type LinkError = 'AUTH_FAILED'|'NO_RESPONSE'|'WRONG_DEVICE'|'REFUSED'|'TIMEOUT'|'LOCAL_NETWORK_DENIED'|'MIDI_OPEN_FAILED'|'LINK_LOST';
```
受信 `param` はアドレス＋バイト列に正規化し、複数バイトは `addr+i` に展開して `paramStore` に書く（アドレス加算は 7bit 桁上がり：`cc+1>0x7F` なら `bb+1`）。

---

## 9. アドレス表（v1 で使うもの全部）

### 9-1. 書込み・読出し
| id | addr | size | 値 | 根拠 |
|---|---|---|---|---|
| input.assign1–10 | 000000–000009 | 1 | 00–1F（00–07 HDMI1–8, 08–0F SDI1–8, 10–1F STILL1–16） | ガイド＋Companion |
| input.assign11–20 | 000024–00002D | 1 | 同上 | Companion |
| panel.pgm | 002100 | 1 | **下記 9-3 参照** | ガイド＋Companion |
| panel.pst | 002101 | 1 | 同上 | 同上 |
| panel.fader | 002102–03 | 2 | 0–2047（u14） | ガイド |
| panel.abBus | 002104 | 1 | 0=A,1=B | ガイド |
| trans.time.mixWipe | 001700 | 1 | 00–28 → 0.0–4.0s | ガイド |
| trans.time.pinp1–4 | 001701–04 | 1 | 同上 | ガイド |
| trans.time.dsk1–2 | 001705–06 | 1 | 同上 | ガイド |
| trans.type | 001800 | 1 | 0=MIX,1=WIPE | ガイド |
| trans.mixType | 001801 | 1 | MIX,FAM,NAM | ガイド |
| trans.wipeType | 001802 | 1 | HORIZONTAL,VERTICAL,UPPER LEFT,UPPER RIGHT,LOWER LEFT,LOWER RIGHT,H-CENTER,V-CENTER | ガイド |
| trans.wipeDir | 001803 | 1 | NORMAL,REVERSE,ROUND TRIP | ガイド |
| split1.sw / split2.sw | 001900 / 001A00 | 1 | OFF/ON | ガイド |
| pinp{n}.pgm / .pvw | 001B00+(n−1)·0x100 / +01 | 1 | OFF/ON（n=1–4 → 1B,1C,1D,1E） | ガイド |
| pinp{n}.source | 001B02 … 001E02 | 1 | 00–33（00–1F 物理, 20–33 INPUT1–20） | Companion |
| dsk{n}.pgm / .pvw | 001F00/01, 002000/01 | 1 | OFF/ON | ガイド |
| label.* | 02xx00–07（xx=10–33） | 8 | ASCII。xx の割当（HDMI1–8,SDI1–8,STILL1–16,PGM,SUB PGM,PVW,AUX の順と推測）【推測】 | ガイド |
| mem.load / save / init | 0A0000 / 0A0001 / 0A0002 | 1 | 00–1D = MEM 1–30（書込み専用トリガ） | ガイド |
| mem.current | 0A0003 | 1 | 00–1D, 7F=Last Memory（読取り専用） | ガイド |
| mem.name{n} | 60{n-1:02X}00–07 | 8 | ASCII | ガイド＋Companion |
| tally.subscribe | 0C0100 | 1 | 01=TALLY SEND ACTIVE | Companion |
| tally.block | 0C0000 | N | §3-5 のビットマスク列（読取り専用） | ガイド＋Companion |
| sys.version | 020000–05 | 6 | 読取り専用 | ガイド |
| audio.in{x}.level | 01{x}03–05 | 3 | s21 / 0.1dB、−800〜+100、`7E0000`=−INF | ガイド |
| audio.in{x}.mute | 01{x}06 | 1 | OFF/ON | ガイド |
| audio.master.level / mute | 012100–02 / 012103 | 3 / 1 | 同上 | ガイド |

AUDIO INPUT の x（00–14）割当：AUDIO IN 1, 2, 3/4, USB IN, Bluetooth IN, HDMI IN 1–8, SDI IN 1–8 の順（21ch）【ガイドは列挙順のみ。x と各入力の厳密な対応は実機で確認＝§13】。

### 9-2. パネルスイッチ（モーメンタリ：`01` 押下 → `00` 解放）【事実：Companion 定数＋Roland サポート記事（CUT）】
| addr | スイッチ | addr | スイッチ |
|---|---|---|---|
| 0B0000–09 | PGM/A 1–10 SW | 0B000A–13 | PST/B 1–10 SW |
| 0B0014–1D | AUX 1–10 SW | **0B001E** | **CUT SW** |
| **0B001F** | **AUTO SW** | 0B0020 | TRANSITION SW |
| 0B0021 | MODE SW | 0B0022 | INPUT ASSIGN SW |
| 0B0025 / 26 | SPLIT A / B SW | 0B0027 | AUTO MIXING |
| 0B0028 | CAPTURE SW | 0B0029–2C | USER 1–4 SW |
| 0B0030/31 | PinP 1 PVW/PGM SW | 0B0035/36 | PinP 2 PVW/PGM SW |
| 0B003A/3B | PinP 3 PVW/PGM SW | 0B003F/40 | PinP 4 PVW/PGM SW |
| 0B0042/43 | DSK 1 PVW/PGM SW | 0B0045/46 | DSK 2 PVW/PGM SW |
| 0B0047–4A | MONITOR 1–4 SW | 0B004E | OUTPUT FADE SW |
| 0B004F–52 | SEQUENCER ON/AUTO/PREV/NEXT SW | | |

- v1 で使うのは **CUT（0B001E）と AUTO（0B001F）のみ**。KEY 系は §9-1 のパラメータ（ON/OFF 状態を直接書く）を使う。
- 押下は touchDown で `01`、解放は touchUp / touchCancel / アプリ非アクティブ / 切断 で必ず `00`。AUTO はタップ（`01` → 150ms 後 `00`）。

### 9-3. ⚠ PGM/PST 値の矛盾（実装で吸収すること）
- Remote Control Guide：`002100` 値 `00–0A` = 「INPUT 1–10」
- Companion（2026-09 の実働実装）：`20–33` = INPUT 1–20、`00–1F` = 物理入力（HDMI1–8/SDI1–8/STILL1–16）
- 対応：プロファイルに `pgmValueMode: 'logical20' | 'guide10'` を持ち、**既定 `logical20`**（INPUT n → `0x1F+n`）。受信値は両方式とも解釈できるデコーダにする（`20–33`→INPUT n、`00–1F`→物理入力として `input.assign` を逆引きして該当 INPUT を推定、該当なしなら「物理入力名」を表示）。診断画面で切替可能にする。実機で確定したら既定を固定（§13）。

### 9-4. V-80HD 差分【事実：V-80HD Remote Control Guide v1.03（2024-08-28）。他は【不明】と明記】
| id | addr | size | 値 | 備考 |
|---|---|---|---|---|
| model | — | — | VER 名 `V-80HD`、SysEx modelId `01 05 14` | §4-1 |
| lan | — | — | TCP 8023、PW **8文字**、書込応答 `stxACK;`（文字列） | §3 |
| input.assign1–16 | 000000–00000F | 1 | 00–2C（00–03 HDMI1–4, 04–07 SDI1–4, 08–27 STILL1–32, 28 VP/SRT, 29–2B Stream&Record Status1/2・Date&Time, 2C N/A） | |
| panel.pgm / pst | 001500 / 001501 | 1 | 00–38：00–03 HDMI1–4, 04–07 SDI1–4, 08–27 STILL1–32, 28 VP/SRT, **29–38 = INPUT 1–16**（INPUT n → `0x28+n`） | Guide 記載例：INPUT 2 = 2A |
| panel.fader | 001502–03 | 2 | 0–2047（u14） | |
| panel.dissolveTakeType | 001504 | 1 | 0=Cut, 1=Auto | 意味は【不明】。v1 は読取り表示のみ |
| panel.faderBase | 001505 | 1 | 0=Upper, 1=Lower | Tバーの基準端。UI の向き合わせに使用 |
| trans.type | 000F00 | 1 | 0=MIX, 1=WIPE | |
| trans.mixType | 000F01 | 1 | MIX, FAM, NAM | |
| trans.time.mix | 000F02 | 1 | 00–28 → 0.0–4.0s | |
| trans.wipeType | 000F03 | 1 | 8種（V-160HD と同順） | |
| trans.time.wipe | 000F04 | 1 | 00–28 → 0.0–4.0s | Guide の項目名は "Mix Time"（重複表記）。並びから WIPE 時間と【推測】 |
| trans.wipeDir | 000F05 | 1 | NORMAL, REVERSE, ROUND TRIP | |
| split1.sw / split2.sw | 001000 / 001100 | 1 | OFF/ON | |
| pinp{n}.time / .pgm / .pvw / .source | 0012xx（n=1）, 0013xx（n=2）：00 / 01 / 02 / 03 | 1 | 時間 00–28、OFF/ON、source 00–38（PGM と同じ値空間） | **PinP&KEY は 2 系統**（V-160HD の 4 と違う。オフセットも違う） |
| dsk.time / .pgm / .pvw | 001400 / 001401 / 001402 | 1 | 時間 00–28、OFF/ON | **DSK は 1 系統** |
| label.* | 02xx00–07（xx=20–4F） | 8 | 並び：HDMI1–4, SDI1–4, STILL1–32, Video Player, SRT In, PGM, SUB PGM, PVW, AUX1, AUX2, DSK Source | INPUT n のラベルは input.assign → ソース → label で引く |
| mem.load / save / init | 0A0000 / 0A0001 / 0A0002 | 1 | 00–1F = SCENE 1–32（7F=None） | **32 件** |
| mem.current | 0A0003 | 1 | 00–1F、7F=Last Memory | |
| mem.exists{n} | 0205{n-1:02X} | 1 | 0/1（読取り専用） | 空きシーンの表示に使う |
| mem.name{n} | 60{n-1:02X}00–07 | 8 | ASCII | |
| tally.block | 0C0000 | 57 | **1byte ずつ 00=OFF / 01=PGM / 02=PST**（V-160HD 購読形式のビットマスクとは別）。並び：00–07 HDMI1–4・SDI1–4, 08–27 STILL1–32, 28 VP/SRT, 29–38 INPUT1–16 | 購読（0C0100）は【不明】→ 送らない |
| sys.version | 020000–05 | 6 | 読取り専用 | |
| audio.in{x}.level / mute | 01{x}03–05 / 01{x}06 | 3 / 1 | V-160HD と同エンコード | **x=01–0F**：AUDIO IN 1, 2, 3/4, USB IN, Bluetooth IN, AUDIO PLAYER, HDMI IN 1–4, SDI IN 1–4, VIDEO PLAYER/SRT IN（V-160HD と開始番号・並びが違う） |
| audio.main.level / mute | 012100–02 / 012103 | 3 / 1 | 同上 | |
| panelSwitch（0B 領域） | — | — | **【不明】Guide に記載なし** | V-80HD では CUT/AUTO ボタンを**表示しない**（§9-5） |

### 9-4b. VR-120HD 差分【事実：VR-120HD リモート・コントロール・ガイド 日本語版 04（MIDI インプリメンテーション Ver.2.00、2024-09-04）】（v1.2）
| id | addr | size | 値 | 備考 |
|---|---|---|---|---|
| model | — | — | VER 名 `VR-120HD`、SysEx modelId `00 00 00 00 25`（5 バイト） | ガイド p.2 |
| lan | — | — | TCP 8023、ネットワーク・パスワード **4 桁**、ack は **06H**（制御コード）、DTH/RQH/VER は V-160HD と同形式 | ガイド p.42–44。認証プロンプト文字列は【推測：V-160HD と同じ】→ §13 |
| pgm / pst | 001B00 / 001B01 | 1 | Hdmi In 1–6 = 00–05、Sdi In 1–6 = 06–0B、Still 1–16 = 0C–1B、Video Player/SRT In = 1C、**Input 1–8 = 1D–24** | `encodeInput(n) = 0x1C + n` |
| fader | 001B02 | 2 | 0–2047 | |
| transType / transTime | 001400 / 001402 | 1 / 1 | Mix, Wipe, Split 1, Split 2 / 0.0–4.0s | |
| inputAssign(n) | 00 00 (n−1) | 1 | HDMI In 1–6 (00–05), SDI In 1–6 (06–0B), Still 1–16 (0C–1B), VP/SRT (1C), Stream/Record Status 1/2 (1D/1E), Date&time (1F) | |
| label | 02 xx 00 | 8 | xx = 20H–45H：HDMI In 1–6, SDI In 1–6, Still 1–16, Program, Sub Program, Preview, AUX 1–3, DSK 1-2 Source, SRT In | Preview Label |
| pinp(n) | 00 (14+n) xx | — | Time 00 / Pgm Sw 01 / Pvw Sw 02 / Source 03 | PinP&Key 1–4 = 15H–18H |
| dsk(n) | 00 (18+n) xx | — | Time 00 / Pgm 01 / Pvw 02 / Mode 03 / Key Source 04 / Fill Source 05 / Type 06 | DSK 1–2 = 19H–1AH |
| split(n) | 001408 / 001412 | 1 | Split 1 Sw / Split 2 Sw | |
| audio.in{x} | 01 xx 03–05 / 06 | 3 / 1 | xx = 01H–18H：Audio In 1–6, 7/8, 9/10, Usb, Bluetooth, Audio Player, HDMI In 1–6, SDI In 1–6, Video Player/SRT In（24ch） | DIGITAL GAIN 01 xx 01、MONO 01 xx 0A は V-160HD と同じ |
| audio.main | 012100–02 / 012103 | 3 / 1 | Level / Mute | |
| memLoad / memCurrent / memName | 0A0000 / 0A0003 / 60 (n−1) 00 | 1 / 1 / 8 | Memory 1–32 | Save 0A0001、Initialize 0A0002 |
| tally | 0C0000 | 37 | 1 バイトずつ Off/PGM/PST：HDMI In 1–6, SDI In 1–6, Still 1–16, VP/SRT, **Input 1–8 = 1DH–24H** | 購読（0C0100）は未記載【不明】 |
| panelSwitch（0B） | — | — | **【不明】ガイド未記載** | CUT/AUTO は LAN の簡易制御コマンドで代替（§3-8） |
| videoAssign | 000008–10 / 000011・24・25 | 1 | HDMI Out 1–3 / SDI Out 1–3 / USB / Stream&Record / LCD の割当（Program, Sub Program, Preview, AUX 1–3, DSK 1-2 Source, Multi-View, …）/ AUX 1–3 Source | F14 / F15 |
| sdiOut | 00 (11–13) 00 | 1 | 3G-SDI Mapping Level-A/B（SDI OUT 1–3 = 11H–13H） | F14 |

### 9-5. 機種ごとの機能有無（プロファイルの `capabilities`）
| 機能 | V-160HD | V-80HD | VR-120HD（v1.2） |
|---|---|---|---|
| クロスポイント | INPUT 1–20、1 バンク 10（5列×2段） | INPUT 1–16、1 バンク 8（4列×2段。キーサイズは 5 列版と同じ高さ、横幅のみ拡張） | INPUT 1–8、1 バンク 8（4列×2段） |
| CUT / AUTO | `0B001E` / `0B001F`（全接続） | LAN：簡易制御コマンド `CUT;` / `ATO;`（FW 1.3+、§3-8）。USB/BLE：**非表示**（0B 領域【不明】、Tバーで代替を案内） | LAN：`CUT;` / `ATO;`（FW 2.2+）。USB/BLE：非表示 |
| タリー購読 | あり（0C0100） | なし（ポーリング） | なし（ポーリング。0C 領域 37B） |
| PinP&KEY / DSK / SPLIT | 4 / 2 / 2 | 2 / 1 / 2 | 4 / 2 / 2 |
| メモリー | 30（「メモリー」） | 32（画面表記は「シーン」） | 32（「シーン」） |
| USB / BLE | 有効 | §13 の確認まで**無効**（S0 で「LAN のみ対応」と表示） | 同左（Model ID `00 00 00 00 25` はプロファイル済み） |
| AUX（F15） | 1 本（`000011`） | 2 本（`000018/19`） | 3 本（`000011` / `000024` / `000025`） |
| マクロ実行 / シーケンサー（F16） | LAN：`MCREX` / `SEQ*`（FW 3.5+）。USB/BLE：`500504`【Companion】/ `0B004F–52` | LAN：`MCREX` / `SEQ*`（FW 1.3+）。USB/BLE：非表示 | LAN：`MCREX` / `SEQ*`（FW 2.2+）。USB/BLE：非表示 |

- 使えない機能はボタンを置かない（disabled で並べない）。タブ自体は隠さず、内容で理由を説明する（HIG：タブを隠さない・無効にしない）。

---

## 10. 同期（SyncEngine）

### 10-1. 接続直後（online 前に完了させる。LAN は RQH、MIDI は RQ1）
| 順 | 読出し | 目的 |
|---|---|---|
| 1 | 020000 ×6 | 版（MIDI のみ。LAN は VER） |
| 2 | 000000 ×10 / 000024 ×10 | INPUT 割当 |
| 3 | 021000〜023307 のラベル（xx=10–33、各8byte） | ラベル（LAN は `RQH:02xx00,000008`） |
| 4 | 002100 ×5 | PGM/PST/Tバー/ABバス |
| 5 | 001700 ×8 / 001800 ×4 | トランジション |
| 6 | 001900, 001A00, 001B00–001E00 ×3, 001F00 ×2, 002000 ×2 | KEY/SPLIT |
| 7 | 0A0003 ×1、6000xx ×8（30件） | メモリー |
| 8 | 0C0000 ×42 | タリー初期値（応答長に従う） |
| 9 | DTH/DT1 `0C0100=01` | タリー購読 |
| 10 | 表示中タブのオーディオのみ | オーディオ |

### 10-2. 常時
- 自発通知（DTH/DT1）を即反映。
- ポーリング（取りこぼし対策）：表示中タブの必要アドレスのみ。周期 LAN 500ms・MIDI 1000ms。重いもの（ラベル・メモリー名）は 10 周期に1回。
- 楽観更新：書込み時に即 UI 反映し `pending[addr]` に記録。1.5s 以内に一致値が来なければ最新受信値に戻し Toast。`ERR:4/5` 受信時も同様。

---

## 11. 画面仕様と受け入れ条件
見た目（レイアウト・寸法・情報配置）は SVG 準拠。ただし**色とタブバーはシステム標準に従う**（v1.1）：
- **色はハードコードしない**。`PlatformColor` で semantic system color を参照する：`bg=systemBackground / group=secondarySystemBackground / fill=tertiarySystemBackground / fill2=systemGray4 / sep=separator / pgm=systemRed / pst=systemGreen / accent=systemBlue / warn=systemOrange`。ボードの hex（`#FF3B30` 等）は iOS 17–18 の参考値で、OS のバージョン・ライト/ダーク・コントラスト強調で自動的に変わる（HIG Color：システムカラーの値をハードコードしない）。
  - 例外：色付き塗りの上の文字（`onTint`）・フェーダーのつまみ（`knob`）・スクリム（`scrim`）は UIKit の `UIColor.white` / `black` に相当する固定値。`PlatformColor` は semantic 名しか解決せず `'white'` / `'black'` は nil（＝透明）になるため【実機で確認：選択中クロスポイントの番号・ラベルが消えていた】。ライト/ダークで変わらない色なので semantic にする意味も無い
- **タブバーは Native Tabs（システムの UITabBar）**。iOS 17–18 ではボードどおりの固定タブバー（高さ 83pt）、iOS 26 以降ではシステムが Liquid Glass のフローティング表示にする。自前でタブバーを描かない。コンテンツはタブバーの下まで敷き、下端の余白はセーフエリアで確保する。
- 寸法トークン：角丸 クロスポイント12・カード10・大ボタン18、クロスポイント 66×58pt（5列、間隔8。V-80HD は 4 列、§9-5）。Dark 既定、Light・コントラスト強調はシステムカラーで自動対応。
- PGM/PST・ON AIR は色だけで示さない（文字・枠で併記、VoiceOver ラベル付き）。

| 画面 | 受け入れ条件 |
|---|---|
| S0 接続 | 3経路セグメント（V-80HD 選択時は USB/BLE に「現在は LAN のみ対応」を表示）。末尾に「デモモードで試す」（F11）。LAN：名前・IP・ポート(8023)・パスワード（SecureStore 保存、表示は ••••）。USB：端点一覧（transport=usb）と「再検索」。Bluetooth：「Bluetooth MIDI デバイスを追加」→ピッカー、閉じた後 BLE 端点一覧。接続中は状態文言（認証中…/機種確認中…/同期中…）。各 LinkError に固有の日本語メッセージ |
| S1 スイッチャー | バンク 1–10/11–20。PGM 行選択で `panel.pgm` 書込み、PST 行で `panel.pst`。選択色 PGM 赤・PST 緑塗り、他バスのタリーは 2pt 枠。CUT 長押し中のみ ON。AUTO タップで AUTO SW、遷移中はリング進捗（MIX/WIPE TIME から算出）。Tバーは 0–2047 を上下ドラッグ、端でハプティクス、指を離しても値保持。MIX/WIPE と TIME（0.1s 刻み 0.0–4.0）変更可 |
| S2 キー | PinP&KEY 1–4、DSK 1–2 の PGM/PVW トグル（状態は受信値で確定）、SPLIT 1–2 ON。サブ表示にソース名・時間 |
| S3 オーディオ | 横スクロールのチャンネルストリップ（IN 1, IN 2, IN 3/4, USB, BT, HDMI 1–8, SDI 1–8）＋固定 MASTER。dB 表示（−INF〜+10.0）。ダブルタップで 0.0dB。MUTE トグル |
| S4 メモリー | 1–30 グリッド、名前（8文字）、現在番号ハイライト。0.6s 長押しで呼出し、途中で離すとキャンセル |
| S5 その他 | 接続管理、操作ロック（スライドで解除）、ハプティクス、スリープ防止、ポーリング周期、PGM 値モード、診断（ログ・任意コマンド・アドレス読取り）、About（非公式アプリである旨と商標表記）、デモモード起動 |
| 共通 | 未接続時は全操作 disabled（40%）＋上部バナー。VoiceOver ラベル。Dynamic Type で崩れない（最大 AX1 まで）。横向きは S1 のみ専用レイアウト（左にクロスポイント2段、右に Tバー＋CUT/AUTO） |

---

## 12. モック・テスト

### 12-1. `tools/mock-v160hd/server.ts`（Node, `npm run mock`）
- TCP 8023 で待受、接続直後 `Enter password:` 送信、正しい PW（既定 `0000`、引数で変更）で `Welcome to V-160HD.`、誤りは切断。
- `VER;` → `VER:V-160HD,3.60\n`。`RQH` → 内部メモリ（256×128×128 の疎 Map）から連結 hex で `DTH:...;`。`DTH` → 書込み＋`ACK;` 返信＋他クライアントへ自発通知。
- `0C0100=01` 受信後、PGM/PST 変更時に `DTH:0C0000,{42byte}` を送信。
- `0B001E` 押下→解放で PGM/PST 入替、`0B001F` で同様（遅延＝MIX/WIPE TIME）。
- `--model v80hd`：`Welcome to V-80HD.`、PW 8 文字（既定 `00000000`）、書込応答 `\x02ACK;`、VER `V-80HD,1.30`、§9-4 のアドレス、自発通知なし・0B 領域は `ERR:0;`（不明を再現）。
- 範囲外書込みは `ERR:5;`。
- ランダム遅延・分割送信オプション（パーサ検証用）。
### 12-2. `MockTransport`（JS 内）
同じ挙動をメモリ上で再現し、UI を実機・モックサーバー無しで動かせるようにする（開発メニューから選択）。
- **リリースビルドにも含め、F11 デモモードとして利用者に公開する**。ダミー機器名は `DEMO-SW-A`、ラベルも架空名のみ。デモ中は実機への接続処理を一切行わない。
- 機種は V-160HD / V-80HD を選べる（プロファイル準拠の応答）。
### 12-3. 単体テスト（必須）
value.ts（§2-1 の例）／SysExCodec（§4-2 全行＋V-80HD 表）／UMP 分割・結合（§7-2 ベクタ、および 6/7/12/13 byte 境界）／lanParser（§3-4 全ケース。V-80HD 形式を含む）／CommandQueue（優先度・20ms・coalesce・clear 世代）／SyncEngine（楽観更新ロールバック）／タリー解釈（0–3）／PGM 値デコード（両モード＋V-80HD の 0x28+n）／プロファイル capabilities による UI 出し分け。
### 12-4. 結合テスト
モックサーバーに対し：接続→認証→同期→PGM 変更→自発通知反映→CUT→切断→自動再接続。

---

## 13. 実機確認チェックリスト（診断画面で実施できること）
- [ ] LAN：認証文字列・`ACK` の実体（文字列か 0x06 か）・VER 応答の終端
- [ ] LAN：同時接続数（公式アプリ/Companion と同時に繋げるか）
- [ ] **PGM/PST の値方式**（INPUT 3 選択時に `RQH:002100,000002` が `22` か `02` か）→ §9-3 の既定を確定
- [ ] タリー購読応答の長さ（42 か）
- [ ] USB：iPhone で見える端点名・driverOwner、RQ1 バージョン応答の形式
- [ ] USB：MIDI 経由でも自発通知・タリー購読が来るか
- [ ] BLE：ピッカーで見える名前、ペアリング後の端点名、RQ1/DT1 往復、体感レイテンシ
- [ ] BLE：アプリ復帰時に端点が online のままか（自動再接続可否）
- [ ] AUDIO INPUT x の対応、LABEL の xx 対応と文字コード
- [ ] AUTO SW がタップ（01→150ms→00）で正しく動くか
- [ ] **マクロ実行 `DTH:500504,nn;`**（nn = 番号−1）で本体のマクロが走るか（Companion 由来・ガイド未記載）。`RQH:500504,000001` の応答も記録
- [ ] シーケンサー `0B004F–52` の押下/解放で本体が反応するか
- [ ] **簡易制御コマンド（§3-8）**：`CUT;` → `ACK;`＋LF、`MCREX:MACRO1;`、`QSEQSW;` → `SQS:…;ACK;` の実際の応答（LF の有無・ACK の形式）。FW が対応版未満のときの応答（`ERR:0;` か無応答か）
**VR-120HD（LAN）**
- [ ] 認証：`Enter password:` / `Welcome to VR-120HD.` か、ack が 06H か
- [ ] INPUT n = `0x1C+n` の確認（INPUT 3 選択時に `RQH:001B00,000002` が `1F..` か）
- [ ] タリー `RQH:0C0000,000025` の応答長（37）と Input 1–8 の位置（1DH–24H）
- [ ] Preview Label `02 20 00`〜の 8 文字と文字コード、AUDIO INPUT xx=01–18 の対応
- [ ] USB / BLE：端点が見えるか、RQ1（Model ID 00 00 00 00 25）で版が返るか
- [ ] F14 一括設定：無信号／モノの HDMI/SDI 入力で MONO=LR MIX が ERR:4 になるか
**V-80HD（先に実機確認できる。M3.5 で実施）**
- [ ] LAN：認証文字列（`Enter password:` / `Welcome to V-80HD.` か）、PW 8 文字の送り方、`ACK;` の実体（stx 付き文字列か）
- [ ] LAN：自発通知の有無（本体で PGM を変えたとき `DTH:001500,..` が来るか）
- [ ] タリー購読：診断画面から `DTH:0C0100,01;` を手動送信し、`ERR` か通知開始か（結果で capabilities を更新）
- [ ] 0B 領域（パネルスイッチ）：**本番外のリハーサル時のみ**、診断画面から手動で 1 アドレスずつ確認。結果が出るまで CUT/AUTO は非表示のまま
- [ ] INPUT n = `0x28+n` の確認（INPUT 3 選択時に `RQH:001500,000002` が `2B..` か）
- [ ] USB / BLE：端点が見えるか、RQ1 バージョンが返るか（返れば capabilities で有効化）
- [ ] AUDIO INPUT x=01–0F の対応、LABEL xx=20–4F の対応
- [ ] VR-120HD：将来対応の判断材料（Guide v1.08 で modelId `00 00 00 00 25`、PGM `001B00`、PW 4 文字と記載）

## 14. 未決事項・リスク
- iPhone の USB 映像モニターは不明のため対象外。
- LAN の機器探索（ブロードキャスト）は公式未公開。v1 は IP 手入力（任意で 1–254 の 8023 ポートスキャン機能を v1.1 で検討）。
- 販売時の商標表記：アプリ名に Roland/V-160HD を含めない（App Store Review Guidelines 4.1(c)：他の開発者のブランド名・製品名をアプリ名やアイコンに使わない）。説明文の「対応機種」表記と「本アプリは Roland Corporation の公式製品ではありません」の明記で運用。キーワード欄への商標詰め込みはしない（同 2.3.7）。最終判断は法務確認。
- **使用許諾**：Roland のソフトウェア使用許諾はリバースエンジニアリング・逆コンパイル・逆アセンブルを禁じている。v1.0 にあった Mac 版 RCS バイナリ由来の記述は v1.1 で全削除した。v1.2 で公式 iPad アプリの平文リソースに基づく UI 構成の参考を可としたが（ルール8）、許諾上のリスク評価はオーナーの責任で行う。解析物（ipa・dmg・抽出文字列）はリポジトリに入れない。公開リポジトリにする場合は過去コミットにも残っていないことを確認する。
- **v2 候補**：公式アプリの機能ブロック（AUX、OUTPUT FADE、INPUT ASSIGN 編集、オーディオ EQ/Comp、メモリー保存、MACRO、SEQUENCER、GPO、PTZ、USB MONITOR）は `docs/ANALYSIS-official-app.md` §6-2 に整理。v1 のスコープは変えない。
- **0B 領域（パネルスイッチ）の正式リスト**：Roland サポートは「一部ボタンはガイド未記載、全リストはサポートへ問い合わせ」としている。V-80HD 分はオーナーから Roland Backstage 経由で請求する（入手経緯を docs に記録）。
- App Review：審査員は実機を持たないため、審査メモに「起動画面の『デモモードで試す』で全機能を確認できる」と記載する（F11）。
- Bundle ID は `com.seventhwell.crospoint`（2026-10-16 確定。Apple 側の登録時の綴りに合わせた。"s" が 1 つなのは誤りではない）。
- **F14 一括設定の実機確認項目**：V-160HD ガイドの MONO は「(*3) Stereo audio only」。HDMI/SDI 入力はステレオなので対象【事実：ガイド脚注】だが、信号が無い／モノの入力で ERR:4 が返るかは【不明】（返ってもロールバックされ他の系統には影響しない）。V-160HD ガイドの USB OUTPUT ASSIGN はアドレスが `00 01 10` と記載されている（カタログもそのまま）。前後の行（`00 00 0F`・`00 00 11`）から `00 00 10` の誤植の可能性【推測】。実機で RQH して確定すること。
- **他機種（VR-120HD 等）対応**：追加する機種ごとに (1) 公式 Remote Control Guide PDF → `tools/guide` でカタログ生成（F13/F14 はそれだけで動く）(2) `core/profiles/` にプロファイル（PGM/PST・タリー・オーディオ・メモリーのアドレス、MIDI Model ID、capabilities）(3) モックサーバーの `--model` 追加。PDF は shell から roland.com を取得できないためオーナーが添付する。

## 15. マイルストーン（各完了条件＝テスト緑＋型チェック緑）
| M | 内容 | 完了条件 |
|---|---|---|
| M1 | プロジェクト雛形、テーマ、タブ、全画面の静的 UI（MockTransport でダミー値） | SVG と目視一致（スクショを docs/screens/ に保存） |
| M2 | codec / parser / queue / store / SyncEngine ＋単体テスト | §12-3 全緑 |
| M3 | LanTransport ＋ mock サーバー ＋結合テスト | §12-4 緑（V-160HD／`--model v80hd` の両方）、シミュレータでモック操作可 |
| M3.5 | **V-80HD 実機（LAN）確認** | §13 の V-80HD 項目を診断画面で実施し `docs/VERIFY.md` に記録、v80hd プロファイルの capabilities を確定 |
| M4 | crosspoint-midi（Swift）＋ MidiTransport（USB/BLE） | 実機 iPhone で端点列挙・BLE ピッカー表示・ループバック（任意の MIDI 機器）で SysEx 往復ログ確認 |
| M5 | 診断画面・操作ロック・スリープ防止・永続化・エラー文言 | §11 全受け入れ条件 |
| M6 | 実機 V-160HD 確認（§13）反映、TestFlight ビルド | §13 チェック済み、EAS/Xcode Archive 成功、デモモードで全画面を通しで操作できること |

## 16. ビルド・配布
- `app.config.ts`：`ios.deploymentTarget 17.0`、`ios.infoPlist` に `NSLocalNetworkUsageDescription`（「同じネットワーク上のビデオスイッチャーに接続するために使用します」）、`NSBluetoothAlwaysUsageDescription`。`UIBackgroundModes` は設定しない。
- 自分の iPhone：`npx expo prebuild` → Xcode で実機ビルド（Development Build）。
- 配布は「自分の iPhone（Development Build）」と「TestFlight」の両方を使う。
- TestFlight：`eas build -p ios --profile production` → `eas submit`（または Xcode Archive → App Store Connect）。
- ローカルネットワーク権限は初回 TCP 接続時に表示される。拒否時は `LOCAL_NETWORK_DENIED` として「設定 > プライバシー > ローカルネットワーク」への案内を表示。

## 17. 出典
- Roland V-160HD Remote Control Guide（SysEx・LAN/RS-232 コマンド・アドレスマップ）: https://shop.ccisolutions.com/StoreFront/jsp/pdf/RND-V-160HD_remoteControlGuide.pdf ／ 最新版 Version 1.12（Roland 公式サーバー）: https://static.roland.com/assets/media/pdf/V-160HD_Control_eng02_W.pdf
- Roland V-80HD Remote Control Guide Version 1.03（§9-4 の根拠）: https://static.roland.com/assets/media/pdf/V-80HD_Control_eng01_W.pdf
- Roland VR-120HD リモート・コントロール・ガイド 日本語版 04（MIDI インプリメンテーション Ver.2.00、2024-09-04。§9-4b の根拠。オーナー添付の `VR-120HD_Control_jpn04_W.pdf`、proav.roland.com の製品サポートページから入手可）
- Roland「LAN/RS-232 簡易制御コマンド」Ver.02（2025。V-160HD 3.5+ / V-80HD 1.3+ / VR-120HD 2.2+ / VR-6HD / V-1-4K。§3-8 の根拠。オーナー添付の `LAN_RS-232_Basic_Control_Commands_jpn02_W.pdf`）
- Roland Support「Professional A/V: LAN and RS-232 Control Tips and Documentation」（全リストはサポートへ）: https://support.roland.com/hc/en-us/articles/360025923832
- Roland V-160HD Remote Connection Guide（USB/Bluetooth/LAN 手順）: https://shop.ccisolutions.com/StoreFront/jsp/pdf/RND-V-160HD_remoteConnectionGuide.pdf
- Roland Support「V-160HD LAN and RS-232 Control Tips」（CUT、パスワード、LF 終端）: https://support.roland.com/hc/en-us/articles/7816887053083-V-160HD-LAN-and-RS-232-Control-Tips
- Roland Support「USB MONITOR の iPad 要件」: https://support.roland.com/hc/en-us/articles/22393239238299
- App Store「V-160HD Remote」: https://apps.apple.com/app/id1569120786
- Bitfocus Companion「companion-module-roland-v160hd」（MIT、commit 5e2197b / 2026-09-27。認証文字列・パーサ・送信キュー・0B スイッチ表・タリー購読・PGM 値）: https://github.com/bitfocus/companion-module-roland-v160hd
- Apple Human Interface Guidelines（Color / Tab bars / Buttons / Layout）: https://developer.apple.com/design/human-interface-guidelines/
- App Store Review Guidelines（4.1(c), 2.3.7）: https://developer.apple.com/app-store/review/guidelines/
- Expo Router Native Tabs: https://docs.expo.dev/router/advanced/native-tabs/
- （v1.0 にあった「Mac 版 RCS の解析」は使用許諾上の理由で出典から削除）
- 公式 iPad アプリ「V-160HD Remote」3.4.0 の平文リソース調査（UI 構成の参考のみ。通信仕様の根拠にはしない）: `docs/ANALYSIS-official-app.md`
