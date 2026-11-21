# WeSync Pro 解锁方案（MITM 改写版）

## 为什么不是改 IPA

这应用是 Flutter 编译的，Dart 代码全部 AOT 编译进 `App.framework`（Dart 3.11.5，太新，blutter 全系不支持；iOS Mach-O 支持上游自己都还挂着 TODO）。快照里对象引用全是集群序列化占位符，静态找不到会员判断点。

但侦察发现更肥的路子：**会员状态完全由服务器一个接口说了算**。

## 侦察结论

- 后端：Supabase（hs.wesync.cloud）+ API 网关（cf.wesync.cloud / hs.wesync.cloud 双边缘）
- 会员状态接口：`GET /api/subscription/status`
- 免费用户实测响应：`{"success":true,"data":{"is_active":false,"auto_renew":false}}`
- 付费形态字段（二进制里挖到的键名）：`is_active` / `auto_renew` / `pro_entitled` / `expires_at` / `trial_granted` / `trial_expires_at` / `store` / `sub_trial`
- 无证书锁定（标准 dart:io TLS，信系统 CA）→ Loon MITM 直接能吃
- 试用接口 `/api/pro-trial/claim` 有 App Attest 验证，模拟不了（想用官方 7 天试用就在 App 里自己点）

## 用法

1. 把 `WeSyncPro.plugin` 和 `WeSyncPro.js` 两个文件一起导入 Loon（配置 → 插件/脚本 → 本地导入，两个文件放同一批）
2. 确认 Loon 的 MITM 已开、CA 证书已安装并在 设置→通用→关于本机→证书信任设置 里信任
3. 杀掉 WeSync 后台重开（状态是启动时拉取的）
4. 进会员页看效果：应显示 Pro 激活、到期 2099

## 能解锁什么 / 不能解锁什么

- ✅ 所有客户端侧 Pro 门禁（界面、画质、功能开关）——客户端只认这个接口
- ⚠️ 云端房间的"房主 Pro"如果服务器侧二次校验（建房请求查数据库），则仍需真 Pro——此时在 App 里领官方 7 天试用顶上（每设备一次）
- ⚠️ 接口响应字段若随版本大改，插件需同步更新（目前 3.24.1 实测）

## 测试账号（技术验证用，可弃）

yk1795266459@euploading.com / WsyTest1795266459Aa（邮箱是 mail.tm 一次性邮箱）
