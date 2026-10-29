import type { runtimeOptionsEn } from "./runtime-options.en.ts";
export const runtimeOptionsZhCN = {
  "runtime.supervised": "受监督",
  "runtime.supervisedDescription": "执行命令和修改文件前先征求批准。",
  "runtime.autoEdits": "自动接受编辑",
  "runtime.autoEditsDescription": "自动批准编辑，其他操作仍需先征求批准。",
  "runtime.auto": "自动",
  "runtime.autoDescription": "仅受支持的提供方会自动批准常规操作；其他提供方仍会先征求批准。",
  "runtime.full": "完全访问",
  "runtime.fullDescription": "执行命令和编辑时无需批准提示。",
  "followUp.queue": "排队",
  "followUp.queueDescription": "你的消息会先排队，等当前轮次结束后再执行。",
  "followUp.steer": "即时引导",
  "followUp.steerDescription": "你的消息会立即送达编程代理，并改变它正在进行的任务。",
  "runtime.readOnly": "只读",
  "runtime.readOnlyDescription": "读取项目和会话。不能启动会话、发送消息或进行任何更改。",
} as const satisfies Record<keyof typeof runtimeOptionsEn, string>;
