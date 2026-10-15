---
name: apple-hig
description: iPhone/iPad アプリの UI を設計・実装・レビューするとき（画面構成、コンポーネント選定、色・タイポグラフィ・レイアウト・アイコン・文言・アクセシビリティ、App Store 審査前チェック）に、Apple Human Interface Guidelines の指針と数値で判断する。React Native/Expo・SwiftUI・UIKit どれでも適用。
---

# Apple Human Interface Guidelines（HIG）準拠スキル

Apple の HIG（https://developer.apple.com/design/human-interface-guidelines 、日本語 https://developer.apple.com/jp/design/human-interface-guidelines 、2026-10 取得の公開版）を、iOS/iPadOS 向けに日本語の設計ルールへ要約したもの。各節末尾の出典 URL が一次情報。ここに無い細部・最新版は出典（URL 末尾に `.md` を付けると Markdown 全文が取れる）を WebFetch して確認し、推測で補わない。

## 使い方
1. **設計前**：画面の目的と主要タスクを決め、「標準コンポーネントで作れるか」を先に検討する（タブバー / ツールバー / リスト / シート / アラート / アクションシート / ピッカー / トグル）。カスタム UI は標準で表現できない場合だけ。
2. **実装中**：下の「必須チェックリスト」の数値を守る。色は semantic system color、文字は Dynamic Type 対応のテキストスタイル、アイコンは SF Symbols、ハプティクスはシステムパターン。
3. **レビュー時**：チェックリスト → 該当コンポーネント節 → Patterns 節の順で照合し、違反は「HIG のどの指針か」と出典 URL を添えて指摘する。
4. **判断に迷うとき**：Design principles（Purpose / Agency / Responsibility / Familiarity / Flexibility / Simplicity / Craft / Delight）に戻る。装飾のための装飾・モーション・ブランド表示は削る側に倒す。

## 必須チェックリスト（iOS / iPadOS の数値）
- タップ領域：既定 **44×44pt**、最小 28×28pt。ベゼル付き要素は周囲約 12pt、ベゼル無しは可視端から約 24pt の余白
- 文字：既定 **17pt**、最小 **11pt**。Dynamic Type で **200%** まで拡大しても崩れない。Ultralight/Thin/Light を避ける
- コントラスト：17pt 以下 **4.5:1**、18pt 以上 / Bold **3:1**（カスタム前景/背景は 7:1 を目標）。色だけで情報を伝えない
- 色：システム色・セマンティック色（`label` `secondaryLabel` `separator` `systemBackground` 等）を API で参照。**RGB/hex のハードコード禁止**、意味の再定義禁止。ライト/ダーク/コントラスト増の全てで確認
- Dark Mode：アプリ独自の外観設定を作らない。両外観でテスト
- レイアウト：safe area とシステムマージンを尊重。サイズクラスで決め、デバイス種別や向きで決めない。文字拡大時は横並び→縦積み
- タブバー：ナビゲーション専用、タブは最小限、移動中も表示、無効化・非表示にしない、ラベルは 1 語、SF Symbols（塗り）
- ツールバー：主要アクションは 1 つ（後縁、`.prominent`）、グループは最大 3、Back/Close はシステム標準
- アラート：控えめに。タイトルは状況を簡潔に（2 行以内）、ボタンは 1〜2 語の動詞（Yes/No 禁止、Cancel は「Cancel」、既定ボタンに OK を使わない）、最大 3 ボタン、破壊的は destructive 赤
- アクションシート：意図的なアクションの選択肢に。破壊的を最上部、Cancel を最下部
- シート：一度に 1 つ。Done には Cancel/Back を併置。デテントは large / medium、閉じる手段を常に明示
- モーダル：明確な利点があるときだけ。別のモーダルを出す前に閉じる
- アイコン：SF Symbols を優先、カスタムは PDF/SVG、Apple ハードウェアの複製禁止、文字入りは最小限
- アプリアイコン：1024×1024、角丸なし・不透明（dark は透過背景、tinted はグレースケール）、文字は必須時のみ、レイヤー（Icon Composer）推奨
- 起動画面：最初の画面と同一、テキスト・広告・ロゴなし
- 許可要求：必要になった時点で、目的文字列は能動態の一文で理由を明示
- 文言：能動態、ボタンは動詞、「we」を使わない、エラーは責めずに直し方を示す、空状態には次の手順
- ハプティクス：システムパターンを文書化された意味で、使いすぎない、無くても使える
- モーション：目的のあるものだけ、キャンセル可能、「視差効果を減らす」に応答

## 判断の原則（違反しやすい点）
- 標準部品の挙動・位置・ジェスチャを再定義しない（戻るスワイプ、3 本指取り消し、シェイク、下スワイプで閉じる）
- 使えない機能はボタンを置かない（disabled で並べない）。ただしタブは隠さず理由を説明する
- ブランド色は主要アクションと状態表示に限定し、コンテンツに譲る。起動画面やロゴ散りばめはしない
- Liquid Glass はシステム部品に任せ、コンテンツ層に使わない。コントロール下に不透明背景を敷かず scroll edge effect で区切る
- 段階的開示：まれな設定は設定画面へ、タスク固有の選択肢はその画面内で

---

## Foundations（基礎）

### Design principles（デザイン原則）
- **Purpose：意味のあるものを作る。** 誰にとって何が最重要かを決め、そこを最高にする。既存解を調べて再発明を避け、差別化点をデザインに反映する。
- **Agency：人が自分のやり方でできるようにする。** 邪魔をせず、タスクや内容へ直行させる。特定のフローやモードに閉じ込めない。ガイド付きフローが必要ならスキップ/離脱を容易にする。取り消し・復帰を簡単にし、ミスからの回復に時間や作業を失わせない。
- **Responsibility：人の最善の利益のために動く。** 何をなぜするかを最初から透明に。許可を求めるときは理由を明示し、収集データと用途を明らかにする。必要なデータだけ集め、悪用・意図せぬ結果を想定して防ぐ。
- **Familiarity：人が知っていることの上に築く。** 現実世界と他ソフトの概念を使う。ある要素の挙動・見た目を決めたら全体で一貫させる。コントロールの可用性、内容の変化を明確にフィードバックし、アラートや選択肢はシステムパターンで出す。
- **Flexibility：多様な文脈とニーズに適応する。** 最初からアクセシビリティを優先。プラットフォーム/構成が変わっても内容とコントロールの位置を予測可能に保ち、自然なアニメーションで遷移。音声・タッチ・キーボードなど多様な入力に対応。対応する各プラットフォームに同じ水準の配慮を。
- **Simplicity：明快で直接的に。** シンプル＝ミニマリズムではない。必要なものだけ含め、言葉は正確に選ぶ。認識しやすいコントロールと一貫した構造で階層を確立する。
- **Craft：細部すべてに気を配る。** 視覚・アニメーション・文言・音の品質が姿勢を示す。早くプロトタイプし、捨てる勇気を持ち、実環境でテスト。出荷はゴールでなく、最新のプラットフォーム機能とパターンに追随し続ける。
- **Delight：人間らしく。** 喚起したい感情を定め、ボタン押下からエラーメッセージまで各瞬間に性格を与える。**喜びと装飾を混同しない**：核心のタスクを妨げてまで「楽しさ」を追わない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/design-principles

### Designing for iOS（iOS 向け設計）
- 前提：中型高解像度ディスプレイ／片手または両手で持ち縦横を切り替える／視距離は 1〜2 フィート程度／Multi-Touch・仮想キーボード・音声／1〜2 分の短時間利用と 1 時間超の長時間利用が混在し、複数アプリを頻繁に切り替える。
- 画面上のコントロール数を絞り、主要タスクと内容に集中させる。二次的な詳細・操作は最小限の操作で発見可能にする。
- 端末の向き・Dark Mode・Dynamic Type など外観変化にシームレスに適応し、ユーザーが選んだ構成を尊重する。
- 持ち方に合う操作を支援する。画面の中央〜下部のコントロールが届きやすい。リスト行のスワイプで戻る/アクションを起動できるようにすることが特に重要。
- ユーザーの許可のもと、データ入力を求めずにプラットフォーム機能（決済、生体認証、位置情報など）を統合して体験を高める。
- システム機能（Widgets、Home Screen quick actions、Spotlight、Shortcuts、Activity views）で慣れた一貫した操作を提供する。
- 出典：https://developer.apple.com/design/human-interface-guidelines/designing-for-ios

### Accessibility（アクセシビリティ）
- アクセシブルな UI は「直感的（慣れた一貫操作）」「知覚可能（単一手段に依存しない）」「適応可能（システムのアクセシビリティ機能に追随）」。Accessibility Inspector で監査し、App Store の Accessibility Nutrition Labels で対応状況を示す。
- **視覚**
  - **大きな文字サイズに対応する。** 少なくとも 200% まで文字を拡大できるようにする（watchOS は 140%）。カスタム UI か Dynamic Type 採用で実現。
  - **カスタム書体でも推奨デフォルトサイズに従う。** iOS/iPadOS：デフォルト 17pt、最小 11pt（macOS 13/10、tvOS 29/23、visionOS 17/12、watchOS 16/12）。
  - **フォントウェイトも可読性に影響する。** 細いウェイトのカスタムフォントは推奨より大きめに。
  - **色コントラストの最小基準を満たす。** Accessibility Inspector は WCAG AA の以下を目安にする。デフォルトで満たせないなら、少なくとも「コントラストを上げる」ON 時に高コントラスト配色を用意する。Dark Mode 対応なら両外観で確認。

    | 文字サイズ | ウェイト | 最小コントラスト比 |
    |---|---|---|
    | 17pt 以下 | すべて | 4.5:1 |
    | 18pt | すべて | 3:1 |
    | すべて | Bold | 3:1 |

  - **システム定義色を優先する。** 「コントラストを上げる」やライト/ダーク切替に自動適応するアクセシブル変種を持つ。
  - **色だけで情報を伝えない。** 赤緑・青橙の区別が難しい人がいる。形やアイコンなど視覚的指標を併用し、チャート色などの配色カスタマイズも検討。
  - **VoiceOver 向けに UI と内容を説明する。**
- **聴覚**
  - **音声・映像をテキストで楽しめる手段を用意する。** 重要情報を音だけで伝えない。キャプション／字幕／音声解説／トランスクリプトを文脈に応じて提供し、表示のカスタマイズを許す。
  - **音のキューにはハプティクスを併用する**（成功音・エラー音・ゲームのフィードバック等）。Music Haptics／Audio Graphs も利用可。
  - **音のキューを視覚キューで補強する。** 画面外で起きることは特に、操作すべき場所を指す視覚指標を追加。
