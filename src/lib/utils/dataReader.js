/* eslint-disable import/prefer-default-export,no-bitwise */
import fs from 'fs';

export const readJson = path => JSON.parse(fs.readFileSync(path, 'utf-8').toString());
