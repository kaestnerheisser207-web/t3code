import type { notificationDialogsEn } from "./notification-dialogs.en.ts";
export const notificationDialogsZhCN = {
  "mobile.notifications.install-a-newer-app-build-to-enable-notifications":
    "安装更新版本的应用以启用通知",
  "mobile.notifications.notifications-unavailable": "通知不可用",
  "mobile.notifications.could-not-request-notification-permission": "无法请求通知权限。",
  "mobile.notifications.notifications-enabled": "通知已启用",
  "mobile.notifications.agent-notifications-are-enabled-for-this-device":
    "此设备已启用编程代理通知。",
  "mobile.notifications.couldn-t-finish-enabling-notifications": "未能完成通知启用",
  "mobile.notifications.notification-access-was-granted-but-this-device-could-not-be-registered-with-t3-connect-notifications-will-start-once-registration-succeeds":
    "通知权限已授予，但此设备未能注册到 T3 Connect。注册成功后通知才会开始送达。",
  "mobile.notifications.agent-notifications-are-unavailable-on-this-platform":
    "此平台不支持编程代理通知。",
  "mobile.notifications.notifications-disabled": "通知已关闭",
  "mobile.notifications.notifications-were-not-enabled": "通知未启用。",
  "mobile.notifications.notifications-were-denied-for-this-app-open-settings-to-enable-them":
    "此应用的通知权限已被拒绝。请打开“设置”以启用通知。",
  "mobile.notifications.cancel": "取消",
  "mobile.notifications.open-settings": "打开设置",
  "mobile.notifications.sign-in-to-t3-connect": "登录 T3 Connect",
  "mobile.notifications.live-activity-updates-require-t3-connect-so-relay-can-deliver-updates-to-this-device":
    "实时活动更新需要 T3 Connect，以便中继服务能把更新送达此设备。",
  "mobile.notifications.ongoing-activity-unavailable": "持续活动不可用",
  "mobile.notifications.could-not-enable-agent-notifications": "无法启用编程代理通知。",
  "mobile.notifications.notification-permission-needed": "需要通知权限",
  "mobile.notifications.enable-notifications-in-system-settings-to-show-ongoing-agent-activity":
    "请在系统“设置”中启用通知，以显示正在进行的编程代理活动。",
  "mobile.notifications.live-activities-unavailable": "实时活动不可用",
  "mobile.notifications.could-not-enable-agent-activity-updates": "无法启用编程代理活动更新。",
  "mobile.notifications.ongoing-activity-enabled": "持续活动已启用",
  "mobile.notifications.live-activities-enabled": "实时活动已启用",
  "mobile.notifications.agent-activity-updates-are-enabled-for-environments-this-connection-can-configure":
    "已为此连接可配置的环境启用编程代理活动更新。",
  "mobile.notifications.agent-activity-updates-are-enabled-add-an-environment-to-start-receiving-updates":
    "编程代理活动更新已启用。添加一个环境即可开始接收更新。",
  "mobile.notifications.couldn-t-finish-enabling-activity-updates": "未能完成活动更新启用",
  "mobile.notifications.this-device-could-not-be-registered-with-t3-connect-so-activity-updates-won-t-appear-yet-they-ll-start-once-registration-succeeds":
    "此设备未能注册到 T3 Connect，因此活动更新暂不会显示。注册成功后即会开始送达。",
  "mobile.notifications.disable-notifications": "关闭通知",
  "mobile.notifications.open-system-settings-to-disable-notifications-for-t3-code":
    "请打开系统“设置”以关闭 T3 Code 的通知。",
  "mobile.notifications.agent-live-updates": "编程代理实时更新",
  "mobile.notifications.ongoing-agent-activity": "正在进行的编程代理活动",
  "mobile.notifications.live-activity-updates": "实时活动更新",
  "mobile.notifications.couldn-t-open-settings": "无法打开设置",
  "mobile.notifications.open-android-settings-select-t3-code-then-enable-live-updates-in-notifications":
    "打开 Android 设置，选择 T3 Code，然后在“通知”中启用实时更新。",
} as const satisfies Record<keyof typeof notificationDialogsEn, string>;
