# SW CROSSPOINT — V-160HD / V-80HD iPhone リモート 詳細設計書 v0.2

> 対象: Roland V-160HD（FW 3.x）と V-80HD を iPhone から操作するネイティブアプリ。V-80HD は v1 で LAN 先行対応（SPEC §9-4）。VR-120HD は将来プロファイル追加で対応。
> v0.2（2026-10-15）：Mac 版 RCS のバイナリ解析に由来する記述を全削除し、根拠を公開資料・公開 OSS に置換（Roland のソフトウェア使用許諾がリバースエンジニアリング等を禁じているため）。
> 本書は Step 1（設計）。Step 2 は `docs/design/*.svg`。
> **⚠ 通信仕様・アドレス・受け入れ条件は `docs/SPEC.md` が正。本書と矛盾する箇所は SPEC.md を優先（G4/G5/AUTO/PGM 値は SPEC で更新済み）。**

---

## 0. 根拠の整理

> v0.1 の「0-1 解析結果（RCS の dmg 内部の文字列・シンボル名）」は v0.2 で削除した。以下の事実・推測はすべて公式資料・Roland サポート記事・公開 OSS（Bitfocus Companion, MIT）・実機観測のいずれかに基づく。

### 0-2. 事実（一次情報で裏付け済み）
| # | 事実 | 出典 |
|---|---|---|
| F1 | LAN制御は **TCP 8023 / Telnet**、本体で設定する **4桁 NETWORK PASSWORD** が必要 | Remote Control Guide p.20-21 |
| F2 | コマンド形式 `stx CMD:p1,p2;`。LAN では **stx(02H) 省略可**、終端 `;`、改行は **LF**、チェックサム不要、応答 **ack(06H)** | Remote Control Guide / Roland Support「LAN and RS-232 Control Tips」 |
| F3 | `DTH:aaaaaa,vv..;`（書込）/ `RQH:aaaaaa,ssssss;`（読出 → `DTH:aaaaaa,vv;` で返る）/ `VER;` → `VER:V-160HD,x.xx;` / `ERR:n;`（0=構文,4=無効,5=範囲外,6=stx無し） | Remote Control Guide |
| F4 | MIDI SysEx: `F0 41 10 00 00 00 00 02 {11=RQ1|12=DT1} addr(3) data/size checksum F7`、パケット間 **20ms 以上** | Remote Control Guide |
| F5 | Bluetooth は **Bluetooth MIDI**。本体 `MENU→SYSTEM→Bluetooth` で設定 → アプリ内の「Bluetooth MIDI Device」一覧からペアリング（iOS設定画面からは繋がない） | Remote Connection Guide（iPad版） |
| F6 | USB は本体 **USB STREAM 端子**（Type-C）に接続 | Remote Connection Guide |
| F7 | 公式 iPad アプリ「V-160HD Remote」は **iPad専用**。USB映像モニターは M1以降・iPadOS 17以降・USB-C が条件 | App Store / Roland Support |
| F8 | CUT は `DTH:0B001E,01;`（押下）→ `DTH:0B001E,00;`（離す）の**モーメンタリ**。0B エリアはガイド未掲載（Roland Backstage 経由で入手） | Roland Support「LAN and RS-232 Control Tips」 |

### 0-3. 推測（実機で要確認）
| # | 推測 | 根拠 |
|---|---|---|
| G1 | USB 接続時は **USB-MIDI クラスコンプライアント**で SysEx(DT1/RQ1) を流している（端点名は不明） | 公式仕様「USB STREAM：PC・iPad からのリモート用」＋ Remote Control Guide の制御が MIDI SysEx |
| G2 | iPhone（USB-C 機、Lightning 機は Camera Adapter 経由）からも CoreMIDI で同ポートが見える | iOS はクラスコンプライアント USB-MIDI を標準サポート |
| G3 | Bluetooth は BLE-MIDI で、iOS 標準の `CABTMIDICentralViewController` でペアリングできる | 公式手順の画面文言が iOS 標準 BLE-MIDI UI と一致 |
| G4 | LAN 接続のパスワード手順は「接続 → `Enter password:` 受信 → `{pw}\n` 送信 → `Welcome to V-160HD.` 受信」→ **SPEC §3-2 で事実扱い** | Bitfocus Companion `companion-module-roland-v160hd` の実装とテスト（MIT） |
| G5 | ~~自発送信されない~~ → **LAN では自発 DTH 通知あり・タリー購読 `0C0100=01` あり**（Companion 実働実装で確認。SPEC §3-5） | — |

