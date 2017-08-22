/* eslint-disable no-console,no-bitwise */
import mirrorkey from 'mirrorkey';
import getMatchups from './league/matchups';
import MEMBERS from './league/members';
import tagsArray from '../config/tags.json';
import unique from '../lib/utils/unique';
import { save } from '../lib/utils/reportWriter';

const { YEARS_BACK } = process.env;
const MATCHUPS = getMatchups(YEARS_BACK);
const TAGS = mirrorkey(tagsArray);

const round = (value, decimals) => Number(`${Math.round(`${value}e${decimals}`)}e-${decimals}`);

const isWinningTeam = ({ tags = [] }) => tags.some(t => t === TAGS.WINNER);
const isLosingTeam = ({ tags = [] }) => tags.some(t => t === TAGS.LOSER);

const isSameTeam = ({ id }, teamId) => id === teamId;

const isTeamMatchup = ({ homeTeam: { id: hid }, awayTeam: { id: aid } }, teamId) => hid === teamId || aid === teamId;
const isRegularSeasonMatchup = ({ tags = [] }) => tags.some(t => t === TAGS.REGULAR_SEASON);
const isPlayoffMatchup = ({ tags = [] }) => tags.some(t => t === TAGS.PLAYOFF);

const getMemberById = id => MEMBERS.find(m => m.id === id);

const getWinningTeam = ({ homeTeam, awayTeam }) => {
  if (isWinningTeam(homeTeam)) {
    return homeTeam;
  } else if (isWinningTeam(awayTeam)) {
    return awayTeam;
  }

  return undefined;
};

const getOtherTeam = ({ homeTeam, awayTeam }, teamId) => {
  if (isSameTeam(homeTeam, teamId)) {
    return awayTeam;
  } else if (isSameTeam(awayTeam, teamId)) {
    return homeTeam;
  }

  return undefined;
};

const getTeamTagsById = ({ homeTeam, awayTeam }, teamId) => {
  if (isSameTeam(homeTeam, teamId)) {
    return homeTeam.tags;
  } else if (isSameTeam(awayTeam, teamId)) {
    return awayTeam.tags;
  }

  return [];
};

const isWinner = ({ homeTeam, awayTeam }, teamId) =>
  (isSameTeam(homeTeam, teamId) && isWinningTeam(homeTeam)) ||
  (isSameTeam(awayTeam, teamId) && isWinningTeam(awayTeam));

const isLoser = ({ homeTeam, awayTeam }, teamId) =>
  (isSameTeam(homeTeam, teamId) && isLosingTeam(homeTeam)) || (isSameTeam(awayTeam, teamId) && isLosingTeam(awayTeam));

const pointsFor = ({ homeTeam, awayTeam }, teamId) => {
  if (homeTeam.id === teamId) {
    return homeTeam.score;
  } else if (awayTeam.id === teamId) {
    return awayTeam.score;
  }

  return 0.0;
};

const pointsAgainst = ({ homeTeam, awayTeam }, teamId) => {
  if (awayTeam.id === teamId) {
    return homeTeam.score;
  } else if (homeTeam.id === teamId) {
    return awayTeam.score;
  }

  return 0.0;
};

const pointsForHome = ({ homeTeam }, teamId) => {
  if (homeTeam.id === teamId) {
    return homeTeam.score;
  }

  return 0.0;
};

const pointsAgainstHome = ({ homeTeam, awayTeam }, teamId) => {
  if (homeTeam.id === teamId) {
    return awayTeam.score;
  }

  return 0.0;
};

const pointsForAway = ({ awayTeam }, teamId) => {
  if (awayTeam.id === teamId) {
    return awayTeam.score;
  }

  return 0.0;
};

const pointsAgainstAway = ({ homeTeam, awayTeam }, teamId) => {
  if (awayTeam.id === teamId) {
    return homeTeam.score;
  }

  return 0.0;
};

const getTeamNameFromMatchup = ({ homeTeam: { name: hName, id: hid }, awayTeam: { name: aName, id: aid } }, teamId) =>
  (teamId === hid ? hName : aName).replace(/[ ]+/g, ' ');

const isHomeGame = ({ homeTeam }, teamId) => isSameTeam(homeTeam, teamId);
const isAwayGame = ({ awayTeam }, teamId) => isSameTeam(awayTeam, teamId);
const isHomeLoss = ({ homeTeam }, teamId) => isHomeGame({ homeTeam }, teamId) && isLosingTeam(homeTeam);
const isHomeWin = ({ homeTeam }, teamId) => isHomeGame({ homeTeam }, teamId) && isWinningTeam(homeTeam);
const isAwayLoss = ({ awayTeam }, teamId) => isAwayGame({ awayTeam }, teamId) && isLosingTeam(awayTeam);
const isAwayWin = ({ awayTeam }, teamId) => isAwayGame({ awayTeam }, teamId) && isWinningTeam(awayTeam);

