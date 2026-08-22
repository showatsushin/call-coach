# CallCoach

会社の正しい応対をもとに、受講者がひとりで何度でも練習できる研修アプリの第1弾モックです。

> 仕事を覚える。自分のスキルも伸ばす。

## 公開デモ

公開予定URL：<https://showatsushin.github.io/call-coach/>

GitHub Pages公開後に上記URLから確認できます。

## ローカル実行

```bash
npm ci
npm run dev
```

## 検証

```bash
npm test
npm run lint
npm run build
npm audit
```

production buildは`build-output/`へ生成されます。

## 第1弾の範囲

- 架空データによる接客・電話対応、営業トレーニング
- 決定論的なCheckpoint評価
- ルールベース顧客シミュレーター
- ブラウザメモリ内だけの練習履歴
- 人が候補を確認・承認する研修作成Mock

実AI、音声処理、認証、Cloud、外部API、実ファイル解析、永続DBは使用していません。
