# PingMe 管理面板（Loon）

Loon 本地脚本生成的网页账号管理面板。浏览器打开 `http://pingme.manage/` 即可增删改 PingMe 账号备注。

## 安装

1. Loon → 配置 → 插件 → 添加插件，填：

```
https://raw.githubusercontent.com/yuu0402/loon/main/PingMe.plugin
```

2. 或手动在配置里加：

```
[MitM]
hostname = pingme.manage

[Script]
http-request ^https?:\/\/pingme\.manage\/? script-path=https://raw.githubusercontent.com/yuu0402/loon/main/PingMe_Panel.js, requires-body=false, timeout=60, tag=PingMe管理面板
```

3. 开启 MITM 并安装证书，然后手机浏览器访问 `http://pingme.manage/`。

## 功能

- 列出已抓到的 PingMe 账号（`$persistentStore` 键 `pingme_accounts_v1`）
- 修改备注名 `/rename?index=N&name=xxx`
- 删除单个 `/delete?index=N&confirm=1`
- 清空全部 `/clear?confirm=1`

## 注意

- 所有写操作都是 GET，Safari 预加载可能误触，建议改成 POST
- `q.msg` 被 `parseQuery` 和 `decodeURIComponent` 解码两次，msg 含 `%` 会抛异常