/* eslint-disable no-console,no-unused-vars */
import mirrorkey from 'mirrorkey';
import math from 'mathjs';

import MEMBERS from '../../data/league/members';
import TT from '../../../config/trophyTypes.json';
import getActivities from '../../data/league/activity';
import activityTypesArray from '../../../config/leagueActivityTypes.json';
import unique from '../../../lib/utils/unique';
import { save } from '../../../lib/utils/reportWriter';

const { YEARS_BACK } = process.env;
const ACTIVITIES = getActivities(YEARS_BACK);
const AT = mirrorkey(activityTypesArray);

const isYearlyTrophy = ({ trophy: { type } } = {}) => {};
const isTeamTrophy = ({ trophy: { team: { id } } }, teamId) => id === teamId;
const isTrophyActivity = ({ trophy }) => !!trophy;
const isWeeklyTrophyActivity = ({ subType } = {}) => subType === AT.TROPHY_WEEKLY;
const isYearlyTrophyActivity = ({ subType } = {}) => subType === AT.TROPHY_YEARLY;
const isWeeklyAdhocTrophyActivity = ({ subType, trophy: { type } } = {}) =>
  isWeeklyTrophyActivity({ subType }) && type === TT.WEEKLY_NON_PARTICIPANT;

const allTrophyTypes = Object.keys(TT).sort().filter(t => t.startsWith('YEARLY_') || t.startsWith('WEEKLY_')).reduce(
  (acc, tt) => ({
    ...acc,
    [tt]: { total: 0 },
  }),
  {}
);

const convertDetailsToHistory = (history, { season, trophy: { id, type }, details: { week, points, player } } = {}) => [
  ...(history || []),
  { season, week, player, points },
];

const historicalTrophyCounts = (activities, teamId) => {
  const tas = activities.filter(a => isTrophyActivity(a) && isTeamTrophy(a, teamId));

  return tas.reduce(
    (acc, { season, trophy: { id, type }, details } = {}) => ({
      ...acc,
      [type]: {
        id,
        total: (acc[type] ? acc[type].total : 0) + 1,
        history: [...convertDetailsToHistory(acc[type].history, { season, trophy: { id, type }, details })],
      },
    }),
    { ...allTrophyTypes }
  );
};

const trophySummary = () =>
  MEMBERS.reduce(
    (acc, { id: teamId, name, firstName, lastName }) => [
      ...acc,
      {
        teamId,
        owner: `${firstName} ${lastName}`,
        currentName: name,
        overall: { ...historicalTrophyCounts(ACTIVITIES, teamId) },
      },
    ],
    []
  );

// console.log(JSON.stringify(trophySummary(), null, 2));

const summarization = trophySummary();
const fileName = `trophies${YEARS_BACK ? `.last-${`00${YEARS_BACK}`.slice(-2)}-years` : '.alltime'}`;
save('league', 'member', fileName, summarization);

// console.log(JSON.stringify(ACTIVITIES.filter(a => a.trophy && a.trophy.id === 17), null, 2));
