import type { linkStatusEn } from "./link-status.en.ts";
export const linkStatusZhCN = {
  "auth.agent.createCode": "请在 设置 → 共享与访问 中创建一个，或在此机器上运行 <command/>。",
  "link.forget":
    "移除与 {{environment}} 的关联？此处的编程代理将停止在那里工作。若要同时结束远端会话，请到 {{environment}} 的“连接”设置中撤销“T3 Code · …”。",
  "link.waitingOriginal": "等待你在发起请求的会话中回应",
  "link.linked": "已关联 {{environment}}",
  "link.declined": "已拒绝",
  "link.failed": "无法关联：{{error}}",
  "link.refused": "另一端环境拒绝了请求",
  "link.ended": "请求已结束",
} as const satisfies Record<keyof typeof linkStatusEn, string>;
