const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const JMETER_VERSION = '5.6.3';
const root = path.resolve(__dirname, '..');
const plan = path.join(root, 'performance', 'restful-booker.jmx');
const toolsDir = path.join(root, 'tools');
const resultsDir = path.join(root, 'performance', 'results');
const jtl = path.join(resultsDir, 'results.jtl');
const reportDir = path.join(resultsDir, 'html-report');

function jmeterBin(home) {
  const file = process.platform === 'win32' ? 'jmeter.bat' : 'jmeter';
  return path.join(home, 'bin', file);
}

function bundledHome() {
  return path.join(toolsDir, `apache-jmeter-${JMETER_VERSION}`);
}

function resolveHome() {
  if (process.env.JMETER_HOME && fs.existsSync(jmeterBin(process.env.JMETER_HOME))) {
    return process.env.JMETER_HOME;
  }
  if (fs.existsSync(jmeterBin(bundledHome()))) return bundledHome();
  return null;
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        download(new URL(response.headers.location, url).toString(), destination).then(resolve, reject);
        return;
      }
      if (status !== 200) {
        response.resume();
        reject(new Error(`No se pudo descargar JMeter (${status}) desde ${url}`));
        return;
      }
      const file = fs.createWriteStream(destination);
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function ensureJmeter() {
  const existing = resolveHome();
  if (existing) return existing;

  fs.mkdirSync(toolsDir, { recursive: true });
  const zipPath = path.join(toolsDir, `apache-jmeter-${JMETER_VERSION}.zip`);
  const mirrors = [
    `https://dlcdn.apache.org/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.zip`,
    `https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.zip`,
  ];

  let lastError;
  for (const mirror of mirrors) {
    try {
      console.log(`Descargando JMeter ${JMETER_VERSION} desde ${mirror}`);
      await download(mirror, zipPath);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
    }
  }
  if (lastError) throw lastError;

  const extracted = spawnSync('tar', ['-xf', zipPath, '-C', toolsDir], { stdio: 'inherit' });
  if (extracted.status !== 0) throw new Error('No se pudo descomprimir Apache JMeter');
  fs.rmSync(zipPath, { force: true });
  return bundledHome();
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function countFailures(file) {
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  if (lines.length < 2) return { samples: 0, failures: 0 };
  const successIndex = parseCsvLine(lines[0]).indexOf('success');
  if (successIndex === -1) return { samples: lines.length - 1, failures: 0 };
  let failures = 0;
  for (const line of lines.slice(1)) {
    if (parseCsvLine(line)[successIndex] === 'false') failures += 1;
  }
  return { samples: lines.length - 1, failures };
}

async function main() {
  const home = await ensureJmeter();
  fs.rmSync(resultsDir, { recursive: true, force: true });
  fs.mkdirSync(reportDir, { recursive: true });

  const run = spawnSync(
    jmeterBin(home),
    ['-n', '-t', plan, '-l', jtl, '-e', '-o', reportDir],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
  if (run.status !== 0) process.exit(run.status || 1);
  if (!fs.existsSync(path.join(reportDir, 'index.html'))) {
    throw new Error('JMeter no generó el informe HTML');
  }

  const { samples, failures } = countFailures(jtl);
  console.log(`Muestras: ${samples}. Fallos de aserción: ${failures}.`);
  console.log(`Informe HTML: ${path.join(reportDir, 'index.html')}`);
  if (samples === 0 || failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
