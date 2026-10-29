import type { agentAuthEn } from "./agent-auth.en.ts";
export const agentAuthZhCN = {
  "auth.agent.connect": "连接 {{client}}",
  "auth.agent.scope": "此代理希望使用 <host/> 上每个项目中的会话。",
  "auth.agent.localRedirect":
    "名称由代理选择。批准后将回到打开此页面的那台计算机上的 {{host}}。请只批准你刚刚发起的登录。",
  "auth.agent.remoteRedirect":
    "名称由代理选择。批准后，运行 <host/> 的人将获得访问权限。请只批准你在该处刚刚发起的登录。",
  "auth.agent.unreachable": "无法连接到该环境，请重试。",
  "auth.agent.failed": "登录无法继续。",
  "auth.agent.approving": "正在批准…",
  "auth.agent.approve": "批准",
  "auth.agent.denying": "正在拒绝…",
  "auth.agent.deny": "拒绝",
  "auth.agent.signIn": "代理登录",
} as const satisfies Record<keyof typeof agentAuthEn, string>;