### 0-4. 不明
- ~~0B エリアのボタンアドレス~~ → **判明**（AUTO=0B001F ほか。SPEC §9-2）
- `PGM Select` 値 `0AH`（11個目）の意味（ガイドは「INPUT 1–10」と記載し値域は 00–0A）
- LABEL の文字コード（00–7F の1byte×8。ASCII と推測）
- iPhone で USB 映像モニター（UVC 受信）が可能か → **v1 では対象外**
- ~~V-80HD / VR-120HD のアドレスマップ~~ → **判明**（公式 Remote Control Guide。V-80HD は SPEC §9-4、VR-120HD は modelId `00 00 00 00 25`・PGM `001B00`）
- V-80HD の認証文字列・自発通知・タリー購読・0B 領域（SPEC §13 で実機確認）

---

## 1. 要件定義

### 1-1. 目的
現場で V-160HD の主要操作を iPhone 片手で行う。iPad 公式アプリの代替ではなく「**ポケットに入るサブ卓**」。

### 1-2. 機能（v1 スコープ）
| ID | 機能 | 実装方式 |
|---|---|---|
| R1 | 接続：LAN/Wi-Fi・USB・Bluetooth の3経路、保存済みデバイス、自動再接続 | §2 Transport |
| R2 | クロスポイント：PGM / PST 選択（INPUT 1–20、バンク切替）、ラベル表示、タリー | `00 21 00/01`、`02 xx 00–07`、`0C 00 00–0F` |
| R3 | CUT / AUTO | CUT=`0B001E`、AUTO=`0B001F` のモーメンタリ（SPEC §9-2） |
| R4 | Tバー（AB Fader 0–2047） | `00 21 02–03`（7bit×2） |
| R5 | トランジション：MIX/WIPE 種別・時間 | `00 18 00–05`、`00 17 00` |
| R6 | KEY：PinP&KEY 1–4 / DSK 1–2 / SPLIT 1–2 の PGM・PVW ON/OFF | `00 1B–20 00/01`、`00 19/1A 00` |
| R7 | オーディオ：主要入力のレベル・ミュート、マスター | `01 xx 03–06`、`01 21 00–03` |
| R8 | プリセットメモリー 1–30 呼出し（現在番号表示） | `0A 00 00` / `0A 00 03` |
| R9 | 操作ロック（誤操作防止のスライド解除）、ハプティクス | アプリ内 |
| R10 | 診断：送受信ログ、任意 DTH/RQH 送信、**アドレス確認**（自分の実機への送受信で 0B エリア等を確認） | 開発・現場切り分け用。設定で表示切替 |
| R11 | デモモード（利用者向け。App Review・練習用） | SPEC F11 |

### 1-3. 非対象（v1）
映像モニター、マクロ編集、シーケンサー編集、PTZ カメラ制御、全設定画面、RS-232（iPhone に端子なし）。

### 1-4. 非機能
- 操作→送信レイテンシ < 30ms（LAN）、表示同期周期 150ms（LAN）/ 300ms（BLE）
- HIG 準拠（Dynamic Type 対応、最小タップ 44pt、VoiceOver ラベル、Dark 既定・Light 対応）
- 縦持ち主、横持ち（クロスポイント2段＋Tバー）対応
- オフライン（インターネット不要）。解析・トラッキング SDK なし
- iOS 17 以上（推奨）

---

## 2. 通信アーキテクチャ

```
UI (React)
  │ dispatch(intent)            ▲ subscribe(state)
  ▼                             │
DeviceController ──► ParamStore (zustand, address→value)
  │  ├ CommandQueue（優先度・デバウンス・20ms間隔）
  │  ├ SyncEngine（RQH ポーリング / 応答反映 / 楽観更新のロールバック）
  │  └ DeviceProfile（V-160HD.ts：アドレス表・値域・エンコード）
  ▼
Codec ─┬─ TextCodec   : "DTH:002100,02;\n" ⇄ parse "DTH:...;" / ACK(06H) / "ERR:n;"
       └─ SysExCodec  : F0 41 10 00 00 00 00 02 12 addr data sum F7 ⇄ parse
  ▼
Transport (interface)
  ├ LanTransport : react-native-tcp-socket → host:8023、パスワード握手
  ├ UsbMidiTransport : ネイティブ CoreMIDI（USB エンドポイント）
  └ BleMidiTransport : ネイティブ CoreMIDI（BLE エンドポイント）＋ CABTMIDICentralViewController
```

