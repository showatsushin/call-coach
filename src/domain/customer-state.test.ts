import { describe, expect, it } from "vitest";
import { initialCustomerState, updateCustomerState } from "./customer-state";

describe("customer state rules", () => {
  it("適切な確認で信頼が改善する", () => {
    const result = updateCustomerState(initialCustomerState, "お名前と注文番号を確認します", "check");
    expect(result.trust).toBe("high");
    expect(result.emotion).toBe("calm");
  });

  it("未確認の断定で信頼が低下する", () => {
    const result = updateCustomerState(initialCustomerState, "絶対に届きます", "speak");
    expect(result.trust).toBe("low");
    expect(result.emotion).toBe("frustrated");
  });

  it("責任者引継ぎで解決状態になる", () => {
    expect(updateCustomerState(initialCustomerState, "", "escalate").resolved).toBe(true);
  });
});
