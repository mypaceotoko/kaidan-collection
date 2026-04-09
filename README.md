# 怪談コレクション

昔のサウンドノベル風ホラーゲーム。  
GitHub Pages でそのまま公開できる静的サイト構成です。

**[▶ プレイする](https://mypaceotoko.github.io/kaidan-collection/)**

---

## 遊び方

| 操作           | 動作               |
|----------------|--------------------|
| クリック / タップ | テキストを進める      |
| Space / Enter  | テキストを進める      |
| A キー         | 自動送りのオン/オフ   |
| S キー         | スキップ            |
| Escape         | メニューを開く        |

---

## ローカルで動かす

ES Modules を使っているので、`file://` では開けません。  
簡易 HTTP サーバーを立ち上げてください。

```bash
# Python 3
python3 -m http.server 8000

# Node.js (npx)
npx serve .
```

ブラウザで `http://localhost:8000` を開いてください。

---

## ディレクトリ構成

```
kaidan-collection/
├── index.html              # エントリーポイント
├── src/
│   ├── main.js             # アプリ初期化・イベント配線
│   ├── style.css           # 全スタイル（CSS背景、演出）
│   ├── engine/
│   │   ├── SceneEngine.js  # ゲームループ・シーン進行
│   │   ├── AudioEngine.js  # BGM / SE 再生
│   │   └── SaveManager.js  # localStorage セーブ
│   ├── ui/
│   │   ├── UIManager.js    # DOM 操作まとめ
│   │   ├── TypeWriter.js   # タイプライター演出
│   │   └── Effects.js      # 画面揺れ・フラッシュ・ノイズ
│   ├── utils/
│   │   └── loader.js       # JSON fetch ユーティリティ
│   └── data/
│       └── storyIndex.js   # 収録作品一覧
├── stories/
│   └── chapter1.json       # Episode 1「放課後の教室」
└── assets/
    ├── bgm/                # BGM ファイル置き場 (.mp3)
    ├── se/                 # SE ファイル置き場 (.mp3)
    └── bg/                 # 背景画像置き場 (任意)
```

---

## 新しい話（エピソード）を追加する手順

### 1. シナリオ JSON を作る

`stories/chapter2.json` のように新しいファイルを作成します。  
`stories/chapter1.json` をテンプレートとしてコピーしてください。

**シーン基本形:**
```json
{
  "id":   "scene_id",
  "bg":   "classroom",
  "bgm":  "ambient_dark",
  "se":   "door_creak",
  "text": "ここに本文を書きます。\n改行は \\n を使います。",
  "next": "next_scene_id"
}
```

**選択肢シーン:**
```json
{
  "id":   "choice1",
  "text": "どうする——",
  "choices": [
    { "label": "選択肢A", "next": "scene_a" },
    { "label": "選択肢B", "next": "scene_b" }
  ]
}
```

**エンディングシーン** (`next` は不要):
```json
{
  "id":     "bad_end",
  "bg":     "black",
  "bgm":    null,
  "text":   "最後のテキスト。",
  "ending": { "label": "END A ── タイトル", "type": "bad" }
}
```

`type` は `"bad"` / `"worst"` / `"ambiguous"` でエンディング画面の色が変わります。

### 2. storyIndex.js に登録する

`src/data/storyIndex.js` を開き、配列に追加します:

```js
{
  id:        'chapter2',
  chapter:   'Episode 2',
  title:     '新しい話のタイトル',
  subtitle:  'サブタイトル',
  path:      './stories/chapter2.json',
  available: true,
},
```

`available: false` にすると「近日公開」として表示されます（プレイ不可）。

### 3. 完了

ページをリロードすると話選択画面に追加されます。

---

## 背景・音声を差し替える

### CSS 背景（デフォルト）

シーン JSON の `"bg"` に指定するキーは `src/style.css` の `.bg-{キー}` に対応しています。  
新しい背景を追加する場合は CSS にクラスを追加してください。

```css
.bg-rooftop_night {
  background: linear-gradient(to bottom, #02020a 0%, #080818 100%);
}
```

### 実際の背景画像

`assets/bg/` に画像を置き、`"bg"` に相対パスを指定します:

```json
{ "bg": "./assets/bg/classroom_night.jpg" }
```

### BGM / SE

`assets/bgm/` と `assets/se/` に `.mp3` ファイルを置き、  
`src/engine/AudioEngine.js` の `_bgmPaths` / `_sePaths` にキーとパスを追加します。

```js
this._bgmPaths = {
  ambient_dark: './assets/bgm/ambient_dark.mp3',
  // ...
};
```

シーン JSON で `"bgm": "ambient_dark"` と書けば自動で再生されます。

---

## シーンで使える `effects`

```json
"effects": [
  { "type": "shake" },
  { "type": "flash",      "color": "white" },
  { "type": "static",     "duration": 1000 },
  { "type": "flicker" },
  { "type": "fade_black", "duration": 600 }
]
```

---

## GitHub Pages で公開する

1. リポジトリを GitHub に push  
2. リポジトリの **Settings → Pages**  
3. Source: `Deploy from a branch` → `main` / `/ (root)`  
4. 数分後に `https://{username}.github.io/{repo}/` で公開されます

---

## ライセンス

MIT
