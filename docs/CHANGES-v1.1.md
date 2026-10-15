# SPEC v1.0 → v1.1 変更点（2026-10-15）

行単位の差分は `docs/CHANGES-v1.1.diff`（SPEC.md / DESIGN.md / CLAUDE.md の unified diff）。

## 1. V-80HD を v1 対象に追加（LAN 先行）

理由：オーナーの手元ですぐ触れる実機は V-80HD で、V-160HD は後日。実機確認を待たずに LAN の挙動を詰めるため。

| 変更 | SPEC |
|---|---|
| ゴールに V-80HD を追加。機種は VER／SysEx モデル ID で自動判定 | §1 |
| 認証文字列を機種名固定にしない（`Welcome to (.+?)\.?`）。PW 長をプロファイル値に（V-160HD 4／V-80HD 8） | §3-2, §3-4 |
| パーサテストに V-80HD 形式（`\x02ACK;`、分割された `Welcome to V-80HD.`）を追加 | §3-4 |
| V-80HD ではタリー購読（0C0100）を送らず、ポーリングで動かす | §3-5 |
| SysEx ヘッダを機種の modelId で可変長に（V-80HD は `01 05 14` の 3 バイト） | §4-1, §4-3, §4-4 |
| V-80HD テストベクタ 7 件（Guide 記載例 1 件＋同式算出 6 件） | §4-2 |
| **V-80HD アドレス表**（公式 Remote Control Guide v1.03 から） | §9-4 |
| 機種ごとの機能有無表。V-80HD の CUT/AUTO は 0B 領域が未公開のため確認まで非表示、USB/BLE も確認まで無効 | §9-5 |
| モックサーバーに `--model v80hd` | §12-1 |
| 実機確認チェックリストに V-80HD 項目、マイルストーン M3.5「V-80HD 実機（LAN）確認」 | §13, §15 |
| Info.plist の文言を機種名を含まない表現に | §7-2, §16 |

## 2. バイナリ解析に由来する根拠を削除

理由：Roland のソフトウェア使用許諾はリバースエンジニアリング・逆コンパイル・逆アセンブルを禁じている。販売・公開を前提にするとリスクになる。

| 変更 | 場所 |
|---|---|
| 実装ルール 8「公式アプリ・RCS のバイナリ解析をしない／根拠に使わない」 | SPEC §0 |
| USB 端点名 `Roland V-160HD MIDI`（RCS 由来）を削除 → 端点名は【不明】、部分一致＋ユーザー選択 | SPEC §5-2 |
| 出典から「Mac 版 RCS の解析」を削除し、公式 Guide（V-160HD v1.12 / V-80HD / VR-120HD）・HIG・審査ガイドライン・Expo を追加 | SPEC §17 |
| 使用許諾・0B 正式リストの入手方針・審査メモを未決事項に追記 | SPEC §14 |
| DESIGN.md §0-1（dmg 内部の文字列・シンボル名の表）を削除。G1/G4 の根拠を公式仕様／Companion に置換 | DESIGN.md §0 |

**影響なし**：認証手順・0B スイッチ表・タリー購読・PGM 値の食い違いなど、実装に必要な事実は Companion（MIT）・Roland サポート記事・公式 Guide で裏付けが取れている。RCS 由来で失われたのは USB 端点名の推測だけで、これは実機で確認する。

**オーナー側の作業**：解析物（dmg・抽出文字列・メモ・`v160hd_rcs_m340.zip`）をリポジトリに入れない。公開リポジトリにするなら過去コミットにも残っていないことを確認する。

## 3. HIG（iOS 26 / Liquid Glass）対応

| 変更 | 理由 | SPEC |
|---|---|---|
| 色は `PlatformColor` の semantic system color。hex はボードの参考値扱い | HIG Color「システムカラーの値をハードコードしない」。現行 HIG のダーク値は red `#FF4245`・blue `#0091FF` 等で、ボードの `#FF3B30`・`#0A84FF` と既にずれている | §11 |
| タブは expo-router Native Tabs（システムの UITabBar）。iOS 17–18 は固定タブバー、iOS 26 以降は自動で Liquid Glass | HIG Tab bars。自前タブバーだと iOS 26 で浮く | §8-1, §11 |
| PGM/PST・ON AIR を色だけで示さない | HIG Color「色だけに頼らない」 | §11 |
| 使えない機能はボタンを置かず、タブは隠さず理由を表示 | HIG Tab bars「タブを隠さない・無効にしない」 | §9-5 |

デザインボード（`docs/design/sw-crosspoint-board.svg`）のレイアウト・寸法は変更なし。配色とタブバーの最終的な見た目は OS が決める。

## 4. 販売準備

| 変更 | SPEC |
|---|---|
| F11 デモモード（利用者向け。MockTransport をリリースビルドに含める）。App Review の審査員は実機を持たないため必須 | §1, §11, §12-2, §14 |
| アプリ名・キーワードの商標ルールを審査ガイドライン 4.1(c) / 2.3.7 で明記 | §14 |
| 配布は自分の iPhone（Development Build）＋ TestFlight の両方 | §16 |

## 5. バージョン再確認

`npm view`（2026-10-15）：`expo` latest 57.0.29（58 系は `next` で未安定）、`react-native` 0.87.1、`expo-router` 57.0.27 → **SDK 57 のまま**。Native Tabs の import は SDK 57 では `expo-router/unstable-native-tabs`。

## 6. 検算

SPEC §4-2 の V-160HD テストベクタ 11 件と §7-2 の UMP 分割ベクタを独立に再計算し、全件一致。§2-1 の符号付き値の例（−420→`7C 5C`、−800→`7F 79 60`、−60→`7F 7F 44`）も一致。

## 7. 確認済みで変更しなかった点

- §6-1 の Bluetooth 設定「SYSTEM → Bluetooth → REC CONTROL を ON」：公式 Remote Connection Guide の原文どおり（誤記ではない）。
- §9-3 の PGM 値の食い違い：V-160HD Guide 最新版（v1.12）でも `00–0AH = INPUT 1–10` のまま。SPEC の `logical20` 既定＋両対応デコードを維持。
