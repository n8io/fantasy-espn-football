/* eslint-disable import/prefer-default-export */
import fs from 'fs';
import cwd from 'cwd';
import mkdirp from 'mkdirp';

export const dirPath = (level, category) => cwd(`reports/${level}/${category}`);

export const fileName = (level, category, leafName) => `${level}-${category}-${leafName}.json`;

export const filePath = (level, category, leafName) =>
  cwd(`${dirPath(level, category)}/${fileName(level, category, leafName)}`);

export const save = (level, category, leafName, data) => {
  const dir = cwd(dirPath(level, category));

  mkdirp(dir, err => {
    if (err) {
      throw new Error(err);
    }

    fs.writeFileSync(cwd(filePath(level, category, leafName)), JSON.stringify(data, null, 2), 'utf-8');
  });
};
