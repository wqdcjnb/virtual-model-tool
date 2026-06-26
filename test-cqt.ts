import { Client } from 'ssh2';

async function main() {
  const conn = new Client();
  await new Promise<void>((r, e) => { conn.on('ready', r); conn.on('error', e); conn.connect({ host: '8.134.18.54', username: 'root', password: 'WQD_cjnb1123', readyTimeout: 15000 }); });

  // Test 1: flux-kontext-max with minimal params
  console.log('=== Test 1: flux-kontext-max ===');
  await exec(conn, `curl -s -X POST https://api.cqtai.com/api/cqt/generator/flux -H 'Authorization: Bearer sk-e093ca89d1f84f5283a1527c20ad3ac8nwll7MPW04Rolve7' -H 'Content-Type: application/json' -d '{"model":"flux-kontext-max","prompt":"a fashion model, studio lighting","numImages":1}'`);

  // Test 2: flux-kontext-pro
  console.log('\n=== Test 2: flux-kontext-pro ===');
  await exec(conn, `curl -s -X POST https://api.cqtai.com/api/cqt/generator/flux -H 'Authorization: Bearer sk-e093ca89d1f84f5283a1527c20ad3ac8nwll7MPW04Rolve7' -H 'Content-Type: application/json' -d '{"model":"flux-kontext-pro","prompt":"a fashion model, studio lighting","numImages":1}'`);

  // Test 3: nano-banana-pro
  console.log('\n=== Test 3: nano-banana-pro ===');
  await exec(conn, `curl -s -X POST https://api.cqtai.com/api/cqt/generator/nano -H 'Authorization: Bearer sk-e093ca89d1f84f5283a1527c20ad3ac8nwll7MPW04Rolve7' -H 'Content-Type: application/json' -d '{"model":"nano-banana-pro","prompt":"a fashion model, studio lighting","numImages":1}'`);

  conn.end();
}

function exec(conn: Client, cmd: string): Promise<string> {
  return new Promise((resolve) => {
    let o = '';
    conn.exec(cmd, (err, stream) => {
      if (err) { resolve(`ERR:${err.message}`); return; }
      stream.on('data', (d: Buffer) => { o += d.toString(); console.log(d.toString()); });
      stream.stderr.on('data', (d: Buffer) => console.log('STDERR:', d.toString()));
      stream.on('close', () => resolve(o));
    });
  });
}

main().catch(e => console.error(e.message));