- **運動機能**
  - **十分な大きさのコントロールを提供する。** iOS/iPadOS：デフォルト 44×44pt、最小 28×28pt（macOS 28/20、tvOS 66/56、visionOS 60/28、watchOS 44/28）。
  - **コントロール間の間隔はサイズと同じくらい重要。** ベゼル付き要素は周囲約 12pt、ベゼル無し要素は可視端から約 24pt のパディングが目安。
  - **頻繁な操作には最も単純なジェスチャを使う。** カスタムの複数指・両手ジェスチャは避ける。
  - **ジェスチャの代替手段を用意する。** スワイプで閉じるなら、タップできるボタンも用意する。
  - **Voice Control に対応する**（要素に適切なラベル）。**Siri と Shortcuts に統合**し音声だけでタスク実行可能に。
  - **VoiceOver、AssistiveTouch、Full Keyboard Access、Pointer Control、Switch Control をテストし、要素にラベルを付ける。**
- **発話**
  - **キーボードだけでナビゲート・操作できるようにする。** システム定義のキーボードショートカットを上書きしない。Full Keyboard Access で検証。
  - **Switch Control に対応する。**
- **認知**
  - **操作をシンプルで直感的に。** カスタムジェスチャよりシステムジェスチャを優先。
  - **時間制限付き UI（タイマーで自動消滅する表示）を最小化する。** 明示的な操作で閉じる方を優先。
  - **ゲームでは難易度調整（クリア条件緩和、反応時間、操作補助）を検討する。**
  - **音声・動画の再生をユーザーが制御できるようにする。** 開始/停止コントロール無しの自動再生を避け、全体で自動再生をオフにできる設定を検討。
  - **点滅する光をオプトアウトできるようにする**（Dim Flashing Lights 設定に応答）。
  - **速い動き・点滅アニメーションに注意する。** 「視差効果を減らす」ON 時は、ズーム・スケール・周辺の動きなど自動/反復アニメーションを減らす。具体策：スプリングを締めてバウンスを減らす／アニメーションをジェスチャに直接追従させる／z 軸の深度変化をアニメーションしない／x・y・z 軸の遷移をフェードに置き換える／ブラーへの出入りをアニメーションしない。
  - **Assistive Access 向けに UI を最適化する。** 中核機能を特定し非重要なワークフロー/UI を削る／複数ステップを 1 画面 1 操作に分割／ファイル削除など復元困難な操作は必ず 2 回確認。
- 出典：https://developer.apple.com/design/human-interface-guidelines/accessibility

### Branding（ブランディング）
- **ブランド固有の声とトーンを、表示する文章すべてに使う。**
- **アクセントカラーは慎重に使う。** ブランド色を広く塗ると UI が圧倒され効果が薄れる。コントロールでの使用は最小限にし、主要アクションや状態表示（未読バッジ、選択中タブのアイコン等）に意図的に使う。ブランド色はコンテンツ層に移し、Liquid Glass コントロールの下をスクロールして動的に拾われる形を検討。
- **カスタムフォントの採用を検討する。** 全サイズで可読で、Bold Text・Dynamic Type に対応すること。見出しにカスタム、本文・キャプションにシステムフォントの組合せが有効。
- **ブランドは慣れたコンポーネントで表現する。** 外観をカスタマイズしてもサイズ・配置・挙動はプラットフォームに適した慣れた体験を保つ。
- **ブランディングは常にコンテンツに譲る。** ブランド資産を表示するだけの要素に画面を割かない。
- **標準パターンを一貫して使う。** UI を期待される位置に置き、標準シンボルを使い、ナビゲーションとモーダルの慣例に従う。
- 出典：https://developer.apple.com/design/human-interface-guidelines/branding

### Color（色）
- **同じ色に異なる意味を持たせない。** ブランド色でボーダレスボタンの操作可能性を示すなら、非操作テキストに同じ色を使わない。
- **ライト・ダーク・コントラスト増の全文脈で色が機能するようにする。** 可能ならシステム色を使う。カスタム色はライト/ダーク変種と、それぞれの高コントラスト変種を用意する。単一外観で出荷する場合も Liquid Glass の適応のため両方定義する。
- **様々な照明条件でテストする**（屋外では暗く鈍く、暗所では明るく飽和して見える）。**異なるデバイスでテストする**（True Tone、P3/sRGB プロファイル）。
- **アートワークや半透明が近隣の色に与える影響を考慮する**（ツールバー越しなど）。
- **色選択 UI はシステム提供のカラーピッカーを優先する。**
- **色だけで物体の区別・操作可能性・必須情報を伝えない。** テキストラベルや形で同じ情報を提供。**知覚を妨げる色を避ける**（コントラスト不足）。**文化による色の意味差を考慮する**（赤＝危険/吉）。
- **システム色の値をハードコードしない。** 公開値は参考用でリリースごとに変動しうる。`Color`/`UIColor` の API で適用する。
- **ダイナミックシステム色の意味を再定義しない。** separator 色を文字色に、secondaryLabel を背景色に使わない。
- Liquid Glass：本来無色で背後の内容の色を拾う。**色は Liquid Glass 本体とその上のシンボル/文字に控えめに適用する。** 主要アクション（Done など）や状態表示に限定し、強調は文字でなく背景に色を付ける。複数コントロールの背景に色を付けない。**背景がカラフルならコントロールラベルに似た色を使わない**（ツールバー/タブバーはモノクロ推奨）。**コンテンツ層の色配置に注意**し、初期/静止状態（スクロール先頭など）で判読性を保つ。
- カラーマネジメント：**画像にカラープロファイルを付ける**（sRGB が大半で正確）。**対応ディスプレイでは広色域（Display P3、16bit/チャンネル、PNG 書き出し）を活用。** **必要なら色空間ごとの画像・色の変種を用意する**（P3 の近似色やグラデーションが sRGB でクリップする場合）。
- iOS/iPadOS の背景色：system 系と grouped 系の 2 セット（primary/secondary/tertiary）。グループ化テーブルは grouped（`systemGroupedBackground` 等）、それ以外は system（`systemBackground` 等）。primary＝全体ビュー、secondary＝その中のグループ、tertiary＝secondary 内のグループ。
- iOS/iPadOS 前景ダイナミック色：

  | 色 | 用途 | UIKit |
  |---|---|---|
  | Label | 主要テキスト | `label` |
  | Secondary label | 二次テキスト | `secondaryLabel` |
  | Tertiary label | 三次テキスト | `tertiaryLabel` |
  | Quaternary label | 四次テキスト | `quaternaryLabel` |
  | Placeholder text | プレースホルダ | `placeholderText` |
  | Separator | 下を透かす区切り線 | `separator` |
  | Opaque separator | 不透明の区切り線 | `opaqueSeparator` |
  | Link | リンク文字 | `link` |

- システム色は API（`Color.red` 等）で参照し、RGB をハードコードしない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/color

### Dark Mode（ダークモード）
- **アプリ独自の外観設定を提供しない。** システム設定に追随しないと壊れていると思われる。
- **両外観で見栄えを保証する。** Auto 設定で実行中に切り替わることがある。
- **両外観で可読性をテストする。** Dark Mode＋「コントラストを上げる」＋「透明度を下げる」を個別/同時に ON にして、暗い背景の暗い文字などを洗い出す。
- **まれに、ダーク外観のみを使う判断もある**（没入型メディア視聴アプリなど）。
- **外観に適応する色を使う。** セマンティック色（`label`、`separator` 等）は自動適応。カスタム色はアセットカタログの Color Set でライト/ダーク変種を定義。**ハードコード色や非適応色を使わない。**
- **全外観で十分なコントラストを確保する。** 最低 4.5:1。カスタムの前景/背景色では 7:1 を目指す（特に小さい文字）。
- **白背景を和らげる。** 白背景の画像は少し暗くして Dark Mode 内で光らないようにする。
- **可能な限り SF Symbols を使う**（自動適応）。**必要ならライト/ダーク別のインターフェースアイコンを用意する**（満月やオイル滴のように縁取りの要否が変わる例）。**フルカラー画像/アイコンも両外観で確認し**、必要なら別アセットをアセットカタログで 1 名にまとめる。
- **ラベルにはシステム提供のラベル色を使う**（primary〜quaternary が自動適応）。**テキストフィールド/テキストビューはシステムビューで描画する**（vibrancy の有無に自動対応）。
- iOS/iPadOS：Dark Mode の背景は base（暗い、後退）と elevated（明るい、前進）の 2 セット。ポップオーバー/モーダルシート、マルチタスク、複数ウィンドウで自動的に elevated に切り替わる。**システム背景色を優先する**（カスタム背景だとこの深度表現が失われる）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/dark-mode

### Icons（アイコン）
- インターフェースアイコン（グリフ）は黒と透明で形を定義し、システムが黒い部分に色を適用する。
- **認識しやすく極めて単純化したデザインにする。** 細部が多いと混乱・判読不能。行動/内容に直結する慣れた視覚メタファーを使う。
- **アプリ内の全アイコンで視覚的一貫性を保つ。** サイズ、ディテール量、線の太さ、パースを揃える。視覚的重さに応じて寸法を調整。
- **一般にアイコンの太さを隣接テキストのウェイトに合わせる。**
- **必要なら余白を足して光学的整列を取る。** 非対称アイコンは幾何学的中心だとずれて見える。調整量をパディングとしてアセットに含める。
- **選択状態版アイコンは必要な場合のみ用意する。** ツールバー・タブバー・ボタンなど標準部品ではシステムが自動更新する。
- **包括的な画像を使う。** 性別中立の人物、文化/言語で誤解されにくい図柄。
- **アイコン内のテキストは意味伝達に必須な場合のみ。** 個別文字を使うならローカライズし、文章を暗示するなら抽象表現にし RTL 用の反転版も用意。
- **カスタムアイコンは PDF/SVG のベクター形式で作る。** PNG は拡大縮小できず複数解像度が必要。代替としてカスタム SF Symbol でスケール指定。
- **カスタムアイコンに代替テキスト（アクセシビリティ説明）を付ける。**
- **Apple ハードウェアの複製を使わない。** 必要なら Apple Design Resources の画像か SF Symbols を使う。
- 標準アクションには対応する SF Symbols を使う（共有 `square.and.arrow.up`、追加 `plus`、More `ellipsis`、削除 `trash`、検索 `magnifyingglass`、完了 `checkmark`、閉じる `xmark`、取り消し `arrow.uturn.backward` など。全一覧は出典）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/icons

### App icons（アプリアイコン）
- **シンプルに。** 単一の概念を最小の形で表し、背景は単色かグラデーション。細部はシステムの光沢・影で潰れる。
- **レイヤーで作る（推奨）。** iOS/iPadOS/macOS/watchOS は背景レイヤー＋前景レイヤーを Icon Composer（Xcode 同梱）で組み、システムが Liquid Glass（ハイライト・屈折・半透明）を適用する。前景は輪郭のはっきりした塗り形状、不透明度の差で奥行き、ベクター（SVG/PDF）優先。
- **マスク済みの形を渡さない。** 1024×1024 の正方形・角丸なしで作り、角丸はシステムが掛ける。主要コンテンツは中央に。
- **ハイライト・影・ベベル・ブラーを自前で描かない**（システムが動的に付ける）。
- **テキストはブランドや体験に必須な場合のみ**（アプリ名は横に出る）。**UI の複製・写真・Apple ハードウェアの複製は使わない。**
- **外観変種**：default / dark / clear / tinted。コア要素は全変種で同じにし、dark はライトを基にした落ち着いた配色（フラット画像なら dark は透過背景、tinted はグレースケール）。用意しない変種はシステムが自動生成する。
- 対応色空間：sRGB / Gray Gamma 2.2 / Display P3。
- 出典：https://developer.apple.com/design/human-interface-guidelines/app-icons

