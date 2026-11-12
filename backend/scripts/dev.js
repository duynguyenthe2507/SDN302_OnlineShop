require('dotenv').config({ path: require('node:path').join(__dirname, '../../.env') });
const { spawn, execFile } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const children = [];
let browserOpened = false;
let stopping = false;
let apiReady = false;
let webReady = false;
let homeUrl = '';

start().catch((error) => {
  console.error('Không thể khởi động ứng dụng:', error.message);
  stop(1);
});

async function start() {
  const requestedApiPort = Number(process.env.PORT) || 3000;
  const requestedWebPort = Number(process.env.VITE_PORT) || 5173;
  const apiPort = await findAvailablePort(requestedApiPort);
  const webPort = await findAvailablePort(requestedWebPort, new Set([apiPort]));
  if (apiPort !== requestedApiPort) console.warn(`Cổng API ${requestedApiPort} đang bận; API chạy tại ${apiPort}.`);
  if (webPort !== requestedWebPort) console.warn(`Cổng React ${requestedWebPort} đang bận; React chạy tại ${webPort}.`);

  const commonEnv = { ...process.env, PORT: String(apiPort), VITE_API_TARGET: `http://127.0.0.1:${apiPort}` };
  homeUrl = `http://localhost:${webPort}/`;
  const nodemon = spawn(process.execPath, [path.join(root, 'node_modules/nodemon/bin/nodemon.js'), 'backend/src/server.js'], { cwd: root, env: commonEnv, stdio: ['inherit', 'pipe', 'pipe'] });
  const vite = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--config', 'vite.config.mjs', '--host', '127.0.0.1', '--port', String(webPort), '--strictPort'], { cwd: root, env: commonEnv, stdio: ['inherit', 'pipe', 'pipe'] });
  children.push(nodemon, vite);
  relay(nodemon, 'API');
  relay(vite, 'React');
}

function relay(child, label, urlToOpen) {
  child.stdout.on('data', (chunk) => {
    const output = chunk.toString();
    process.stdout.write(output);
    if (label === 'API' && output.includes('Online shop API đang chạy')) apiReady = true;
    if (label === 'React' && /Local:\s+http:\/\//.test(output)) webReady = true;
    if (!browserOpened && apiReady && webReady) { browserOpened = true; openBrowser(homeUrl); }
  });
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  child.on('error', (error) => { console.error(`${label} không khởi động được:`, error.message); stop(1); });
  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(`${label} đã dừng${signal ? ` (${signal})` : ` với mã ${code}`}.`);
    stop(code ?? 1);
  });
}

async function findAvailablePort(startPort, reserved = new Set()) {
  for (let port = startPort; port < startPort + 100 && port <= 65535; port += 1) {
    if (reserved.has(port)) continue;
    const available = await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once('error', (error) => error.code === 'EADDRINUSE' ? resolve(false) : reject(error));
      probe.listen(port, () => probe.close(() => resolve(true)));
    });
    if (available) return port;
  }
  throw new Error(`Không tìm thấy cổng trống trong khoảng bắt đầu từ ${startPort}.`);
}

function openBrowser(url) {
  const [command, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  execFile(command, args, (error) => { if (error) console.warn(`Không mở được trình duyệt tự động. Mở ${url} thủ công.`); });
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal === 'SIGINT' ? 130 : 143));
