/* eslint-disable no-bitwise */
import glob from 'glob-all';
import cwd from 'cwd';

import { readJson } from '../../../lib/utils/dataReader';
import unique from '../../../lib/utils/unique';

const scheduleFilePaths = glob.sync([cwd('data/**/*-league-members.json')]);

const MEMBERS = readJson(scheduleFilePaths[scheduleFilePaths.length - 1]);

const getMemberKey = ({ id, firstName, lastName } = {}) =>
  `${id.toString().padStart(2, '0')}${lastName}${firstName}`.replace(/[^a-z0-9]+/gi, '').toLowerCase();

const getMemberDivision = m => (m.tags.find(t => Object.keys(t).indexOf('division') > -1) || {}).division;
const getMemberSeason = m => ~~(m.tags.find(t => Object.keys(t).indexOf('season') > -1) || {}).season;
const getMemberAliasKey = a => {
  const regReplace = /[^a-z0-9]/gi;

  return (a || '').replace(regReplace, '').toUpperCase();
};
const getAliasKeys = (m = {}) => {
  const season = getMemberSeason(m);

  return [getMemberAliasKey(m.abbrev), getMemberAliasKey(m.alias)]
    .filter(a => !!a)
    .map(a => `${season.toString()}${a}`.toLowerCase());
};

const getMembersBySeason = season => {
  const paths = scheduleFilePaths.filter(path => {
    const reg = new RegExp(`/${season}/`);

    return reg.test(path);
  });

  if (!paths || !paths.length) {
    return [];
  }

  return readJson(paths[paths.length - 1]);
};

const getMembersAlltime = () => {
  const members = scheduleFilePaths.reduce((acc, path) => [...acc, ...readJson(path)], []);

  const consolidatedMembers = members.reduce((acc, m) => {
    const key = getMemberKey(m);
    const { id, firstName, lastName, name } = m;
    const division = getMemberDivision(m);

    return {
      ...acc,
      [key]: {
        id,
        firstName,
        lastName,
        name,
        aliases: unique([...(acc[key] ? acc[key].aliases : []), ...getAliasKeys(m)]),
        divisions: unique([...(acc[key] ? acc[key].divisions : []), division]),
      },
    };
  }, {});

  return consolidatedMembers;
};

const getMemberByAliasKey = (members, aliasKey) => {
  const lookup = Object.keys(members).reduce((acc, key) => {
    const { id, firstName, lastName, name, aliases } = members[key];

    const aliasMap = aliases.reduce(
      (mem, alias) => ({
        ...mem,
        [alias]: {
          key,
          id,
          firstName,
          lastName,
          name,
        },
      }),
      {}
    );

    return {
      ...acc,
      ...aliasMap,
    };
  }, {});

  return lookup[aliasKey.toLowerCase()];
};

export { getMembersBySeason, getMembersAlltime, getMemberByAliasKey, getMemberAliasKey };

export default MEMBERS;
