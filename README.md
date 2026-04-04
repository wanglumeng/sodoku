# 数独（纯网页）

电脑和手机浏览器里直接玩，**不需要 Python、Node 或任何后端**，整站都是静态文件。

## 访问网址

[在线游玩](https://wanglumeng.github.io/sodoku/)

```text
https://wanglumeng.github.io/sodoku/
```

用浏览器打开即可（电脑、手机都行）。

## 操作说明

- **点格子**选中，再点下方 **1–9** 填数；电脑也可用键盘数字键（含中文输入法场景）。
- **新游戏**：选难度；**检查谜题**；**求解**：按唯一解填满剩余格。
- **主题**：切换浅色 / 深色。

## 项目结构

| 文件 | 说明 |
|------|------|
| `index.html` | 页面入口 |
| `styles.css` | 样式与响应式 |
| `solver.js` | 求解与校验 |
| `generator.js` | 出题（唯一解） |
| `ui.js` | 交互与棋盘 |
| `manifest.json` | Web 应用清单（可选「添加到主屏幕」） |
| `favicon.svg` | 站点图标 |

## 技术栈

HTML + CSS + JavaScript，无构建步骤。
