[English](../en/hacker-mode.md) | **日本語**

# ハッカーモード

テーマの上に重ねる、見た目だけのターミナル風エフェクトです。CRT の走査線、蛍光体の発光、タイピングパーティクル、起動シーケンス、ステータスバーの HUD などがあります。ノートが変更されることはありません。

[← ドキュメント索引に戻る](README.md)

## 要件

- なし。すべてのエフェクトはローカルで動作します。

## クイックセットアップ

1. **Hacker mode: Toggle** を実行するか、**Settings → Crystal → Hacker mode** で **Enable hacker mode** をオンにします。
2. **Accent color** を選びます。
3. 不要なエフェクトをオフにします。

## コマンド

| コマンド | 動作 |
|---|---|
| `Hacker mode: Toggle` | ハッカーモードのオン・オフを切り替えます。 |
| `Hacker mode: Play boot sequence` | 起動アニメーションをすぐに再生します。 |
| `Hacker mode: Preview reward banner` | 報酬バナーのサンプルを表示します。 |

## 設定

**Settings → Crystal → Hacker mode**

| 設定 | デフォルト | 説明 |
|---|---|---|
| **Enable hacker mode** | オフ | 以下のすべてのエフェクトをまとめてオン・オフします。 |
| **Accent color** | `#00ff9c` | すべてのエフェクトが使う色。 |
| **CRT overlay** | オン | ウィンドウ全体に走査線、周辺減光、かすかなちらつきを重ねます。 |
| **Phosphor glow** | オン | アクセントカラーのキャレットと、エディターのテキストへの柔らかな発光。 |
| **Typing particles** | オン | キーを押すたびにキャレット位置にかすかな 0/1 の文字を表示し、コンボカウンターも表示します。 |
| **Boot sequence** | オン | 起動時とハッカーモードをオンにしたときに、架空の起動ログを表示します。任意のキーでスキップできます。 |
| **Status bar HUD** | オン | 時計、JS ヒープサイズ、タイピング速度（WPM）とスパークライン。 |
| **Background rain** | オフ | ウィンドウ全体に常にかすかなデジタルレインを表示します。 |
| **Title decode** | オン | ノートを開くと、ノートのタイトルがランダムな文字から復元されるように表示されます。 |
| **Reward banner** | オン | [ゲーミフィケーション](gamification.md)の報酬時に "ACCESS GRANTED" のバナーまたはターミナル風の行も表示します。 |
| **Background rain opacity** | 0.15 | バックグラウンドレインの見えやすさ。0.05〜0.5 の範囲です。 |
| **Preview** | — | **Boot sequence** と **Reward banner** のボタンで、エフェクトをすぐに試せます。 |

## 使用例

起動ログは Vault の情報（バージョン、ノート数、サイズ、プラグイン数）から作られます。例:

```text
CRYSTAL BIOS v0.23.0 — obsidian api 1.10.0
mount /vault/MyVault                 OK
index 1284 notes (12.3 MB)           OK
load modules: 42 plugins             OK
bypass firewall                      WARN
```

## 注意とトラブルシューティング

- **動作が重い**: まず **Background rain** と **CRT overlay** をオフにしてください。どちらもウィンドウ全体を覆います。
- エフェクトが反映するのはアクセントカラーだけです。テーマのその他の色はそのまま残ります。