const isChampionshipMatchup = ({ tags }) => (tags || []).some(t => t === TAGS.PLAYOFF_CHAMPIONSHIP);
const isLastPlaceMatchup = ({ tags }) => (tags || []).some(t => t === TAGS.CONSOLATION_LOSERS_CHAMPIONSHIP_ELEVENTH);
const isCrownMatchup = matchup => isChampionshipMatchup(matchup) || isLastPlaceMatchup(matchup);

const isDivisionalMatchup = ({ tags }) => (tags || []).some(t => t === TAGS.DIVISIONAL_MATCHUP);
const isDivisionalMatchupWin = (matchup, teamId) => isDivisionalMatchup(matchup) && isWinner(matchup, teamId);
const isDivisionalMatchupLoss = (matchup, teamId) => isDivisionalMatchup(matchup) && isLoser(matchup, teamId);

const isPlayoffMiss = (matchup, teamId) =>
  isTeamMatchup(matchup, teamId) &&
  getTeamTagsById(matchup, teamId).some(t => [TAGS.SEED_9, TAGS.SEED_10, TAGS.SEED_11, TAGS.SEED_12].indexOf(t) > -1);

const isPlayoffMake = (matchup, teamId) =>
  isTeamMatchup(matchup, teamId) &&
  isPlayoffMatchup(matchup, teamId) &&
  getTeamTagsById(matchup, teamId).some(
    t =>
      [TAGS.SEED_1, TAGS.SEED_2, TAGS.SEED_3, TAGS.SEED_4, TAGS.SEED_5, TAGS.SEED_6, TAGS.SEED_7, TAGS.SEED_8].indexOf(
        t
      ) > -1
  );

const isRegularSeasonChamp = (matchup, teamId) =>
  isWinner(matchup, teamId) && getWinningTeam(matchup).tags.some(t => t === TAGS.SEED_1);
const isRegularSeasonRunnerUp = (matchup, teamId) =>
  isWinner(matchup, teamId) && getWinningTeam(matchup).tags.some(t => t === TAGS.SEED_2);

const historyWinLossRegularSeason = (matchups, teamId) => {
  const myMatchups = matchups.filter(mu => isTeamMatchup(mu, teamId) && isRegularSeasonMatchup(mu, teamId));
  const summary = myMatchups.reduce(
    (acc, mu) => ({
      wins: {
        total: acc.wins.total + (isWinner(mu, teamId) ? 1 : 0),
        home: acc.wins.home + (isHomeWin(mu, teamId) ? 1 : 0),
        away: acc.wins.away + (isAwayWin(mu, teamId) ? 1 : 0),
        divisional: acc.wins.divisional + (isDivisionalMatchupWin(mu, teamId) ? 1 : 0),
      },
      losses: {
        total: acc.losses.total + (isLoser(mu, teamId) ? 1 : 0),
        home: acc.losses.home + (isHomeLoss(mu, teamId) ? 1 : 0),
        away: acc.losses.away + (isAwayLoss(mu, teamId) ? 1 : 0),
        divisional: acc.losses.divisional + (isDivisionalMatchupLoss(mu, teamId) ? 1 : 0),
      },
      points: {
        total: {
          for: acc.points.total.for + pointsFor(mu, teamId),
          against: acc.points.total.against + pointsAgainst(mu, teamId),
        },
        home: {
          for: acc.points.home.for + pointsForHome(mu, teamId),
          against: acc.points.home.against + pointsAgainstHome(mu, teamId),
        },
        away: {
          for: acc.points.away.for + pointsForAway(mu, teamId),
          against: acc.points.away.against + pointsAgainstAway(mu, teamId),
        },
      },
    }),
    {
      wins: {
        total: 0,
        away: 0,
        home: 0,
        divisional: 0,
      },
      losses: {
        total: 0,
        away: 0,
        home: 0,
        divisional: 0,
      },
      points: {
        total: { for: 0, against: 0 },
        away: { for: 0, against: 0 },
        home: { for: 0, against: 0 },
      },
    }
  );

  summary.points.total.for = round(summary.points.total.for, 2);
  summary.points.total.against = round(summary.points.total.against, 2);
  summary.points.home.for = round(summary.points.home.for, 2);
  summary.points.home.against = round(summary.points.home.against, 2);
  summary.points.away.for = round(summary.points.away.for, 2);
  summary.points.away.against = round(summary.points.away.against, 2);

  return summary;
};

