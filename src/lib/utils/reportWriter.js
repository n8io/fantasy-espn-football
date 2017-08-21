/* eslint-disable import/prefer-default-export */
import fs from 'fs';
import cwd from 'cwd';
import mkdirp from 'mkdirp';

export const dirPath = category => cwd(`reports/${category}`);

export const fileName = (category, leafName) => `${category}-${leafName}.json`;

export const filePath = (category, leafName) => cwd(`${dirPath(category)}/${fileName(category, leafName)}`);

export const save = (category, leafName, data) => {
  const dir = cwd(dirPath(category));

  mkdirp(dir, err => {
    if (err) {
      throw new Error(err);
    }

    fs.writeFileSync(cwd(filePath(category, leafName)), JSON.stringify(data, null, 2), 'utf-8');
  });
};
