import { Client } from 'ssh2';
const conn = new Client();

function exec(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    let out = '';
    conn.exec(cmd, (err: any, stream: any) => {
      if (err) { resolve(`ERR:${err.message}`); return; }
      stream.on('data', (d: Buffer) => { out += d.toString(); process.stdout.write(d.toString()); });
      stream.stderr.on('data', (d: Buffer) => { process.stderr.write(d.toString()); });
      stream.on('close', () => resolve(out));
    });
  });
}

async function main() {
  await new Promise<void>((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect({ host: '8.134.18.54', username: 'root', password: 'WQD_cjnb1123', readyTimeout: 15000 });
  });

  // 1. Update code from git
  console.log('=== 1. Git pull ===');
  await exec('cd /opt/virtual-model-tool && git pull');

  // 2. Add CQT API key to .env.local
  console.log('\n=== 2. 配置 CQT Key ===');
  await exec(`
    cd /opt/virtual-model-tool
    grep -q "CQT_API_KEY" .env.local || echo "CQT_API_KEY=sk-e093ca89d1f84f5283a1527c20ad3ac8nwll7MPW04Rolve7" >> .env.local
    echo "Keys configured"
  `);

  // 3. Install & Build
  console.log('\n=== 3. Build ===');
  await exec('cd /opt/virtual-model-tool && pnpm install 2>&1 | tail -3 && pnpm build 2>&1 | tail -10');

  // 4. Restart
  console.log('\n=== 4. Restart ===');
  await exec('cd /opt/virtual-model-tool && pm2 restart virtual-tryon && sleep 3 && pm2 status');

  // 5. Test
  console.log('\n=== 5. Test ===');
  await exec('curl -s http://127.0.0.1:3000/ | grep -o "<title>[^<]*</title>"');

  conn.end();
}

main().catch(e => console.error('Failed:', e.message));
