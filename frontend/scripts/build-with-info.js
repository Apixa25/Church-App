const { spawnSync, execSync } = require('child_process');
const path = require('path');
const packageJson = require('../package.json');

const runGit = (command) => {
  try {
    return execSync(command, {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
};

const fullSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  runGit('git rev-parse HEAD');

const shortSha = fullSha ? fullSha.slice(0, 7) : '';
const branch =
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.GITHUB_REF_NAME ||
  runGit('git rev-parse --abbrev-ref HEAD');
const deploymentId =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_URL ||
  process.env.NETLIFY_DEPLOY_ID ||
  '';

const env = {
  ...process.env,
  CI: 'false',
  REACT_APP_PACKAGE_VERSION: packageJson.version,
  REACT_APP_BUILD_TIME: new Date().toISOString(),
  REACT_APP_GIT_SHA: shortSha,
  REACT_APP_GIT_BRANCH: branch,
  REACT_APP_DEPLOYMENT_ID: deploymentId,
  REACT_APP_DEPLOYMENT_NAME: branch && shortSha ? `${branch} @ ${shortSha}` : shortSha || branch || deploymentId
};

const reactScripts = require.resolve('react-scripts/bin/react-scripts.js');
const result = spawnSync(process.execPath, [reactScripts, 'build'], {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: 'inherit'
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.signal) {
  console.error(`Build stopped by signal: ${result.signal}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
