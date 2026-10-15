# TestFlight 配布を GitHub Actions で自動化する（Mac 不要）

記録日 2026-10-15。`.github/workflows/testflight.yml` ＋ `fastlane/Fastfile`。署名用の証明書・プロファイルは **fastlane match** が GitHub の macOS ランナー上で発行し、非公開リポジトリに暗号化保存して使い回す。手元に Mac も Xcode も不要で、準備はすべてブラウザで済む。

Xcode Cloud（`docs/XCODE-CLOUD.md`）は初回ワークフロー作成に Xcode が必要なため、Mac が無い間はこちらを使う。

## 流れ
1. `fastlane match appstore`：配布証明書（Apple Distribution）と App Store 用プロビジョニングプロファイルを取得。無ければ作って `crosspoint-certs` リポに保存
2. ビルド番号 = TestFlight の最新 + 1
3. `gym`：Release アーカイブ → .ipa
4. `pilot`：App Store Connect へアップロード（内部テスターに配布）

起動条件：`v*` タグの push、または Actions 画面の「Run workflow」。

## 準備（ブラウザのみ・1 回）

### A. Apple 側
| # | 何を | どこで | 控えるもの |
|---|---|---|---|
| A1 | Team ID を確認 | https://developer.apple.com/account → Membership details | `APPLE_TEAM_ID`（10 桁英数） |
| A2 | Bundle ID 登録 | https://developer.apple.com/account/resources/identifiers/list → `+` → App IDs → App → Explicit `com.seventhwell.crosspoint` | — |
| A3 | アプリ記録を作成 | https://appstoreconnect.apple.com/apps → `+` → 新規 App（iOS、名前は仮、Bundle ID = A2、SKU 任意） | — |
| A4 | App Store Connect API キーを発行 | https://appstoreconnect.apple.com/access/integrations/api → **Team Keys** → `+` → 名前任意、アクセス **Admin**（証明書の発行に必要） → `.p8` をダウンロード（1 回しか落とせない） | `ASC_KEY_ID`（Key ID）、`ASC_ISSUER_ID`（ページ上部の Issuer ID）、`ASC_KEY_P8`（.p8 をテキストで開いた中身。`-----BEGIN PRIVATE KEY-----` から `-----END PRIVATE KEY-----` まで） |
| A5 | TestFlight 内部グループ | App Store Connect → アプリ → TestFlight → Internal Testing → `+` → グループ名任意、自分の Apple ID を追加。「自動配信」をオン | — |

### B. GitHub 側
| # | 何を | どこで | 控えるもの |
|---|---|---|---|
| B1 | 証明書保管用の**非公開**リポジトリを作る | https://github.com/new → 名前 `crosspoint-certs`、Private、README 無しで空のまま作成 | — |
| B2 | そのリポに書き込めるトークン | https://github.com/settings/personal-access-tokens/new → Fine-grained、Repository access = Only select repositories → `crosspoint-certs`、Permissions → Contents: **Read and write**、期限は長め | トークン文字列 |
| B3 | `MATCH_GIT_URL` を組み立てる | `https://kajisho5:<B2のトークン>@github.com/kajisho5/crosspoint-certs.git` | `MATCH_GIT_URL` |
| B4 | 暗号化パスフレーズ | 任意の長い文字列を決める（忘れたら証明書を作り直すだけで済む） | `MATCH_PASSWORD` |
| B5 | Secrets を登録 | https://github.com/kajisho5/crosspoint/settings/secrets/actions → New repository secret を 6 つ | 下表 |

### C. 登録する Secrets（名前は厳密に）
| Secret | 値 |
|---|---|
| `ASC_KEY_ID` | A4 の Key ID |
| `ASC_ISSUER_ID` | A4 の Issuer ID |
| `ASC_KEY_P8` | A4 の .p8 の中身（複数行そのまま貼る） |
| `APPLE_TEAM_ID` | A1 |
| `MATCH_GIT_URL` | B3 |
| `MATCH_PASSWORD` | B4 |

## 実行
- https://github.com/kajisho5/crosspoint/actions/workflows/testflight.yml → **Run workflow**（main）
- またはタグ：`git tag v0.1.0 && git push origin v0.1.0`
- 所要 25〜35 分。終わると TestFlight アプリ（iPhone）に通知が来る。初回は App Store Connect 側の処理に数分かかる

## うまくいかないとき
| 症状 | 原因と対処 |
|---|---|
| Secrets check で失敗 | 6 つの名前のどれかが違う／未登録 |
| match で `Couldn't find bundle identifier` | A2 の Bundle ID 未登録 |
| match で 401 / 403 | API キーの権限不足（Admin にする）。Developer Program の契約更新・未同意の規約があると失敗する → https://developer.apple.com/account の警告を確認 |
| match で git 認証エラー | B2 のトークンに Contents: Read and write が無い、または `MATCH_GIT_URL` の綴り |
| `latest_testflight_build_number` で失敗 | A3 のアプリ記録が無い、Bundle ID 不一致 |
| アップロード後 TestFlight に出ない | 処理待ち（数分〜）。輸出コンプライアンスは `ITSAppUsesNonExemptEncryption=false` 設定済みなので質問は出ない |
| 証明書上限（Apple Distribution は 1 チーム 3 枚まで） | 過去に作った証明書が残っていれば https://developer.apple.com/account/resources/certificates/list で古いものを失効 |

## 証明書を作り直すとき
`crosspoint-certs` リポを空にして再実行（match が新規発行）。失効は Apple の証明書ページから。

## 注意
- `MATCH_GIT_URL` にはトークンが含まれる。Secrets 以外（Issue・ログ・チャット）に貼らない
- `crosspoint-certs` は必ず Private。中身はパスフレーズで暗号化されているが公開しない
- Xcode Cloud に切り替える場合はこのワークフローを無効化すればよい（並行運用すると証明書が二重になる）