### Images（画像）
- ポイントは抽象単位。@1x＝1pt:1px、@2x＝2:1、@3x＝3:1。
- **対応する全デバイス向けに、すべてのビットマップ画像の高解像度アセットを提供する。** ファイル名に「@1x」「@2x」「@3x」を付けてアセットカタログに登録。
- **一般に最低解像度でデザインし、拡大して高解像度アセットを作る。** ベクター形状の制御点は整数値に置き、1x でグリッドに揃える（2x/3x は 1x の倍数）。
- 形式：ビットマップは PNG（24bit 不要なら 8bit パレット）、写真は JPEG/HEIC、アイコン等のスケーリングが必要なものは PDF/SVG。
- **各画像にカラープロファイルを含める。**
- 出典：https://developer.apple.com/design/human-interface-guidelines/images

### Inclusion（インクルージョン）
- 年齢・性別/性自認・人種/民族・性的指向・身体/認知属性・恒久/一時/状況的障害・言語/文化・宗教・教育・政治/哲学的意見・社会経済的文脈など、多様な視点で言葉と画像を見直す。「不快でない」＝「包括的」ではない。
- **文章のトーンを異なる視点から検討する**（学術的トーンは高学歴者だけを歓迎する印象を与えうる）。明確・直接・敬意をもって。
- **人への言及に注意する。** *you/your* で直接呼びかける。*the user/the player* は距離を感じさせる。*we/our* は自社/ソフトを指す用途に限定（押し付けがましく響くことがある）。
- **専門用語を定義なしに使わない。** 使うなら先に定義し参照しやすくする。平易な言葉の方が読みやすく翻訳しやすい。
- **口語表現を平易な言葉に置き換える。** 文化依存で翻訳困難、排他的由来を持つ表現もある（例：peanut gallery、grandfathered in）。
- **ユーモアの使用は慎重に検討する。** 主観的で翻訳困難。混乱・苛立ち・侮辱のリスク。
- 出典：https://developer.apple.com/design/human-interface-guidelines/inclusion

### Layout（レイアウト）
- 視覚階層
  - **相対的重要度で内容を並べる。** 読み順（上→下、先頭側→末尾側）で見るので、重要なものは上・先頭側に。RTL は標準部品で自動適応。
  - **要素を整列させて走査しやすくし、インデントで階層を示す。** 整列した項目は関連、インデント項目は従属と認識される。
  - **関連項目をグループ化する**（余白、コンテナ形状、区切り線）。
  - **段階的開示でレイアウトを整理する**（開閉三角、メニュー、入れ子ビュー、スクロールセクション）。
  - **コントロールと内容を区別する。** Liquid Glass でコントロールに独自の外観を与える。コントロール下に不透明/半透明の背景色を敷くのではなく、スクロールエッジ効果で浮かせる。全画面背景はサイドバー・ツールバー・タブバーの下まで延ばす。背景画像が隠れるなら background extension effect（反転＋ブラー）を使う。
- 適応性
  - 扱うべき特性：regular/compact のサイズクラス、画面サイズ、向きとアスペクト比、Dynamic Island、外部ディスプレイ/Display Zoom/iPad・Mac のウィンドウリサイズ、文字サイズ変更、ロケール（LTR/RTL、日時・数値書式、フォント、文字長）。SwiftUI か Auto Layout を使う。
  - **優雅かつ一貫して適応するレイアウトを設計する。** システム定義の safe area・マージン・ガイドを尊重する。向き固定（横向きゲーム等）でもリサイズに耐えること。
  - **文字サイズ変更に備える。** 大きな文字では横並びを縦積みに、行やコンテナの高さを伸ばし、1 行の行を複数行にする。
  - **複数デバイス・サイズクラス・ローカライズ・文字サイズでプレビューする。** まず最大と最小のレイアウトをテスト。Device Hub で iPad のリサイズや iPhone ミラーリングを確認。
  - **必要なら表示変化に応じて背景アートをスケールする。** アスペクト比は変えず、画面全体を埋めるよう拡大。
- サイズクラス（iOS/iPadOS）：横・縦それぞれ compact か regular。デバイス種別、ウィンドウ構成、マルチタスク状態で決まる。
  - **レイアウトはサイズクラスで決める。デバイス種別や向きで決めない。**
  - **サイズクラスの全組合せを考慮する。**
  - **サイズクラスが変わっても機能は同じに保ち、レイアウト変化はプラットフォームに馴染んだものにする。** 空間に応じて見える機能量は変えてよい（タブバー→サイドバー、オーバーフローメニューの展開）。
- ガイドと safe area：レイアウトガイドは標準マージンや可読幅の制限に使う。safe area はハードウェア（Dynamic Island 等）やツールバー/タブバー/ステータスバーに覆われない領域。**safe area を尊重し、システム UI とハードウェアが内容やコントロールを隠さないようにする。**
- 注：2026-09-09 改訂版の本ページには、iPhone/iPad 機種別の画面寸法・マージン表は掲載されていない（Apple Design Resources 参照のみ）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/layout

### Materials（マテリアル）
- マテリアル＝前景（文字・コントロール）と背景（内容）の深度・階層を作る視覚効果。Liquid Glass（コントロール/ナビゲーション層）と標準マテリアル（コンテンツ層内の区別）の 2 種。
- Liquid Glass：**コンテンツ層に使わない**（内容と操作要素の区別が崩れる。例外はスライダー・トグルなど操作中の要素）。**効果は控えめに**（標準部品は自動適用。カスタムに多用すると内容から注意を逸らす）。**clear 変種は写真/動画など視覚的に豊かな背景上の部品だけ**（背景が明るければ 35% 不透明の暗いディミング層を検討）。regular は文字の多いアラート/サイドバー/ポップオーバー向け。
- 標準マテリアル：**意味と推奨用途で選び、見た目の色で選ばない。** **マテリアル上では vibrant 色で可読性を確保する。** 厚いほど細い文字のコントラストが良く、薄いほど背景の文脈が残る。
- iOS/iPadOS：標準マテリアルは ultra-thin / thin / regular（デフォルト）/ thick の 4 種。vibrancy はラベル（label / secondaryLabel / tertiaryLabel / quaternaryLabel）、塗り（fill / secondaryFill / tertiaryFill）、区切り線（separator、1 段階）。**quaternary は thin / ultraThin の上で使わない**（コントラスト不足）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/materials

### Motion（モーション）
- システム部品は自動でモーションを含み、アクセシビリティ設定や入力方法（タッチ vs トラックパッド）に応じて調整される。
- **モーションは目的を持って加え、体験を支えるが覆い隠さない。** モーションのためのモーションを加えない。過剰なアニメーションは注意を散らし不快感を招く。
- **モーションを任意にする。** 重要情報をモーションだけで伝えない。ハプティクスや音などで補う。
- **人のジェスチャと期待に沿う現実的なフィードバックモーションを目指す。** 上から引き下ろして出したビューを横に消さない。
- **フィードバックアニメーションは短く正確に。** 軽量で控えめな方が情報を伝えやすい。
- **アプリでは、頻繁に発生する UI 操作にモーションを加えない。** 標準部品にはすでに控えめなアニメーションがある。
- 出典：https://developer.apple.com/design/human-interface-guidelines/motion

### Privacy（プライバシー）
- App Store 提出時にプライバシー慣行と収集データの詳細（App privacy details）が必須。
- **実際に必要なデータへのアクセスのみ要求する。** 機能に必要以上、または興味を示す前の要求は信頼を損なう。許可要求はできるだけ具体的に。
- **データの収集と利用方法を透明にする。** Hide My Email、Mail Privacy Protection などのユーザー選択を尊重し、トラッキングの義務を理解する。
- **可能な限りデバイス上で処理する**（Neural Engine、Create ML）。
- **システム定義のプライバシー保護とセキュリティのベストプラクティスを採用する**（CloudKit の暗号化等）。
- 許可が必要なもの：個人データ（位置、健康、金融、連絡先等）、ユーザー生成コンテンツ（メール、メッセージ、カレンダー、写真/動画/音声等）、保護リソース（Bluetooth 周辺機器、ホームオートメーション、Wi-Fi、ローカルネットワーク）、デバイス機能（カメラ、マイク）、広告識別子。
- **アプリが明確に必要とするときだけ許可を求める。** 理想は該当機能の使用時。**起動時の許可要求は、機能に必須でない限り避ける**（ナビアプリの位置情報のように理由が明白な場合は可）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/privacy

### SF Symbols（SF シンボル）
- San Francisco と統合され、全ウェイト・サイズでテキストに自動整列。OS バージョンにより利用可能なシンボル/機能が異なる。**アプリアイコン・ロゴ・商標用途にシンボル（や紛らわしい類似画像）を使うことは禁止。**
- レンダリングモード：Monochrome（単色）／Hierarchical（単色を層ごとに不透明度差）／Palette（層ごとに別色）／Multicolor（固有色）。システム色を使えばアクセシビリティ・vibrancy・Dark Mode に自動適応。**シンボルのレンダリングモードが全文脈で機能するか確認する。**
- グラデーション（SF Symbols 7 以降）：単一色から線形グラデーション生成。大きいサイズで映える。
- 変数カラー：0〜100% の値に応じて層に色を付ける。**変化を伝えるために使い、深度を伝えるために使わない**（深度は Hierarchical）。
- ウェイトとスケール：9 ウェイト（ultralight〜black）がシステムフォントに対応。3 スケール（small / medium（デフォルト）/ large）はキャップハイト基準。スケールで隣接テキストに対する強調を調整できる。
- デザイン変種：outline（最多、テキスト的）、fill、slash、enclosed（circle/square/rectangle）。outline はツールバー・リスト向き、囲み形は小サイズで判読性向上、fill は強調が強く iOS タブバー・スワイプアクション・アクセント色での選択表示向き。多くの場合ビューが変種を決める（タブバー＝fill、ツールバー＝outline）。言語/文字体系別の変種は言語設定で自動切替。
- アニメーション：Appear / Disappear / Bounce / Scale / Pulse / Variable color / Replace（down-up, up-up, off-up）/ Magic Replace（既定、関連形状間のみ）/ Wiggle / Breathe / Rotate / Draw On・Off（SF Symbols 7）。
  - **シンボルアニメーションは慎重に適用する。** 多すぎると圧倒・妨害。
  - **アニメーションがシンボルの意図の伝達に明確に役立つことを確認する。**
  - **情報をより効率的に伝えるために使う。**
  - **アプリのトーンに合わせる。**