const historyWinLossPlayoff = (matchups, teamId) => {
  const myMatchups = matchups.filter(mu => isTeamMatchup(mu, teamId) && isPlayoffMatchup(mu));
  const summary = myMatchups.reduce(
    (acc, mu) => ({
      wins: {
        total: acc.wins.total + (isWinner(mu, teamId) ? 1 : 0),
        home: acc.wins.home + (isHomeWin(mu, teamId) ? 1 : 0),
        away: acc.wins.away + (isAwayWin(mu, teamId) ? 1 : 0),
        divisional: acc.wins.divisional + (isDivisionalMatchupWin(mu, teamId) ? 1 : 0),
      },
      losses: {
        total: acc.losses.total + (isLoser(mu, teamId) ? 1 : 0),
        home: acc.losses.home + (isHomeLoss(mu, teamId) ? 1 : 0),
        away: acc.losses.away + (isAwayLoss(mu, teamId) ? 1 : 0),
        divisional: acc.losses.divisional + (isDivisionalMatchupLoss(mu, teamId) ? 1 : 0),
      },
      points: {
        total: {
          for: acc.points.total.for + pointsFor(mu, teamId),
          against: acc.points.total.against + pointsAgainst(mu, teamId),
        },
        home: {
          for: acc.points.home.for + pointsForHome(mu, teamId),
          against: acc.points.home.against + pointsAgainstHome(mu, teamId),
        },
        away: {
          for: acc.points.away.for + pointsForAway(mu, teamId),
          against: acc.points.away.against + pointsAgainstAway(mu, teamId),
        },
      },
    }),
    {
      wins: {
        total: 0,
        away: 0,
        home: 0,
        divisional: 0,
      },
      losses: {
        total: 0,
        away: 0,
        home: 0,
        divisional: 0,
      },
      points: {
        total: { for: 0, against: 0 },
        away: { for: 0, against: 0 },
        home: { for: 0, against: 0 },
        divisional: { for: 0, against: 0 },
      },
    }
  );

  summary.points.total.for = round(summary.points.total.for, 2);
  summary.points.total.against = round(summary.points.total.against, 2);
  summary.points.home.for = round(summary.points.home.for, 2);
  summary.points.home.against = round(summary.points.home.against, 2);
  summary.points.away.for = round(summary.points.away.for, 2);
  summary.points.away.against = round(summary.points.away.against, 2);

  return summary;
};

const historyWinLossOverall = (matchups, teamId) => {
  const myMatchups = matchups.filter(mu => isTeamMatchup(mu, teamId));
  const summary = myMatchups.reduce(
    (acc, mu) => ({
      wins: {
        total: acc.wins.total + (isWinner(mu, teamId) ? 1 : 0),
        home: acc.wins.home + (isHomeWin(mu, teamId) ? 1 : 0),
        away: acc.wins.away + (isAwayWin(mu, teamId) ? 1 : 0),
        divisional: acc.wins.divisional + (isDivisionalMatchupWin(mu, teamId) ? 1 : 0),
      },
      losses: {
        total: acc.losses.total + (isLoser(mu, teamId) ? 1 : 0),
        home: acc.losses.home + (isHomeLoss(mu, teamId) ? 1 : 0),
        away: acc.losses.away + (isAwayLoss(mu, teamId) ? 1 : 0),
        divisional: acc.losses.divisional + (isDivisionalMatchupLoss(mu, teamId) ? 1 : 0),
      },
      playoffs: {
        made: acc.playoffs.made + (isPlayoffMake(mu, teamId) ? 1 : 0),
        missed: acc.playoffs.missed + (isPlayoffMiss(mu, teamId) ? 1 : 0),
      },
      points: {
        total: {
          for: acc.points.total.for + pointsFor(mu, teamId),
          against: acc.points.total.against + pointsAgainst(mu, teamId),
        },
        home: {
          for: acc.points.home.for + pointsForHome(mu, teamId),
          against: acc.points.home.against + pointsAgainstHome(mu, teamId),
        },
        away: {
          for: acc.points.away.for + pointsForAway(mu, teamId),
          against: acc.points.away.against + pointsAgainstAway(mu, teamId),
        },
      },
    }),
    {
      wins: { total: 0, away: 0, home: 0, divisional: 0 },
      losses: { total: 0, away: 0, home: 0, divisional: 0 },
      playoffs: {
        missed: 0,
        made: 0,
      },
      points: { total: { for: 0, against: 0 }, away: { for: 0, against: 0 }, home: { for: 0, against: 0 } },
    }
  );

  summary.games = {
    total: summary.wins.total + summary.losses.total,
    divisional: summary.wins.divisional + summary.losses.divisional,
  };

  summary.points.total.for = round(summary.points.total.for, 2);
  summary.points.total.against = round(summary.points.total.against, 2);
  summary.points.home.for = round(summary.points.home.for, 2);
  summary.points.home.against = round(summary.points.home.against, 2);
  summary.points.away.for = round(summary.points.away.for, 2);
  summary.points.away.against = round(summary.points.away.against, 2);

  return summary;
};

