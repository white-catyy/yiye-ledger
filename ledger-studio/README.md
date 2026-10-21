# 一页账

面向大学生的轻量记账 App。首页以「今日账页」展示当天支出，支持直接修改流水并自动更新汇总与预算。

## 功能

- 查看今日累计、笔数、昨日对比和本月预算进度
- 新增、编辑或删除今日流水
- 自定义分类、名称、金额、时间和备注
- 首次启动为空账本，金额和预算由用户填写
- 本地自动保存流水、预算和主题
- 明细页按日期展示本月流水，不再重复首页
- 我的页面统一提供预算、主题颜色和数据设置
- 支持预设主题色和自定义十六进制颜色

## 运行

```bash
npm install
npx expo start
```

优先使用 Expo Go 扫码预览。Web 预览：

```bash
npm run web
```

## 验证

```bash
npx tsc --noEmit
npx expo export --platform web --output-dir dist
```

`scripts/verify-app.mjs` 会在本地 Web 服务运行时执行编辑、校验、新增、刷新持久化、删除、空状态和导航回归，并生成首页与编辑表单预览图。

## Android APK

可直接安装的 ARM64 测试版 APK（修复按钮触控、状态栏避让和页面重复问题）：

```text
https://github.com/white-catyy/yiye-ledger/releases/download/v1.1.0/yiye-ledger-v1.1.0-arm64.apk
```

- 应用名称：一页账
- 包名：`com.yiye.ledger`
- 版本：`1.1.0 (2)`
- 支持架构：`arm64-v8a`
- SHA-256：`E03D304AF9882083345E7112FE1DD2A0E6716FCD14DBB79AAE998DB149A0E34A`

当前 APK 使用 Android 调试证书签名，适合本机安装和内部测试。准备发布到应用商店时，需要生成并妥善保管正式发布证书。仓库外仍保留包含四种架构的通用 APK 构建文件。
