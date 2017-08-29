/* eslint-disable no-console,no-bitwise */
import getMatchups from '../data/league/matchups';
import { getMembersBySeason } from '../data/league/members';
import { save } from '../../lib/utils/reportWriter';

const { YEARS_BACK } = process.env;
const MATCHUPS = getMatchups(YEARS_BACK);

const getMember = (season, id) => getMembersBySeason(season).find(m => m.id === id);

const getSeeds = ({ homeTeam, homeTeam: { tags: hTags }, awayTeam, awayTeam: { tags: aTags } }) => {
  const hSeed = hTags.find(t => t.startsWith('PLACE_'));
  const aSeed = aTags.find(t => t.startsWith('PLACE_'));
  const season = ~~hTags.find(t => t.startsWith('SEASON_')).replace(/SEASON[_]/gi, '');
  const home = getMember(season, homeTeam.id);
  const away = getMember(season, awayTeam.id);

  return [
    {
      season,
      team: home,
      place: ~~hSeed.replace(/PLACE[_]/g, ''),
    },
    {
      season,
      team: away,
      place: ~~aSeed.replace(/PLACE[_]/g, ''),
    },
  ];
};

const isSeedMatchup = ({ homeTeam: { tags } }) => tags.some(t => t.startsWith('PLACE_'));

const standingsSummary = () =>
  MATCHUPS.filter(isSeedMatchup)
    .map(mu => getSeeds(mu))
    .reduce((acc, seedArr) => [...acc, ...seedArr], [])
    .sort((a, b) => {
      if (a.place < b.place) {
        return -1;
      } else if (a.place > b.place) {
        return 1;
      }

      return 0;
    })
    .reduce(
      (acc, { season, team: { abbrev }, place }) => ({
        ...acc,
        [season]: {
          ...acc[season],
          [place]: abbrev,
        },
      }),
      {}
    );

// console.log(JSON.stringify(standingsSummary(), null, 2));
const summarization = standingsSummary();
const fileName = `standings-final.${YEARS_BACK ? `last-${`00${YEARS_BACK}`.slice(-2)}-years` : 'alltime'}`;
save('quick', 'league', fileName, summarization);
