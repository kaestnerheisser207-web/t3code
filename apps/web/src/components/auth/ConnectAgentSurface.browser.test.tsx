import { createI18n } from "@t3tools/client-runtime/i18n";
import { I18nextProvider } from "react-i18next";
import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { act, render } from "../../../test/render";
import { ConnectAgentSurface } from "./ConnectAgentSurface";

const transport = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("~/lib/runtime", () => ({ runPrimaryHttp: transport.run }));

it("preserves authorization hosts and raw errors when changing the interface language", async () => {
  transport.run.mockReset();
  transport.run.mockResolvedValueOnce({
    kind: "ok",
    value: {
      clientName: "Example client",
      environmentHost: "workspace.example.test",
      redirectHost: "client.example.test",
    },
  });
  const instance = createI18n("zh-CN");
  await using screen = await render(
    <I18nextProvider i18n={instance}>
      <ConnectAgentSurface />
    </I18nextProvider>,
  );
  await expect.element(screen.getByText("workspace.example.test", { exact: true })).toBeVisible();
  const redirectHost = screen.getByText("client.example.test", { exact: false });
  await expect.element(redirectHost).toBeVisible();
  await expect
    .element(redirectHost)
    .toHaveTextContent("client.example.test · 运行此服务的人将获得这些访问权限");
  await expect
    .element(screen.getByRole("button", { name: "批准只读", exact: true }))
    .toBeDisabled();
  await userEvent.fill(screen.getByLabelText("登录码", { exact: true }), "test-code");
  transport.run.mockResolvedValueOnce({
    kind: "error",
    message: "raw: pairing denied [test-code]",
  });
  await userEvent.click(screen.getByRole("button", { name: "批准自动", exact: true }));
  await expect
    .element(screen.getByText("raw: pairing denied [test-code]", { exact: true }))
    .toBeVisible();
  await act(() => instance.changeLanguage("en"));
  await expect
    .element(screen.getByRole("button", { name: "Approve Auto", exact: true }))
    .toBeEnabled();
  await expect
    .element(screen.getByText("raw: pairing denied [test-code]", { exact: true }))
    .toBeVisible();
  expect(transport.run).toHaveBeenCalledTimes(2);
});
