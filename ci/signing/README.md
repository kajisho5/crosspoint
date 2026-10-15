# ci/signing

`signing.yml` が作った iOS 署名用の鍵と証明書。

- `ios.key.enc` — RSA 秘密鍵（AES-256-CBC、PBKDF2。パスフレーズは GitHub Secret `SIGNING_KEY_PASSWORD`）。平文の鍵はどこにも保存していない
- `development.cer` / `distribution.cer` — App Store Connect API で発行した Apple Development / Apple Distribution 証明書（DER）
- `testflight.yml` が復号して一時キーチェーンに取り込み、Xcode の自動署名がこの証明書を使い回す（毎回の新規発行を防ぐ）

期限が切れたら、または漏えいが疑われるときは `signing.yml` を `rotate=true`（必要なら `revoke=ALL`）で実行して作り直す。
