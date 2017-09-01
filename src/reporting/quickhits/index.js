import { save } from '../../lib/utils/reportWriter';
import biggestLosers from './alltime-biggest-losers';
import closestMatchups from './alltime-closest-matchups';
import highTeamScores from './alltime-team-high-score';
import lowTeamScores from './alltime-team-low-score';
import playerHighScore from './alltime-player-high-score';
import offensivePlayerHighScore from './alltime-player-offensive-high-score';
import defensivePlayerHighScore from './alltime-player-defensive-high-score';
import specialTeamsPlayerHighScore from './alltime-player-special-teams-high-score';
import hindsghtPlayerHighScore from './alltime-player-hindsight-high-score';
import winningestTeams from './alltime-winningest-owner';
import losingestTeams from './alltime-losingest-owner';
import easiestSchedule from './alltime-owner-schedule-easiest';
import hardestSchedule from './alltime-owner-schedule-hardest';
import teamPointDiffLow from './alltime-owner-point-differential-low';
import teamPointDiffHigh from './alltime-owner-point-differential-high';

require('./alltime-standings-regular');
require('./alltime-standings-final');

const reducer = (acc, item) => ({
  ...acc,
  [Object.keys(item)[0]]: item[Object.keys(item)[0]],
});

const summarization = {
  biggestLosers: biggestLosers().reduce(reducer, {}),
  closestMatchups: closestMatchups().reduce(reducer, {}),
  highestTeamScores: highTeamScores().reduce(reducer, {}),
  lowestTeamScoress: lowTeamScores().reduce(reducer, {}),
  highestPlayerScores: playerHighScore().reduce(reducer, {}),
  highestOffensivePlayerScores: offensivePlayerHighScore().reduce(reducer, {}),
  highestDefensivePlayerScores: defensivePlayerHighScore().reduce(reducer, {}),
  highestSpecialTeamsPlayerScores: specialTeamsPlayerHighScore().reduce(reducer, {}),
  highestHindsightPlayerScores: hindsghtPlayerHighScore().reduce(reducer, {}),
  winningestTeams: winningestTeams().reduce(reducer, {}),
  losingestTeams: losingestTeams().reduce(reducer, {}),
  easiestSchedule: easiestSchedule().reduce(reducer, {}),
  hardestSchedule: hardestSchedule().reduce(reducer, {}),
  teamPointDiffHigh: teamPointDiffHigh().reduce(reducer, {}),
  teamPointDiffLow: teamPointDiffLow().reduce(reducer, {}),
};

const fileName = `alltime`;
save('quick', 'league', fileName, summarization);
