# 公式 iPad アプリ「V-160HD Remote」3.4.0 の構成調査（2026-10-15）

> 位置づけ：**UI 構成の参考資料**。通信仕様の根拠には使わない（使えない。理由は §1）。SPEC §0 ルール8 の改訂（v1.2）の経緯も §4 に記す。
> 表記：**【事実】**＝パッケージ内の平文データから読み取れた内容／**【推測】**＝事実からの推論／**【不明】**＝判別不能。

## 1. 何が読めて、何が読めなかったか【事実】

| 対象 | 結果 |
|---|---|
| 実行バイナリ `V-160HD Remote`（Mach-O arm64） | **FairPlay 暗号化**（`LC_ENCRYPTION_INFO_64` cryptid=1、`__TEXT` セグメント全域 0x4000–0x16C000）。コード・C 文字列・ObjC クラス名・メソッド名は**読めない**。復号は行わない |
| `__LINKEDIT` のインポートシンボル | 読める（リンク先フレームワークと C 関数名のみ） |
| `Info.plist` | 読める |
| `*.nib`（68 個） | 読める（NIBArchive 内の文字列：ラベル・アウトレット名・アクション名） |
| `Localizable.strings`（en 88 / ja 1,715 / zh-Hans 1,759 件） | 読める |
| `Assets.car` | 読める（画像。参照しない：SPEC ルール7） |

→ **コマンド体系・アドレス・認証手順・パケット形式は一切取得できない**。それらは引き続き Roland 公開の Remote Control Guide と公開 OSS（SPEC §17）を根拠にする。

## 2. アプリ属性【事実】

| 項目 | 値 |
|---|---|
| Bundle ID | `jp.co.roland.V160HDRemote` |
| バージョン | 3.4.0（build 141）、Xcode 26.2 / iOS SDK 26.2 でビルド |
| 対応機種 | **iPad 専用**（`UIDeviceFamily = [2]`）、横向き固定、`UIRequiresFullScreen` |
| 最低 OS | iOS 12.1 |
| 権限文言 | `NSBluetoothAlwaysUsageDescription` = "MIDI connection via Bluetooth."／`NSCameraUsageDescription` = "monitor V-160HD USB OUT" |
| 暗号輸出 | `ITSAppUsesNonExemptEncryption = false` |

## 3. 接続経路の実装方式【事実：インポートシンボルと nib】

| 経路 | 読み取れた内容 | SPEC v1.1 との関係 |
|---|---|---|
| LAN | BSD ソケット（`socket/connect/getaddrinfo/send/recv/poll/setsockopt`）。Network.framework は未リンク。接続画面 `UiConnectDetailViewLAN`：「IP ADDRESS」「NETWORK PASSWORD」「CONNECT」。エラー文言「Check IP address and password.」「INCORRECT PASSWORD.」 | §3（TCP＋パスワード）と整合 |
| USB | CoreMIDI（`MIDIClientCreate / MIDIInputPortCreate / MIDIOutputPortCreate / MIDISendSysex / MIDISendEventList / MIDIEventListAdd`）。`kMIDIPropertyUniqueID / Manufacturer / Model / Name / DisplayName` を参照 | §4・§5（USB-MIDI SysEx、UniqueID で端点管理）と整合 |
| Bluetooth | CoreMIDI＋**CoreAudioKit `CABTMIDICentralViewController`**＋CoreBluetooth。接続画面 `UiConnectDetailViewBT` は 3 ステップ（STEP1 iPad の Bluetooth を有効化・まだペアリングしない／STEP2 「Bluetooth MIDI Device」ボタンからペアリング／STEP3 デバイス選択→CONNECT） | §6-2 の【推測】（標準 BLE-MIDI ピッカー）と一致。ただし本資料は根拠にしない（§4） |
| USB MONITOR | AVFoundation `AVCaptureDeviceTypeExternal`／`AVCaptureDeviceWasConnected/DisconnectedNotification`（外部 UVC カメラとして V-160HD の USB OUT を取り込む）。nib に「V-16HD not found.」（原文ママ）、USB 2.0 ケーブル警告文言 | v1 非対象。iPhone で外部 UVC カメラが使えるかは【不明】（Apple の公開要件は iPad のみ記載） |
| その他 | `_CCCrypt`（CommonCrypto）をインポート。用途は【不明】（保存パスワードの暗号化か通信かは判別できない） | — |

## 4. 使用許諾とプロジェクトルールの扱い（v1.2 改訂の経緯）

