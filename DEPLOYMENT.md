# 部署指南 - Aura Music Homelab

## 1. 准备工作
确保你的 Linux 服务器已安装以下工具：
- **Node.js**: 建议 v18 或更高版本。
- **Nginx**: 用于反向代理和静态资源服务。
- **PM2**: 进程管理器，用于保持后端服务持续运行 (`npm install -g pm2`)。

## 2. 前端构建
在项目根目录下执行：
```bash
# 1. 创建 .env 文件并填入 Gemini API Key
echo "GEMINI_API_KEY=your_api_key_here" > .env

# 2. 安装依赖并构建
npm install
npm run build
```
执行完毕后，根目录下会出现 `dist` 文件夹。请将其中的内容上传到服务器的网页根目录（例如 `/var/www/music_homelab`）。

## 3. 后端部署
1. 将 `server` 文件夹和 `package.json` 上传到服务器（例如 `/home/user/aura-music-server`）。
2. 在该目录下安装依赖：
   ```bash
   npm install --production
   ```
3. 使用 PM2 启动服务（根据你的路径修改环境变量）：
   ```bash
   # MUSIC_DIR: 音乐存放目录
   # PORT: 监听端口 (建议 3002)
   export MUSIC_DIR=/path/to/your/music
   export PORT=3002
   pm2 start server/index.js --name aura-music-server
   ```

## 4. Nginx 配置
1. 创建或编辑 Nginx 配置文件：
   ```bash
   sudo nano /etc/nginx/conf.d/music_homelab.conf
   ```
2. 填入项目中 `music_homelab.conf` 的内容，并注意修改以下关键项：
   - `root /var/www/music_homelab;`: 修改为 `dist` 内容存放的路径。
   - `proxy_pass http://127.0.0.1:3002;`: 确保端口与后端启动端口一致。
   - **注意**：现在的配置将 `/music/` 路径也转发到了后端。这意味着 Nginx 不需要知道音乐的具体路径，只需在后端启动时通过 `MUSIC_DIR` 环境变量指定即可。
3. 检查并运行：
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## 5. 其他操作
- **SSL 证书**: 确保 `/etc/nginx/ssl/` 目录下有配置文件中引用的证书文件。
- **权限**: 确保 Nginx 用户（通常是 `www-data` 或 `nginx`）对前端目录和音乐目录有读取权限。
- **防火墙**: 如果是云服务器，请在控制台开放 `9921` 端口。
