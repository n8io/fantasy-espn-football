/* eslint-disable no-console,no-bitwise */
import math from 'mathjs';
import getMatchups from '../data/league/matchups';
import { getMembersBySeason } from '../data/league/members';
// import { save } from '../../lib/utils/reportWriter';

const { MAX_RESULTS: maxResults = 3 } = process.env;
const MAX_RESULTS = ~~maxResults || 3;
const MATCHUPS = getMatchups();

const getMemberById = (members, id) => members.find(m => m.id === id);

const getWinner = mu => {
  if (mu.homeTeam.score > mu.awayTeam.score) {
    return mu.homeTeam;
  }

  return mu.awayTeam;
};

const getTeamHighScores = () => {
  const defecits = MATCHUPS.filter(({ homeTeam: { tags } }) => tags.find(t => t !== 'INDETERMINATE'))
    .filter(({ homeTeam: { score: hs }, awayTeam: { score: as } }) => hs > 100 && as > 100)
    .map(({ homeTeam: { score: hs }, awayTeam: { score: as } }) => math.max(hs, as))
    .sort((a, b) => b - a)
    .filter((d, index) => index <= MAX_RESULTS - 1);

  const highestScoreMatchups = MATCHUPS.filter(
    ({ homeTeam: { score: hs }, awayTeam: { score: as } }) => defecits.indexOf(math.max(hs, as)) > -1
  );

  // eslint-disable-next-line
  return highestScoreMatchups.filter((d, index) => index <= MAX_RESULTS - 1).map((mu, index) => {
    const week = ~~mu.tags.find(t => t.startsWith('WEEK_')).replace(/WEEK[_]/, '');
    const season = ~~mu.tags.find(t => t.startsWith('SEASON_')).replace(/SEASON[_]/, '');
    const playoffRound = ~~(mu.tags.find(t => t.startsWith('PLAYOFF_ROUND_')) || '').replace(/PLAYOFF[_]ROUND[_]/, '');
    const members = getMembersBySeason(season);
    const winner = getWinner(mu);
    const wMember = getMemberById(members, winner.id);
    const wRealName = wMember.firstName ? `${wMember.firstName} ${wMember.lastName}` : `???`;

    const suffix = `${wRealName} (${winner.name}) scored ${math.round(defecits[index], 2)} points`;
    let msg = `In week ${week} of the ${season} season ${suffix}`;
    if (playoffRound) {
      msg = `During round ${playoffRound} of the ${season} playoffs ${suffix}`;
    }

    return { [index + 1]: msg };
  });
};

export default getTeamHighScores;
