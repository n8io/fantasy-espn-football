/* eslint-disable no-console,no-bitwise */
import math from 'mathjs';
import getMatchups from '../data/league/matchups';
import { getMembersBySeason } from '../data/league/members';
// import { save } from '../../lib/utils/reportWriter';

const { MAX_RESULTS: maxResults = 5 } = process.env;
const MAX_RESULTS = ~~maxResults || 3;
const MATCHUPS = getMatchups();

const getMemberById = (members, id) => members.find(m => m.id === id);

const getLoser = mu => {
  if (mu.homeTeam.score < mu.awayTeam.score) {
    return mu.homeTeam;
  }

  return mu.awayTeam;
};

const getWinner = mu => {
  if (mu.homeTeam.score > mu.awayTeam.score) {
    return mu.homeTeam;
  }

  return mu.awayTeam;
};

const isGameStarted = ({ homeTeam: { tags } }) => tags.find(t => t !== 'INDETERMINATE');

const isValidMatchup = ({ homeTeam: { score: hs }, awayTeam: { score: as } }) => hs > 100 && as > 100;

const appendDeficit = mu => ({
  ...mu,
  defecit: math.abs(mu.homeTeam.score - mu.awayTeam.score),
});

const defecitSort = (a, b) => a.defecit - b.defecit;

const maxResultsFilter = (d, index) => index <= MAX_RESULTS - 1;

const getClosestMatchups = () => {
  const closestMatchups = MATCHUPS.filter(isGameStarted)
    .filter(isValidMatchup)
    .map(appendDeficit)
    .sort(defecitSort)
    .filter(maxResultsFilter);

  // eslint-disable-next-line
  return closestMatchups
    .sort(defecitSort)
    .map((mu, index) => {
      const week = ~~mu.tags.find(t => t.startsWith('WEEK_')).replace(/WEEK[_]/, '');
      const season = ~~mu.tags.find(t => t.startsWith('SEASON_')).replace(/SEASON[_]/, '');
      const playoffRound = ~~(mu.tags.find(t => t.startsWith('PLAYOFF_ROUND_')) || '')
        .replace(/PLAYOFF[_]ROUND[_]/, '');
      const members = getMembersBySeason(season);
      const winner = getWinner(mu);
      const loser = getLoser(mu);
      const wMember = getMemberById(members, winner.id);
      const lMember = getMemberById(members, loser.id);
      const wRealName = wMember.firstName ? `${wMember.firstName} ${wMember.lastName}` : `???`;
      const lRealName = lMember.firstName ? `${lMember.firstName} ${lMember.lastName}` : `???`;

      const suffix = `${lRealName} (${loser.name}) lost to ${wRealName} (${winner.name}) by ${math.round(
        mu.defecit,
        2
      )} points`;
      let msg = `In week ${week} of the ${season} season ${suffix}`;
      if (playoffRound) {
        msg = `During round ${playoffRound} of the ${season} playoffs ${suffix}`;
      }

      return { [index + 1]: msg };
    })
    .filter(maxResultsFilter);
};

export default getClosestMatchups;
