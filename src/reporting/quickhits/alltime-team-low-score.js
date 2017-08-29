/* eslint-disable no-console,no-bitwise */
import math from 'mathjs';
import getMatchups from '../data/league/matchups';
import { getMembersBySeason } from '../data/league/members';
// import { save } from '../../lib/utils/reportWriter';

const { MAX_RESULTS: maxResults = 5 } = process.env;
const MAX_RESULTS = math.eval(maxResults) || 5;
const MATCHUPS = getMatchups();

const getMemberById = (members, id) => members.find(m => m.id === id);

const getLoser = mu => {
  if (mu.homeTeam.score < mu.awayTeam.score) {
    return mu.homeTeam;
  }

  return mu.awayTeam;
};

const isGameStarted = ({ homeTeam: { tags } }) => tags.find(t => t !== 'INDETERMINATE');

const isValidMatchup = ({ homeTeam: { score: hs }, awayTeam: { score: as } }) => hs > 100 && as > 100;

const appendMinScore = mu => ({
  ...mu,
  minScore: math.min(mu.homeTeam.score, mu.awayTeam.score),
});

const minScoreSort = (a, b) => a.minScore - b.minScore;

const minResultsFilter = (d, index) => index <= MAX_RESULTS - 1;

const getTeamLowScores = () => {
  const highestScoreMatchups = MATCHUPS.filter(isGameStarted)
    .filter(isValidMatchup)
    .map(appendMinScore)
    .sort(minScoreSort)
    .filter(minResultsFilter);

  // eslint-disable-next-line
  return highestScoreMatchups
    .sort(minScoreSort)
    .map((mu, index) => {
      const week = ~~mu.tags.find(t => t.startsWith('WEEK_')).replace(/WEEK[_]/, '');
      const season = ~~mu.tags.find(t => t.startsWith('SEASON_')).replace(/SEASON[_]/, '');
      const playoffRound = ~~(mu.tags.find(t => t.startsWith('PLAYOFF_ROUND_')) || '')
        .replace(/PLAYOFF[_]ROUND[_]/, '');
      const members = getMembersBySeason(season);
      const loser = getLoser(mu);
      const member = getMemberById(members, loser.id);
      const realName = member.firstName ? `${member.firstName} ${member.lastName}` : `???`;

      const suffix = `${realName} (${loser.name}) scored ${math.round(mu.minScore, 2)} points`;
      let msg = `In week ${week} of the ${season} season ${suffix}`;
      if (playoffRound) {
        msg = `During round ${playoffRound} of the ${season} playoffs ${suffix}`;
      }

      return { [index + 1]: msg };
    })
    .filter(minResultsFilter);
};

export default getTeamLowScores;
