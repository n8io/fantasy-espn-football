/* eslint-disable no-console,no-bitwise */
import math from 'mathjs';
import getMatchups from '../data/league/matchups';
import members from '../data/league/members';

const { MAX_RESULTS: maxResults = 5 } = process.env;
const MAX_RESULTS = ~~maxResults || 5;
const MATCHUPS = getMatchups();

const getMemberById = id => members.find(m => m.id === id);

const onlyCompleted = ({ homeTeam: { tags } }) => tags.find(t => t !== 'INDETERMINATE');
const onlyValidCompetitions = ({ homeTeam: { score: hs }, awayTeam: { score: as } }) => hs > 100 && as > 100;
const maxResultsLimit = (d, index) => index <= MAX_RESULTS - 1;

const getWinner = mu => {
  if (mu.homeTeam.score > mu.awayTeam.score) {
    return mu.homeTeam;
  }

  return mu.awayTeam;
};

const getLoser = mu => {
  if (mu.homeTeam.score < mu.awayTeam.score) {
    return mu.homeTeam;
  }

  return mu.awayTeam;
};

const reduceRecords = (acc, mu) => {
  const winner = getWinner(mu);
  const loser = getLoser(mu);

  const wBefore = acc[winner.id] || { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
  const lBefore = acc[loser.id] || { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };

  return {
    ...acc,
    [winner.id]: {
      ...wBefore,
      wins: wBefore.wins + 1,
      pointsFor: math.round(math.add(wBefore.pointsFor, winner.score), 3),
    },
    [loser.id]: {
      ...lBefore,
      losses: lBefore.losses + 1,
      pointsAgainst: math.round(math.add(lBefore.pointsAgainst, winner.score), 3),
    },
  };
};

const matchups = MATCHUPS.filter(onlyCompleted).filter(onlyValidCompetitions);

// eslint-disable-next-line
const teamRecords = matchups.reduce(reduceRecords, {});

const getWinningestTeams = () => {
  const winningestTeams = Object.keys(teamRecords)
    .map(key => ({
      id: ~~key,
      wins: teamRecords[key].wins,
      losses: teamRecords[key].losses,
      winPct: math.round(teamRecords[key].wins / (teamRecords[key].wins + teamRecords[key].losses) * 100, 0),
      pointsFor: teamRecords[key].pointsFor,
      pointsAgainst: teamRecords[key].pointsAgainst,
    }))
    .sort((a, b) => {
      if (a.wins > b.wins) {
        return -1;
      } else if (a.wins < b.wins) {
        return 1;
      }

      return 0;
    })
    .map((team, index) => {
      const { firstName, lastName, name } = getMemberById(team.id);

      return {
        [index + 1]: `${firstName} ${lastName} (${name}) with a ${team.winPct}% win percentage`,
      };
    })
    .filter(maxResultsLimit);

  return winningestTeams;
};

export default getWinningestTeams;
