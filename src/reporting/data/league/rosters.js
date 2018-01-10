import glob from 'glob-all';
import cwd from 'cwd';

import { readJson } from '../../../lib/utils/dataReader';

export default (league, seasons) => {
  const specificSeasons = filepath => seasons.find(season => filepath.indexOf(`${season}-${league}-`) > -1);

  const filepaths = glob.sync([cwd('data/**/*-league-rosters.json')]).filter(specificSeasons);

  return filepaths.reduce((acc, file) => [...acc, ...readJson(file)], []);
};