- カスタムシンボル：類似シンボルのテンプレートを書き出しベクターツールで編集。Apple 製品/機能を表す著作権付きシンボルはカスタマイズ不可。
  - **テンプレートをガイドにする。** ディテール、光学的ウェイト、整列、位置、パースをシステムと揃える。シンプル・認識可能・包括的・内容に直結。
  - **必要なら負のサイドマージンを設定する**（バッジ付きシンボルの水平整列。「left-margin-Regular-M」の命名規則）。
  - **アニメーション用に層を最適化する**（SF Symbols アプリで層を注釈、Z 順）。**カスタムシンボルのアニメーションをテストする**（全プリセット。切り抜きでなく全体形＋消去層で描く）。
  - **囲みやバッジなど一般的な変種を自作しない。** コンポーネントライブラリで生成する。
  - **カスタムシンボルに代替テキストを付ける。**
  - **Apple 製品の複製をデザインしない。**
- 出典：https://developer.apple.com/design/human-interface-guidelines/sf-symbols

### Typography（タイポグラフィ）
- **多くの人が楽に読めるフォントサイズを使う。** iOS/iPadOS：デフォルト 17pt、最小 11pt（macOS 13/10、tvOS 29/23、visionOS 17/12、watchOS 16/12）。カスタム・システム両フォントに適用。細いウェイトは推奨より大きく。
- **異なる文脈で可読性をテストする。** 読みにくければサイズ拡大、コントラスト増、可読性最適化書体（システムフォント）を検討。
- **一般に細いウェイトを避ける。** Regular / Medium / Semibold / Bold を使い、Ultralight / Thin / Light は避ける。
- **ウェイト・サイズ・色を調整して重要情報を強調し階層を可視化する。** 文字サイズ変更時も相対階層を維持。
- **書体の数を最小限にする。** 多用は階層を曖昧にし、不統一に見える。
- **文字サイズ変更への応答では重要な内容を優先する。** 全要素を等しく拡大する必要はない（タブタイトル、ゲームのダメージ値など）。
- システムフォント：San Francisco（SF Pro / SF Compact / SF Arabic / SF Armenian / SF Georgian / SF Hebrew / SF Mono、Rounded 変種あり）と New York（セリフ）。可変フォントで動的光学サイズ対応。iOS/iPadOS のシステムフォントは SF Pro、NY も使用可。**システムフォントをアプリに埋め込まない**（`Font.Design` で取得）。
- **組み込みテキストスタイルの使用を検討する。** Dynamic Type と大きなアクセシビリティサイズに自動対応。
- **必要なら組み込みテキストスタイルを修正する**（symbolic traits：bold、leading）。長文・広い段組は loose leading、高さ制約の行は tight leading。**3 行以上の文章では tight leading を避ける。**
- **必要ならモックアップでトラッキングを調整する**（実行時はシステムが自動調整）。
- カスタムフォント：**可読性を確保する**（推奨最小サイズに従う）。**アクセシビリティ機能（Dynamic Type、Bold Text）を実装する。**
- Dynamic Type：
  - **レイアウトが全フォントサイズに適応することを確認する。** 設定 > アクセシビリティ > 画面表示とテキストサイズ > さらに大きな文字 を ON にして確認。
  - **フォントサイズに応じて意味のあるアイコンも拡大する**（SF Symbols は自動）。
  - **フォントサイズ増加時のテキスト切り詰めを最小限にする。** 最大アクセシビリティサイズでも最大標準サイズと同程度の有用なテキストを表示。スクロール領域での切り詰めは別ビューで全文を読める場合を除き避ける。
  - **大きなフォントサイズではレイアウト調整を検討する**（インライン要素を縦積みに、段組数を減らす）。
  - **フォントサイズに関わらず情報階層を一定に保つ**（主要要素を上部に）。
- iOS/iPadOS Dynamic Type サイズ — Large（デフォルト）：

  | スタイル | ウェイト | サイズ (pt) | 行送り (pt) | 強調ウェイト |
  |---|---|---|---|---|
  | Large Title | Regular | 34 | 41 | Bold |
  | Title 1 | Regular | 28 | 34 | Bold |
  | Title 2 | Regular | 22 | 28 | Bold |
  | Title 3 | Regular | 20 | 25 | Semibold |
  | Headline | Semibold | 17 | 22 | Semibold |
  | Body | Regular | 17 | 22 | Semibold |
  | Callout | Regular | 16 | 21 | Semibold |
  | Subhead | Regular | 15 | 20 | Semibold |
  | Footnote | Regular | 13 | 18 | Semibold |
  | Caption 1 | Regular | 12 | 16 | Semibold |
  | Caption 2 | Regular | 11 | 13 | Semibold |

- xSmall〜AX5 の全サイズ表は出典ページ Specifications を参照（Body は xSmall 14pt → AX5 53pt）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/typography

### Writing（ライティング）
- **アプリの声（voice）を決める。** 誰に話すか、どう感じてほしいかから語彙を決め、共通用語リストを作って一貫させる。
- **トーンを文脈に合わせる。** 声は一定、トーンは状況で変える（転倒検知は直接的、目標達成は祝福）。
- **明快に。** 理解しやすく正しい言葉を選び、不要な語を削る。迷ったら声に出して読む。
- **すべての人に向けて書く。** 平易な言葉、アクセシビリティとローカライズを意識、専門用語と性別を含む語を避ける。
- **各画面の目的を考える。** 要素の順序に注意し最重要情報を先に。複数の考えは複数画面に分ける。
- **行動志向に。** 能動態と明確なラベル。ボタン/リンクはほぼ常に動詞。「Let's do it!」より「Send」。リンクは「Click here」でなく「Learn more about UX Writing」のような説明的語句（スクリーンリーダーに重要）。
- **言語パターンを作る。** 一貫性が親しみと統一感を生む。
- **大文字小文字のルールをアプリのスタイルに合わせて決め、一貫適用する。** Title case は形式的、sentence case は砕けた印象。UI 要素種別ごとに統一（アラートは title case、見出しは sentence case 等）。
- **複数ステップのプロセスでは明確な案内と一貫した語を使う。** 開始は「Get Started」、進行は「Continue」/「Next」のどちらかに統一、完了は「Done」。
- **所有代名詞は控えめに。** 「Your Favorites」より「Favorites」。使うなら視点を切り替えず一貫。**「we」は使わない**（「We're having trouble loading this content」より「Unable to load content」）。
- **各デバイスの使われ方に合わせて書く。** タッチ端末で「click」と言わない（「tap」）。iPhone/Apple Watch は簡潔に、TV は共有空間なので宛先に配慮し大きな文字のため簡潔に。
- **空の画面には明確な次の手順を示す。** 歓迎と教育の機会。行動を案内しボタン/リンクを置く。一時的な状態なので消える重要情報を置かない。
- **明確なエラーメッセージを書く。** まずエラーを避ける設計。必要なら問題の近くに表示し、責めず、直し方を明示（「That password is too short」より「Choose a password with at least 8 characters」）。「oops!」「uh-oh」は不要で不誠実に響く。言葉で解決できないなら操作を見直す。
- **適切な伝達手段を選ぶ**（通知、アラート、アクションシート）。緊急度・重要度・文脈・必要な補足情報で判断。
- **設定ラベルは明快かつ簡潔に。** ON のときの動作を説明すれば OFF は推測できる。設定へ誘導するなら場所の説明でなく直接リンク/ボタン。
- **テキストフィールドにヒントを表示する。** 全フィールドにラベル、書式を示すプレースホルダ（「name@example.com」「Your name」）。エラーはフィールドの隣に、正しい入力方法を示す（「Use only letters for your name」。「Invalid name」のような無情報なメッセージは避ける）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/writing

## Patterns（パターン）

### Charting data（データのチャート表示）
- データセットの重要な情報を強調したいときにチャートを使う。データを提供するだけなら、スクロール・検索・ソートできるリストやテーブルを検討する。
- チャートはシンプルに保ち、追加の詳細は人が選んで見られるようにする。詳細レベルやサブセットを段階的に開示する。
- すべてのチャートをアクセシブルにする。値と構成要素を説明するアクセシビリティラベルと、操作用のアクセシビリティ要素を必ず提供する。
- 原則として一般的なチャート種別（棒・折れ線）を優先する。新しい表現なら読み方を教える。
- 出典：https://developer.apple.com/design/human-interface-guidelines/charting-data

### Collaboration and sharing（コラボレーションと共有）
- 共有ボタンはツールバーなど便利な場所に置く（SwiftUI は ShareLink、システムの共有シート）。
- 共有権限を要約する簡潔な語句を書く。共有オプションはシンプルに、カスタム選択肢は最小限。
- 出典：https://developer.apple.com/design/human-interface-guidelines/collaboration-and-sharing

### Drag and drop（ドラッグ＆ドロップ）
- 可能な限りアプリ全体で対応し、代替手段（コピー／移動のメニュー等）も提供する。
- 同じコンテナ内＝移動、異なるコンテナ＝コピー、アプリ間＝常にコピー。データ損失や混乱が最も少ない挙動を優先する。
- 複数アイテムの同時ドラッグ、取り消し（取り消せない操作は確認）、高忠実度→低忠実度の複数バージョン提供を検討する。
- フィードバック：約 3 ポイントドラッグしたらドラッグ画像（半透明）を表示し、ドロップまで表示し続ける。宛先がドロップ可能かを示し、不可/失敗時は元の位置に戻すかフェードアウト。必要なら自動スクロール。
- 出典：https://developer.apple.com/design/human-interface-guidelines/drag-and-drop

### Entering data（データ入力）
- システムから取得できる情報は入力させない。必要なデータを明確にする（プレースホルダー、ラベル、既定値のプリフィル）。
- 機密データにはセキュアテキストフィールド。パスワードフィールドを事前入力しない。
- 可能なら文字入力の代わりに選択肢（ピッカー、メニュー）。ドラッグ＆ドロップやペーストでも入力できるようにする。
- フィールド値を動的にバリデーションし、必須データが揃うまで進めないことを明示する（Next/Continue は揃ってから有効化）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/entering-data

### Feedback（フィードバック）
- すべてのフィードバックをアクセシブルに（色・テキスト・音・ハプティクスを併用）。
- ステータスフィードバックはインターフェースに統合することを検討する。
- アラートは重要で実行可能な情報に限る。使いすぎると効果が薄れる。
- 予期せず取り消せないデータ損失を起こすタスクでは警告する。期待される結果のデータ損失（ファイル削除など）では警告しない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/feedback

### File management（ファイル管理）
- 作業はキャンセル・削除しない限り常に保存されていると確信させる。明示的な保存操作を避け、編集中に定期的に自動保存し、閉じる／アプリ切替時にも保存する。
- ファイル拡張子は既定で非表示にし表示を選べるようにする。Quick Look でプレビュー可能に。
- iOS 18 / iPadOS 18 以降のドキュメントランチャー：タイトルカードのボタンは最重要機能に、背景は単色・グラデーション・パターン、アニメーションは控えめ。
- 出典：https://developer.apple.com/design/human-interface-guidelines/file-management

