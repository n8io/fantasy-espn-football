/* eslint-disable no-console,no-bitwise */
import getMatchups from '../data/league/matchups';
import MEMBERS from '../data/league/members';
import { save } from '../../lib/utils/reportWriter';

const { YEARS_BACK = 1 } = {};
const MATCHUPS = getMatchups(YEARS_BACK);

const getMemberById = id => MEMBERS.find(m => m.id === id);

const getSeeds = ({ homeTeam, homeTeam: { tags: hTags }, awayTeam, awayTeam: { tags: aTags } }) => {
  const hSeed = hTags.find(t => t.startsWith('PLACE_'));
  const aSeed = aTags.find(t => t.startsWith('PLACE_'));
  const home = getMemberById(homeTeam.id);
  const away = getMemberById(awayTeam.id);

  return [
    {
      abbrev: home.abbrev,
      place: ~~hSeed.replace(/PLACE[_]/g, ''),
    },
    {
      abbrev: away.abbrev,
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
      (acc, { abbrev, place }) => ({
        ...acc,
        [place]: abbrev,
      }),
      {}
    );

// console.log(JSON.stringify(standingsSummary(), null, 2));
const summarization = standingsSummary();
const fileName = `post-season-standings${YEARS_BACK ? `.last-${`00${YEARS_BACK}`.slice(-2)}-years` : '.alltime'}`;
save('quick', 'league', fileName, summarization);
