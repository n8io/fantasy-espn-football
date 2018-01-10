import urlMap from './urls.json';
import { getCurrentYear } from '../lib/utils/season';

const convertToBool = val => ['1', 'true'].indexOf((val || '').toString().toLowerCase()) > -1;
const convertToInts = val =>
  (val || '')
    .toString()
    .split(',')
    .map(x => Number((x || '').trim()))
    .filter(x => !!x);

const whitelistedEnvVars = () => {
  const {
    HEADLESS: headless = true,
    SLOWMO: slowMo = 0,
    ESPN_LEAGUE_ID = 220779,
    ESPN_USERNAME: username,
    ESPN_PASSWORD: password,
    USER_AGENT: userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
    SEASONS,
    WEEK,
    WEEKS,
    WAIT_ON_CLOSE = 0,
  } = process.env;

  const league = Number(ESPN_LEAGUE_ID || -1);
  const seasons = convertToInts(SEASONS || getCurrentYear());
  const weeks = convertToInts(WEEKS || (WEEK || ''));
  const week = Number(WEEK || -1);

  return {
    puppeteer: { headless: convertToBool(headless), slowMo, args: ['--allow-running-insecure-content'] },
    espn: {
      username,
      password,
      league,
      seasons,
      week,
      weeks,
    },
    browser: { userAgent, viewport: { width: 1920, height: 1080 } },
    waitFor: Number(WAIT_ON_CLOSE || 0),
  };
};

const config = {
  ...whitelistedEnvVars(),
  urls: urlMap,
};

export default config;
