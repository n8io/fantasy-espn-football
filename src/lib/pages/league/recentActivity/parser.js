import $ from 'cheerio';
import moment from 'moment-timezone';

import config from '../../../../config';
import { parseKeyFromUrl } from '../../../utils/urls';
import activityTypes from '../../../../config/leagueActivityTypes.json';
import trophyTypes from '../../../../config/trophyTypes.json';
import rosterActionTypes from '../../../../config/rosterActionTypes.json';

const { espn: { season } } = config;

const normalizeType = (typeMap, str, ignoreMismatch, unknownMsgPrefix) => {
  const type = (str || '')
    .toString()
    .toUpperCase()
    .replace(/[^A-Z ]/gi, ' ') // Convert non-alphanumerics to spaces
    .replace(/([ ]+)/gi, ' ') // Replace multiple consecutive spaces with singles
    .trim() // Remove wrapping spaces
    .replace(/[ ]/gi, '_'); // Replace single spaces with underscores

  if (typeMap[type]) {
    return typeMap[type];
  }

  if (!ignoreMismatch) {
    throw new Error(unknownMsgPrefix ? `${unknownMsgPrefix}${type}` : `Could not determine type: ${type}`);
  }

  return typeMap.UNKNOWN;
};

const normalizeActivityType = (typeStr, ignoreMismatch) =>
  normalizeType(activityTypes, typeStr, ignoreMismatch, 'Could not determine activity type: ');

const normalizeTrophyType = (typeStr, ignoreMismatch) =>
  normalizeType(trophyTypes, typeStr, ignoreMismatch, 'Could not determine trophy type: ');

const normalizeNotes = cell => {
  const html = $(cell).html().replace(/<br>/gi, '\n');
  const notes = $(html).text().split('\n').map(s => s.replace(/congrats?[!]*[ ]*[-—]?[ ]*/gi, '').trim());

  return notes;
};

const normalizeActionType = str => rosterActionTypes[(str || '').toUpperCase()] || rosterActionTypes.UNKNOWN;

const parseValueFromStringByRegex = (str, reg, fallback, castType) => {
  const matches = reg.exec(str);

  if (matches && matches.length && matches.length >= 2) {
    switch (castType) {
      case 'int':
        return ~~matches[1]; // eslint-disable-line no-bitwise
      case 'float':
        return parseFloat(matches[1], 10);
      default:
        return matches[1].trim();
    }
  }

  return fallback;
};

const parseWeekFromString = str => {
  const reg = /we*k[ ]+([0-9]+)[ ]*/gi;

  return parseValueFromStringByRegex(str, reg, -1, 'int');
};

const parsePointsFromString = str => {
  const reg = /[-—]?([0-9]+([.][0-9]+)?)[ ]*pts?[-—]?/gi;

  return parseValueFromStringByRegex(str, reg, 0.0, 'float');
};

const parseYearFromString = str => {
  const reg = /(2[0-9]{3})/gi;

  return parseValueFromStringByRegex(str, reg, -1, 'int');
};

const parsePlayerNameFromString = str => {
  const reg = /[-—][ ]*([A-Z'-]+([ ][A-Z']+)*)[ ]*[-—]?/gi;

  const fullName = parseValueFromStringByRegex(str, reg);

  if (!fullName) {
    return {};
  }

  const parts = fullName.split(' ');
  const [firstName, ...lastNames] = parts;
  const lastName = lastNames.join(' ');

  return { firstName, lastName };
};

const parseTrophyFromString = str => {
  const reg = /(.*)[ ]awarded[ ]to[ ]([A-Z]+)/gi;
  const matches = reg.exec(str);

  let trophy = {};

  if (matches && matches.length && matches.length > 2) {
    trophy = {
      ...trophy,
      name: matches[matches.length - 2],
      team: { abbrev: matches[matches.length - 1] },
      type: normalizeTrophyType(matches[matches.length - 2]),
    };
  } else {
    throw new Error(`Could not determine tropy for: ${str}`);
  }

  return trophy;
};

const parseTradeTypeFromString = str => {
  const normalizedStr = (str || '').toString().toLowerCase().trim();

  if (normalizedStr.indexOf('trade') === -1) {
    return activityTypes.UNKNOWN;
  }

  let tradeType = activityTypes.UNKNOWN;

  if (normalizedStr.indexOf('processed') > -1) {
    tradeType = activityTypes.TRADE_PROCESSED;
  } else if (normalizedStr.indexOf('accepted') > -1) {
    tradeType = activityTypes.TRADE_ACCEPTED;
  } else if (normalizedStr.indexOf('upheld') > -1) {
    tradeType = activityTypes.TRADE_UPHELD;
  }

  return tradeType;
};

const parseDateCell = cell => {
  const dateStr = ($(cell).html() || '').replace(/<br>/g, ` ${season}, `);
  const date = moment(dateStr, 'ddd, MMM D YYYY, HH:mm A');
  const activity = {
    date: (date.month() <= 1 ? date.add(-1, 'year') : date).utc().format(),
  };

  return activity;
};

