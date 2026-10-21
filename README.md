# 一页账

面向大学生的轻量记账 App，以「今日账页」为核心体验，强调快速记录、清晰汇总和可自定义的界面。
基本上是AI帮忙写的可能会有一些小问题

## 功能

- 首页展示今日支出、流水笔数和昨日对比
- 轻点首页流水即可修改分类、名称、金额、时间和备注
- 明细页按日期展示本月流水

## 项目结构

```text
design/        首页静态视觉设计稿
ledger-studio/ Expo React Native App
```

## 运行

```bash
cd ledger-studio
npm install
npx expo start
```

Web 预览：

```bash
cd ledger-studio
npm run web
```

## Android

当前版本：`1.1.0 (2)`

包名：`com.yiye.ledger`

下载地址：

https://github.com/white-catyy/yiye-ledger/releases/tag/v1.1.0

## 验证

```bash
cd ledger-studio
npx tsc --noEmit
npx expo export --platform web --output-dir dist
```

交互回归脚本位于 `ledger-studio/scripts/verify-app.mjs`。

## 截图

![首页](ledger-studio/preview-home.png)

![编辑流水](ledger-studio/preview-editor.png)

![设置](ledger-studio/preview-settings.png)
