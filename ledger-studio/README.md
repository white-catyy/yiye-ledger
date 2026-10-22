# 一页账

面向大学生的轻量记账 App。首页以「今日账页」展示当天支出，明细页通过月历管理历史流水，并支持完整的本地数据迁移。

## 功能

- 查看今日累计、笔数、昨日对比和本月预算进度
- 新增、编辑或删除今日流水
- 月历按日查看、编辑和补记今天及过去日期的流水
- 未来日期禁用，切换月份时保留同一天号并自动处理月末
- 自定义分类、名称、金额、时间和备注
- 首次启动为空账本，金额和预算由用户填写
- 本地自动保存流水、预算和主题
- “我的”页面统一提供预算，以及默认折叠的主题和数据设置
- 支持预设主题色和自定义十六进制颜色
- 导出 `yiye-ledger-backup-YYYY-MM-DD.json`，包含流水、预算和主题
- 导入前校验格式、版本、字段和日期，确认后完整替换本地账本

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

`scripts/verify-app.mjs` 会在本地 Web 服务运行时验证按日明细、未来日期限制、设置折叠、预算与主题持久化、导出、合法/损坏备份导入、首页新增/编辑/删除和刷新持久化，并生成四张预览图。

## Android APK

可直接安装的 ARM64 APK：

```text
https://github.com/white-catyy/yiye-ledger/releases/download/v1.2.0/yiye-ledger-v1.2.0-arm64.apk
```

- 应用名称：一页账
- 包名：`com.yiye.ledger`
- 版本：`1.2.0 (3)`
- 支持架构：`arm64-v8a`
- 文件大小：约 `33.48 MB`
- SHA-256：`B1E97A45228065EB1EE03C5A863159EF3DE602B09E229F6E861B7151ACC8DB40`

当前 APK 使用 Android 调试证书签名，适合本机安装和内部测试。准备发布到应用商店时，需要生成并妥善保管正式发布证书。
