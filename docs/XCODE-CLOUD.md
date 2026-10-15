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
| Xcode Cloud（アプリ登録後、アプリページの「Xcode Cloud」タブ） | https://appstoreconnect.apple.com/apps → 対象アプリ → Xcode Cloud |
| TestFlight（テスター・グループ） | https://appstoreconnect.apple.com/apps → 対象アプリ → TestFlight |
| 接続する GitHub リポジトリ | https://github.com/kajisho5/crosspoint |
| Xcode Cloud の利用枠・料金（Developer Program に月 25 時間付帯） | https://developer.apple.com/xcode-cloud/ |

### 手順
1. **Bundle ID 登録**：Identifiers → `+` → App IDs → App → Description 任意、Bundle ID = Explicit `com.seventhwell.crosspoint`。Capabilities は無しでよい
2. **アプリ登録**：App Store Connect → Apps → `+` → 新規 App → プラットフォーム iOS、名前（仮でよい。後で変更可）、プライマリ言語 日本語、Bundle ID = 上記、SKU 任意（例 `crosspoint`）
3. **Xcode Cloud 開始**：アプリページ → Xcode Cloud タブ → Get Started
   - ソース管理：GitHub を選び、GitHub 側で App Store Connect の連携を承認（Apple の GitHub App をインストール）→ `kajisho5/crosspoint` を選択
   - Product：**SWCROSSPOINT**（リポジトリ直下の `SWCROSSPOINT.xcworkspace` が検出される）
   - 最初のワークフロー（Default）はそのまま作成してよい。作成後に下記へ編集
4. **ワークフロー編集**（Xcode Cloud タブ → Manage Workflows → Default）
   - General：Xcode Version = Latest Release、macOS Version = Latest
   - Environment：Clean = 任意（最初はオン）
   - Start Conditions：Branch Changes → `main`（Files and Folders は「Any」）
   - Actions：**Archive – iOS**、Deployment Preparation = **TestFlight (Internal Testing Only)**
     - 外部テスターにも配るなら TestFlight and App Store にする（審査あり）
   - Post-Actions：**TestFlight Internal Testing** → グループを選択（先に TestFlight タブで Internal グループを 1 つ作り、自分の Apple ID を追加）
5. **署名**：Xcode Cloud が自動管理（証明書・プロファイルの登録作業は不要）
6. **実行**：main に push するか、Xcode Cloud タブの Start Build。初回は `ci_post_clone.sh` で Node 取得と `npm ci`・`pod install` が走る

## ビルド番号・バージョン
- `CFBundleVersion`（ビルド番号）は Xcode Cloud が `CI_BUILD_NUMBER` で自動採番する【推測：Apple の既定動作。初回ビルドの TestFlight 表示で確認】
- `CFBundleShortVersionString` は `app.config.ts` の `version`（現在 0.1.0）。上げるときは `app.config.ts` を変更 → prebuild → コミット
- `ITSAppUsesNonExemptEncryption = false` を設定済みなので、TestFlight の輸出コンプライアンス質問は出ない

## 既知の注意
- Xcode Cloud のビルド機は Apple Silicon。`ci_post_clone.sh` は darwin-arm64 の Node を取得する
- `expo-dev-client` は Debug 構成のみに入る。Archive（Release）には含まれない
- ビルド時間は 1 本あたり 20〜30 分見込み（無料枠 25 時間/月 ≒ 50〜70 本）。超える場合は Start Conditions をタグ（`v*`）起動に変える
- ローカル（Mac）で `npx expo run:ios` するときも同じ `ios/` を使う。`pod install` は手元で実行する
