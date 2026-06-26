#!/bin/bash
# 一键部署脚本 - 在服务器上执行
# ssh root@8.134.18.54 然后粘贴执行

set -e
echo "================================="
echo " AI Virtual Try-On Studio 部署"
echo "================================="

# 1. 安装 Node.js 20+
if ! command -v node &> /dev/null; then
  echo "[1/6] 安装 Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "[1/6] Node.js 已安装: $(node -v)"
fi

# 2. 安装 pnpm
if ! command -v pnpm &> /dev/null; then
  echo "[2/6] 安装 pnpm..."
  npm install -g pnpm
else
  echo "[2/6] pnpm 已安装: $(pnpm -v)"
fi

# 3. 安装 Nginx
if ! command -v nginx &> /dev/null; then
  echo "[3/6] 安装 Nginx..."
  apt-get install -y nginx
  systemctl enable nginx
else
  echo "[3/6] Nginx 已安装"
fi

# 4. 安装 PM2
if ! command -v pm2 &> /dev/null; then
  echo "[4/6] 安装 PM2..."
  npm install -g pm2
else
  echo "[4/6] PM2 已安装: $(pm2 -v)"
fi

# 5. 克隆项目
echo "[5/6] 部署项目..."
cd /opt
if [ -d "virtual-model-tool" ]; then
  cd virtual-model-tool
  git pull
else
  git clone https://github.com/wqdcjnb/virtual-model-tool.git
  cd virtual-model-tool
fi

# 创建 .env.local（如果不存在）
if [ ! -f .env.local ]; then
  echo "请输入 DashScope API Key："
  read DASHSCOPE_KEY
  echo "DASHSCOPE_API_KEY=${DASHSCOPE_KEY}" > .env.local
fi

pnpm install
pnpm build

# 6. 启动服务
echo "[6/6] 启动服务..."
pm2 delete tryon 2>/dev/null || true
pm2 start node_modules/.bin/next --name "tryon" -- start -p 3000
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# 7. 配置 Nginx
cat > /etc/nginx/sites-available/tryon << 'NGINX'
server {
    listen 80;
    server_name ai-wqd.fun www.ai-wqd.fun;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/tryon /etc/nginx/sites-enabled/
# 删除默认站点
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "================================="
echo " 部署完成！"
echo " 访问 http://8.134.18.54"
echo " 配置 DNS 后访问 http://ai-wqd.fun"
echo "================================="
echo ""
echo "后续更新命令："
echo "  cd /opt/virtual-model-tool && git pull && pnpm install && pnpm build && pm2 restart tryon"
