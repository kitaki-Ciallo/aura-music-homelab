<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🎵 Aura Music

**一个纯前端的高颜值在线音乐播放器**

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

</div>

---

## ✨ Features

- 🎨 **WebGL 流体背景** — 基于 [Shadertoy](https://www.shadertoy.com/view/wdyczG) 的动态着色器背景，自动从封面提取配色，切歌时平滑过渡
- 🎤 **逐字歌词 (YRC)** — 支持网易云逐字精确时间轴 + LRC 滚动歌词 + 翻译歌词三层显示
- 📂 **本地文件夹导入** — 基于 [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)，文件保留在磁盘上，不上传不复制
- 🔗 **网易云歌单导入** — 粘贴网易云歌单链接即可导入，自动匹配歌词和封面
- 🔎 **全局搜索** — 支持本地曲库搜索 + 网易云在线搜索
- 💾 **IndexedDB 持久化** — 播放队列、歌单、目录权限自动保存，刷新不丢失
- 🌓 **多主题切换** — Dark / Light / Fluid（毛玻璃）三种视觉风格
- ⌨️ **快捷键** — 空格播放/暂停、方向键切歌、音量调节等

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│                  Browser                      │
│                                              │
│  ┌─────────┐  ┌───────────┐  ┌────────────┐ │
│  │ React   │  │ IndexedDB │  │ Web Worker │ │
│  │ App     │◄─┤ (idb-     │  │ (WebGL     │ │
│  │         │  │  keyval)  │  │  Renderer) │ │
│  └────┬────┘  └───────────┘  └────────────┘ │
│       │                                      │
│  ┌────▼────────────────────────────────────┐ │
│  │  File System Access API                 │ │
│  │  (Local audio files stay on disk)       │ │
│  └─────────────────────────────────────────┘ │
│       │                                      │
│  ┌────▼────────────────────────────────────┐ │
│  │  Netease Cloud Music API (外部)         │ │
│  │  • 歌词搜索 & 匹配 (LRC/YRC/翻译)      │ │
│  │  • 封面获取                              │ │
│  │  • 歌单导入                              │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

> **纯前端版本**：无需后端服务，所有数据存储在浏览器 IndexedDB 中，音频文件通过 File System Access API 从本地磁盘读取。

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Chrome / Edge**（需要 File System Access API 支持）

### 运行

```bash
# 1. 克隆仓库
git clone https://github.com/kitaki-Ciallo/aura-music-homelab.git
cd aura-music-homelab
git checkout Frontend_only

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

打开 `http://localhost:3000`，点击右上角 **Import** 按钮导入本地音乐文件夹即可开始使用。

### 构建部署

```bash
npm run build
```

生成的 `dist/` 文件夹可直接部署到任何静态托管服务（如 Cloudflare Pages、Vercel、Nginx 等）。

## 📖 Usage

### 导入本地音乐

1. 点击侧边栏底部的 **"+"** 按钮打开导入面板
2. 选择 **Local Folder** 标签
3. 选择包含音频文件的文件夹（支持 MP3、FLAC、WAV、M4A、OGG 等格式）
4. 子文件夹会自动创建为独立的歌单
5. 系统会自动从网易云匹配歌词和封面，并缓存到 IndexedDB

### 导入网易云歌单

1. 选择 **Web Link** 标签
2. 粘贴网易云歌单链接（如 `https://music.163.com/playlist?id=123456`）
3. 点击 **Import**，歌曲会以在线流媒体方式播放

### Sidecar 元数据文件

在音频文件旁放置同名 `.json` 文件可覆盖自动匹配的元数据：

```
music/
├── Artist - Title.flac
└── Artist - Title.json    ← Sidecar 元数据
```

JSON 格式参考：

```json
{
  "lrc": "[00:10.16] 歌词内容...",
  "yrc": "[10500,4880](10500,880,0)逐(11380,970,0)字...",
  "tLrc": "[00:10.16] 翻译内容...",
  "metadata": ["作词: xxx", "作曲: xxx"],
  "coverUrl": "https://example.com/cover.jpg"
}
```

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放 / 暂停 |
| `←` / `→` | 上一首 / 下一首 |
| `↑` / `↓` | 音量 +/- |
| `Ctrl + F` | 打开搜索 |
| `L` | 切换歌词显示 |

## 📸 Screenshots

![Screenshot1](./images/screenshot1.png)
![Screenshot2](./images/screenshot2.png)
![Screenshot3](./images/screenshot3.png)
![Screenshot4](./images/screenshot4.png)

## 🛠️ Tech Stack

| 技术 | 用途 |
|------|------|
| [React 19](https://react.dev) | UI 框架 |
| [Vite 6](https://vitejs.dev) | 构建工具 |
| [TypeScript](https://www.typescriptlang.org) | 类型安全 |
| [Tailwind CSS](https://tailwindcss.com) | 样式系统 |
| [idb-keyval](https://github.com/nicedoc/idb-keyval) | IndexedDB 封装 |
| [Lucide React](https://lucide.dev) | 图标库 |
| [React Router](https://reactrouter.com) | 路由 |
| WebGL / GLSL Shaders | 流体背景渲染 |
| Web Worker | 后台 WebGL 渲染 & 颜色提取 |
| File System Access API | 本地文件访问 |

## 📄 License

[MIT](./LICENSE)

---

> Shader source: https://www.shadertoy.com/view/wdyczG

> Vibe coding with gemini3-pro, gpt-5.1-codex-mini, and claude-sonnet-4.5.
