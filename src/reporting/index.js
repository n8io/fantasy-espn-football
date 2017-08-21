/* eslint-disable no-console,no-bitwise */
import mirrorkey from 'mirrorkey';
import MATCHUPS from './league/matchups';
import MEMBERS from './league/members';
import tagsArray from '../config/tags.json';
import unique from '../lib/utils/unique';

const TAGS = mirrorkey(tagsArray);

const round = (value, decimals) => Number(`${Math.round(`${value}e${decimals}`)}e-${decimals}`);

const isWinningTeam = ({ tags = [] }) => tags.some(t => t === TAGS.WINNER);
const isLosingTeam = ({ tags = [] }) => tags.some(t => t === TAGS.LOSER);

const isSameTeam = ({ id }, teamId) => id === teamId;

const isTeamMatchup = ({ homeTeam: { id: hid }, awayTeam: { id: aid } }, teamId) => hid === teamId || aid === teamId;
const isRegularSeasonMatchup = ({ tags = [] }) => tags.some(t => t === TAGS.REGULAR_SEASON);
const isPlayoffMatchup = ({ tags = [] }) => tags.some(t => t === TAGS.PLAYOFF);

const getWinningTeam = ({ homeTeam, awayTeam }) => {
  if (isWinningTeam(homeTeam)) {
    return homeTeam;
  } else if (isWinningTeam(awayTeam)) {
    return awayTeam;
  }

  return undefined;
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
  (teamId === hid ? hName : aName).replace(/[ ]+/, ' ');

const isChampionshipMatchup = ({ tags }) => (tags || []).some(t => t === TAGS.PLAYOFF_CHAMPIONSHIP);
const isLastPlaceMatchup = ({ tags }) => (tags || []).some(t => t === TAGS.CONSOLATION_LOSERS_CHAMPIONSHIP_ELEVENTH);
const isCrownMatchup = matchup => isChampionshipMatchup(matchup) || isLastPlaceMatchup(matchup);

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

  summary.games = summary.wins + summary.losses;
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
    { wins: 0, losses: 0, points: { for: 0, against: 0 } }
  );

  summary.games = summary.wins + summary.losses;
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
    }),
    { wins: 0, losses: 0, points: { for: 0, against: 0 } }
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

  const crowns = myMatchups.reduce(
    (acc, mu) => ({
      ...acc,
      championships: acc.championships + (isChampionshipMatchup(mu) && isWinner(mu, teamId) ? 1 : 0),
      runnerUps: acc.runnerUps + (isChampionshipMatchup(mu) && isLoser(mu, teamId) ? 1 : 0),
      lastPlaces: acc.lastPlaces + (isLastPlaceMatchup(mu) && isLoser(mu, teamId) ? 1 : 0),
      closeCalls: acc.closeCalls + (isLastPlaceMatchup(mu) && isWinner(mu, teamId) ? 1 : 0),
    }),
    { championships: 0, runnerUps: 0, lastPlaces: 0, closeCalls: 0 }
  );

  return crowns;
};

const leagueSummary = () =>
  MEMBERS.reduce((acc = [], { id: teamId, name, firstName, lastName }) => [
    ...acc,
    {
      teamId,
      owner: `${firstName} ${lastName}`,
      name,
      names: historyTeamName(MATCHUPS, teamId),
      crowns: { ...historyCrowns(MATCHUPS, teamId) },
      regularSeason: { ...historyWinLossRegularSeason(MATCHUPS, teamId) },
      playoffs: { ...historyWinLossPlayoff(MATCHUPS, teamId) },
      overall: { ...historyWinLossOverall(MATCHUPS, teamId) },
    },
  ]);

console.log(JSON.stringify(leagueSummary(), null, 2));

// console.log(JSON.stringify(MATCHUPS.filter(mu => isCrownMatchup(mu) && isWinner(mu, 5)), null, 2));

// const myMatchups = matchups.filter(m => isTeamMatchup(m, TEAM_ID) && isPlayoffMatchup(m));
// console.log(JSON.stringify({ myMatchups, teamId: TEAM_ID, length: myMatchups.length }, null, 2));
