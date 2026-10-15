# TestFlight 配布を GitHub Actions で自動化する（Mac 不要）

記録日 2026-10-15。`.github/workflows/testflight.yml` ＋ `.github/scripts/asc_upload.py`。**kajisho5/OSEE_Control_Software（cutline）と同じ方式**で、Secrets の名前も同じ。cutline で登録済みの値をそのまま使える（Team ID と API キーは Apple アカウント単位なので共通）。

- 署名：`xcodebuild -allowProvisioningUpdates` ＋ App Store Connect API キーの自動署名。配布証明書・プロファイルは Apple 側で自動発行・管理され、リポジトリにもランナーにも残らない
- 送信：App Store Connect API の Build Uploads（`asc_upload.py`）。`xcodebuild` 自身のアップロードは鍵を拒否した実績があるため使わない
- 証明書ファイルはどこにも置かない。GitHub Secrets だけ

Xcode Cloud（`docs/XCODE-CLOUD.md`）は初回ワークフロー作成に Xcode（Mac）が必要なので、Mac が無い間はこちら。

## 準備（ブラウザのみ・1 回）
| # | 何を | どこで |
|---|---|---|
| 1 | Team ID を確認 | https://developer.apple.com/account → Membership details（10 桁英数） |
| 2 | Bundle ID 登録 `com.seventhwell.crospoint` | https://developer.apple.com/account/resources/identifiers/list → `+` → App IDs → App → Explicit |
| 3 | アプリ記録を作成 | https://appstoreconnect.apple.com/apps → `+` → 新規 App（iOS、名前は仮、Bundle ID = 2、SKU 任意） |
| 4 | App Store Connect API キー（cutline のものがあれば流用可） | https://appstoreconnect.apple.com/access/integrations/api → Team Keys → `+` → アクセス **Admin** → `.p8` をダウンロード（1 回しか落とせない） |
| 5 | TestFlight 内部グループ | App Store Connect → アプリ → TestFlight → Internal Testing → `+` → 自分の Apple ID を追加、自動配信オン |
| 6 | Secrets を登録 | https://github.com/kajisho5/crosspoint/settings/secrets/actions → New repository secret × 4 |

## Secrets（cutline と同名）
| 名前 | 値 |
|---|---|
| `APPLE_TEAM_ID` | 1 のチーム ID |
| `APPSTORE_ISSUER_ID` | 4 の Issuer ID |
| `APPSTORE_KEY_ID` | 4 の Key ID |
| `APPSTORE_P8` | 4 の .p8 の中身。`-----BEGIN PRIVATE KEY-----` から `-----END PRIVATE KEY-----` まで全部 |
| `SIGNING_KEY_PASSWORD` | （任意）署名用秘密鍵の暗号化パスフレーズ。無ければ `APPSTORE_P8` の SHA-256 を使う（p8 を持つ者は証明書を発行できるので信頼境界は同じ） |

## 証明書（1 度だけ。3 回目の TestFlight で `maximum number of certificates` が出た対策）
GitHub の macOS ランナーは毎回まっさらなので、自動署名が実行のたびに新しい Apple Development / Distribution 証明書を発行し、Apple の上限に当たる。`signing.yml` で鍵と証明書を 1 組作り、秘密鍵を暗号化して `ci/signing/` にコミットしておくと、`testflight.yml` がそれを一時キーチェーンに取り込み、以後は使い回す。

1. （任意）Secrets に `SIGNING_KEY_PASSWORD` を追加。無くても動く（`APPSTORE_P8` から導出）
2. https://github.com/kajisho5/crosspoint/actions/workflows/signing.yml → **Run workflow**（`gh workflow run signing.yml -f revoke=ALL` でも可）。`revoke` に **`ALL`** と入れる（この Apple ID には Mac が無く、証明書は CI が作ったものだけなので、全部失効して問題ない。cutline の CI も次回に作り直すだけ）
3. 成功すると bot が `ci/signing/{ios.key.enc, development.cer, distribution.cer}` をコミットする。以後は TestFlight を普通に実行
4. 証明書は 1 年で期限切れ → `signing.yml` を `rotate=true` で再実行

平文の秘密鍵はランナーの一時領域にしか置かず、リポジトリと Secrets には暗号化したものしか残らない。

## 実行
- https://github.com/kajisho5/crosspoint/actions/workflows/testflight.yml → **Run workflow**（main）
- またはタグ：`git tag v0.1.0 && git push origin v0.1.0`
- ビルド番号 = GitHub Actions の実行回数（`github.run_number`）。Archive 前に `ios/SWCROSSPOINT/Info.plist` の `CFBundleVersion` を直接書き換える（Expo prebuild が "1" を直書きするため `CURRENT_PROJECT_VERSION` では効かない）。バージョンは `app.config.ts` の `version`
- 所要 25〜35 分。TestFlight タブに出るまで処理に数分〜

## 流れ
1. Check secrets → 4 つの有無
2. Check App Store Connect API access → 鍵の形式、`/v1/apps` でアプリ記録の有無、`/v1/users` で Admin かどうか（ここで落ちたら Apple 側の設定ミス）
3. Xcode 26 を選択（iOS 26 SDK 必須、エラー 90725 対策）
4. `npm ci` → `pod install` → `xcodebuild archive`（自動署名）→ `-exportArchive`（.ipa）
5. `asc_upload.py` で Build Uploads API へ送信し、処理完了（COMPLETE）まで待つ

## うまくいかないとき
| 症状 | 原因と対処 |
|---|---|
| Check secrets で失敗 | 名前違い／未登録 |
| `GET /v1/apps -> HTTP 401` | Key ID / Issuer ID / .p8 の組合せ違い、または鍵が失効 |
| `No App Store Connect app with bundle ID` | 3 のアプリ記録が無い、Bundle ID 不一致 |
| `/v1/users -> HTTP 403` | 鍵が Admin でない。署名の自動発行には Admin が要る |
| archive で署名エラー（`No profiles for …` 等） | 2 の Bundle ID 未登録、Developer Program の規約未同意（https://developer.apple.com/account の警告を確認） |
| `Choose a certificate to revoke. Your account has reached the maximum number of certificates` | ランナーが毎回証明書を作って上限に到達。上の「証明書」の手順（`signing.yml` を `revoke=ALL` で実行）。手動なら https://developer.apple.com/account/resources/certificates/list で失効 |
| 復号に失敗（`bad decrypt`） | `ci/signing` を作ったときと `APPSTORE_P8`（または `SIGNING_KEY_PASSWORD`）が変わった。`signing.yml` を `rotate=true` で作り直す |
| エラー 90725 | Xcode 26 が選ばれていない（ランナーイメージ変更時） |
| アップロード後 TestFlight に出ない | 処理待ち。`ITSAppUsesNonExemptEncryption=false` 設定済みなので輸出コンプライアンスの質問は出ない |
