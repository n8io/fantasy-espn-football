import { save } from '../../lib/utils/reportWriter';
import biggestLosers from './alltime-biggest-losers';
import closestMatchups from './alltime-closest-matchups';
import highTeamScores from './alltime-team-high-score';
import lowTeamScores from './alltime-team-low-score';
import offensivePlayerHighScore from './alltime-player-offensive-high-score';
import defensivePlayerHighScore from './alltime-player-defensive-high-score';
import specialTeamsPlayerHighScore from './alltime-player-special-teams-high-score';
import hindsghtPlayerHighScore from './alltime-player-hindsight-high-score';
import winningestTeams from './alltime-winningest-owner';
import losingestTeams from './alltime-losingest-owner';

require('./alltime-regular-season-standings');
require('./alltime-post-season-standings');

const reducer = (acc, item) => ({
  ...acc,
  [Object.keys(item)[0]]: item[Object.keys(item)[0]],
});

const summarization = {
  biggestLosers: biggestLosers().reduce(reducer, {}),
  closestMatchups: closestMatchups().reduce(reducer, {}),
  highTeamScores: highTeamScores().reduce(reducer, {}),
  lowTeamScores: lowTeamScores().reduce(reducer, {}),
  offensivePlayerHighScores: offensivePlayerHighScore().reduce(reducer, {}),
  defensivePlayerHighScores: defensivePlayerHighScore().reduce(reducer, {}),
  specialTeamsPlayerHighScores: specialTeamsPlayerHighScore().reduce(reducer, {}),
  hindsightPlayerHighScores: hindsghtPlayerHighScore().reduce(reducer, {}),
  winningestTeams: winningestTeams().reduce(reducer, {}),
  losingestTeams: losingestTeams().reduce(reducer, {}),
};

const fileName = `trophies-weekly.alltime`;
save('quick', 'league', fileName, summarization);
