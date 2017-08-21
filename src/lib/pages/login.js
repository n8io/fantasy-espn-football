import config from '../../config';
import { parseUrl } from '../utils/urls';
import log from '../utils/domLogger';

const { urls: { LEAGUE_HOME }, espn: { username, password } } = config;

const login = async page => {
  const { url: leagueHomePage } = parseUrl(LEAGUE_HOME);
  let msg = `➡️ 302 Redirecting to login: ${leagueHomePage} ...`;

  await log(msg, page);

  await page.goto(leagueHomePage);

  msg = '🔐 203 Logging in...';
  await log(msg, page);

  // Login
  await page.type(username);
  await page.press('Tab');
  await page.type(password);
  await page.keyboard.down('Shift');
  await page.press('Tab');
  await page.mouse.click(700, 270);

  // Wait for login to complete
  await page.waitFor(5000);

  const seasonSelector = await page.$('select#seasonHistoryMenu');

  let isLoggedIn = true;

  if (!seasonSelector) {
    isLoggedIn = false;
    msg = '🔑 401 Unauthorized';
    await log(msg, page);
  } else {
    msg = '👍 200 Login successful';
    await log(msg, page);
  }

  return isLoggedIn;
};

export default login;
