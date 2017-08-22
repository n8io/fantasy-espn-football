import $ from 'cheerio';
import mirrorkey from 'mirrorkey';

import { parseKeyFromUrl } from '../../../utils/urls';
import unique from '../../../utils/unique';
import tagsArray from '../../../../config/tags.json';

const tags = mirrorkey(tagsArray);

const parseValueFromStringByRegex = (str, reg, fallback, castType) => {
  const matches = reg.exec(str);

  if (matches && matches.length && matches.length >= 2) {
    switch (castType) {
      case 'int':
        return ~~matches[1]; // eslint-disable-line no-bitwise
      case 'float':
        return parseFloat(matches[1], 10);
      default:
        return matches[1].trim();
    }
  }

  return fallback;
};

const parseTeamIdFromLink = href => ({ teamId: parseKeyFromUrl(href, 'teamId', 'int') });

const parseTeamFromCell = (cell, key) => {
  const regTeamName = /([\S ]+)[ ][(][0-9]{1,2}[-][0-9]{1,2}[)]/gi;
  const regWins = /[\S ]+[ ][(]([0-9]{1,2})[-][0-9]{1,2}[)]/gi;
  const regLosses = /[\S ]+[ ][(][0-9]{1,2}[-]([0-9]{1,2})[)]/gi;

  const text = $(cell).text();
  const href = $(cell).find('a').attr('href');
  const { teamId: id } = parseTeamIdFromLink(href);

  return {
    [key]: {
      id,
      name: parseValueFromStringByRegex(text, regTeamName).replace(/[ ]+/g, ' '),
      record: {
        wins: parseValueFromStringByRegex(text, regWins, 0, 'int'),
        losses: parseValueFromStringByRegex(text, regLosses, 0, 'int'),
      },
    },
  };
};

const parseHomeTeamFromCell = cell => parseTeamFromCell(cell, 'homeTeam');
const parseAwayTeamFromCell = cell => parseTeamFromCell(cell, 'awayTeam');

const parseResultFromString = str => {
  const regAwayScore = /([1-9]+[0-9]*([.][0-9]+)?)[-]/gi;
  const regHomeScore = /[-]([1-9]+[0-9]*([.][0-9]+)?)/gi;

  return {
    homeScore: parseValueFromStringByRegex(str, regHomeScore, 0, 'float'),
    awayScore: parseValueFromStringByRegex(str, regAwayScore, 0, 'float'),
  };
};

const isDivisionalMatchup = (homeTeamId, awayTeamId, members) => {
  const homeTeam = members.find(m => m.id === homeTeamId);
  const awayTeam = members.find(m => m.id === awayTeamId);
  const homeTeamDivision = homeTeam.tags.find(t => !!t.division).division;
  const awayTeamDivision = awayTeam.tags.find(t => !!t.division).division;

  return homeTeamDivision === awayTeamDivision;
};

export const selector = 'table.tableBody';

export const parseRows = (rows, members, seasonId) => {
  const schedule = {};

  let week = 1;
  let matchups = [];
  let playoffRound = 0;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < rows.length; i++) {
    // console.log(`week: ${week} row: ${i}`);

    const cells = $(rows[i]).find('td');
    const skipRowParse = i % 9 <= 1 || i === week * 9 - 1 || cells.length === 1; // if first two rows or the last row of a week

    if (skipRowParse === false) {
      const { homeScore, awayScore } = parseResultFromString($(cells[5]).text());
      const matchup = {
        ...parseAwayTeamFromCell(cells[0]),
        ...parseHomeTeamFromCell(cells[3]),
        tags: [tags[`WEEK_${week}`], tags[`SEASON_${seasonId}`]],
      };

      matchup.homeTeam.score = homeScore;
      matchup.awayTeam.score = awayScore;

      if (homeScore > awayScore) {
        matchup.homeTeam.tags = unique([...(matchup.homeTeam.tags || []), tags.WINNER]);
        matchup.awayTeam.tags = unique([...(matchup.awayTeam.tags || []), tags.LOSER]);
      } else if (homeScore < awayScore) {
        matchup.homeTeam.tags = unique([...(matchup.homeTeam.tags || []), tags.LOSER]);
        matchup.awayTeam.tags = unique([...(matchup.awayTeam.tags || []), tags.WINNER]);
      } else {
        matchup.homeTeam.tags = unique([...(matchup.homeTeam.tags || []), tags.INDETERMINATE]);
        matchup.awayTeam.tags = unique([...(matchup.awayTeam.tags || []), tags.INDETERMINATE]);
      }

      if (isDivisionalMatchup(matchup.homeTeam.id, matchup.awayTeam.id, members)) {
        matchup.tags = unique([...(matchup.tags || []), tags.DIVISIONAL_MATCHUP]);
      }

      matchups.push(matchup);
    } else if (i % 9 === 0) {
      // Check header row to determine if we're in the playoffs
      const isPlayoffs = $(cells[0]).text().toLowerCase().indexOf('playoffs') > -1;

      if (isPlayoffs) {
        playoffRound += 1;
      }
    } else if (i === week * 9 - 1) {
      // Was the last row for the week, add to schedule
      schedule[`week${week}`] = {
        id: week,
        matchups,
        tags: [tags[`WEEK_${week}`]],
      };

      if (playoffRound) {
        schedule[`week${week}`].playoffRound = playoffRound;
        schedule[`week${week}`].tags = unique([...schedule[`week${week}`].tags, tags[`PLAYOFF_ROUND_${playoffRound}`]]);

        // eslint-disable-next-line no-loop-func
        schedule[`week${week}`].matchups = schedule[`week${week}`].matchups.map(mu => ({
          ...mu,
          tags: unique([...mu.tags, tags[`PLAYOFF_ROUND_${playoffRound}`]]),
        }));
      } else {
        // eslint-disable-next-line no-loop-func
        schedule[`week${week}`].matchups = schedule[`week${week}`].matchups.map(mu => ({
          ...mu,
          tags: unique([...mu.tags, tags.REGULAR_SEASON]),
        }));
      }

      matchups = [];
      week += 1;
    }
  }

  return schedule;
};
