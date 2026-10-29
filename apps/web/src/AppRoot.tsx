import { RouterProvider } from "@tanstack/react-router";

import { ElectronBrowserHost } from "./browser/ElectronBrowserHost";
import { QuitHoldOverlay } from "./components/QuitHoldOverlay";
import { AppAtomRegistryProvider } from "./rpc/atomRegistry";
import type { AppRouter } from "./router";
import { LanguageProvider } from "./i18n";
import { LanguageSync } from "./LanguageSync";

// Keep webviews outside the router but inside its atom registry so route changes preserve them.
export function AppRoot({ router }: { readonly router: AppRouter }) {
  return (
    <AppAtomRegistryProvider>
      <LanguageProvider>
        <LanguageSync />
        <RouterProvider router={router} />
        <ElectronBrowserHost />
        <QuitHoldOverlay />
      </LanguageProvider>
    </AppAtomRegistryProvider>
  );
}
