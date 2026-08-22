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
- ブラウザのWeb Speech APIを利用した音声入力・顧客発話の読み上げ
- ブラウザメモリ内だけの練習履歴
- 人が候補を確認・承認する研修作成Mock

実AI、独自の外部API、認証、Cloud、実ファイル解析、永続DBは使用していません。音声ファイルの録音・保存・アップロードも行いません。

## 音声デモについて

対応ブラウザでは、受講者の音声認識にWeb Speech Recognition API、顧客発話の読み上げに`window.speechSynthesis`を使用します。音声認識結果は即送信せず、テキスト欄で確認・修正してから既存の会話トレーニングへ送信します。

Web Speech Recognition APIの処理方式はブラウザ・OS・実装に依存します。ブラウザ提供元などの外部音声認識サービスへ音声が送信される可能性があるため、完全なローカル処理とは断言していません。実顧客情報、機密情報、個人情報を音声デモへ入力しないでください。

音声入力が非対応またはマイク権限が許可されていない場合も、テキスト入力で全トレーニングを継続できます。
