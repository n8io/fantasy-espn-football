/* eslint-disable no-nested-ternary,no-plusplus */
import cheerio from 'cheerio';
import mirrorkey from 'mirrorkey';
import config from '../../../../config';
import tagsArray from '../../../../config/tags.json';
import { parseUrl, parseKeyFromUrl } from '../../../utils/urls';
import unique from '../../../utils/unique';
import log from '../../../utils/domLogger';

const { urls: { LEAGUE_PLAYOFF_BRACKET: url } } = config;
const tags = mirrorkey(tagsArray);

const parseValueFromStringByRegex = (str, reg, fallback, castType) => {
  const matches = reg.exec(str);

  reg.lastIndex = 0; // eslint-disable-line no-param-reassign

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

const updatePlayoffMatchups = (week, matchups) => {
  const wk = { ...week };

  const updatedMatchups = wk.matchups.map(omu => {
    const newMatchup = matchups.find(
      nmu => omu.homeTeam.id === nmu.homeTeam.id && nmu.tags.indexOf(`PLAYOFF_ROUND_${wk.playoffRound}`) > -1
    );

    return {
      ...omu,
      tags: unique([...(omu.tags || []), ...(newMatchup.tags || [])]),
      homeTeam: {
        ...omu.homeTeam,
        ...newMatchup.homeTeam,
        tags: unique([...(omu.homeTeam.tags || []), ...(newMatchup.homeTeam.tags || [])]),
      },
      awayTeam: {
        ...omu.awayTeam,
        ...newMatchup.awayTeam,
        tags: unique([...(omu.awayTeam.tags || []), ...(newMatchup.awayTeam.tags || [])]),
      },
    };
  });

  return {
    ...wk,
    matchups: updatedMatchups,
  };
};

const convertToMatchupsOnly = weeksObj =>
  Object.keys(weeksObj).reduce((acc = [], key) => [...acc, ...weeksObj[key].matchups], []);

export default async (page, seasonId, schedule) => {
  const { url: gotoUrl } = parseUrl(url, {
    search: {
      seasonId,
    },
  });

  let msg = `➡️ 302 Redirecting to league playoff bracket: ${gotoUrl} ...`;
  await log(msg, page);

  await page.goto(gotoUrl);

  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  const $ = cheerio.load(bodyHtml);
  const isBracketAvailable = !$('.games-error-red-alert').length;

  if (isBracketAvailable === false) {
    msg = `😕 404 League playoff bracket not available yet for the given season: ${seasonId}`;
    await log(msg, page);

    return schedule;
  }

  msg = `🏆 203 Parsing playoff brackets...`;
  await log(msg, page);

  const tMatchupTables = $('table.tableBody[bgcolor="#c9c9bc"]');

  const matchupTables = Array.from(tMatchupTables);

  if (!matchupTables || !matchupTables.length) {
    return schedule;
  }

  const matchupTagMap = [
    {
      tags: [tags.PLAYOFF, tags.PLAYOFF_FIRST_ROUND, tags.PLAYOFF_ROUND_1],
      seeds: { home: [tags.SEED_1], away: [tags.SEED_8] },
    },
    { tags: [tags.PLAYOFF, tags.PLAYOFF_SEMIFINAL, tags.PLAYOFF_ROUND_2] },
    {
      tags: [tags.PLAYOFF, tags.PLAYOFF_CHAMPIONSHIP, tags.PLAYOFF_ROUND_3],
      winner: [tags.CHAMPION, tags.PLACE_1],
      loser: [tags.RUNNER_UP, tags.PLACE_2],
    },
    {
      tags: [tags.PLAYOFF, tags.PLAYOFF_FIRST_ROUND, tags.PLAYOFF_ROUND_1],
      seeds: { home: [tags.SEED_4], away: [tags.SEED_5] },
    },
    {
      tags: [tags.PLAYOFF, tags.PLAYOFF_FIRST_ROUND, tags.PLAYOFF_ROUND_1],
      seeds: { home: [tags.SEED_3], away: [tags.SEED_6] },
    },
    { tags: [tags.PLAYOFF, tags.PLAYOFF_SEMIFINAL, tags.PLAYOFF_ROUND_2] },
    {
      tags: [tags.PLAYOFF, tags.PLAYOFF_FIRST_ROUND, tags.PLAYOFF_ROUND_1],
      seeds: { home: [tags.SEED_2], away: [tags.SEED_7] },
    },

    {
      tags: [tags.CONSOLATION_WINNERS, tags.CONSOLATION_WINNERS_CHAMPIONSHIP_THIRD, tags.PLAYOFF_ROUND_3],
      winner: [tags.PLACE_3],
      loser: [tags.PLACE_4],
    },
    { tags: [tags.CONSOLATION_WINNERS, tags.CONSOLATION_WINNERS_SEMIFINAL_THIRD, tags.PLAYOFF_ROUND_2] },
    {
      tags: [tags.CONSOLATION_WINNERS, tags.CONSOLATION_WINNERS_CHAMPIONSHIP_FIFTH, tags.PLAYOFF_ROUND_3],
      winner: [tags.PLACE_5],
      loser: [tags.PLACE_6],
    },
    { tags: [tags.CONSOLATION_WINNERS, tags.CONSOLATION_WINNERS_SEMIFINAL_THIRD, tags.PLAYOFF_ROUND_2] },
    {
      tags: [tags.CONSOLATION_WINNERS, tags.CONSOLATION_WINNERS_CHAMPIONSHIP_SEVENTH, tags.PLAYOFF_ROUND_3],
      winner: [tags.PLACE_7],
      loser: [tags.PLACE_8],
    },

    {
      tags: [tags.CONSOLATION_LOSERS, tags.CONSOLATION_LOSERS_FIRST_ROUND, tags.PLAYOFF_ROUND_1],
      seeds: { home: [tags.SEED_9], away: [tags.SEED_10] },
    },
    { tags: [tags.CONSOLATION_LOSERS, tags.CONSOLATION_LOSERS_SEMIFINAL, tags.PLAYOFF_ROUND_2] },
    {
      tags: [tags.CONSOLATION_LOSERS, tags.CONSOLATION_LOSERS_CHAMPIONSHIP_NINTH, tags.PLAYOFF_ROUND_3],
      winner: [tags.PLACE_9],
      loser: [tags.PLACE_10],
    },
    {
      tags: [tags.CONSOLATION_LOSERS, tags.CONSOLATION_LOSERS_FIRST_ROUND, tags.PLAYOFF_ROUND_1],
      seeds: { home: [tags.SEED_11], away: [tags.SEED_12] },
    },
    {
      tags: [tags.CONSOLATION_LOSERS, tags.CONSOLATION_LOSERS_SEMIFINAL, tags.PLAYOFF_ROUND_2],
    },
    {
      tags: [
        tags.CONSOLATION_LOSERS,
        tags.CONSOLATION_LOSERS_CHAMPIONSHIP_ELEVENTH,
        tags.PLAYOFF_ROUND_3,
        tags.CONSOLATION_LAST_PLACE,
      ],
      winner: [tags.PLACE_11],
      loser: [tags.PLACE_12, tags.LAST_PLACE],
    },
  ];

  const playoffMatchups = matchupTables.map((table, index) => {
    const rows = $(table).find('tr');
    const awayHref = $(rows[1]).find('a').attr('href');
    const homeHref = $(rows[2]).find('a').attr('href');
    const awayText = $(rows[1]).text().replace(/(\n|\r|[ ]+)/g, ' ').trim();
    const homeText = $(rows[2]).text().replace(/(\n|\r|[ ]+)/g, ' ').trim();
    const regScore = /#[1-9][0-2]?[ ][\S ]+[ ]([1-9]+[0-9]*([.][0-9]+)?)/gi;
    const regTeamName = /#[1-9][0-2]?[ ]([\S ]+)[ ][1-9]+[0-9]*([.][0-9]+)?/gi;

    const matchup = {
      homeTeam: {
        id: parseKeyFromUrl(homeHref, 'teamId', 'int'),
        name: parseValueFromStringByRegex(homeText, regTeamName),
        score: parseValueFromStringByRegex(homeText, regScore, 0.0, 'float'),
        tags: [],
      },
      awayTeam: {
        id: parseKeyFromUrl(awayHref, 'teamId', 'int'),
        name: parseValueFromStringByRegex(awayText, regTeamName),
        score: parseValueFromStringByRegex(awayText, regScore, 0.0, 'float'),
        tags: [],
      },
    };

    const { homeTeam: { score: hScore }, awayTeam: { score: aScore } } = matchup;

    const isHomeWinner = hScore > aScore;
    const isAwayWinner = aScore > hScore;

    let homeTags = [];
    let awayTags = [];

    if (isHomeWinner && !isAwayWinner) {
      awayTags = unique([tags.LOSER, ...(matchupTagMap[index].loser || [])]);
      homeTags = unique([tags.WINNER, ...(matchupTagMap[index].winner || [])]);
    } else if (!isHomeWinner && isAwayWinner) {
      awayTags = unique([tags.WINNER, ...(matchupTagMap[index].winner || [])]);
      homeTags = unique([tags.LOSER, ...(matchupTagMap[index].loser || [])]);
    } else {
      awayTags.push(tags.INDETERMINATE);
      homeTags.push(tags.INDETERMINATE);
    }

    matchup.awayTeam.tags = unique([...matchup.awayTeam.tags, ...awayTags]);
    matchup.homeTeam.tags = unique([...matchup.homeTeam.tags, ...homeTags]);
    matchup.tags = unique([...(matchup.tags || []), ...matchupTagMap[index].tags]);

    if (matchupTagMap[index].seeds) {
      matchup.awayTeam.tags = unique([...(matchup.awayTeam.tags || []), ...(matchupTagMap[index].seeds.away || [])]);
      matchup.homeTeam.tags = unique([...(matchup.homeTeam.tags || []), ...(matchupTagMap[index].seeds.home || [])]);
    }

    return matchup;
  });

  const regSeasonWeekIds = Object.keys(schedule).filter(key => !schedule[key].playoffRound);
  const regSeasonWeeks = regSeasonWeekIds.reduce(
    (acc, key) => ({
      ...acc,
      [key]: {
        ...schedule[key],
        tags: unique([...(schedule[key].tags || []), tags.REGULAR_SEASON]),
      },
    }),
    {}
  );

  const playoffWeekIds = Object.keys(schedule).filter(key => schedule[key].playoffRound);
  const playofWeeks = playoffWeekIds.reduce(
    (acc, key) => ({
      ...acc,
      [key]: updatePlayoffMatchups(schedule[key], playoffMatchups),
    }),
    {}
  );

  msg = `👍 200 Playoff brackets parsed successfully.`;
  await log(msg, page);

  return [...convertToMatchupsOnly(regSeasonWeeks), ...convertToMatchupsOnly(playofWeeks)];
};
