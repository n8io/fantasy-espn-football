import glob from 'glob-all';
import cwd from 'cwd';

import { readJson } from '../../lib/utils/dataReader';

const scheduleFilePaths = glob.sync([cwd('data/**/*-league-members.json')]);

export default readJson(scheduleFilePaths[scheduleFilePaths.length - 1]);
