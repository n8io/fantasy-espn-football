import glob from 'glob-all';
import cwd from 'cwd';

import { readJson } from '../../lib/utils/dataReader';

const scheduleFilePaths = glob.sync([cwd('data/**/*-league-schedule.json')]);

export default scheduleFilePaths.reduce((acc, file) => [...acc, ...readJson(file)], []);
