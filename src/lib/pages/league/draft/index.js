/* eslint-disable no-console */
import cheerio from 'cheerio';
import moment from 'moment-timezone';

import config from '../../../../config';
import { parseUrl } from '../../../utils/urls';
import log from '../../../utils/domLogger';

const { urls: { LEAGUE_DRAFT } } = config;

const INJURY_STATII = {
  D: 'DOUBTFUL',
  Q: 'QUESTIONABLE',
  O: 'OUT',
  P: 'PROBABLE',
  PUP: 'PHYISCALLY_UNABLE_TO_PLAY',
  IR: 'INJURED_RESERVER',
  SSPD: 'SUSPENDED',
  ACTIVE: 'ACTIVE',
  UNKNOWN: 'UNKNOWN',
};

const getPlayerInjuryStatus = str => {
  const status =
    INJURY_STATII[
      (str || '')
        .toString()
        .trim()
        .toUpperCase()
    ] || INJURY_STATII.UNKNOWN;

  return status;
};

const draftRecap = async ({ page, league, season }) => {
  const { url: urlDraftRecap } = parseUrl(LEAGUE_DRAFT, {
    search: {
      seasonId: season,
      mode: 1,
      leagueId: league,
    },
  });

  let msg = `➡️ 302 Redirecting to league draft recap: ${urlDraftRecap} ...`;
  await log(msg, page);

  await page.goto(urlDraftRecap);

  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  const $ = cheerio.load(bodyHtml);

  const parsePlayerFromCell = td => {
    const raw = $(td)
      .remove('span')
      .text()
      .trim();
    const normalized = raw
      .replace(/[\s]+/, ' ')
      .replace(/[^a-z'. ,-]+/gi, ' ')
      .replace(/[ ]+/gi, ' ')
      .replace(' , ', ', ');

    const nameParts = normalized.split(',');

    if (!normalized || nameParts.length <= 1) {
      throw new Error(`Unexpected player name cell: ${raw}`);
    }

    const firstNameReg = /^([a-z'.-]+)/gi;
    const firstNameMatches = firstNameReg.exec(nameParts[0]);
    const firstName = firstNameMatches[1];

    let lastName = nameParts[0]
      .replace(`${firstName} `, '')
      .replace('*', '')
      .trim();

    const suffixReg = /[ ]([sj]r[.]|[iv]+$)/i;
    const suffixMatches = suffixReg.exec(lastName);
    let suffix;

    if (suffixMatches && suffixMatches.length === 2) {
      suffix = suffixMatches[1].trim();
      lastName = lastName.replace(` ${suffix}`, '');
    }

    const reg = /[\s]+([A-Za-z]{2,3})[\s]+([A-Z]{1,3})(,[\s]+[A-Z]{1,3})?(,[\s]+[A-Z]{1,3})?([\s]+[A-Z])?/g;
    let matches = reg.exec(normalized);

    if (!matches) {
      throw new Error(normalized);
    }

    matches.shift(); // remove the first entry of the arr

    matches = matches.map(
      o =>
        !o
          ? o
          : o
              .toString()
              .trim()
              .replace(/[\s,]+/g, ''),
    );

    let injuryStatus = getPlayerInjuryStatus(matches.pop());

    if (injuryStatus === INJURY_STATII.UNKNOWN) {
      injuryStatus = INJURY_STATII.ACTIVE;
    }

    const fullname = `${firstName} ${lastName}${suffix ? ` ${suffix}` : ''}${
      injuryStatus === INJURY_STATII.IR ? '*' : ''
    }`;
    const team = normalized
      .replace(`${fullname}, `, '')
      .trim()
      .split(' ')[0];

    let positions = [];
    try {
      positions = normalized
        .split(`,`)[1]
        .split(`${team} `)[1]
        .split(' ')
        .filter(p => ['IR', 'Q', 'D', 'O', 'SSPD'].indexOf(p) === -1)
        .join(' ')
        .replace(/[ ]+/gi, '')
        .split(',')
        .map(p => (p || '').trim())
        .map(p => {
          if (p.length > 1 && p.endsWith('K')) {
            return p.replace(/K$/, '');
          }

          return p;
        });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify(
          {
            team,
            split: normalized.split(`,`)[1].split(`${team} `)[1],
            normalized,
          },
          null,
          2,
        ),
      );

      throw e;
    }
    return { team: team.toUpperCase(), positions, firstName, lastName, suffix, injuryStatus, raw: normalized };
  };

  const selector = 'table[width="100%"]';
  const tables = $(selector).splice(1);

  msg = `🛠 203 Parsing league draft recap...`;
  await log(msg, page);

  const rawDate = $('.games-grey-alert')
    .text()
    .replace(/[ ]+/gi, ' ') // eslint-disable-line no-irregular-whitespace
    .replace(/[ ]+/g, ' ')
    .split(' Type')
    .join('~')
    .split('Draft Date: ')
    .join('')
    .split(' Time:')
    .join('')
    .split(' ET')
    .join('')
    .split('~')[0];

  // Thu., Aug. 23, 2012 Time: 7:00 PM ET
  const draftDate = moment(rawDate, 'ddd., MMM. D, YYYY h:mm AA')
    .utc()
    .format();

  const draftResults = tables.reduce((acc, table) => {
    const id = Number(
      $(table)
        .find('tr.tableHead td a')
        .first()
        .attr('href')
        .split('teamId=')[1]
        .split('&seasonId=')[0],
    );

    const title = $(table)
      .find('tr.tableHead td a')
      .first()
      .attr('title');

    const roster = [...$(table).find('tr.tableBody')].map(tr => ({
      pickOverall: Number(
        $(tr)
          .find('td')
          .eq(0)
          .text(),
      ),
      player: {
        ...parsePlayerFromCell(
          $(tr)
            .find('td')
            .eq(1)
            .remove('span'),
        ),
      },
    }));

    return [
      ...acc,
      {
        team: {
          id,
          name: title.split(' (')[0],
          owner: title.split(' (').length > 1 ? title.split(' (')[1].split(')')[0] : null,
        },
        picks: roster,
      },
    ];
  }, []);

  msg = `👍 200 League draft recap parsed successfully.`;
  await log(msg, page);

  return {
    season,
    date: draftDate,
    results: draftResults,
  };
};

export default draftRecap;
