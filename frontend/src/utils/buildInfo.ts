import packageJson from '../../package.json';

const packageVersion =
  process.env.REACT_APP_PACKAGE_VERSION ||
  packageJson.version ||
  '0.0.0';

const gitSha = process.env.REACT_APP_GIT_SHA || '';
const gitBranch = process.env.REACT_APP_GIT_BRANCH || '';
const deploymentId = process.env.REACT_APP_DEPLOYMENT_ID || '';
const deploymentName =
  process.env.REACT_APP_DEPLOYMENT_NAME ||
  (gitBranch && gitSha ? `${gitBranch} @ ${gitSha}` : gitSha || gitBranch || deploymentId || 'Local development');
const buildTime = process.env.REACT_APP_BUILD_TIME || '';

const formattedBuildTime = buildTime
  ? new Date(buildTime).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  : 'Local development';

export const appBuildInfo = {
  version: gitSha ? `${packageVersion}+${gitSha}` : packageVersion,
  packageVersion,
  deploymentName,
  deploymentId,
  buildTime,
  formattedBuildTime,
  gitSha,
  gitBranch
};
