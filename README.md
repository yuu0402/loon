# yuu0402/loon

Loon 插件与脚本集合。目前两套，共用同一个 `$persistentStore` 键 `pingme_accounts_v1`，互相对得上。

| 文件 | 作用 |
|---|---|
| `PingMe.js` | 主脚本：抓包入库 + 自动签到 + 视频奖励 |
| `PingMe_Panel.js` | 网页管理面板：`http://pingme.manage/` 改备注、删号、清库 |
| `PingMe.plugin` | 上面两个打包成 Loon 插件 |

## 安装

Loon → 配置 → 插件 → 添加：

```
https://raw.githubusercontent.com/yuu0402/loon/main/PingMe.plugin
```

手动写进配置也可以：

```
[MitM]
hostname = api.pingmeapp.net, pingme.manage

[Script]
http-request ^https:\/\/api\.pingmeapp\.net\/app\/queryBalanceAndBonus script-path=https://raw.githubusercontent.com/yuu0402/loon/main/PingMe.js, requires-body=false, timeout=60, tag=PingMe抓包
http-request ^https?:\/\/pingme\.manage\/? script-path=https://raw.githubusercontent.com/yuu0402/loon/main/PingMe_Panel.js, requires-body=false, timeout=60, tag=PingMe管理面板

[Task]
cron "30 8,20 * * *" script-path=https://raw.githubusercontent.com/yuu0402/loon/main/PingMe.js, tag=PingMe签到, enabled=true
```

`[Task]` 那行如果你的 Loon 版本不认 `cron "..."` 前缀，去掉 `cron ` 直接写 `30 8,20 * * * script-path=..., tag=..., enabled=true`。

## 用法

1. 开 MITM + 装证书（`api.pingmeapp.net` 走 https，必须解密）
2. 打开 PingMe App，触发一次 `queryBalanceAndBonus` 请求 → 脚本抓参数入库，弹「✅ 新账号已入库」
3. 浏览器开 `http://pingme.manage/` 改备注 / 删号
4. 每天 8:30、20:30 自动跑签到 + 5 次视频奖励，结果推通知

## 实测记录（2026-11-10，vm 沙箱 mock Loon 环境）

- 抓包入库：1 个账号，指纹 `f48c27b58a6f` = `MD5("uniquedeviceid=ABCD-1111").slice(0,12)`，与本地 md5sum 一致
- 同设备第二次抓包（sign/signDate/timestamp 都变）不新增账号，只更新参数 ✅
- 定时任务：8 个请求 `queryBalanceAndBonus → checkIn → videoBonus×5 → queryBalanceAndBonus` ✅
- 通知正文完整：余额 / 签到 / 视频 1-5 / 最新余额 / 视频累计 ✅
- 签名 32 位 hex，`signDate` 为 UTC 时间 ✅

## 已知问题

1. **`$argument` 的管理指令是死代码**：`manageAccountsIfNeeded()` 定义完整（`list` / `del:N` / `rename:N:名字`），但主流程 `else` 分支从头到尾没调用它，实测传 `action=list` 毫无反应，直接跑签到。
2. **多账号会撞 Loon 任务时限**：单账号约 38s（5 次视频 × 8s + 1.5s + 请求），账号间隔 3.5s，2 个号 ≈ 80s。`RUN_ALL_ACCOUNTS=true` 一次全跑，账号一多大概率被后台掐断。
3. `RUN_ALL_ACCOUNTS`、`toBool()` 定义了没用上。
4. 视频 `bonus` 为 0 时显示 `+?`，不是 `+0`。
5. 面板写操作全是 GET，`/clear?confirm=1` 一个 `<img>` 就能触发。
6. 面板 `q.msg` 被解码两次，`/?msg=100%25` 直接抛 `URIError`。