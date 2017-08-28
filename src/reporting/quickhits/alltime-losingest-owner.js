/* eslint-disable no-console,no-bitwise */
import math from 'mathjs';
import getMatchups from '../data/league/matchups';
import { getMembersBySeason, getMembersAlltime, getMemberAliasKey, getMemberByAliasKey } from '../data/league/members';

const { MAX_RESULTS: maxResults = 5 } = process.env;
const MAX_RESULTS = ~~maxResults || 5;
const MATCHUPS = getMatchups();
const MEMBERS_ALLTIME = getMembersAlltime();

const onlyCompleted = ({ homeTeam: { tags } }) => tags.find(t => t !== 'INDETERMINATE');
const onlyValidCompetitions = ({ homeTeam: { score: hs }, awayTeam: { score: as } }) => hs > 100 && as > 100;
const maxResultsLimit = (d, index) => index <= MAX_RESULTS - 1;

const getSeason = ({ tags }) => ~~tags.find(t => t.startsWith('SEASON_')).replace(/SEASON[_]/i, '');

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

const getTeamKeySuffix = key => key.replace(/[0-9]/gi, '');

const onlyValidTeams = t => t.wins + t.losses >= 8;

const reduceRecords = (acc, mu) => {
  const season = getSeason(mu);
  const seasonMembers = getMembersBySeason(season);
  const winner = getWinner(mu);
  const loser = getLoser(mu);

  const wMember = seasonMembers.find(m => m.id === winner.id);
  const lMember = seasonMembers.find(m => m.id === loser.id);

  const wmak = getMemberAliasKey(`${season}${wMember.abbrev}`);
  const lmak = getMemberAliasKey(`${season}${lMember.abbrev}`);

  const { key: wmk } = getMemberByAliasKey(MEMBERS_ALLTIME, wmak);
  const { key: lmk } = getMemberByAliasKey(MEMBERS_ALLTIME, lmak);

  const wBefore = acc[wmk] || { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
  const lBefore = acc[lmk] || { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };

  return {
    ...acc,
    [wmk]: {
      ...wBefore,
      wins: wBefore.wins + 1,
      pointsFor: math.round(math.add(wBefore.pointsFor, winner.score), 3),
      pointsAgainst: math.round(math.add(wBefore.pointsAgainst, loser.score), 3),
    },
    [lmk]: {
      ...lBefore,
      losses: lBefore.losses + 1,
      pointsFor: math.round(math.add(lBefore.pointsFor, loser.score), 3),
      pointsAgainst: math.round(math.add(lBefore.pointsAgainst, winner.score), 3),
    },
  };
};

const matchups = MATCHUPS.filter(onlyCompleted).filter(onlyValidCompetitions);

// eslint-disable-next-line
const teamRecords = matchups.reduce(reduceRecords, {});

const getLosingestTeams = () => {
  const losingestTeams = Object.keys(teamRecords)
    .map(key => ({
      key,
      wins: teamRecords[key].wins,
      losses: teamRecords[key].losses,
      pointsFor: teamRecords[key].pointsFor,
      pointsAgainst: teamRecords[key].pointsAgainst,
    }))
    .filter(onlyValidTeams) // Only owners who have at least half of one season under them are considered valid
    .reduce((acc, team) => {
      const suffix = getTeamKeySuffix(team.key);
      const records = acc.filter(t => getTeamKeySuffix(t.key) === suffix);

      let record = { ...team };

      if (records.length) {
        // A record already exists for this owner, we need to accumulate
        record = {
          ...record,
          key: team.key,
          wins: record.wins + records[0].wins,
          losses: record.losses + records[0].losses,
          pointsFor: record.pointsFor + records[0].pointsFor,
          pointsAgainst: record.pointsAgainst + records[0].pointsAgainst,
        };
      }

      return [...acc.filter(t => getTeamKeySuffix(t.key) !== suffix), record];
    }, [])
    .map(tr => ({
      ...tr,
      winPct: math.round(tr.wins / (tr.wins + tr.losses) * 100, 2),
      lossPct: math.round(tr.losses / (tr.wins + tr.losses) * 100, 2),
    }))
    .sort((a, b) => {
      if (a.lossPct > b.lossPct) {
        return -1;
      } else if (a.lossPct < b.lossPct) {
        return 1;
      }

      // Tiebreaker 1 (avg points for per game)
      const apfpg = math.round(a.pointsFor / (a.wins + a.losses), 2);
      const bpfpg = math.round(b.pointsFor / (b.wins + b.losses), 2);

      if (apfpg < bpfpg) {
        return -1;
      } else if (apfpg > bpfpg) {
        return 1;
      }

      return 0;
    })
    .filter(maxResultsLimit)
    .map((team, index) => {
      const { firstName, lastName, name } = MEMBERS_ALLTIME[team.key];

      return {
        [index +
        1]: `${firstName} ${lastName} (${name}) with a ${team.lossPct}% loss percentage with a W/L record of ${team.wins}/${team.losses}`,
      };
    });

  return losingestTeams;
};

export default getLosingestTeams;
