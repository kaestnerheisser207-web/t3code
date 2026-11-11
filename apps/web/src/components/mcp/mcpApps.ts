import { webI18n } from "../../i18n";
import chatgptLogo from "./logos/chatgpt.png";
import claudeLogo from "./logos/claude.png";
import geminiLogo from "./logos/gemini.png";
import grokBotLogo from "./logos/grokbot.png";
import hermesLogo from "./logos/hermes.png";
import instinctLogo from "./logos/instinct.png";
import museLogo from "./logos/muse.png";
import openClawLogo from "./logos/openclaw.png";
import pokeLogo from "./logos/poke.png";

/** How the Connect step hands T3 Code's MCP URL to an app. Every `link` is https. */
export type McpAppHandoff =
  /** Opens the app's add form with T3 Code filled in. */
  | { readonly kind: "open"; readonly link: (mcpUrl: string) => string }
  /** Copies the URL, then opens the page it goes on. */
  | { readonly kind: "copy-url"; readonly link: string }
  /** Copies a message for the app's chat, then opens the app. */
  | {
      readonly kind: "copy-message";
      readonly link: string;
      /**
       * Opens the installed app first, given the message; `link` is the fallback. The desktop
       * app opens only the link shapes `APP_LAUNCH_URLS` in ElectronShell lists.
       */
      readonly appLink?: (message: string) => string;
      readonly message: (mcpUrl: string) => string;
    }
  /** Commands to run where the app runs. */
  | { readonly kind: "commands"; readonly commands: (mcpUrl: string) => readonly string[] };

export interface McpApp {
  readonly id: string;
  readonly name: string;
  readonly logo: string;
  readonly handoff: McpAppHandoff;
  /** "Set up another way", next to the URL. */
  readonly steps: readonly string[];
  /** One line under the primary action. */
  readonly note?: string;
  readonly docs?: string;
  /** Kept out of the grid until its sign-in works. */
  readonly hidden?: boolean;
}

const encoded = encodeURIComponent;