const parseTypeAndTrophyCell = cell => {
  const $el = $(cell).find('b');
  const typeStr = $el.text();
  const subTypeText = $(cell).text().replace(typeStr, '').trim();
  const type = normalizeActivityType(typeStr);
  const subType = normalizeActivityType(subTypeText, true);

  const activity = {
    type,
    subType,
    subTypeText,
  };

  switch (activity.type) {
    case activityTypes.TROPHY_AWARDED:
      activity.trophy = parseTrophyFromString(subTypeText);

      if (activity.trophy) {
        const isYearly = activity.trophy.type.startsWith('YEARLY');

        activity.subType = isYearly ? activityTypes.TROPHY_YEARLY : activityTypes.TROPHY_WEEKLY;
      }
      break;
    case activityTypes.ROSTER_TRANSACTION:
      if (subTypeText.toLowerCase().indexOf('trade') > -1) {
        activity.subType = parseTradeTypeFromString(subTypeText);
      }
      break;
    case activityTypes.LEAGUE_NOTE_UPDATE:
      activity.subType = activityTypes.NONE;
      break;
    default:
      break;
  }

  return activity;
};

const parseRosterTransactionDetail = str => {
  const reg = /([A-Z][A-Z][A-Z][A-Z]?)[ ](added|dropped|traded)[ ]([A-Z0-9 .']+),[ ]([A-Z][A-Z][A-Z]?)[ ]([A-Z][A-Z]?[A-Z]?)/gi;
  const matches = reg.exec(str);

  if (!matches || !matches.length) {
    return null;
  }

  const [team, action, playerName, playerTeam, playerPosition] = matches.splice(1);

  return {
    team,
    action: normalizeActionType(action),
    player: {
      name: playerName,
      team: playerTeam,
      position: playerPosition,
    },
  };
};

const parseRosterMove = cell => {
  let moves = [];

  const normalizedHtml = $(cell).html().replace(/<br>/g, '|');
  const infos = $(normalizedHtml).text().split('|');

  if (infos && infos.length) {
    moves = infos.map(parseRosterTransactionDetail);
  }

  return moves;
};

const parseActivityDetails = ({ type, subType, trophy }, cell) => {
  const text = $(cell).text().trim();
  const notes = normalizeNotes(cell);
  let details = {
    notes,
  };

  switch (type) {
    case activityTypes.ROSTER_TRANSACTION:
      details = { ...details, moves: parseRosterMove(cell) };
      break;
    case activityTypes.TROPHY_AWARDED:
      if (subType === activityTypes.TROPHY_WEEKLY) {
        details = {
          ...details,
          week: parseWeekFromString(text),
          points: parsePointsFromString(text),
        };

        const isWeeklyPlayerTrophy =
          trophy.type.startsWith('WEEKLY') && ['WEEKLY_TEAM_HIGHEST_POINTS'].indexOf(trophy.type) === -1;

        if (isWeeklyPlayerTrophy) {
          details.player = parsePlayerNameFromString(text);
        }
      } else if (subType === activityTypes.TROPHY_YEARLY) {
        details.year = parseYearFromString(text);

        const isYearlyPlayerTrophy =
          trophy.type.startsWith('YEARLY') &&
          [
            'YEARLY_OWNER',
            'YEARLY_CHAMPION',
            'YEARLY_RUNNER_UP',
            'YEARLY_REGULAR_SEASON_CHAMPION',
            'YEARLY_REGULAR_SEASON_RUNNER_UP',
          ].indexOf(trophy.type) === -1;

        if (isYearlyPlayerTrophy) {
          details.player = parsePlayerNameFromString(text);
        }
      }
      break;
    default:
      break;
  }

  return details;
};

export const selector = 'table.tableBody';

export const parseRow = row => {
  const cells = $(row).find('td');

  const isMessageBoardPost = $(cells[1]).text().toLowerCase().indexOf('posted') > -1;

  if (isMessageBoardPost) {
    return null; // We don't give two shits about msg board posts
  }

  const activity = {
    ...parseDateCell(cells[0]),
    ...parseTypeAndTrophyCell(cells[1]),
  };

  if (activity.trophy) {
    const trophyLink = $(cells[3]).find('a').first();
    const teamLink = $(cells[3]).find('a').last();

    activity.trophy.id = parseKeyFromUrl(trophyLink.attr('href'), 'trophyId', 'int');
    activity.trophy.team.id = parseKeyFromUrl(teamLink.attr('href'), 'teamId', 'int');
  }

  activity.details = parseActivityDetails(activity, cells[2]);

  if (activity.type === activityTypes.ROSTER_TRANSACTION) {
    const isWaiver = $(cells[3]).text().toLowerCase().indexOf('waiver') > -1;

    activity.details.isWaiver = isWaiver;
  }

  return activity;
};