### 2-1. Transport インターフェース
```ts
interface Transport {
  kind: 'lan' | 'usb' | 'ble';
  connect(target: ConnectTarget): Promise<void>;
  disconnect(): Promise<void>;
  write(bytes: Uint8Array): Promise<void>;
  onData(cb: (bytes: Uint8Array) => void): Unsubscribe;
  onState(cb: (s: LinkState) => void): Unsubscribe;
}
```

### 2-2. LAN 接続シーケンス
1. TCP connect `ip:8023`（タイムアウト 3s）
2. 受信バッファに `Enter password:` → `${pw}\n` 送信（G4。届かない場合は即 `VER;` へ進むフォールバック）
3. `Welcome to V-160HD` 待ち（3s）→ 失敗時 `AUTH_FAILED`（「IPアドレスとパスワードを確認」）
4. `VER;` → `VER:V-160HD,x.xx;` を検証（機種不一致→`WRONG_DEVICE`、FW < 3.00→警告）
5. 初期同期：ラベル・PGM/PST・トランジション・KEY・タリー・メモリー番号を一括 RQH
6. ポーリング開始。無通信 5s で `VER;` キープアライブ、失敗で再接続（指数バックオフ 1→2→4→8s 上限）

### 2-3. USB / BLE（CoreMIDI）
- ネイティブモジュール `CrosspointMidi`（Swift / Expo Modules API）
  - `listEndpoints()`：`{id, name, transport:'usb'|'ble'|'network', online}`（`kMIDIPropertyDriverOwner` 等で判別）
  - `presentBluetoothPicker()`：`CABTMIDICentralViewController` をモーダル表示
  - `open(id)` / `close()` / `send(bytes)` / イベント `onSysEx`（SysEx 分割受信の再結合をネイティブ側で実施）
- 端点名 `Roland V-160HD` を含むものを候補上位に並べる（G1/G3）
- SysEx 送信は 20ms 間隔を CommandQueue で保証（F4）

### 2-4. CommandQueue 規則
| 種別 | 例 | 規則 |
|---|---|---|
| 即時 | CUT/クロスポイント/KEY ON/OFF | 優先度高、即送信 |
| 連続値 | Tバー・フェーダー | 同アドレス最新値のみ保持、LAN 33ms / BLE 50ms 間隔で間引き |
| モーメンタリ | CUT（0B001E） | `01` 送信 → 指を離した時 `00`。**切断時・アプリ非アクティブ時は必ず `00` を送る**（押しっぱなし防止） |
| 読出し | ポーリング RQH | 書込み待ちがある間は後回し |

### 2-5. 同期と整合
- 送信時は楽観更新（UI即反映）→ 次ポーリング値で確定。`ERR:4/5` 受信時は直前値へロールバック＋トースト
- 他の操作者（本体パネル/他アプリ）による変更もポーリングで反映
- ポーリング対象は「表示中の画面に必要なアドレスのみ」（画面ごとに `useParams([...])` で購読登録）

### 2-6. 値エンコード
- 7bit 分割：2byte `hi*128+lo`、3byte `a*16384+b*128+c`
- 符号付き（Level / Gain）：14bit / 21bit の2の補数、単位 0.1dB。`7E 00 00` = −INF（Level）
- ラベル：8byte ASCII、末尾スペース除去

---

## 3. 画面構成

| # | 画面 | 主要要素 |
|---|---|---|
| S0 | 接続（シート） | 経路セグメント（LAN/USB/Bluetooth）、保存済みデバイス、IP・パスワード入力、接続ボタン、状態 |
| S1 | スイッチャー（タブ1） | ステータスバー（経路・FW・遅延）、PGM 行・PST 行（5×2）、Tバー（縦）、CUT/AUTO、トランジション種別・時間 |
| S2 | キー（タブ2） | PinP&KEY 1–4、DSK 1–2、SPLIT 1–2 の PGM/PVW トグル、各トランジション時間 |
| S3 | オーディオ（タブ3） | 入力チャンネルストリップ（横スクロール）、マスター、ミュート |
| S4 | メモリー（タブ4） | 1–30 のグリッド、現在番号ハイライト、長押しで呼出し確定（誤爆防止） |
| S5 | その他（タブ5） | 接続管理、操作ロック、ハプティクス、ポーリング周期、診断（ログ/コンソール/アドレス探索）、About・法的表記 |