### Going full screen（フルスクリーン）
- 体験に意味があればフルスクリーンをサポートし、必須機能とコントロールへのアクセスを維持する。
- 離れて戻ったときに続きから再開できるようにする。フルスクリーン終了のタイミングは人に選ばせる。
- ツールバーとナビゲーションを一時的に隠してコンテンツを優先し、タップ等で復元可能にする。
- 出典：https://developer.apple.com/design/human-interface-guidelines/going-full-screen

### Launching（起動）
- 即座に起動する。再起動時に前の状態（スクロール位置など）を復元する。
- 起動画面（iOS/iPadOS で必要）は控えめに。最初の画面とほぼ同一にし、デバイスの向きと外観モードに合わせる。テキストを含めない（ローカライズされない）。広告しない。ロゴは最初の画面の固定部分でない限り入れない。
- iOS/iPadOS：適切な向きで起動する。
- 出典：https://developer.apple.com/design/human-interface-guidelines/launching

### Loading（読み込み）
- できるだけ早く何かを表示する（プレースホルダー）。読み込み中に他のことができるようにする（バックグラウンド読み込み）。
- 避けられない長時間ロードでは興味深いものを見せ、残り時間を正確に見積もる。大きなアセットはバックグラウンドでダウンロード。
- 一瞬以上かかるなら progress indicator（時間が分かる＝determinate、不明＝indeterminate）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/loading

### Managing accounts（アカウント管理）
- コア機能に必要な場合のみアカウント作成を求める。Sign in with Apple を検討し、サインインをできる限り遅らせる。
- Sign in with Apple を使わないなら passkey を優先する。パスワードなら二要素認証を要求する。
- 提供する認証方法を常に明示する（「Sign In with Face ID」）。利用可能な方法のみ言及する。「passcode」という語をアカウント認証の意味で使わない。
- アプリ内でアカウント作成できるなら削除もできるようにする（明確な削除開始手段、完了時期の通知、課金の説明）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/managing-accounts

### Managing notifications（通知管理）
- 割り込みレベル：Passive / Active（既定）/ Time Sensitive / Critical（entitlement 必須）。各通知の緊急度を正確に表す。
- Time Sensitive は今起きている、または 1 時間以内に起きる事象にのみ。マーケティング通知は明示的同意なしに送らず、Time Sensitive では決して送らない。
- 送る前に許可を得る（種類を説明）。アプリ内で通知設定を管理できるようにする。
- 出典：https://developer.apple.com/design/human-interface-guidelines/managing-notifications

### Modality（モーダル）
- 明確な利点があるときだけモーダルで表示する。モーダルタスクはシンプル・短く・簡潔に。アプリ内アプリのように感じさせない。
- 深いコンテンツや複雑なタスクにはフルスクリーンモーダル。閉じる手段を常に明示する（iOS/iPadOS は上部ツールバーのボタンか下スワイプ）。
- データ損失を防ぐため閉じる前に確認する（iOS なら保存オプション付きアクションシート）。
- モーダルのタスクを識別しやすくする（タイトル）。別のモーダルを出す前に閉じる。複数のアラートを同時に表示しない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/modality

### Multitasking（マルチタスク）
- 注意が必要な活動は切り替え時に一時停止する。音声割り込みにスムーズに対応する。
- ユーザーが開始したタスクはバックグラウンドで完了させる。通知は重要／時間制約のあるタスク完了のみ。
- iPadOS：複数ウィンドウ・リサイズ可。アプリはマルチタスク構成を制御も把握もできない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/multitasking

### Offering help（ヘルプの提供）
- ヘルプは現在の行動に直接関連づけ、不要なら閉じる／避けられるようにする。関連性のある一貫した言葉（iPhone で「クリック」と書かない）。
- 標準コンポーネントの説明でヘルプを肥大化させない。
- Tips（TipKit）：シンプルな機能に（3 アクション超なら複雑すぎる）。1〜2 文、宣伝的内容を含めない。表示頻度を設定（例：24 時間に 1 回）。画像/シンボルは filled variant 優先。
- 出典：https://developer.apple.com/design/human-interface-guidelines/offering-help

### Onboarding（オンボーディング）
- インタラクティブに教える。単一フローの代わりに文脈固有の Tips を検討する。
- 前提オンボーディングが必要なら短く楽しく。別チュートリアルはオプションにし、スキップしたら次回以降出さず後で見つけやすくする。
- システムやデバイスの使い方を教えない。大きなダウンロードで妨げない。ライセンス詳細を表示しない。
- 非必須のセットアップは後回し（合理的な既定値）。許可リクエストは機能に必要ならオンボーディングに統合、そうでなければ初回アクセス時。評価や購入を促す前に体験させる。
- 出典：https://developer.apple.com/design/human-interface-guidelines/onboarding

### Playing audio（オーディオ再生）
- サイレント時は明示的に開始した音声のみ再生。システム音量がすべてを支配。ヘッドフォン切断時は即座に一時停止。
- 全体音量は調整しない。システム提供の volume view（MPVolumeView）を使う。
- 用途に合うオーディオカテゴリを選ぶ（Ambient / Solo ambient / Playback / Record / Play and record）。不要なら他アプリの音楽を止めない。
- オーディオコントロールの意味を変えない。割り込み終了後に自動再開するか決める。短い音と振動はシステムのサウンドサービス。
- 出典：https://developer.apple.com/design/human-interface-guidelines/playing-audio

### Playing haptics（ハプティクス）
- システム提供のハプティクスパターンを文書化された意味で使い、意味を変えない。アプリ全体で一貫して使う。
- 他のフィードバックを補完するものとして使い（強さ・鋭さをアニメーションと一致）、使いすぎない。離散的イベントを補完する短いハプティクスを優先。
- ハプティクスをオプションにする（なくても使える）。カメラ・ジャイロ・マイクへの影響に注意。
- iOS：UIFeedbackGenerator は Notification（Success / Warning / Error）、Impact（Light / Medium / Heavy / Rigid / Soft）、Selection。
- 出典：https://developer.apple.com/design/human-interface-guidelines/playing-haptics

### Playing video（ビデオ再生）
- システムの video player を使う。常に元のアスペクト比で表示する（埋め込みレターボックスを入れない）。
- 入力デバイスに関わらず期待される操作（Space で再生／一時停止）。読み込みが 2 秒超なら中央スピナー付きの黒いローディング画面を検討。
- 出典：https://developer.apple.com/design/human-interface-guidelines/playing-video

### Printing（印刷）
- 印刷を発見しやすくする（iOS/iPadOS はツールバーボタン → アクションシート）。印刷可能なときだけ表示する。
- 関連する印刷オプションのみをシステム提供ビューで提示する。
- 出典：https://developer.apple.com/design/human-interface-guidelines/printing

### Ratings and reviews（評価とレビュー）
- エンゲージメントを示した後にのみ評価を求める。初回起動・オンボーディング中・タスク中は避ける。
- しつこくしない（1〜2 週間は空ける）。システム提供プロンプトを優先する（365 日間に 3 回まで）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews

### Searching（検索）
- 検索が重要なら主要な位置に置く。単一の場所からコンテンツを検索可能にする。
- 現在の検索スコープを明示する（プレースホルダー・スコープバー）。サジェスト（最近の検索、予測）を提供し、検索履歴のクリア手段を提供する。
- Spotlight にコンテンツを検索可能にする。
- 出典：https://developer.apple.com/design/human-interface-guidelines/searching

### Settings（設定）
- 最多数に最良の既定設定を提供し、設定数を最小化する。
- 他の方法で得られる情報を設定で尋ねない。システム全体の設定を尊重し、冗長な複製を含めない。
- 一般的で変更頻度の低い設定はアプリ内設定領域に、タスク固有オプションは影響する画面内で変更できるようにする。システムの設定アプリには最も稀に変更するオプションのみ。
- 出典：https://developer.apple.com/design/human-interface-guidelines/settings

### Undo and redo（取り消しとやり直し）
- 結果を予測できるようにし（「Undo Typing」）、結果を表示する。複数回の取り消しを許可する（不要な回数制限を置かない）。
- 専用ボタンは必要なときのみ（標準シンボル、ツールバー）。
- iOS/iPadOS：標準ジェスチャー（3 本指スワイプ、シェイク）を再定義しない。アラートタイトルは「Undo 」「Redo 」＋ 1〜2 語。
- 出典：https://developer.apple.com/design/human-interface-guidelines/undo-and-redo

## Content（コンテンツ）

### Charts（チャート）
- マーク種類は伝えたい情報で選ぶ（棒＝カテゴリ比較・合計、線＝時間変化、点＝個別値・外れ値）。明確になるなら組み合わせる（線＋点）。
- 軸範囲は意味で固定/可変を決める（バッテリー 0〜100% は固定、値域が広ければ可変）。
- 下限はマーク種類と用途で決める（棒は 0 始まりが有効、心拍のように 0 から遠い差は 0 始まりが隠す）。
- 目盛ラベルは慣れた数列（0, 5, 10…可、1, 6, 11…不可）。グリッド線とラベルの密度は用途に合わせる。
- 見る前に目的が分かる説明を書き、主要メッセージを要約する。
- データを最も目立たせる一貫した視覚階層を作る。コンパクト環境ではプロット幅を最大化し縦軸ラベルを短くする。
- 出典：https://developer.apple.com/design/human-interface-guidelines/charts

### Image views（イメージビュー）
- 画像表示だけが目的のときに使う。操作可能にするならボタンに画像を設定する。
- アイコンには画像でなく SF Symbols かインターフェースアイコンを検討する。
- 出典：https://developer.apple.com/design/human-interface-guidelines/image-views

### Text views（テキストビュー）
- 長文・編集可能・特殊書式に使う。少量ならラベル、少量＋編集ならテキストフィールド。
- 可読性を保つ（Dynamic Type、太字テキスト設定でテスト）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/text-views

### Web views（Web ビュー）
- 複数ページを見せるなら進む/戻ると対応コントロールを提供する（既定では無効）。
- Web ビューでブラウザを作らない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/web-views

## Layout and organization（レイアウトと構成）

### Boxes（ボックス）
- 包含ビューより十分小さく保つ。入れ子ボックスでなく余白と整列でサブグループを示す。
- 役立つなら簡潔なタイトル（短い句、文頭のみ大文字、句読点なし。設定ペインではコロン）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/boxes

### Collections（コレクション）
- 標準の行/グリッドレイアウトを使う。テキストにはテーブルを検討。
- 項目を選びやすく（画像周りに余白）。必要なら独自操作を追加（既定：タップ選択、長押し編集、スワイプ）。
- 挿入・削除・並べ替えはアニメーションでフィードバック。
- 出典：https://developer.apple.com/design/human-interface-guidelines/collections

