import type { sourceControlEn } from "./source-control.en.ts";

export const sourceControlZhCN = {
  "sourceControl.supportComingSoon": "即将支持 {{provider}}。",
  "sourceControl.unavailable": "该服务器上不可用：{{hint}}",
  "sourceControl.authenticatedAccount": "已通过认证，账户：<account/>",
  "sourceControl.availableHint": "可用。{{hint}}",
  "sourceControl.hostsDisabled": "所有 {{provider}} 主机连接均已禁用。",
  "sourceControl.signInHint":
    "该服务器上的 <provider/> 尚未认证。请在服务器主机上使用 <command/> 工具登录或配置凭据，以启用变更请求功能。",
  "sourceControl.verifyFailed": "无法验证 {{provider}}。{{detail}}",
  "sourceControl.notAuthenticated": "未认证",
  "sourceControl.statusUnknown": "状态未知",
} as const satisfies Record<keyof typeof sourceControlEn, string>;
