import glob from 'glob-all';
import cwd from 'cwd';

import { readJson } from '../../../lib/utils/dataReader';

export default (yearsBack = 100) => {
  const scheduleFilePaths = glob
    .sync([cwd('data/**/*-league-schedule.json')])
    .reverse()
    .slice(0, ~~yearsBack + 1) // eslint-disable-line no-bitwise
    .reverse();

  return scheduleFilePaths.reduce((acc, file) => [...acc, ...readJson(file)], []);
};
