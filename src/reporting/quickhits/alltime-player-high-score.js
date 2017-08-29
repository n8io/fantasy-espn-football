/* eslint-disable no-console,no-unused-vars,no-bitwise */
import mirrorkey from 'mirrorkey';
import math from 'mathjs';

import { getMembersBySeason } from '../data/league/members';
import TT from '../../config/trophyTypes.json';
import getActivities from '../data/league/activity';
import activityTypesArray from '../../config/leagueActivityTypes.json';
import unique from '../../lib/utils/unique';
import { save } from '../../lib/utils/reportWriter';

const ACTIVITIES = getActivities();

const { MAX_RESULTS: maxResults = 5 } = process.env;
const MAX_RESULTS = ~~maxResults || 3;

const getMemberById = (members, id) => members.find(m => m.id === id);

const maxPointsSort = (a, b) => b.details.points - a.details.points;

const maxResultsFilter = (d, index) => index <= MAX_RESULTS - 1;

const onlyWeeklyPlayerTrophies = ({ trophy, details: { points } }) =>
  trophy &&
  [
    TT.WEEKLY_OFFENSIVE_PLAYER_HIGH_SCORE,
    TT.WEEKLY_DEFENSIVE_PLAYER_HIGH_SCORE,
    TT.WEEKLY_SPECIAL_TEAMS_PLAYER_HIGH_SCORE,
  ].indexOf(trophy.type) > -1 &&
  points > 0;

export default () =>
  ACTIVITIES.filter(onlyWeeklyPlayerTrophies)
    .sort(maxPointsSort)
    .map(({ season, trophy: { team: { id } }, details: { week, points, player } }, index) => {
      const members = getMembersBySeason(season);
      const member = getMemberById(members, id);
      const realName = member.firstName ? `${member.firstName} ${member.lastName}` : `???`;
      const playerName = player.firstName ? `${player.firstName} ${player.lastName}` : '???';

      const suffix = `${realName} (${member.name}) scored ${math.round(points, 2)} points with ${playerName}`;

      const msg = `In week ${week} of the ${season} season ${suffix}`;

      return { [index + 1]: msg };
    })
    .filter(maxResultsFilter);
