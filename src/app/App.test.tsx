import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("CallCoach vertical slice", () => {
  it("EMPTY状態からサンプルシナリオを選択できる", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText("トレーニング環境はまだありません")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /サンプル環境で試す/ }));
    expect(screen.getByText("通常注文")).toBeInTheDocument();
    expect(screen.getByText("法人顧客への初回ヒアリング")).toBeInTheDocument();
  });

  it("研修準備でCommunicationStyleを変更できる", async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole("button", { name: /サンプル環境で試す/ }));
    await user.click(screen.getByRole("button", { name: /配達遅延/ }));
    expect(screen.getByText("TRAINING PREPARATION")).toBeInTheDocument();
    expect(screen.getByText("顧客の目的")).toBeInTheDocument();
    const style = screen.getByLabelText("会話スタイル");
    await user.selectOptions(style, "direct");
    expect(style).toHaveValue("direct");
    expect(screen.getByText(/人物の性格を診断/)).toBeInTheDocument();
  });

  it("ConversationActionで練習し結果を保存して再挑戦できる", async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole("button", { name: /サンプル環境で試す/ }));
    await user.click(screen.getByRole("button", { name: /研修準備へ/ }));
    await user.click(screen.getByRole("button", { name: /トレーニングを開始/ }));
    await user.click(screen.getByRole("button", { name: /確認する/ }));
    expect(screen.getByText(/必要な確認によって信頼が改善/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /責任者へ引き継ぐ/ }));
    await user.click(screen.getByRole("button", { name: /採点して終了/ }));
    expect(screen.getByText("TRAINING RESULT")).toBeInTheDocument();
    expect(screen.getByText("会社・業務ルール")).toBeInTheDocument();
    expect(screen.getByText("今回確認できたPortable Skills")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /同じ条件で再挑戦/ }));
    expect(screen.getByText(/LIVE PRACTICE/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "成長" }));
    expect(screen.getByText("配達遅延")).toBeInTheDocument();
  });

  it("研修作成で候補を人が承認しGoodResponsePatternを登録する", async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole("button", { name: /サンプル環境で試す/ }));
    await user.click(screen.getByRole("button", { name: "研修を作る" }));
    await user.click(screen.getByRole("button", { name: /サンプルマニュアルを読み込む/ }));
    expect(screen.getByText(/候補 → 人が確認・修正 → 承認/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ルールを承認/ }));
    expect(screen.getByText("良い応対例を追加")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /応対例を承認/ }));
    expect(screen.getByText("研修へ登録しました")).toBeInTheDocument();
  });

  it("管理者Dashboardとスマートフォン用ナビゲーションを表示する", async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole("button", { name: /サンプル環境で試す/ }));
    expect(screen.getByRole("navigation", { name: "画面切替" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "教育状況" }));
    expect(screen.getByText("共通の弱点")).toBeInTheDocument();
    expect(screen.getByText("配達遅延時の状況確認")).toBeInTheDocument();
    expect(screen.getByText(/架空スタッフのMock/)).toBeInTheDocument();
  });
});