- v1.1 では「公式アプリ・RCS のバイナリ解析を行わない／根拠にしない」（旧ルール8）としていた。
- 2026-10-15、オーナーが公式 iPad アプリの IPA を提示し調査を指示。オーナー判断により **UI 構成（画面一覧・用語）の参考に限って使用可**とし、旧ルール8 を改訂した（SPEC v1.2 §0 ルール8）。
- 通信仕様は、そもそも暗号化で取得できないため従来どおり公開資料のみ。
- Roland のソフトウェア使用許諾にはリバースエンジニアリング等の禁止条項がある。本調査はパッケージ内の平文リソースの閲覧に留め、復号・逆アセンブル・逆コンパイルは行っていない。許諾上のリスク評価はオーナーの責任で行う。**IPA・抽出物はリポジトリに入れない**（本書の要約のみ）。

## 5. 画面構成（nib 名と主要ラベル）【事実】

nib 名の `Ui*` を機能別にまとめる。括弧内は nib 内の主なラベル。

### 5-1. ヘッダ・接続・共通
- `UiHeaderView`（VERSION）／`UiHeaderPresetView`（PRESET MEMORY, bank, SAVE, INIT）
- `UiConnectionSettings`（CONNECTION SETTINGS：LAN / USB / Bluetooth）／`UiConnectDetailViewLAN`／`UiConnectDetailViewBT`
- `UiVKbdFrameIpAdrs`（IP 4 オクテット入力）／`UiVKbdFrameTenkey`（テンキー）
- `SettingViewController`（SETUP MENU：メニュー＋詳細の 2 ペイン）
- `UiCustomColorEditor`（CUSTOM COLOR：RED/GREEN/BLUE＋TEMPLATE）

### 5-2. VIDEO SWITCHER
- `UiVideoView`（VIDEO：MIX/WIPE、TRANSITION TIME、TRANSITION SYNC、FREEZE、OUTPUT FADE、CAPTURE、REC、INPUT ASSIGN、EFFECTS/SETUP）
- `UiVideoViewPgm`（PGM 列＋CUT）／`UiVideoViewPst`（PST 列＋AUTO）／T バー（`viewTBar`）
- `UiVideoEfxMix`／`UiVideoEfxWipe`（トランジション種別詳細）
- `UiVideoViewPinP`／`UiVideoSelectPinP`／`UiVideoSetupPinP`（PinP&KEY 1–4：ソース選択・位置・サイズ・時間）
- `UiVideoViewDSK`／`UiVideoSelectDSK`／`UiVideoSetupDSK`（DSK 1–2）
- `UiVideoViewSplit`／`UiVideoSetupSplitVfx`（SPLIT／VFX）
- `UiVideoViewAux`／`UiVideoSetupAux`（AUX 1–3）
- `UiVideoViewAutoSw`／`UiVideoSetupAutoSw`（AUTO SWITCHING）
- `UiVideoSetupFreeze`／`UiVideoSetupOutFade`
- `UiVideoInputAssign`／`UiVideoInAsgnUnit`（INPUT 1–20 ↔ HDMI/SDI/STILL、OUTPUT ASSIGN：HDMI OUT 1–3 / SDI OUT 1–3 / USB OUT、LAYER ASSIGN、AUX LINKED PGM）
- `UiCaptureImgDialog`／`UiVideoCaptureInfo`（CAPTURE IMAGE：PGM/PVW/SUB → STILL 1–8）
- `UiStillImgOutView`（STILL IMAGE OUTPUT：NAME EDIT／DELETE）

### 5-3. AUDIO MIXER
- `UiAudioView`（AUDIO IN / HDMI IN / SDI IN / AUDIO OUT のグループ切替、LAYOUT、AUTO MIXING SETUP）
- `UiAudioSetupInput`（入力：ANALOG/DIGITAL GAIN、PHANTOM、STEREO LINK、MONO、PAN、HPF 80Hz、EQ、COMPRESSOR、NOISE GATE、DELAY、DE-ESSER、ECHO CANCELLER、VOICE CHANGER、ANTI-FEEDBACK、AMBIENT MIC、EFFECT PRESET：DEFAULT/MEETING/INTERVIEW/WINDY FIELD、EMBEDDED AUDIO CH、MAIN/REVERB/AUX SEND）
- `UiAudioSetupInputEq`／`UiAudioSetupInputComp`／`UiAudioSetupInputGate`（個別パネル）
- `UiAudioSetupMain`（MAIN：EQ、MULTIBAND COMPRESSOR、LIMITER、REVERB、OUTPUT DELAY、ADAPTIVE NOISE REDUCTION、LOUDNESS AUTO GAIN CONTROL（TARGET LKFS）、MOMENTARY GAIN CONTROL、TALKING DETECTOR、INTEGRATED GAIN CONTROL）
- `UiAudioSetupOutputEq`／`UiAudioSetupOutputMBComp`／`UiAudioSetupOutputCompLmt`
- `UiAudioSetupAux`／`UiAudioSetupAuxSend`（AUX 1–3：SEND LEVEL/POINT、AUX DELAY、AUX SEND VIDEO、EQ/GEQ、LIMITER）
- `UiAudioSetupUacOut`（USB OUT：EQ、USB OUT DELAY）

