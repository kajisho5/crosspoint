# CLAUDE.md — SW CROSSPOINT

Roland V-160HD / V-80HD / VR-120HD を iPhone から LAN / USB / Bluetooth で操作する React Native（Expo）アプリ。仕様は SPEC v1.2（v1.1 の変更点は `docs/CHANGES-v1.1.md`）。進捗メモ：`docs/M1.md` `docs/M2-M3.md` `docs/M4.md`。

## 最初に読むもの（この順）
1. `docs/SPEC.md` — 実装仕様（唯一の正。通信・アドレス・受け入れ条件・マイルストーン）
2. `docs/design/sw-crosspoint-board.svg`（PNG 同梱）— 画面デザイン。完全準拠
3. `docs/DESIGN.md` — 設計の背景（SPEC と矛盾したら SPEC 優先）
4. `.claude/skills/apple-hig/SKILL.md` — Apple HIG の要約（プロジェクトスキル。UI の設計・実装・レビューはこの指針と数値に従う。`docs/HIG-ja.md` は案内のみ）

## 厳守
- Expo（Development Build）＋ TypeScript strict ＋ NativeWind。WebView/素の HTML で作らない
- CoreMIDI / Bluetooth MIDI は `modules/crosspoint-midi`（Expo Modules API / Swift）
- 省略コード禁止（`// ...` を残さない）。指示外の仕様変更禁止
- サンプル/テスト/モックに実在の社名・人名・会場名を使わない（`DEMO-SW-A` 等）
- Roland ロゴ・公式アプリ/RCS の画像素材は使わない
- 通信仕様の根拠は公開資料・公開 OSS・実機観測のみ。公式アプリ・RCS の復号・逆アセンブル・逆コンパイル・通信傍受はしない。公式 iPad アプリの画面構成は `docs/ANALYSIS-official-app.md` の範囲で UI の参考にしてよい（SPEC §0 ルール8、v1.2）
- 色は `PlatformColor` の semantic system color、タブは expo-router Native Tabs（SPEC §11）。hex 直書き・自前タブバー禁止
- 機種差は `core/profiles/` の capabilities で出し分け。使えない機能はボタンを置かない（SPEC §9-5）
- SPEC の【推測】【不明】は実機で確かめられるよう、診断画面とログを必ず残す
- マイルストーン（SPEC §15）ごとに `npm test` / `npx tsc --noEmit` / `npx expo-doctor` を通してからコミット
- 実機 V-160HD が無い間は `npm run mock`（TCP 8023 モック）と MockTransport で開発。V-80HD 形式は `npm run mock -- --model v80hd`、VR-120HD は `--model vr120hd`
- 機種追加の手順：公式 Remote Control Guide PDF → `python3 tools/guide/parse_guide.py <pdf> tools/guide/<id>.raw.json` → `python3 tools/guide/normalize.py tools/guide/<id>.raw.json <Model> core/params/<id>.params.json` → `core/profiles/<id>.ts`（アドレス・Model ID・capabilities）→ `core/profiles/index.ts` / `core/params/index.ts` / `ModelId` / デモ・モック・About に登録。PDF 自体はコミットしない（raw.json は可）
- CUT/AUTO・マクロ・シーケンサーは `lib/features.ts` の経路判定（SysEx アドレス or LAN 簡易制御コマンド）を通す。新しい機能も「機種×接続」で出し分ける
- 実機確認は V-80HD（LAN）が先（M3.5）。結果は `docs/VERIFY.md` に記録してプロファイルへ反映

## コマンド
- `npm run ios` — 実機/シミュレータ（Development Build。`npx expo prebuild` 後）
- `npm run mock` — V-160HD モックサーバー（`-- --model v80hd --port 8023 --password 0000 --jitter --split`）
- `npm test` / `npm run typecheck` / `npm run doctor`
- Linux/CI では Swift（`modules/crosspoint-midi/ios`）はコンパイルできない。Mac での確認手順は `docs/M4.md`
