/* eslint-disable no-console */
import cheerio from 'cheerio';
import moment from 'moment';

import config from '../../../../config';
import { getStartDate, getEndDate } from '../../../utils/season';
import { parseUrl } from '../../../utils/urls';
import { selector, parseRow } from './parser';
import log from '../../../utils/domLogger';

const { urls: { LEAGUE_RECENT_ACTIVITY } } = config;

const recentActivity = async (page, seasonId, members) => {
  const fmt = 'YYYYMMDD';
  const startDate = getStartDate(seasonId).format(fmt);
  const endDate = getEndDate(seasonId).format(fmt);
  const { activityType = -1, teamId = -1, tranType = -2 } = {};

  const { url: urlLeagueRecentActivity } = parseUrl(LEAGUE_RECENT_ACTIVITY, {
    search: {
      seasonId,
      startDate,
      endDate,
      activityType,
      teamId,
      tranType,
    },
  });

  let msg = `➡️ 302 Redirecting to league recent activity: ${urlLeagueRecentActivity} ...`;
  await log(msg, page);

  await page.goto(urlLeagueRecentActivity);

  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  const $ = cheerio.load(bodyHtml);
  const tRows = $(selector).find('tr');

  // Trim off header and subheader rows
  const rows = Array.from(tRows).splice(2);

  if (!rows || !rows.length) {
    return [];
  }

  msg = `🛠 203 Parsing league activity feed...`;
  await log(msg, page);

  const activities = rows.map(row => parseRow(row, seasonId, members));

  msg = `👍 200 League activity feed parsed successfully. ${activities.length} activities found.`;
  await log(msg, page);

  return activities.filter(a => !!a).sort((a, b) => {
    const aDate = moment(a.date);
    const bDate = moment(b.date);

    if (aDate.isBefore(bDate)) {
      return -1;
    } else if (aDate.isAfter(bDate)) {
      return 1;
    }

    return 0;
  });

  // const uniqueReducer = (acc = [], s) => {
  //   if (acc.indexOf(s) === -1) {
  //     acc.push(s);
  //   }
  //
  //   return acc;
  // };
  //
  // const removeMemberNames = str => {
  //   const members = [
  //     'DANK',
  //     'NATE',
  //     'JROD',
  //     'KURT',
  //     'JOTA',
  //     'FRYE',
  //     'BROK',
  //     'WEAV',
  //     'PERO',
  //     'EBBY',
  //     'DUBS',
  //     'MBIX',
  //     'HURL',
  //   ];
  //
  //   const reg = new RegExp(`(${members.join('|')})`, 'ig');
  //
  //   return str.replace(reg, '[TEAM]').trim();
  // };

  // const subTypeTexts = activities
  //   .reduce((acc, a) => {
  //     if (acc.indexOf(a.subTypeText) === -1) {
  //       acc.push(a.subTypeText);
  //     }
  //
  //     return acc;
  //   }, [])
  //   .sort();
  //
  // console.log(JSON.stringify(subTypeTexts.map(removeMemberNames).reduce(uniqueReducer, []).sort(), null, 2));
  // console.log(JSON.stringify(activities.filter(a => a.details.isWaiver).filter((a, i) => i < 10), null, 2)); // eslint-disable-line no-console

  // const breakdown = activities.reduce((acc, a) => {
  //   if (!acc[a.type]) {
  //     acc[a.type] = {};
  //   }
  //
  //   if (!acc[a.type][a.subType]) {
  //     acc[a.type][a.subType] = [];
  //   }
  //
  //   const normalized = removeMemberNames(a.subTypeText);
  //
  //   if (acc[a.type][a.subType].indexOf(normalized) === -1) {
  //     acc[a.type][a.subType].push(normalized);
  //     acc[a.type][a.subType].sort();
  //   }
  //
  //   return acc;
  // }, {});
  //
  // console.log(JSON.stringify(breakdown, null, 2));
};

export default recentActivity;