### Disclosure controls（ディスクロージャーコントロール）
- 詳細は必要になるまで隠し、頻用コントロールを最上位に置く。
- トライアングルには「Advanced Options」のような説明ラベル。
- 出典：https://developer.apple.com/design/human-interface-guidelines/disclosure-controls

### Labels（ラベル）
- 編集不要の少量テキストに使う。システムフォントを優先。
- 重要度はシステムのラベル色で表す：Label（主要）/ Secondary（補足）/ Tertiary（利用不可の説明）/ Quaternary（透かし）。
- 有用なラベル（エラー、場所、IP）は選択可能に。
- 出典：https://developer.apple.com/design/human-interface-guidelines/labels

### Lists and tables（リストとテーブル）
- テキストはリスト/テーブルで。サイズ差の大きい項目や大量画像はコレクション。
- 意味があれば編集（並べ替え）を許可。iOS/iPadOS は選択前に編集モード。
- 選択フィードバック：階層ナビは持続ハイライト、オプション選択は一時ハイライト＋チェックマーク。
- 項目テキストは簡潔に。切り詰めは中央省略記号など可読性を保つ。
- 複数列は名詞・タイトルケースの列見出し、句読点なし。単一列で見出しなしならラベル/ヘッダーで補う。
- 出典：https://developer.apple.com/design/human-interface-guidelines/lists-and-tables

### Split views（スプリットビュー）
- 詳細へ導く各ペインで現在の選択を持続ハイライト。ペイン間のドラッグ＆ドロップを検討。
- iOS：regular 環境で使い、compact では避ける。
- iPadOS：2 または 3 ペイン。狭い/コンパクト/中間幅で論理的に移動できるよう設計。
- 出典：https://developer.apple.com/design/human-interface-guidelines/split-views

### Tab views（タブビュー）
- 密接に関連するコンテンツに使い、ペイン内のコントロールは同ペインにだけ作用させる。
- 各タブに内容を表すラベル（名詞、タイトルケース）。タブ切替にポップアップボタンを使わない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/tab-views

## Menus and actions（メニューとアクション）

### Activity views（共有シート）
- 既存の共通アクション（Print 等）を重複させない。似た機能は固有タイトル（例：Print Transaction）。
- カスタムアクティビティは SF Symbols。独自アイコンは約 70x70 px の中央に配置。
- タイトルは動詞 1 語/短い動詞句。社名・製品名を入れない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/activity-views

### Buttons（ボタン）
- 周囲に十分な余白。ヒット領域は最低 44x44 pt（visionOS は 60x60 pt）。
- カスタムボタンには必ず押下状態を用意する。
- 最も選ばれそうなアクションに目立つスタイル。目立つボタンは 1 ビューに 1〜2 個。
- 推奨の区別はサイズでなくスタイルで。ラベルとコンテンツ層背景に似た色を使わない。
- 各ボタンが目的を明確に伝える（シンボル/テキスト/両方）。慣れたアクションには慣れたアイコン（共有＝`square.and.arrow.up`）。短いテキストの方が明確ならテキスト（タイトルケース、動詞始まり）。
- ロール：Normal / Primary（Return で確定）/ Cancel / Destructive（システム赤）。最も選ばれそうなボタンに Primary。破壊的ボタンに Primary を付けない。
- iOS/iPadOS：即完了しないアクションはボタン内にアクティビティインジケーター（ラベルを「Checking out…」等に変更可）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/buttons

### Context menus（コンテキストメニュー）
- 関連性を最優先し項目数は少なく。アプリ全体で一貫して提供する。
- 項目は必ずメイン UI でも使えるようにする。
- サブメニューは 1 階層まで、予測できるタイトル。
- 利用不可項目は淡色でなく非表示（macOS の Cut/Copy/Paste は例外）。
- 頻用項目を最初に目に入る位置に（開く方向で順序反転も検討）。ショートカットは表示しない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/context-menus

### Edit menus（編集メニュー）
- システム提供の編集メニューを優先し、既知のシステム操作で表示させる。
- 文脈に合うコマンドだけを出し、該当しないものは削除/淡色化（未選択で Copy、貼付対象なしで Paste を出さない）。
- カスタムコマンドは関連するシステムコマンドの近くに、多すぎない。短い動詞ラベル。
- 編集不可テキストもコピー可能に（コントロールラベルは除く）。取り消し/やり直しをサポート。
- 出典：https://developer.apple.com/design/human-interface-guidelines/edit-menus

### Home Screen quick actions（ホーム画面クイックアクション）
- 価値の高いタスクに。最低 1 つは期待され、最大 4 つ。
- 動的に変える場合も予測可能に。
- 結果が即座に分かる簡潔なタイトル（Directions Home、New Message）。必要ならサブタイトル。アプリ名を入れない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/home-screen-quick-actions

### Menus（メニュー）
- 各項目に動作を表す動詞/動詞句のラベル、タイトルケース、冠詞（a/an/the）を省く。
- 利用不可項目は淡色表示。全項目不可でもメニューは開けるようにする。
- 追加入力が必要なら末尾に「…」。
- 共通アクションは標準アイコンで一貫表示。アイコンは目的を持って控えめに、同グループ内は全部付けるか全部付けない。
- 重要・頻用項目を先頭に。関連項目はセパレータでグループ化し、重要度が違っても同グループに。
- 長さに注意。サブメニューは控えめに（同じ語が 3 項目以上繰り返すときに検討）、1 階層まで、約 5 項目超なら新メニュー。入れ子が不可でもサブメニューは開けるように。インデント禁止。
- 出典：https://developer.apple.com/design/human-interface-guidelines/menus

### Pop-up buttons（ポップアップボタン）
- 相互排他的な選択肢のフラットなリストに。アクション一覧・複数選択・サブメニューなら pull-down。
- 有用な既定選択を用意し、開かなくても選択肢を予測できるようにする（導入ラベル等）。
- スペースが限られ全選択肢を常時表示しなくてよいときに有効。必要なら Custom 項目と説明文。
- 出典：https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons

### Pull-down buttons（プルダウンボタン）
- ボタンのアクションに直接関係するコマンドに（Add→追加対象、Sort→属性、Back→戻り先）。
- ビューの全アクションを 1 つに押し込めない。
- 項目は最低 3 つが目安。1〜2 個ならボタン/トグル。多すぎも避ける。
- 出典：https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons

### Toolbars（ツールバー）
- 項目を厳選し、幅が狭いときにオーバーフローへ移る項目を定義する（macOS/iPadOS は自動。手動で作らない、既定でオーバーフローさせない）。
- 追加アクションは More メニューに。本当に必要なときだけ。
- ツールバー背景や色付きコントロールを減らし、必要なら scroll edge effect で区切る。項目ラベルとコンテンツ層背景に似た色を使わない。
- 標準コンポーネントを優先（角丸がバーと同心）。集中モードで一時的に隠すなら復元手段を用意。
- 各ウィンドウに有用なタイトル。アプリ名をタイトルにしない。15 文字未満。
- 標準の Back/Close ボタンを使い、「Back」「Close」のテキストラベルにしない。
- 主要タスクを支えるアクションを提供し意味を明確に。テキストよりシンボル優先（Edit 等は例外）。ボーダーなしシンボルを優先。
- Done/Submit には `.prominent`。主要アクションは 1 つだけ、後縁側。
- 配置：先頭（戻る・サイドバー・タイトル・ドキュメントメニュー、カスタマイズ不可）/中央（共通コントロール、縮小でオーバーフロー）/後縁（常時必要な項目・検索・More・Done、常に表示）。
- 機能と頻度でグループ化。ナビゲーションと Done/Close/Save は専用の区切られたセクションに。プラットフォーム間で配置を揃える。
- グループは最大 3 つ。テキストラベル付きアクションはシンボルから固定スペースで分離。
- iOS：最重要項目だけをメインに、残りは More。large title で現在位置を示す。
- iPadOS：ツールバーとタブバーを上部で併用可。macOS：全項目をメニューバーにも。visionOS：縦ツールバー禁止、プルダウン回避。watchOS：角か下部に配置。
- 出典：https://developer.apple.com/design/human-interface-guidelines/toolbars

## Navigation and search（ナビゲーションと検索）

### Search fields（検索フィールド）
- プレースホルダーで検索範囲を示す。可能なら入力と同時に検索開始。候補（最近の検索、予測）を表示。
- 結果は関連順・簡潔に、カテゴリ分けとフィルタ（スコープバー）を検討。
- スコープバーは明確なカテゴリの絞り込みに。既定は広いスコープ。トークンは共通の検索語に使い、候補と組み合わせる。
- iOS：入口は①タブバーのタブ（標準タブ＝探索ランディング、ボタン外観＝即キーボード）、②ツールバー（下部にスペースがあれば下部優先。下部のコンテンツを隠したくない/下部ツールバーがなければ上部）、③インライン（対象との関係を強めたいとき。上部に置くなら対象リストの上、スクロール時に固定を検討）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/search-fields

### Sidebars（サイドバー）
- 豊かなコンテンツをサイドバーの下に延ばす（横スクロールか background extension effect）。
- 内容のカスタマイズ、disclosure control での階層整理、SF Symbols を検討。
- 隠せるようにする（iPadOS はエッジスワイプ、macOS はボタン/View メニュー）。既定で隠さない。
- 階層は 2 段まで。深ければコンテンツリストを挟む split view。2 段なら各グループに簡潔なラベル。
- 出典：https://developer.apple.com/design/human-interface-guidelines/sidebars

### Tab bars（タブバー）
- ナビゲーション用。アクションはツールバー。
- 移動中もタブバーを表示したまま（モーダルが覆う場合は例外）。
- タブ数は必要最小限。複雑ならサイドバー変換可能なタブバー。オーバーフロー（More タブ）を避ける。
- 内容が不可でもタブを無効化・非表示にしない。空なら理由を説明。
- ラベルを付ける（できれば 1 語）。SF Symbols（塗りつぶし）を使う。
- バッジ（赤楕円に数字か「!」）は重要情報に限定。ラベルとコンテンツ層背景に似た色を使わない。
- iOS：下部に浮く Liquid Glass。アクセサリ付きならスクロールで最小化可。後端に検索タブ可。
- iPadOS：上部に表示、固定かサイドバー変換ボタン付き。カスタマイズ可なら既定は 5 個以下。
- 出典：https://developer.apple.com/design/human-interface-guidelines/tab-bars

## Presentation（プレゼンテーション）

### Action sheets（アクションシート）
- 意図的なアクションに関連する選択肢にはアラートでなくアクションシート。控えめに使う。
- タイトルは 1 行。メッセージは必要時のみ。
- データ破壊の可能性があればキャンセルを最下部に（watchOS は左上）。
- 破壊的選択は destructive スタイルで最上部に。
- iOS/iPadOS：メニューでなくアクションシートを使い、スクロールさせない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/action-sheets

