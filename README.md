# Karenda — 受験校カレンダー・ツクール

Windows 10/11（64 bit）向けのデスクトップアプリ。添付された 2027 年度入試 Excel の学校データを収録した初期版です。Excel やインターネット接続なしで利用できます。

## Windows で使う

`dist/Karenda-0.1.0-Windows-x64.zip` を展開し、フォルダー内の `Karenda.exe` を起動します。ZIP 内から直接起動せず、全ファイルを展開してください。現時点では署名なしの開発版です。

1. 「生徒・保存設定」で生徒の氏名・番号を設定、または生徒を追加します。
2. 「大学・入試を探す」で検索し、方式を追加します。日程・順位・備考を編集できます。
3. 「受験プラン」で内容を確認し、必要に応じて計画を履歴に保存します。
4. 「カレンダー」で月間・日付順・学校別を切り替え、印刷または PDF に保存します。
5. 「生徒・保存設定」から全生徒分のバックアップを保存できます。

保存先は通常 `%APPDATA%/karenda/students.json`。直前の保存は `students.json.bak` に保管します。端末間の同期はありません。元 Excel の生徒名やサンプル計画は取り込んでいません。

## 開発

Node.js 22 以降と npm を使用します。

```sh
npm ci
npm start
npm test
npm run check
npm run dist:win
```

Windows 配布物は Electron Builder の ZIP ターゲットで生成します。コード署名・自動更新・インストーラーは未実装です。`npm run test:ui` は Chromium による画面テスト、`npm run test:desktop` は Electron 本体による保存・再起動・PDF テストです。Linux では headless Ozone で動作し、UI テスト用 Chromium は `/usr/bin/chromium` を使います（環境に応じて `playwright.config.cjs` を調整）。

学校データを再変換する場合のみ Python と openpyxl が必要です。

```sh
python3 -m pip install openpyxl==3.1.5
python3 scripts/import_excel.py 入力ファイル.xlsm
```

変換処理は VBA を実行せず、Excel の保存済み計算結果を読みます。入力ファイルのシート・列構成が変わった場合はスクリプトの見直しが必要です。生徒情報は変換対象外です。

## 対応範囲

[Excel との機能対応表](docs/excel-parity.md) に実装範囲と差分を記載しています。入試日程は元資料の転記です。大学の募集要項との照合や更新は行っていません。実際の出願前に必ず公式情報を確認してください。