ナビゲーション：expo-router の Tabs（`(tabs)/switcher|keys|audio|memory|more`）＋ `connect` を modal。
未接続時は各タブ上部に「未接続」バナー、操作要素は disabled。

---

## 4. コンポーネント分割

```
app/
  _layout.tsx                 … Provider（DeviceController, Theme）
  connect.tsx                 … S0
  (tabs)/_layout.tsx          … TabBar
  (tabs)/switcher.tsx         … S1
  (tabs)/keys.tsx             … S2
  (tabs)/audio.tsx            … S3
  (tabs)/memory.tsx           … S4
  (tabs)/more/…               … S5（index, diagnostics, console, explorer, about）
components/
  status/ConnectionPill       … 経路アイコン＋状態色＋RTT
  status/OfflineBanner
  switcher/CrosspointRow      … props: bus('pgm'|'pst'), selected, tally[], labels[], onSelect
  switcher/CrosspointButton   … 44pt 以上、タリー枠、ラベル2行
  switcher/TBar               … Gesture Handler + Reanimated、0–2047、端でハプティクス
  switcher/TransitionButtons  … CUT（モーメンタリ）/ AUTO（進捗リング）
  switcher/TransitionPicker   … MIX/WIPE、時間ステッパー
  keys/KeyToggleCard          … PGM/PVW 2トグル＋時間
  audio/ChannelStrip          … 縦フェーダー、メーターなし(v1)、MUTE、dB表示
  memory/MemoryGrid / MemoryCell（長押し確定）
  diagnostics/LogList / CommandConsole / AddressExplorer
  ui/Segmented, Stepper, SheetHeader, Toast, HoldToConfirm, LockSlider
```

---

## 5. 状態管理（zustand）

| Store | 主な state | 備考 |
|---|---|---|
| `connectionStore` | `link: 'idle'|'connecting'|'auth'|'syncing'|'online'|'reconnecting'|'error'`, `transport`, `device {model, fw}`, `rttMs`, `error?` | |
| `paramStore` | `values: Record<Addr, number[]>`, `pending: Record<Addr, {value, ts}>` | アドレス単位。セレクタで派生 |
| `devicesStore` | `saved: SavedDevice[]`, `lastUsedId` | 永続化（expo-secure-store：パスワード、AsyncStorage：その他） |
| `settingsStore` | `haptics`, `lockEnabled`, `pollMs`, `showDiagnostics`, `autoMode: 'native'|'emulated'` | 永続化 |
| `logStore` | リングバッファ 500件 `{dir:'tx'|'rx', raw, ts}` | 診断用、メモリのみ |

派生（selectors）：`usePgm()`, `usePst()`, `useTally(i)`, `useLabels()`, `useFader()`, `useKey(n)`, `useMemory()`。

---

## 6. データ構造

```ts
type Addr = `${string}`; // "002100" 6桁HEX

interface ParamDef {
  id: string;                 // 'panel.pgm'
  addr: Addr;
  size: 1 | 2 | 3 | 8;
  kind: 'enum' | 'range' | 'bool' | 'momentary' | 'trigger' | 'text' | 'readonly';
  encode: 'u7' | 'u14' | 's14' | 's21' | 'ascii8';
  min?: number; max?: number; unit?: 'dB' | 's' | '%';
  scale?: number;             // 0.1 など
  options?: string[];         // enum 表示名
}

interface DeviceProfile {
  model: 'V-160HD' | 'V-80HD' | 'VR-120HD';
  verPrefix: string;          // 'VER:V-160HD,'
  sysexHeader: number[];      // [0x41,0x10,0x00,0x00,0x00,0x00,0x02]
  inputs: number;             // 10
  params: Record<string, ParamDef>;
  pollGroups: Record<'switcher'|'keys'|'audio'|'memory', Addr[][]>; // 連続領域を1RQHでまとめる
}

interface SavedDevice {
  id: string; name: string;          // ユーザー命名（例：DEMO-SW-A）
  transport: 'lan'|'usb'|'ble';
  host?: string; port?: number;      // 既定 8023
  midiEndpointName?: string;
  passwordRef?: string;              // SecureStore キー
}
```

