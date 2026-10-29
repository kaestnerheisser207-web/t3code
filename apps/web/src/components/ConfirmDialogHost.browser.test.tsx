import { expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import "~/index.css";
import { act, render } from "../../test/render";
import { requestConfirmDialog, resetConfirmDialogForTests } from "../confirmDialog";
import { ConfirmDialogHost } from "./ConfirmDialogHost";

it.each(["Delete this thread?", "删除这个会话？"])(
  "uses the question as the confirmation title: %s",
  async (title) => {
    resetConfirmDialogForTests();
    await using _screen = await render(<ConfirmDialogHost />);
    let answer: Promise<boolean> | undefined;
    await act(() => {
      answer = requestConfirmDialog(`${title}\nThis cannot be undone.`);
    });
    await expect.element(page.getByRole("alertdialog", { name: title })).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(answer).resolves.toBe(false);
  },
);
