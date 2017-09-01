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

const onlyValidTeams = t => t.games >= 8;

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

  const wBefore = acc[wmk] || { games: 0, pointDiff: 0 };
  const lBefore = acc[lmk] || { games: 0, pointDiff: 0 };

  const pointDiff = math.abs(math.subtract(winner.score, loser.score));

  const datar = {
    ...acc,
    [wmk]: {
      ...wBefore,
      games: wBefore.games + 1,
      pointDiff: math.round(math.add(wBefore.pointDiff, pointDiff), 3),
    },
    [lmk]: {
      ...lBefore,
      games: lBefore.games + 1,
      pointDiff: math.round(math.add(lBefore.pointDiff, pointDiff), 3),
    },
  };

  return datar;
};

const matchups = MATCHUPS.filter(onlyCompleted).filter(onlyValidCompetitions);

// eslint-disable-next-line
const teamRecords = matchups.reduce(reduceRecords, {});

const getTeams = () => {
  const teams = Object.keys(teamRecords)
    .map(key => ({
      key,
      games: teamRecords[key].games,
      pointDiff: teamRecords[key].pointDiff,
    }))
    .map(tr => ({
      ...tr,
      avgPointDiff: math.round(tr.pointDiff / tr.games, 2),
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
          game: record.games + records[0].games,
          pointsDiff: record.pointsDiff + records[0].pointsDiff,
          avgPointDiff: record.avgPointDiff + records[0].avgPointDiff,
        };
      }

      return [...acc.filter(t => getTeamKeySuffix(t.key) !== suffix), record];
    }, [])
    .sort((a, b) => {
      if (a.avgPointDiff > b.avgPointDiff) {
        return -1;
      } else if (a.avgPointDiff < b.avgPointDiff) {
        return 1;
      }

      return 0;
    })
    .filter(maxResultsLimit)
    .map((team, index) => {
      const { firstName, lastName, name } = MEMBERS_ALLTIME[team.key];

      return {
        [index + 1]: `${firstName} ${lastName} (${name}) with an average point differential of ${team.avgPointDiff}`,
      };
    });

  return teams;
};

export default getTeams;
