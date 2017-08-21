import urlMap from './urls.json';
import { getCurrentYear } from '../lib/utils/season';

const convertToBool = val => ['1', 'true'].indexOf((val || '').toString().toLowerCase()) > -1;
const convertSeasons = val => (val || '').toString().split(',').map(x => ~~(x || '').trim()).filter(x => !!x); // eslint-disable-line no-bitwise

const whitelistedEnvVars = () => {
  const {
    HEADLESS: headless = true,
    SLOWMO: slowMo = 0,
    ESPN_LEAGUE_ID: league,
    ESPN_USERNAME: username,
    ESPN_PASSWORD: password,
    USER_AGENT: userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
    SEASONS: seasons = getCurrentYear(),
    WAIT_ON_CLOSE = 0,
  } = process.env;

  return {
    puppeteer: { headless: convertToBool(headless), slowMo, args: ['--allow-running-insecure-content'] },
    espn: { username, password, league: ~~league, seasons: convertSeasons(seasons) }, // eslint-disable-line no-bitwise
    browser: { userAgent, viewport: { width: 1440, height: 776 } },
    waitFor: ~~WAIT_ON_CLOSE, // eslint-disable-line no-bitwise
  };
};

const config = {
  ...whitelistedEnvVars(),
  urls: urlMap,
};

export default config;
