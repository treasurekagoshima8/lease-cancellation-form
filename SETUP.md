# 賃貸借契約解約申込Webツール セットアップ手順書

## 概要

このツールは、賃貸借契約の解約申込をWebフォームで受け付け、Googleスプレッドシートで管理するシステムです。

## 構成ファイル

```
treasure-company/
├── index.html          # 解約申込フォーム（入居者向け）
├── admin.html          # 管理者設定画面
├── css/
│   └── style.css       # スタイルシート
├── js/
│   ├── form.js         # フォーム処理
│   ├── pdf.js          # PDF生成
│   ├── api.js          # API連携
│   └── admin.js        # 管理画面処理
├── gas/
│   └── main.gs         # Google Apps Script
└── materials/          # 元資料
```

## セットアップ手順

### Step 1: Googleスプレッドシートの作成

1. [Google スプレッドシート](https://sheets.google.com)にアクセス
2. 「空白のスプレッドシート」を新規作成
3. スプレッドシートに名前を付ける（例：「解約申込管理」）

### Step 2: Google Apps Scriptの設定

1. スプレッドシートで「拡張機能」→「Apps Script」をクリック
2. `gas/main.gs` の内容をすべてコピーして貼り付け
3. 「プロジェクトを保存」（Ctrl/Cmd + S）

### Step 3: 初期化スクリプトの実行

1. Apps Script画面で「関数を選択」から `initializeSpreadsheet` を選択
2. 「実行」ボタンをクリック
3. 初回実行時は権限の承認が必要です
   - 「権限を確認」をクリック
   - Googleアカウントを選択
   - 「詳細」→「〇〇（安全ではないページ）に移動」
   - 「許可」をクリック
4. スプレッドシートに「申込データ」と「設定」シートが作成されます

### Step 4: Webアプリとしてデプロイ

1. Apps Script画面で「デプロイ」→「新しいデプロイ」をクリック
2. 「種類の選択」で歯車アイコン→「ウェブアプリ」を選択
3. 設定:
   - 説明: 任意（例：「解約申込フォーム API」）
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
4. 「デプロイ」をクリック
5. **ウェブアプリのURL** をコピー

### Step 5: APIのURL設定

1. `js/api.js` を開く
2. 以下の行を見つけて、コピーしたURLを貼り付け:
   ```javascript
   const API_URL = '';  // ← ここにURLを貼り付け
   ```
   例:
   ```javascript
   const API_URL = 'https://script.google.com/macros/s/xxxxx/exec';
   ```
3. ファイルを保存

### Step 6: GitHub Pagesでの公開

#### 6-1. GitHubリポジトリの作成

1. [GitHub](https://github.com)にログイン
2. 「New repository」をクリック
3. リポジトリ名を入力（例：`lease-cancellation-form`）
4. 「Public」を選択
5. 「Create repository」をクリック

#### 6-2. ファイルのアップロード

```bash
# リポジトリを初期化（まだの場合）
cd treasure-company
git init
git add .
git commit -m "Initial commit"

# GitHubにプッシュ
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
git branch -M main
git push -u origin main
```

#### 6-3. GitHub Pagesの有効化

1. GitHubリポジトリページで「Settings」をクリック
2. 左メニューから「Pages」を選択
3. Source: 「Deploy from a branch」を選択
4. Branch: `main` / `/ (root)` を選択
5. 「Save」をクリック
6. 数分後、URLが表示されます（例：`https://ユーザー名.github.io/リポジトリ名/`）

## 使い方

### 入居者向け（解約申込フォーム）

1. 公開URLにアクセス
2. フォームに必要事項を入力
3. 「申込を送信」→ スプレッドシートに保存
4. 「PDFをダウンロード」→ 申込書PDFを取得

### 管理者向け（設定画面）

1. `公開URL/admin.html` にアクセス
2. パスワードでログイン（初期パスワード: `admin123`）
3. 設定可能な項目:
   - 入力項目の表示/非表示
   - 解約事由の選択肢
   - 電話種別の選択肢
   - 携帯所有者の選択肢
   - パスワード変更

### 申込データの確認

Googleスプレッドシートの「申込データ」シートで確認できます。

---

## 本番環境への移行手順

開発・テスト完了後、本番用アカウントに移行する場合の手順です。

### 1. Googleスプレッドシートの移行

1. **本番用Googleアカウント**でGoogleスプレッドシートを新規作成
2. 「拡張機能」→「Apps Script」を開く
3. `gas/main.gs` のコードを貼り付け
4. `initializeSpreadsheet` を実行してシートを初期化
5. 「デプロイ」→「新しいデプロイ」でWebアプリをデプロイ
6. **新しいウェブアプリURL**を取得

### 2. GitHubリポジトリの移管

1. 開発用リポジトリで「Settings」→「General」→ 最下部「Danger Zone」
2. 「Transfer ownership」をクリック
3. 本番用GitHubアカウント名を入力
4. 確認してTransfer
5. 本番用アカウントで招待を承認

### 3. 設定の更新

1. 本番用アカウントでリポジトリをクローン
2. `js/api.js` の `API_URL` を新しいURLに変更
3. コミット・プッシュ
4. GitHub Pagesを再度有効化

### 4. 移行後の確認

- [ ] フォームが表示される
- [ ] データがスプレッドシートに保存される
- [ ] PDFが正しく出力される
- [ ] 管理画面にログインできる
- [ ] 設定変更が反映される

---

## トラブルシューティング

### データがスプレッドシートに保存されない

1. `js/api.js` の `API_URL` が正しく設定されているか確認
2. Apps Scriptのデプロイが「全員」にアクセス可能か確認
3. ブラウザのコンソール（F12）でエラーを確認

### PDFが日本語で表示されない

- インターネット接続を確認（フォントをCDNから読み込みます）
- ブラウザを更新して再試行

### 管理画面にログインできない

- 初期パスワード: `admin123`
- スプレッドシートの「設定」シートでパスワードを確認

---

## 技術仕様

- **フロントエンド**: HTML5, CSS3, JavaScript (Vanilla JS)
- **PDF生成**: jsPDF (CDN)
- **日本語フォント**: Noto Sans JP (CDN)
- **バックエンド**: Google Apps Script
- **データ保存**: Google スプレッドシート
- **ホスティング**: GitHub Pages

## ライセンス

このプロジェクトは内部利用を目的としています。
