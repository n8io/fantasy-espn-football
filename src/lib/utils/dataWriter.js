/* eslint-disable import/prefer-default-export */
import fs from 'fs';
import cwd from 'cwd';
import mkdirp from 'mkdirp';

export const dirPath = (season, league, category) => cwd(`data/${season}/${league}/${category}`);

export const fileName = (season, league, category, leafName) => `${season}-${league}-${category}-${leafName}.json`;

export const filePath = (season, league, category, leafName) =>
  cwd(`${dirPath(season, league, category)}/${fileName(season, league, category, leafName)}`);

export const save = (season, league, category, leafName, data) => {
  const dir = cwd(dirPath(season, league, category));

  mkdirp(dir, err => {
    if (err) {
      throw new Error(err);
    }

    fs.writeFileSync(cwd(filePath(season, league, category, leafName)), JSON.stringify(data, null, 2), 'utf-8');
  });
};
