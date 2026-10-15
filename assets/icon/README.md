# アプリアイコン

Apple HIG「App icons」（2026-06-08 改訂）と Xcode「Configuring your app icon using an asset catalog」に従う。

- コンセプト：3×3 のクロスポイント。点灯した行（バス）と列（ソース）が交わる 1 点＝選択中のクロスポイントを PGM タリー赤（systemRed `#FF3B30`）で示す。
- `icon-light.svg/.png`：1024×1024、不透明、角丸なし（マスクは OS が掛ける）。背景は `#1C1C22 → #050505`（SEVENTHWELL ブランド黒）。
- `icon-dark.svg/.png`：前景のみ・背景透過（Apple：「dark は透過背景で用意し、システムの背景を透かす」）。
- `icon-tinted.svg/.png`：グレースケール・背景透過（システムが輝度でティントする）。
- `layer-foreground.svg` / `layer-buttons.svg`：Icon Composer（Xcode 26 同梱）用のレイヤー素材。Mac で `.icon` を作る場合は背景色を Icon Composer 側で指定し、buttons レイヤーは不透明度 ≈15%、foreground は Liquid Glass を有効にする。`.icon` ができたら `app.config.ts` の `ios.icon` をそのパスに差し替える（Expo SDK 54+ 対応）。
- 文字・ロゴ・Roland の素材・ハイライト/影は入れない（HIG：効果はシステムが付ける）。

PNG 再生成：
```
python3 -c "import cairosvg;[cairosvg.svg2png(url=f'assets/icon/icon-{n}.svg',write_to=f'assets/icon/icon-{n}.png',output_width=1024,output_height=1024) for n in ('light','dark','tinted')]"
python3 -c "from PIL import Image;Image.open('assets/icon/icon-light.png').convert('RGB').save('assets/icon/icon-light.png')"
npx expo prebuild --platform ios --no-install
```
