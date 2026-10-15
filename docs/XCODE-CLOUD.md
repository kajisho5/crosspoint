# Xcode Cloud で TestFlight まで自動化する（設定手順）

記録日 2026-10-15。署名・ビルド番号・TestFlight 配布を Apple 側（Xcode Cloud）に任せる構成。GitHub Actions（`.github/workflows/ci.yml`）はテストと「コンパイルが通るか」の確認用として残す。

## リポジトリ側（済）
| 項目 | 内容 |
|---|---|
| `ios/` をコミット | Xcode Cloud はワークフロー作成時にリポジトリ内の Xcode プロジェクトを検出するため。`ios/Pods` `ios/build` `.xcode.env.local` は除外 |
| `SWCROSSPOINT.xcworkspace`（リポジトリ直下） | `ios/SWCROSSPOINT.xcodeproj` と `ios/Pods/Pods.xcodeproj` を参照するだけのファイル。`expo prebuild` が `ios/` を作り直しても消えない位置に置く |
| `ci_scripts/ci_post_clone.sh`（リポジトリ直下） | Node 22 取得 → `npm ci` → `ios/.xcode.env.local` に NODE_BINARY → `pod install`。ワークスペースと同じ階層に置く必要がある（Apple の規約） |
| `expo-doctor` | `ios/` をコミットすると「app.config のフィールドが同期されない」警告が出る（非 CNG 扱い）。同期は下の CI 差分検出で担保するので `appConfigFieldsNotSyncedCheck` を無効化した |
| CI の差分検出 | GitHub CI が `expo prebuild` を実行し、コミット済み `ios/` と食い違えば失敗する。`app.config.ts`・ネイティブ依存を変えたら `npx expo prebuild --platform ios --clean --no-install` を再実行してコミット |

## App Store Connect 側（オーナーが 1 回だけ行う）

### URL
| 用途 | URL |
|---|---|
| App Store Connect（アプリ一覧・新規登録） | https://appstoreconnect.apple.com/apps |
| Bundle ID（Identifiers）の登録・確認 | https://developer.apple.com/account/resources/identifiers/list |
| Xcode Cloud（ワークフロー編集・ビルド確認。最初の作成は Xcode から） | https://appstoreconnect.apple.com/apps → 対象アプリ → Xcode Cloud |
| TestFlight（テスター・グループ） | https://appstoreconnect.apple.com/apps → 対象アプリ → TestFlight |
| 接続する GitHub リポジトリ | https://github.com/kajisho5/crosspoint |
| Xcode Cloud の利用枠・料金（Developer Program に月 25 時間付帯） | https://developer.apple.com/xcode-cloud/ |
| Apple 公式：最初のワークフローの作り方 | https://developer.apple.com/documentation/xcode/configuring-your-first-xcode-cloud-workflow |

### 手順（最初のワークフローは Xcode で作る。Apple 公式：App Store Connect の Web で作れるのは 2 本目以降）

**0. Mac の準備（1 回）**
```bash
brew install node@22 cocoapods      # 未導入なら
git clone https://github.com/kajisho5/crosspoint && cd crosspoint
npm ci
(cd ios && pod install)
open SWCROSSPOINT.xcworkspace        # リポジトリ直下のワークスペースを開く
```
Xcode → Settings → Accounts に Apple Developer Program の Apple ID が入っていること。

**1. Xcode で最初のワークフローを作る**
1. Xcode 左のナビゲータ最後尾「Report navigator」（⌘9）→ 上の **雲アイコン（Cloud）** タブ → **Get Started**
2. Select a Product：**SWCROSSPOINT** → Next（複数チームに入っている場合はチーム選択）
3. Review Workflow：既定のまま Next（後で直す）
4. Grant Access to Your Source Code：**Grant Access** → ブラウザで GitHub にログイン → Apple の GitHub App を `kajisho5/crosspoint` に許可 → Xcode に戻って Next
5. App Store Connect にアプリ記録が無ければ、ここで作成シートが出る：名前（仮でよい）、Bundle ID `com.seventhwell.crospoint`、SKU 任意 → 作成（Bundle ID の登録も同時に行われる）
6. Complete → **Start Build**（ブランチ main）。初回は `ci_scripts/ci_post_clone.sh` が Node 取得・`npm ci`・`pod install` を実行する

**2. TestFlight 配布を足す（App Store Connect の Web でよい）**
https://appstoreconnect.apple.com/apps → 対象アプリ → **Xcode Cloud** タブ → Manage Workflows → Default
- Start Conditions：Branch Changes = `main`
- Actions：Archive – iOS → Deployment Preparation = **TestFlight (Internal Testing Only)**
- Post-Actions：**TestFlight Internal Testing** → グループを選択（先に TestFlight タブ → Internal Testing → `+` でグループを作り自分の Apple ID を追加）
- 保存。以後 main への push ごとに TestFlight へ届く

**3. 署名**：Xcode Cloud が自動管理。証明書・プロファイルの作業は不要

## ビルド番号・バージョン
- `CFBundleVersion`（ビルド番号）は Xcode Cloud が `CI_BUILD_NUMBER` で自動採番する【推測：Apple の既定動作。初回ビルドの TestFlight 表示で確認】
- `CFBundleShortVersionString` は `app.config.ts` の `version`（現在 0.1.0）。上げるときは `app.config.ts` を変更 → prebuild → コミット
- `ITSAppUsesNonExemptEncryption = false` を設定済みなので、TestFlight の輸出コンプライアンス質問は出ない

## 既知の注意
- Xcode Cloud のビルド機は Apple Silicon。`ci_post_clone.sh` は darwin-arm64 の Node を取得する
- `expo-dev-client` は Debug 構成のみに入る。Archive（Release）には含まれない
- ビルド時間は 1 本あたり 20〜30 分見込み（無料枠 25 時間/月 ≒ 50〜70 本）。超える場合は Start Conditions をタグ（`v*`）起動に変える
- ローカル（Mac）で `npx expo run:ios` するときも同じ `ios/` を使う。`pod install` は手元で実行する