### Alerts（アラート）
- 控えめに。情報提供だけのアラートを避ける。一般的で取り消せるアクションには出さない（取り消せない稀な破壊的アクションには出す）。起動時に出さない。
- 構成：タイトル、任意の説明文、最大 3 ボタン。iOS/iPadOS/macOS/visionOS はテキストフィールド可。
- 文体は直接的・中立的。タイトルは状況を簡潔に（「Error」「Error 329347 occurred」不可、2 行超不可。完全文なら文頭大文字＋句読点、断片ならタイトルケース）。説明文は価値がある場合のみ。ボタンの説明をしない。テキストフィールドは解決に必要な場合のみ。
- ボタンは 1〜2 語の動詞（View All、Reply）。情報アラートでのみ OK、Yes/No 禁止。キャンセルは常に「Cancel」。既定ボタンに OK を使わない（Erase、Delete 等）。
- 既定ボタンは横並びなら後縁側、縦積みなら最上部。キャンセルは先頭側/最下部。
- 意図していない破壊的アクションに destructive スタイル（意図したもの、例 Empty Trash には不要）。
- 破壊的アクションがあればキャンセルを含める。キャンセルを既定にしない。読ませたいなら既定ボタンなし。単一ボタンなら Done。
- 代替のキャンセル手段（ホームへ、Esc / Command-.）。
- iOS/iPadOS：意図的アクションにはアクションシート。スクロールするアラートを避ける。
- 出典：https://developer.apple.com/design/human-interface-guidelines/alerts

### Page controls（ページコントロール）
- 順序付きページの移動に使う。下部中央に配置。ドットは約 10 個まで。
- カスタムインジケーターはシンプルに（負の空間・文字・内側線なし）。画像は 2 種類まで。色を付けない。
- iOS/iPadOS：スクラブ中はページ遷移をアニメーションしない。背景は Automatic / Prominent（主要ナビのみ）/ Minimal（スクラブ非対応に）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/page-controls

### Popovers（ポップオーバー）
- 少量の情報/機能に。一時的な内容にスペースが欲しいときに検討。
- 矢印が呼び出し元を指すよう配置し、呼び出し元や必要なコンテンツを隠さない。
- Close ボタンは明確さを増す場合のみ。複数選択可なら明示的に閉じるまで開いたまま。
- 非モーダルを自動で閉じるときは必ず保存。破棄は明示的 Cancel のみ。
- 一度に 1 つ。ポップオーバーからポップオーバーを出さない。上に別ビューを出さない（アラート除く）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/popovers

### Scroll views（スクロールビュー）
- 既定のジェスチャーとショートカットをサポート（独自実装でも弾性挙動）。
- スクロール可能と分かるようにする（端に内容を一部見せる）。
- 同じ向きの入れ子禁止（縦の中に横は可）。
- 内容に合えばページ単位スクロール。必要時は自動スクロール（必要最小限）。ズームは適切な最小/最大。
- 出典：https://developer.apple.com/design/human-interface-guidelines/scroll-views

### Sheets（シート）
- 複雑・長時間のフローには別手段（iOS/iPadOS のフルスクリーンモーダル等）。
- メイン UI からは一度に 1 つ。シートからシートなら先に閉じる。
- 親ビューに作用する補助項目には非モーダル（iOS/iPadOS は非モーダルシート）。
- Done には必ず Cancel か Back を併置。Cancel・Done・Back の 3 つ同時は避ける。
- iOS/iPadOS：単一ビューでは Cancel を上部ツールバー先頭側、Done を後縁側。
- デテント：large（全展開）と medium（約半分）。medium 追加で両方、medium のみで全展開不可。iPhone では medium で段階的開示を検討。
- リサイズ可能ならグラバーを表示。スワイプで閉じる操作をサポートし、未保存ならアクションシートで確認。
- iPadOS：page/form シートスタイルを優先。
- 出典：https://developer.apple.com/design/human-interface-guidelines/sheets

## Selection and input（選択と入力）

### Color wells（カラーウェル）
- システム提供のカラーピッカーを検討（iOS/iPadOS/macOS で一貫）。tvOS/watchOS 非対応。
- 出典：https://developer.apple.com/design/human-interface-guidelines/color-wells

### Pickers（ピッカー）
- 中〜長いリストに。短ければプルダウン、非常に大きければリスト/テーブル。
- 予測可能で論理的な順序。ビューを切り替えず、編集フィールドの近く（下部かポップオーバー）に表示。
- 分の粒度を粗くすることを検討（既定 60 値、60 を割り切れる間隔、例 0/15/30/45）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/pickers

### Segmented controls（セグメンテッドコントロール）
- 密接に関連する選択肢に。グループ化と選択状態の明示に有効。
- 1 コントロール内で選択とアクションを混在させない。
- セグメント数：広い UI で約 5〜7、iPhone で約 5 まで。幅と内容サイズを揃える。
- テキストと画像を混在させない。ラベルは名詞、タイトルケース、導入テキスト不要。
- 出典：https://developer.apple.com/design/human-interface-guidelines/segmented-controls

### Sliders（スライダー）
- 価値があれば外観をカスタマイズ。方向は横＝先頭が最小・後縁が最大、縦＝下が最小・上が最大。
- 広い範囲ならテキストフィールド＋ステッパーを併用。
- iOS/iPadOS：音量にスライダーを使わない（volume view）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/sliders

### Steppers（ステッパー）
- 変更する値を明示する。大きな変化が見込まれるならテキストフィールドと併用。
- 出典：https://developer.apple.com/design/human-interface-guidelines/steppers

### Text fields（テキストフィールド）
- 少量の情報に（大量はテキストビュー）。プレースホルダーで目的を示し、別途ラベルも有効。
- 機密データは必ず secure text field。
- 大きさを想定入力量に合わせ、複数フィールドは均等間隔・縦積み・幅統一、Tab 順を論理的に。
- 適切なタイミングで検証（メールは別フィールドへ移ったとき、ユーザー名/パスワードは移る前）。数値は number formatter。
- 出典：https://developer.apple.com/design/human-interface-guidelines/text-fields

### Toggles（トグル）
- 相反する 2 値の選択に（リスト選択はポップアップボタン）。
- 作用対象を明確に。状態の視覚差を明確に（色だけに頼らない）。
- iOS/iPadOS：switch はリスト行内でだけ（ラベル不要）。既定色（緑）は必要時のみ変更しコントラスト確保。リスト外はトグル挙動のボタン（説明ラベルなし）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/toggles

### Virtual keyboards（仮想キーボード）
- 編集内容に合うキーボードを選ぶ（Default / Email address / Number pad / Decimal pad / Phone pad / URL / Web search 等）。textContentType で自動選択を改善。
- 明確になるなら Return キー種別をカスタマイズ（検索なら Search）。
- カスタム入力ビューはアプリの文脈で意味あるものにし、標準キーボード音を鳴らす。
- 出典：https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards

## Status（ステータス）

### Gauges（ゲージ）
- 現在値と両端の簡潔なラベル（VoiceOver 用）。目的を伝えるならグラデーション。
- スタイル：standard/capacity × circular/linear、accessory（ロック画面ウィジェット向け）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/gauges

### Progress indicators（進捗インジケーター）
- 可能なら determinate。進捗は正確に、ペースを均す（5 秒で 90%、残り 10% に 5 分は不可）。
- 動かし続ける。停止時は理由と対処を伝える。
- 可能になったら indeterminate→determinate に切替。円形からバーへ切り替えない。
- 説明は役立つ場合のみ（「loading」「authenticating」は避ける）。一貫した場所に表示。
- 出典：https://developer.apple.com/design/human-interface-guidelines/progress-indicators

## System experiences（システム体験）

### App Shortcuts（App ショートカット）
- 一般的な機能は app schema を優先し、固有機能に App Shortcuts。1 アプリ最大 10 個。
- 最も一般的で重要なタスクに。単一パラメータで選択肢（予測可能な値）。不足情報は追加で尋ね既定候補を提示。
- 音声操作はシンプルに。アプリ内で発見可能に。音声のみデバイス向けに完全なダイアログに重要情報を含める。
- 出典：https://developer.apple.com/design/human-interface-guidelines/app-shortcuts

### Controls（コントロール：コントロールセンター/ロック画面/アクションボタン）
- アプリを起動せずに最も恩恵があるアクションに（例：Live Activity 開始）。
- 操作時・完了時・プッシュで状態を更新。
- 動作を示すシンボル（トグルはオン/オフ両方、例 `door.garage.open`/`.closed`）。状態変化はシンボルアニメーション（長い処理は完了まで）。
- ブランドに合う tint 色。設定が必要なら追加時に促す。アクションボタンのヒントは動詞。可変タイトル/値にはプレースホルダー。
- 出典：https://developer.apple.com/design/human-interface-guidelines/controls

### Live Activities（ライブアクティビティ）
- 明確な開始と終了があるタスクに。8 時間を超えない。
- 一目で必要な情報に絞る。広告禁止。機密情報を表示しない。
- ライト/ダーク両方でアプリの個性に合わせる。ロゴはコンテナなし、アプリアイコン全体は不可。Dynamic Island に注意を引く要素をアプリに追加しない。
- 文字は大きく medium 以上の太さ。
- 必須プレゼンテーション：Compact / Minimal / Expanded / Lock Screen（StandBy は 2x）。
- 幅制限時は compact/minimal を直径 28 pt の円に収める（略記、後縁側を空にすると自動で隠れる）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/live-activities

### Notifications（通知）
- 簡潔で情報価値のある通知。同じ事柄で複数送らない。アプリ内操作を指示する通知を送らない。
- エラーはアラートで、通知を使わない。フォアグラウンド時は目立たない形で提示（バッジ、データ挿入）。機密情報を含めない。
- 文脈を与える短いタイトル（タイトルケース、句読点なし）。汎用タイトルならアプリ名表示に任せる。本文は完全な文、自分で切り詰めない。
- プレビュー非表示時の汎用テキスト（「Friend request」等）。アプリ名/アイコンを含めない。
- サウンドは短く特徴的でプロ品質、重要情報を頼らない。
- 通知アクションは最大 4 つ。文脈で有益、短いタイトルケース。単にアプリを開くだけのアクション禁止。非破壊的を優先。各アクションにアイコン。
- 出典：https://developer.apple.com/design/human-interface-guidelines/notifications

### Snippets（スニペット）
- Siri/App Shortcut の結果または確認。ライト/ダークでコントラストと一定の余白。
- 内容は簡潔、高さは最大 400 pt。詳細はアプリへディープリンク。
- 出典：https://developer.apple.com/design/human-interface-guidelines/snippets

### Status bars（ステータスバー）
- 下のコンテンツをぼかす（既定は透明。裏のコントロールが操作可能に見えないよう scroll edge effect を優先）。
- 全画面メディアでは一時的に隠すことを検討。恒久的に隠さない（1 タップ等で再表示）。
- 出典：https://developer.apple.com/design/human-interface-guidelines/status-bars