V-160HD プロファイル抜粋（ガイド準拠）：
| id | addr | size | 値域 |
|---|---|---|---|
| panel.pgm / panel.pst | 002100 / 002101 | 1 | 00–0A |
| panel.fader | 002102 | 2 | 0–2047 |
| trans.type / trans.mixType / trans.wipeType | 001800 / 001801 / 001802 | 1 | MIX,WIPE / MIX,FAM,NAM / 8種 |
| trans.time | 001700 | 1 | 00–28（0.0–4.0s） |
| key.pinp{n}.pgm/pvw | 001B00+(n-1)·0100 / +01 | 1 | OFF/ON |
| key.dsk{n}.pgm/pvw | 001F00 / 002000 (+01) | 1 | OFF/ON |
| split{n}.sw | 001900 / 001A00 | 1 | OFF/ON |
| tally.hdmi{n} / sdi{n} | 0C0000–07 / 0C0008–0F | 1 | OFF,PGM,PST |
| input.assign{n} | 000000–09 | 1 | 00–1F（HDMI1–8,SDI1–8,STILL1–16） |
| label.* | 02xx00–07（xx=10–33） | 8 | ASCII |
| mem.load / mem.current | 0A0000 / 0A0003 | 1 | 00–1D / 7F=Last |
| btn.cut | 0B001E | 1 | momentary |
| audio.in{n}.level / mute | 01xx03 / 01xx06 | 3 / 1 | −80.0〜+10.0dB, −INF |
| audio.master.level / mute | 012100 / 012103 | 3 / 1 | 同上 |

タリー表示ロジック：クロスポイント n のタリー = `input.assign{n}` が指す物理入力の `tally.*`（STILL は PGM/PST 選択状態から算出）。

---

## 7. ディレクトリ構成

```
sw-crosspoint/
├─ app/                         # expo-router 画面（§4）
├─ components/                  # UI（§4）
├─ core/
│  ├─ transport/  Transport.ts LanTransport.ts MidiTransport.ts
│  ├─ codec/      TextCodec.ts SysExCodec.ts value.ts（7bit/符号/ASCII）
│  ├─ controller/ DeviceController.ts CommandQueue.ts SyncEngine.ts
│  └─ profiles/   v160hd.ts index.ts（v80hd.ts / vr120hd.ts は後日）
├─ stores/        connection.ts param.ts devices.ts settings.ts log.ts
├─ modules/crosspoint-midi/     # Expo Module（Swift）
│  ├─ ios/CrosspointMidiModule.swift  ios/BluetoothPicker.swift
│  ├─ src/index.ts              # JS API 型定義
│  └─ expo-module.config.json
├─ theme/        tokens.ts（色・余白・角丸）tailwind.config.js（NativeWind）
├─ tools/mock-v160hd/server.ts  # Node 製モック（TCP 8023・パスワード・DTH/RQH・状態保持）
├─ __tests__/    codec.test.ts value.test.ts queue.test.ts sync.test.ts
├─ docs/         DESIGN.md design/*.svg
├─ app.config.ts eas.json package.json tsconfig.json
```

技術スタック（npm 最新版を 2026-10-15 に確認）：Expo SDK 57 / React Native 0.87 / TypeScript / expo-router / NativeWind 4（Tailwind）/ zustand 5 / react-native-reanimated 4 / react-native-gesture-handler 3 / react-native-tcp-socket 6 / expo-haptics / expo-secure-store。
※ CoreMIDI と BLE-MIDI ピッカーを使うため **Expo Go 不可、Development Build（Xcode / EAS）必須**。

---

## 8. デザイン方針（Step 2 SVG の前提）
- システムフォント（SF Pro / 日本語はヒラギノ）、Dynamic Type。数値は SF Mono 相当の等幅
- 色：Dark 既定。背景 #000、グループ面 #1C1C1E、区切り #38383A（iOS system colors 準拠）
- 意味色：PGM=#FF3B30（タリー赤）、PST=#30D158（タリー緑）、アクセント=#0A84FF、警告=#FF9F0A
- タップ領域 ≥ 44pt、クロスポイントは 64×64pt。CUT/AUTO は親指圏（画面下部）
- SEVENTHWELL ブランドはアプリアイコン・About・スプラッシュのみ（HIG 優先）

