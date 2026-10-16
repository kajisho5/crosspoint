# store/ — App Store 製品ページの素材

- `metadata/<locale>.json`：名前（30 字）・サブタイトル（30 字）・キーワード（100 字、カンマ区切り。他社商標は入れない：SPEC §14）・プロモーションテキスト（170 字）・説明（4000 字）・What's New・URL。`ja` が primary locale
- `screenshots/<locale>/<DISPLAY_TYPE>/01.png …`：ファイル名順に並ぶ。フォルダがある組だけ置き換える
  - `APP_IPHONE_67`：6.7"/6.9"（1290×2796 または 1320×2868）— 現行の必須サイズ
  - `APP_IPHONE_65`：6.5"（1242×2688）— 任意
  - `APP_IPAD_PRO_3GEN_129`：iPad 12.9"（2048×2732）— `supportsTablet` なので任意で
  - 撮り方：TestFlight のアプリで「デモモードで試す」→ 各画面でスクリーンショット（実在の会場名・社名が入らないデモ値のまま）
- 反映：Actions → `store-metadata` を version `0.1.0` で Run（`.github/scripts/asc_metadata.py`）
- API で設定できないもの（App Store Connect で手動）：App Privacy（「データを収集しない」を選ぶ）、価格と配信地域、審査に添付するビルドの選択
- 公開 URL：プライバシーポリシー `docs/store/privacy.md`、サポート `docs/store/support.md`（GitHub 上のページをそのまま指定。独自ドメインに移すときは json の URL を変えて再実行）
