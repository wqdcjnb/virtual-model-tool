import { Client } from 'ssh2';

async function main() {
  const conn = new Client();
  await new Promise<void>((r, e) => { conn.on('ready', r); conn.on('error', e); conn.connect({ host: '8.134.18.54', username: 'root', password: 'WQD_cjnb1123', readyTimeout: 15000 }); });

  const keyHeader = '-H "Authorization: Bearer sk-e093ca89d1f84f5283a1527c20ad3ac8nwll7MPW04Rolve7"';
  const ct = '-H "Content-Type: application/json"';

  // Try flux with different params
  console.log('=== FLUX + size ===');
  await exec(conn, `curl -s -X POST https://api.cqtai.com/api/cqt/generator/flux ${keyHeader} ${ct} -d '{"model":"flux-kontext-pro","prompt":"model","numImages":1,"size":"1024x1024"}'`);

  console.log('\n=== FLUX + width/height ===');
  await exec(conn, `curl -s -X POST https://api.cqtai.com/api/cqt/generator/flux ${keyHeader} ${ct} -d '{"model":"flux-kontext-pro","prompt":"model","numImages":1,"width":1024,"height":1024}'`);

  console.log('\n=== FLUX + imageUrl (img2img) ===');
  await exec(conn, `curl -s -X POST https://api.cqtai.com/api/cqt/generator/flux ${keyHeader} ${ct} -d '{"model":"flux-kontext-pro","prompt":"model","numImages":1,"imageUrl":"https://example.com/test.jpg"}'`);

  // Also try nano-banana for comparison
  console.log('\n=== Nano simple ===');
  await exec(conn, `curl -s -X POST https://api.cqtai.com/api/cqt/generator/nano ${keyHeader} ${ct} -d '{"model":"nano-banana-pro","prompt":"model","numImages":1}'`);

  conn.end();
}

function exec(conn: Client, cmd: string): Promise<string> {
  return new Promise((resolve) => {
    let o = '';
    conn.exec(cmd, (err, stream) => {
      if (err) { resolve(`ERR:${err.message}`); return; }
      stream.on('data', (d: Buffer) => { o += d.toString(); console.log(d.toString()); });
      stream.on('close', () => resolve(o));
    });
  });
}

main().catch(e => console.error(e.message));