---

## 9. エッジケース
| ケース | 対応 |
|---|---|
| パスワード誤り / 応答なし | 3s タイムアウト → 該当エラー文言、パスワード欄にフォーカス |
| 他クライアント接続中で拒否（`Port busy` 相当） | 「他の機器が接続中の可能性」表示（同時接続数は不明→実機確認） |
| Wi-Fi 切替・バックグラウンド遷移 | `AppState` で非アクティブ時にモーメンタリ解除送信→切断、復帰時再接続 |
| ローカルネットワーク権限拒否 | 設定アプリへの誘導（`NSLocalNetworkUsageDescription` 必須） |
| BLE 切断 | CoreMIDI の端点 offline 通知で再接続待機表示 |
| `ERR:5`（範囲外） | プロファイル値域のバグとして診断ログに残しロールバック |
| FW 差異 | `VER` で取得、プロファイルに `minFw` を持ち未対応機能を非表示 |
| AUTO（ネイティブ不明） | 既定は「エミュレート」：Tバーを遷移時間で 0→2047 駆動し完了時 PGM/PST 入替を本体に任せる。0B アドレス判明後に `native` へ切替 |
| 二重タップ | クロスポイントは同値送信を抑止、メモリーは長押し確定 |

---

## 10. テスト計画
1. **単体**：Codec（ガイド記載例 `F0 41 10 00 00 00 00 02 12 00 21 00 01 5E F7` を期待値に）、7bit/符号変換、Queue 間引き
2. **モック結合**：`tools/mock-v160hd` に対し接続〜操作〜切断・再接続・ERR 応答を自動テスト
3. **実機（V-160HD 入手後）**：§11 チェックリスト
4. **TestFlight**：内部テスター配布

## 11. 実機確認チェックリスト（推測・不明の解消）
- [ ] G4 パスワード握手の正確なバイト列（改行 CR/LF、プロンプト有無）
- [ ] G5 本体操作時に自発 DTH が来るか（来るならポーリング周期を延ばす）
- [ ] LAN 同時接続数（公式アプリ・Companion と併用可否）
- [ ] G1/G2 iPhone で USB-MIDI 端点名と SysEx 往復
- [ ] G3 BLE-MIDI ペアリングと SysEx 往復、実効レイテンシ
- [ ] `PGM Select` 0AH の意味、ラベル文字コード
- [ ] V-80HD の 0B エリア（CUT/AUTO 等）：Roland Backstage へ全リストを請求（推奨）＋リハーサル時に診断画面で確認（SPEC §13）

## 12. 配布・権限
- `NSLocalNetworkUsageDescription`、`NSBluetoothAlwaysUsageDescription`
- 自分の iPhone：Xcode で Development Build。TestFlight：EAS Build → App Store Connect
- 名称は自社名義「SW CROSSPOINT」。「Roland」「V-160HD」は**対応機種の説明文に限定**し、ロゴ・公式 UI 素材は使わない（公式アプリ・RCS の素材は一切流用しない）。販売時の商標表記は要確認（推測：互換表記は可能だが要法務確認）

## 13. 出典
- Roland V-160HD Remote Control Guide: https://shop.ccisolutions.com/StoreFront/jsp/pdf/RND-V-160HD_remoteControlGuide.pdf
- Roland V-160HD Remote Connection Guide: https://shop.ccisolutions.com/StoreFront/jsp/pdf/RND-V-160HD_remoteConnectionGuide.pdf
- Roland Support「V-160HD LAN and RS-232 Control Tips」: https://support.roland.com/hc/en-us/articles/7816887053083-V-160HD-LAN-and-RS-232-Control-Tips
- Roland Support「Requirements of iPad to use the USB MONITOR function」: https://support.roland.com/hc/en-us/articles/22393239238299
- App Store「V-160HD Remote」: https://apps.apple.com/app/id1569120786
- 公式マニュアル配布ページ: https://proav.roland.com/global/support/by_product/v-160hd/owners_manuals/
- Roland V-80HD Remote Control Guide v1.03: https://static.roland.com/assets/media/pdf/V-80HD_Control_eng01_W.pdf
- Bitfocus Companion「companion-module-roland-v160hd」（MIT）: https://github.com/bitfocus/companion-module-roland-v160hd
