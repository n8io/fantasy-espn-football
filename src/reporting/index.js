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

const getTeamNameFromMatchup = ({ homeTeam: { name: hName, id: hid }, awayTeam: { name: aName, id: aid } }, teamId) =>
  (teamId === hid ? hName : aName).replace(/[ ]+/g, ' ');

const isChampionshipMatchup = ({ tags }) => (tags || []).some(t => t === TAGS.PLAYOFF_CHAMPIONSHIP);
const isLastPlaceMatchup = ({ tags }) => (tags || []).some(t => t === TAGS.CONSOLATION_LOSERS_CHAMPIONSHIP_ELEVENTH);
const isCrownMatchup = matchup => isChampionshipMatchup(matchup) || isLastPlaceMatchup(matchup);

const isPlayoffMiss = (matchup, teamId) =>
  isTeamMatchup(matchup, teamId) &&
  getTeamTagsById(matchup, teamId).some(t => [TAGS.SEED_9, TAGS.SEED_10, TAGS.SEED_11, TAGS.SEED_12].indexOf(t) > -1);

const isRegularSeasonChamp = (matchup, teamId) =>
  isWinner(matchup, teamId) && getWinningTeam(matchup).tags.some(t => t === TAGS.SEED_1);
const isRegularSeasonRunnerUp = (matchup, teamId) =>
  isWinner(matchup, teamId) && getWinningTeam(matchup).tags.some(t => t === TAGS.SEED_2);

const historyWinLossRegularSeason = (matchups, teamId) => {
  const myMatchups = matchups.filter(mu => isTeamMatchup(mu, teamId) && isRegularSeasonMatchup(mu, teamId));
  const summary = myMatchups.reduce(
    (acc, mu) => ({
      wins: acc.wins + isWinner(mu, teamId),
      losses: acc.losses + isLoser(mu, teamId),
      points: {
        for: acc.points.for + pointsFor(mu, teamId),
        against: acc.points.against + pointsAgainst(mu, teamId),
      },
    }),
    { wins: 0, losses: 0, points: { for: 0, against: 0 } }
  );

  summary.points.for = round(summary.points.for, 2);
  summary.points.against = round(summary.points.against, 2);

  return summary;
};

const historyWinLossPlayoff = (matchups, teamId) => {
  const myMatchups = matchups.filter(mu => isTeamMatchup(mu, teamId) && isPlayoffMatchup(mu));
  const summary = myMatchups.reduce(
    (acc, mu) => ({
      wins: acc.wins + isWinner(mu, teamId),
      losses: acc.losses + isLoser(mu, teamId),
      points: {
        for: acc.points.for + pointsFor(mu, teamId),
        against: acc.points.against + pointsAgainst(mu, teamId),
      },
    }),
    { wins: 0, losses: 0, points: { for: 0, against: 0, misses: 0 } }
  );

  summary.points.for = round(summary.points.for, 2);
  summary.points.against = round(summary.points.against, 2);

  return summary;
};

const historyWinLossOverall = (matchups, teamId) => {
  const myMatchups = matchups.filter(mu => isTeamMatchup(mu, teamId));
  const summary = myMatchups.reduce(
    (acc, mu) => ({
      wins: acc.wins + isWinner(mu, teamId),
      losses: acc.losses + isLoser(mu, teamId),
      points: {
        for: acc.points.for + pointsFor(mu, teamId),
        against: acc.points.against + pointsAgainst(mu, teamId),
      },
      didNotMakePlayoffs: acc.didNotMakePlayoffs + (isPlayoffMiss(mu, teamId) ? 1 : 0),
    }),
    { wins: 0, losses: 0, didNotMakePlayoffs: 0, points: { for: 0, against: 0 } }
  );

  summary.games = summary.wins + summary.losses;
  summary.points.for = round(summary.points.for, 2);
  summary.points.against = round(summary.points.against, 2);

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
      const wonMatchup = isWinner(mu, teamId);
      const otherTeam = getOtherTeam(mu, teamId);
      const member = getMemberById(otherTeam.id);
      const matchupBefore = acc.find(m => m.id === otherTeam.id);
      const winsPrior = matchupBefore ? matchupBefore.wins : 0;
      const lossesPrior = matchupBefore ? matchupBefore.losses : 0;

      return [
        ...(acc.filter(m => m.id !== otherTeam.id) || []),
        {
          id: otherTeam.id,
          vs: member.abbrev,
          wins: winsPrior + (wonMatchup ? 1 : 0),
          losses: lossesPrior + (wonMatchup === false ? 1 : 0),
        },
      ];
    }, [])
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
