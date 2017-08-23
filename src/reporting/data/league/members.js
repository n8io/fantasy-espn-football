import glob from 'glob-all';
import cwd from 'cwd';

import { readJson } from '../../../lib/utils/dataReader';

const scheduleFilePaths = glob.sync([cwd('data/**/*-league-members.json')]);

export const getMembersBySeason = season => {
  const paths = scheduleFilePaths.filter(path => {
    const reg = new RegExp(`/${season}/`);

    return reg.test(path);
  });

  if (!paths || !paths.length) {
    return [];
  }

  return readJson(paths[paths.length - 1]);
};

export default readJson(scheduleFilePaths[scheduleFilePaths.length - 1]);