const historyTeamName = (matchups, teamId) => {
  const myMatchups = matchups.filter(mu => isTeamMatchup(mu, teamId));
  const summary = myMatchups.reduce((acc = [], mu) => [...acc, getTeamNameFromMatchup(mu, teamId)]);

  return unique(summary, true);
};

const historyCrowns = (matchups, teamId) => {
  const myMatchups = matchups.filter(mu => isCrownMatchup(mu));

  const postSeasonCrowns = myMatchups.reduce(
    (acc, mu) => ({
      ...acc,
      championships: acc.championships + (isChampionshipMatchup(mu) && isWinner(mu, teamId) ? 1 : 0),
      runnerUps: acc.runnerUps + (isChampionshipMatchup(mu) && isLoser(mu, teamId) ? 1 : 0),
      lastPlaces: acc.lastPlaces + (isLastPlaceMatchup(mu) && isLoser(mu, teamId) ? 1 : 0),
      closeCalls: acc.closeCalls + (isLastPlaceMatchup(mu) && isWinner(mu, teamId) ? 1 : 0),
    }),
    { championships: 0, runnerUps: 0, lastPlaces: 0, closeCalls: 0 }
  );

  const regSeasonCrowns = matchups.reduce(
    (acc, mu) => ({
      ...acc,
      regSeasonChamps: acc.regSeasonChamps + (isRegularSeasonChamp(mu, teamId) ? 1 : 0),
      regSeasonRunnerUp: acc.regSeasonRunnerUp + (isRegularSeasonRunnerUp(mu, teamId) ? 1 : 0),
    }),
    { regSeasonChamps: 0, regSeasonRunnerUp: 0 }
  );

  const crowns = {
    ...regSeasonCrowns,
    ...postSeasonCrowns,
  };

  return crowns;
};

const historyHeadToHead = (matchups, teamId) => {
  const myMatchups = matchups.filter(mu => isTeamMatchup(mu, teamId));

  return myMatchups
    .reduce((acc, mu) => {
      const otherTeam = getOtherTeam(mu, teamId);
      const member = getMemberById(otherTeam.id);
      const matchupBefore = acc.find(m => m.id === otherTeam.id);
      const winsPrior = (matchupBefore || {}).wins || { total: 0, home: 0, away: 0 };
      const lossesPrior = (matchupBefore || {}).losses || { total: 0, home: 0, away: 0 };

      return [
        ...(acc.filter(m => m.id !== otherTeam.id) || []),
        {
          id: otherTeam.id,
          vs: member.abbrev,
          wins: {
            total: winsPrior.total + (isWinner(mu, teamId) ? 1 : 0),
            home: winsPrior.home + (isHomeWin(mu, teamId) ? 1 : 0),
            away: winsPrior.away + (isAwayWin(mu, teamId) ? 1 : 0),
          },
          losses: {
            total: lossesPrior.total + (isLoser(mu, teamId) ? 1 : 0),
            home: lossesPrior.home + (isHomeLoss(mu, teamId) ? 1 : 0),
            away: lossesPrior.away + (isAwayLoss(mu, teamId) ? 1 : 0),
          },
        },
      ];
    }, [])
    .map(h2h => ({
      ...h2h,
      meetings: h2h.wins.total + h2h.losses.total,
    }))
    .sort((a, b) => {
      if (a.id < b.id) {
        return -1;
      } else if (a.id > b.id) {
        return 1;
      }

      return 0;
    });
};

const leagueSummary = () =>
  MEMBERS.reduce(
    (acc = [], { id: teamId, name, firstName, lastName }) => [
      ...acc,
      {
        teamId,
        owner: `${firstName} ${lastName}`,
        currentName: name,
        names: historyTeamName(MATCHUPS, teamId),
        crowns: { ...historyCrowns(MATCHUPS, teamId) },
        regularSeason: { ...historyWinLossRegularSeason(MATCHUPS, teamId) },
        playoffs: { ...historyWinLossPlayoff(MATCHUPS, teamId) },
        overall: { ...historyWinLossOverall(MATCHUPS, teamId) },
        h2h: [...historyHeadToHead(MATCHUPS, teamId)],
      },
    ],
    []
  );

const summarization = leagueSummary();
const fileName = `member-summary${YEARS_BACK ? `.last-${`00${YEARS_BACK}`.slice(-2)}-years` : '.alltime'}`;
save('league', fileName, summarization);

// console.log(JSON.stringify(MATCHUPS.filter(mu => isTeamMatchup(mu, 1) && isPlayoffMake(mu, 1)), null, 2));