export const MCP_APPS: readonly McpApp[] = [
  {
    id: "poke",
    name: "Poke",
    logo: pokeLogo,
    handoff: {
      kind: "open",
      link: (url) => `https://poke.com/integrations/new?name=T3%20Code&url=${encoded(url)}`,
    },
    get steps() {
      return [webI18n.t("release4491.mcp-step-0"), webI18n.t("release4491.mcp-step-1")];
    },
    docs: "https://poke.com/docs/mcp-servers",
  },
  {
    id: "claude",
    name: "Claude",
    logo: claudeLogo,
    handoff: {
      kind: "open",
      link: (url) =>
        `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=T3%20Code&connectorUrl=${encoded(url)}`,
    },
    get steps() {
      return [
        webI18n.t("release4491.mcp-step-2"),
        webI18n.t("release4491.mcp-step-3"),
        webI18n.t("release4491.mcp-step-4"),
      ];
    },
    docs: "https://claude.com/docs/connectors/building/directory-vs-custom",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    logo: chatgptLogo,
    handoff: { kind: "copy-url", link: "https://chatgpt.com/plugins" },
    get steps() {
      return [
        webI18n.t("release4491.mcp-step-5"),
        webI18n.t("release4491.mcp-step-6"),
        webI18n.t("release4491.mcp-step-7"),
      ];
    },
    docs: "https://developers.openai.com/api/docs/guides/custom-mcp-server",
  },
  {
    id: "grok-bot",
    name: "Grok Bot",
    logo: grokBotLogo,
    // No web chat, and no link that prefills a message yet (Grok Bot plans one), so the app
    // opens bare and the copied message is pasted in.
    handoff: {
      kind: "copy-message",
      link: "https://x.ai/bot",
      appLink: () => "grokbot://app",
      message: (url) => `Add the MCP server ${url} and connect it.`,
    },
    get steps() {
      return [webI18n.t("release4491.mcp-step-8")];
    },
    get note() {
      return webI18n.t("release4491.mcp-step-9");
    },
    docs: "https://docs.x.ai/grok-bot/computer-and-apps",
  },
  {
    id: "gemini",
    name: "Gemini",
    logo: geminiLogo,
    handoff: { kind: "copy-url", link: "https://gemini.google.com/apps" },
    get steps() {
      return [webI18n.t("release4491.mcp-step-10"), webI18n.t("release4491.mcp-step-11")];
    },
    docs: "https://support.google.com/gemini/answer/17209137",
    // Gemini's sign-in and its tool schema checks do not work with T3 Code yet.
    hidden: true,
  },
  {
    id: "muse",
    name: "Muse",
    logo: museLogo,
    handoff: {
      kind: "copy-message",
      link: "https://muse.ai",
      message: (url) => `Create a custom connector for the MCP server ${url}.`,
    },
    get steps() {
      return [webI18n.t("release4491.mcp-step-12")];
    },
    docs: "https://www.meta.com/help/artificial-intelligence/1687253048996149/",
  },
  {
    id: "instinct",
    name: "Instinct",
    logo: instinctLogo,
    handoff: {
      kind: "copy-message",
      link: "https://app.instinct.com",
      message: (url) => `Connect the MCP server ${url}.`,
    },
    get steps() {
      return [webI18n.t("release4491.mcp-step-13")];
    },
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    logo: openClawLogo,
    handoff: {
      kind: "commands",
      commands: (url) => [
        // Its MCP commands refuse to write while the Gateway runs.
        "openclaw gateway stop",
        `openclaw mcp add t3code --url ${url} --transport streamable-http --auth oauth`,
        "openclaw mcp login t3code",
        "openclaw gateway start",
      ],
    },
    get steps() {
      return [
        webI18n.t("release4491.mcp-step-14"),
        webI18n.t("release4491.mcp-step-15"),
        "Select Sign in for it under Settings → MCP.",
      ];
    },
    docs: "https://docs.openclaw.ai/tools/mcp",
  },
  {
    id: "hermes-agent",
    name: "Hermes Agent",
    logo: hermesLogo,
    handoff: {
      kind: "commands",
      commands: (url) => [
        // `add` signs in on its first connection (30 s by default, too short to get a code);
        // `login` would clear that sign-in and need a second code.
        `hermes mcp add t3code --url ${url} --auth oauth --connect-timeout 315`,
      ],
    },
    get steps() {
      return [webI18n.t("release4491.mcp-step-17"), webI18n.t("release4491.mcp-step-18")];
    },
    get note() {
      return webI18n.t("release4491.mcp-step-19");
    },
    docs: "https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp",
  },
];

/** The "Something else…" choice: the URL and general steps only. */
export const OTHER_MCP_APP_STEPS = ["release4491.mcp-step-20"] as const;

/**
 * The primary button for `app`: its label, the https page it opens, and what it copies first.
 * Null for apps set up with commands. It never copies the approval code.
 */
export function mcpHandoffAction(app: McpApp, mcpUrl: string) {
  const { handoff } = app;
  switch (handoff.kind) {
    case "open":
      return {
        label: webI18n.t("release4491.text500", { value0: app.name }),
        link: handoff.link(mcpUrl),
        appLink: null,
        copy: null,
      };
    case "copy-url":
      return {
        label: webI18n.t("release4491.text501", { value0: app.name }),
        link: handoff.link,
        appLink: null,
        copy: { text: mcpUrl, title: webI18n.t("release4491.text502") },
      };
    case "copy-message": {
      const message = handoff.message(mcpUrl);
      return {
        label: webI18n.t("release4491.text503", { value0: app.name }),
        link: handoff.link,
        appLink: handoff.appLink?.(message) ?? null,
        copy: { text: message, title: webI18n.t("release4491.text504") },
      };
    }
    case "commands":
      return null;
  }
}