### 5-4. その他の機能ブロック
- `UiLoadPresetView`（PRESET MEMORY：バンク×番号、SAVE／INITIALIZE／NAME EDIT／THUMBNAIL／LAYOUT）
- `UiMacroView`／`UiMacroRecView`／`UiMacroFuncEditView`（MACRO：REC／EDIT／EXECUTE／COPY／MOVE／SWAP、FUNCTION／VALUE／TIMING、TEST）
- `UiSequencerView`（SEQUENCER：LIST／ADD NEW／ADD COPY／PREVIOUS／NEXT／JUMP／AUTO SEQUENCE／REPEAT、SCENE1/2、CURRENT・NEXT 表示）
- `UiGpoView`（GPO 1–16：ONE SHOT／ALTERNATE）
- `UiCamCtrlView`／`UiCamCtrlUnit`／`UiUvcCamCtrlFrame`（CAMERA CONTROL：CAMERA 1–16、1/4 CAMERA レイアウト、PROTOCOL、IP ADDRESS／PORT／LOGIN NAME／PASSWORD、TALLY CH、ZOOM／FOCUS／EXPOSURE／PAN TILT SPEED、CAMERA PRESET／STORE、ALL CAMERAS LOAD）
- `UiUvcMonitorView`（USB MONITOR：PGM／PVW／SUB PGM／AUX 1–3／DSK／PinP／16 INPUT-VIEW／16 STILL-VIEW／MULTI-VIEW、PANEL OPERATION、CAMERA ID、ZOOM）

### 5-5. 文字列テーブルについて【推測】
`Localizable.strings` には V-160HD に無い項目（配信開始/停止、テザリング、AUDIO PLAYER／VIDEO PLAYER、MIXER IP ADDRESS／Yamaha MIXER CONTROL 等）も含まれる。Roland の複数機種アプリで共通の文字列テーブルを流用していると推測する。V-160HD の機能一覧としては nib（§5-1〜5-4）を正とする。

## 6. SW CROSSPOINT への反映

### 6-1. v1（現行 SPEC）に影響するもの
- なし（通信仕様は変わらない。BLE ピッカーの方式は【推測】のまま、M4 の実機確認で確定する）。

### 6-2. v2 以降の候補（公式アプリの機能ブロックから。優先度はオーナー判断）
| 候補 | 根拠となる公開資料の有無 | 備考 |
|---|---|---|
| AUX 1–3 のバス選択 | Remote Control Guide に AUX 領域あり | S1 に AUX 行を追加する形で実装可能 |
| OUTPUT FADE／FREEZE | Guide にパラメータあり | S1 のボタン追加 |
| INPUT ASSIGN 編集 | Guide に `000000–` 領域あり | 現在は読取り表示のみ |
| PinP 位置・サイズ編集 | Guide に PinP 領域あり | S2 の詳細シート |
| オーディオ EQ／Comp／Gate | Guide に AUDIO INPUT 領域あり | S3 の詳細シート。項目数が多いので iPhone では段階的開示 |
| メモリーの保存／初期化 | Guide の `0A0001 / 0A0002` | S4 に長押しメニュー |
| MACRO／SEQUENCER | Guide の記載範囲を要確認【不明】 | 公開資料で確認できる範囲のみ |
| GPO | Guide を要確認【不明】 | |
| CAMERA CONTROL（PTZ） | 本体経由の制御アドレスは要確認【不明】 | |
| USB MONITOR（UVC） | iPhone で外部 UVC が使えるか【不明】 | Apple 公開要件は iPad のみ |

## 7. 調査手順（再現用）
1. IPA を zip として展開（`unzip`）。`Payload/V-160HD Remote.app/` を確認。
2. `Info.plist` を plist として読む。
3. 実行バイナリのロードコマンドから `LC_ENCRYPTION_INFO_64` の `cryptid` を確認（1 = 暗号化）。
4. `strings` でインポートシンボル（`_MIDI*`, `_socket` 等）とリンク先フレームワークのパスを抽出。
5. `*.nib` から可読文字列を抽出し nib 名ごとに整理。
6. `*.lproj/Localizable.strings` を plist として読む。
（復号・逆アセンブル・実行は行わない）
