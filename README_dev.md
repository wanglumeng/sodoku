# 数独（纯网页）

电脑和手机浏览器里直接玩，**不需要 Python、Node 或任何后端**，整站都是静态文件。

## 怎么发给别人玩

任选一种即可：

1. **打包发文件**  
   把整个项目文件夹打成 zip，对方解压后**用浏览器打开 `index.html`**。  
   若个别浏览器对本地 `file://` 有限制，请用下面方式 2。

2. **免费托管一条链接（推荐）**  
   把**包含 `index.html` 的整份文件夹**上传到任一静态托管，把生成的 **https 链接**发给对方即可：
   - [Netlify Drop](https://app.netlify.com/drop)（拖文件夹）
   - [Cloudflare Pages](https://pages.cloudflare.com/)
   - [GitHub Pages](https://pages.github.com/)（仓库 Settings → Pages）

3. **手机**  
   用 Safari / Chrome 打开上述 **https 链接**；可「添加到主屏幕」，像轻应用一样打开。

---

## 部署到 GitHub Pages（图文式步骤）

下面假设你的项目根目录里**直接**有 `index.html`（本仓库就是这样），网站挂在仓库的**默认分支**（一般是 `main`）**根目录**。

### 1. 在 GitHub 上新建仓库

1. 登录 [GitHub](https://github.com)，右上角 **+** → **New repository**。
2. 填仓库名，例如 `sodoku_web`，选 **Public**（免费 Pages 需公开库；私有库需 GitHub 付费或改用其他托管）。
3. **不要**勾选 “Add a README” 也行（你本地已有文件的话，后面用命令行推上去即可）。
4. 点 **Create repository**。

### 2. 把本地代码推送到 GitHub

在本项目文件夹里打开终端（若还没初始化过 git）：

```bash
cd /你的/项目路径/sodoku_web
git init
git add .
git commit -m "Initial commit: 数独网页"
git branch -M main
git remote add origin https://github.com/你的用户名/sodoku_web.git
git push -u origin main
```

把 `你的用户名` 和 `sodoku_web` 换成你自己的仓库地址（GitHub 创建完仓库后页面里会显示）。

### 3. 打开 GitHub Pages

1. 打开该仓库页面，点 **Settings**（设置）。
2. 左侧点 **Pages**。
3. **Build and deployment** 里：
   - **Source** 选 **Deploy from a branch**。
   - **Branch** 选 **`main`**，文件夹选 **`/ (root)`**。
4. 点 **Save**。

### 4. 访问网址

等约 **1～3 分钟**，刷新 **Settings → Pages**，上面会出现 **Your site is live at** 的链接，形式为：

```text
https://你的用户名.github.io/sodoku_web/
```

用浏览器打开即可（电脑、手机都行）。

> **若仓库名是** `你的用户名.github.io`（固定这种命名），站点地址会是 **`https://你的用户名.github.io/`**（不带子路径），同样把文件放在该仓库**根目录**即可。

### 常见问题

- **404**：再等几分钟；确认 Pages 里分支是 `main`、目录是 `/ (root)`；地址末尾可试加 `/index.html`。
- **样式/脚本加载失败**：必须用 **https://用户名.github.io/仓库名/** 这种地址打开，不要只用 `file://` 打开本地文件来对比线上路径。
- **更新网站**：本地改完后 `git add .` → `git commit` → `git push`，一般几分钟内自动更新。

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

## 可选：本地预览

不依赖 Python；若需要本地 http 服务，可用任意静态服务器，例如：

```bash
npx --yes serve .
```

仅开发自测用，**分享给他人不必安装这些**。