### Widgets（ウィジェット）
- アプリの主目的に関係するシンプルなアイデア。アプリアイコンの複製は価値が低い。
- 1 日の中で変化する動的情報を優先。驚きと楽しさの機会を探す。
- 複数サイズは価値があるときだけ。小さい内容を引き伸ばさない。情報密度のバランス。主目的に直接関係する情報だけ。
- ブランド要素は控えめ（小ロゴは右上）。自動表示とユーザー設定を選ぶ。アプリ内にウィジェット風の要素を置かない。サインインで価値が増すなら知らせる。
- 最新に保つ（最終更新時刻の表示を検討）。日時はシステムで更新。プレースホルダーで古いデータを隠さない。更新アニメーションは最大 2 秒。
- 操作はシンプルで関連するものだけ、正しい場所にディープリンク、アプリ風レイアウト禁止、タップ対象サイズに注意（inline は 1 対象）。
- 標準余白 16 pt。詰める場合は 11 pt。角丸はウィジェットと同心（ContainerRelativeShape）。
- システムフォント・SF Symbols 優先。フォントは 11 pt 以上。文字をラスタライズしない。
- 出典：https://developer.apple.com/design/human-interface-guidelines/widgets

### Designing for iPhone Duo（iPhone Duo 向け設計）
- 外側（閉時）・内側（開時）の 2 画面＋ヒンジ。Designing for iOS の原則はそのまま適用。
- **リサイズに耐える作りにする。** サイズクラス・レイアウトマージン・セーフエリアを使い、固定幅や特定画面依存を避ける。外側＝compact 幅、内側＝regular 幅を基本に既存レイアウトを広げる。
- **画面間で一貫した体験にする。** 機能・状態を両画面で同じに。内側では一段深い階層を並べてよい。
- **どのポーズでも同じ機能を提供する。**
- **ツールバー・タブバー・ナビゲーションはシステムの縦配置に従う。** 外側画面は横長のためコントロールが側面へ移る。内側も横向きでは側面のまま。
- 出典: https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo

## Inputs（入力）

### Gestures（ジェスチャ）
- **操作手段を複数用意する。** 音声・キーボード・Switch Control の利用者がいる。特定ジェスチャ前提にしない。
- **反応は人の期待どおりに。** タップ＝起動/選択。標準ジェスチャを独自動作に、標準動作に独自ジェスチャを割り当てない。
- **できる限り即応する。** 操作中にフィードバックで結果と必要な動きを伝える。
- **使えないジェスチャはそれを示す。** 無反応はフリーズや操作ミスと誤解される。
- **カスタムジェスチャは必要時のみ。** 条件：発見しやすい／簡単／他と区別できる／重要操作の唯一の手段にしない。
- **カスタムジェスチャは学びやすく。** 簡単な言葉と図で説明できないなら難しすぎる。
- **ショートカットジェスチャは標準操作の補完で、置き換えではない**（サイドスワイプで戻れても Back ボタンは残す）。
- **システム UI 用ジェスチャと衝突させない。** ゲーム・没入体験ではシステムジェスチャの遅延で対応。
- iOS/iPadOS：**体験が向上するならゲームで複数ジェスチャの同時認識を許可する。**

**標準ジェスチャ（共通）**

| ジェスチャ | 対応 | 一般的な動作 |
|---|---|---|
| タップ | iOS, iPadOS, macOS, tvOS, visionOS, watchOS | コントロール起動、項目選択 |
| スワイプ | 同上 | アクション/コントロール表示、ビュー解除、スクロール |
| ドラッグ | 同上 | UI 要素の移動 |
| タッチ（またはピンチ）＆ホールド | iOS, iPadOS, tvOS, visionOS, watchOS | 追加のコントロール・機能を表示 |
| ダブルタップ | iOS, iPadOS, macOS, tvOS, visionOS, watchOS | ズームイン／ズーム済みならズームアウト。Apple Watch Series 9 / Ultra 2 では primary action |
| ズーム | iOS, iPadOS, macOS, tvOS, visionOS | ビューのズーム、内容の拡大 |
| 回転 | iOS, iPadOS, macOS, tvOS, visionOS | 選択項目の回転 |

**iOS / iPadOS 追加ジェスチャ**

| ジェスチャ | 一般的な動作 |
|---|---|
| 3 本指スワイプ | 左＝取り消し、右＝やり直し |
| 3 本指ピンチ | ピンチイン＝コピー、ピンチアウト＝ペースト |
| 4 本指スワイプ（iPadOS のみ） | アプリ切替 |
| シェイク | 取り消し／やり直し |

- 出典: https://developer.apple.com/design/human-interface-guidelines/gestures

### Keyboards（キーボード）
- ショートカット＝主キー＋修飾キー（Control, Option, Shift, Command）。ゲームのキーバインドは単キーが多い。
- **可能なら Full Keyboard Access に対応する**（iOS/iPadOS/macOS/visionOS。設定＞アクセシビリティで ON にしてテスト）。
- 重要：iPadOS ではテキストフィールド・テキストビュー・サイドバーのキーボードナビゲーションは対応するが、**ボタン・セグメント・スイッチ等のコントロールには付けない。** Full Keyboard Access に任せる。
- **標準ショートカットを尊重する。** 固有の頻出操作にはカスタムを作る。ゲームでも Command–Q は期待されるが、キーバインドは変更可能に。
- **標準ショートカットを別用途に再定義しない。** 例外はその動作が無意味な場合のみ（テキスト編集が無ければ Command–I を Get Info に転用可）。
- 標準表（抜粋）：Command-A 全選択／C コピー／X カット／V ペースト／Z 取り消し／Shift-Command-Z やり直し／F 検索／N 新規／O 開く／S 保存／W 閉じる／Q 終了／Comma 設定／Period キャンセル／Esc キャンセル。
- **カスタムは最頻のアプリ固有コマンドだけに定義する。**
- 出典: https://developer.apple.com/design/human-interface-guidelines/keyboards

### Pointing devices（ポインティングデバイス）
- **マウス／トラックパッドジェスチャへの反応は一貫させる。**
- **システム全体のトラックパッドジェスチャを再定義しない。**
- **ジェスチャ・視線・ポインタ・キーボードで一貫した体験にする。**
- **自動で最小化・フェードするコントロールはポインタで表示／非表示できるようにする。**
- **修飾キー長押し中の操作はタッチでもポインタでも同じ結果に**（Option＋ドラッグ＝複製）。
- iPadOS：ポインタはタッチの置き換えではなく追加手段。
- **必要ならカスタムビューで複数選択を許可する**（iPadOS 15 以降の矩形選択。標準コレクションビューは既定対応）。
- **ポインタと指を区別するのは価値がある場合だけ**（スクラバーの正確なシーク指定）。
- 出典: https://developer.apple.com/design/human-interface-guidelines/pointing-devices

### Apple Pencil and Scribble（Apple Pencil と Scribble）
- **筆記具として直感的に期待される振る舞いに対応する**（余白への書き込み等）。
- **Pencil と指の切替は人に委ねる。** コントロールも Pencil で反応させる（Scribble は Pencil のみ）。
- **触れた瞬間に描けるようにする。** ボタンやモード切替を要求しない。
- **tilt（altitude）・force（pressure）・orientation（azimuth）・barrel roll に応じて表現を変える。** 筆圧は不透明度やブラシサイズなど連続属性に。
- **内容との直接的なつながりを視覚フィードバックで示す。**
- 出典: https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble

### Action button（アクションボタン）
- **本質的な機能群で対応する。** アプリを開くだけのショートカットは不要（システム提供済み）。
- **各アクションに短いラベルを。** Title-style capitalization、動詞始まり、現在形、冠詞・前置詞なし、**最大 3 語**（“Start Race”）。
- **使い方の案内はシステムに任せ、Settings と重複するコンテンツを作らない。**
- iOS：**現在のコンテキストを離れずに使えるようにする。** Live Activities やカスタムスニペットでアプリを開かず完結（“Set Timer”）。
- 出典: https://developer.apple.com/design/human-interface-guidelines/action-button

### Camera Control（カメラコントロール）
- iPhone 16 / 16 Pro 系。軽く押す→オーバーレイ、軽く 2 回押し→一覧、スライドで調整。部品は slider（連続値）と picker（離散値）。
- **SF Symbols で機能を表す**（カスタムシンボル不可。シンボルは現在状態を表さない）。
- **コントロール名は短く**（Dynamic Type に従い、長いとファインダーを隠す）。
- 出典: https://developer.apple.com/design/human-interface-guidelines/camera-control

### Gyroscope and accelerometer（ジャイロスコープと加速度センサー）
- iOS/iPadOS/watchOS で利用可。tvOS は Siri Remote のジャイロ。
- **モーションデータは人に具体的な利益がある場合だけ使う。**
- 出典: https://developer.apple.com/design/human-interface-guidelines/gyro-and-accelerometer

### Game controls（ゲームコントロール）
- 物理コントローラー対応でも既定入力（タッチ等）を併用する（持たない人がいる／慣れた方法を好む）。
- タッチコントロール：仮想ボタンは届きやすい位置に（セーフエリア内、ホームインジケーター・Dynamic Island と重ねない）。頻出コントロールは最小 44x44 pt、メニュー等は最小 28x28 pt。押下状態を視覚＋触覚で示し、動作を伝えるシンボルを使う（A / X / R1 の名称は不可）。移動＝左、カメラ＝右。
- 物理コントローラー：**既定入力方式へのフォールバックを用意。** **必須ならそれを伝える**（tvOS/visionOS で必須指定可、未接続時は接続を促す）。**ペアリングを自動検出。** **接続中コントローラーのラベル・色に合わせる。** **UI 操作の割当：A＝起動、B＝キャンセル／戻る、L/R ショルダー＝左右のセクション移動、スティック／十字＝選択移動、Home＝システム予約、Menu＝設定／ポーズ。** **複数接続に対応し、要素参照はテキストでなく SF Symbols で。**
- キーボード：**単キーを優先**（I＝Inventory、Space＝主アクション）。**Apple キーボードで快適さをテスト**（Control → Command 再割当を検討）。**キーの近接を考慮**（WASD 周辺、数字キー）。**キーバインドはカスタマイズ可能に。**
- 出典: https://developer.apple.com/design/human-interface-guidelines/game-controls

### Focus and selection（フォーカスと選択）
- リモコン・コントローラー・キーボードで部品にフォーカスを移して操作。文脈が大きく変わる場合は選択を別ジェスチャに。
- **システム提供のフォーカスエフェクトに頼る。** カスタムは絶対必要な時のみ。
- **人の操作なしにフォーカスを変えない。** 例外：離散的方向入力で操作中にフォーカス項目が消えた場合は 1 ステップ以内の項目へ。それ以外は表示を隠す。
- 出典: https://developer.apple.com/design/human-interface-guidelines/focus-and-selection

### Nearby interactions（近接インタラクション）
- Ultra Wideband 対応機、要事前許可。iPhone＝距離＋方向、Apple Watch＝距離のみ（フォアグラウンド必須）。
- **物理世界の視点でタスクを捉える。**
- 出典: https://developer.apple.com/design/human-interface-guidelines/nearby-interactions

