import $ from 'cheerio';
import moment from 'moment-timezone';
import math from 'mathjs';

import { parseKeyFromUrl } from '../../../utils/urls';
import activityTypes from '../../../../config/leagueActivityTypes.json';
import trophyTypes from '../../../../config/trophyTypes.json';
import rosterActionTypes from '../../../../config/rosterActionTypes.json';
import { properCase } from '../../../utils/string';
import { dumbLogger as log } from '../../../utils/domLogger';

const normalizeType = (typeMap, str, ignoreMismatch, unknownMsgPrefix) => {
  const type = (str || '')
    .toString()
    .toUpperCase()
    .replace(/[^A-Z ]/gi, ' ') // Convert non-alphanumerics to spaces
    .replace(/([ ]+)/gi, ' ') // Replace multiple consecutive spaces with singles
    .trim() // Remove wrapping spaces
    .replace(/[ ]+/gi, '_'); // Replace single spaces with underscores

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
  let html = $(cell).html().replace(/<br>/gi, '\n');

  if (html.indexOf('<') === -1) {
    html = `<div>${html}</div>`; // Wrap so we can pull the text out
  }

  const notes = $(html)
    .text()
    .split('\n')
    .map(s => s.replace(/congrats?[!]*[ ]*[-—]?[ ]*/gi, '').trim())
    .filter(note => !!note);

  return notes;
};

const normalizeActionType = str => rosterActionTypes[(str || '').toUpperCase()] || rosterActionTypes.UNKNOWN;

const parseValueFromStringByRegex = (str, reg, fallback, castType) => {
  const matches = reg.exec(str);

  if (matches && matches.length && matches.length >= 2) {
    switch (castType) {
      case 'int':
        return math.eval(matches[1]);
      case 'float':
        return parseFloat(math.eval(matches[1]), 10);
      default:
        return (matches[1] || fallback || '').trim().replace(/[ ]+/g, ' ');
    }
  }

  return fallback;
};

const parseWeekFromString = str => {
  const reg = /W[E]*[K]?[ ]*[-]?([0-9]{1,2})/i;

  const week = parseValueFromStringByRegex(str, reg, -1, 'int');

  if (week === -1) {
    log(`  ⚠️ 📅 Week could not be determined from text: ${str}`);
  }

  return week;
};

const parsePointsFromString = str => {
  const reg = /([1-9][0-9]{2,4}([.][0-9]+)?)/gi;

  const pts = parseValueFromStringByRegex(str, reg, 0.0, 'float');

  if (pts === 0) {
    log(`  ⚠️ 🔢 Points could not be determined from text: ${str}`);
  }

  return pts;
};

const parsePlayerNameFromString = str => {
  const reg = /[-]*[ ]*([a-z][a-z'.]*([ ]+[a-z][a-z'.]*)+)/i;
  const fullName = parseValueFromStringByRegex(str, reg, '')
    .replace(/[ ]+/g, ' ')
    .replace(/[-]+/g, '')
    .trim()
    .replace(/(['][s]|[s]['])$/g, '');

  if (!fullName) {
    log(`🛑 Could not find player name in the following string: ${str}`);
    throw new Error();
  }

  const parts = fullName.split(' ');
  const [firstName, ...lastNames] = parts;
  const lastName = properCase(lastNames.join(' '));

  return { firstName: properCase(firstName), lastName };
};

const parseTrophyFromString = str => {
  const reg = /(.*)[ ]awarded[ ]to[ ]([A-Z]+)/gi;
  const matches = reg.exec(str);

  let trophy = {};

  if (matches && matches.length && matches.length > 2) {
    trophy = {
      ...trophy,
      name: matches[matches.length - 2].replace(/[ ]+/g, ' '),
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

const parseYearFromTrophyNote = str => {
  const reg = /([2][0-9]{3})/i;

  return parseValueFromStringByRegex(str, reg, 0, 'int');
};

const parseDateCell = (cell, seasonId) => {
  const dateStr = ($(cell).html() || '').replace(/<br>/g, ` ${seasonId}, `);
  const date = moment.tz(dateStr, 'ddd, MMM D YYYY, H:mm A', 'America/New_York');
  const activity = {
    date: (date.month() <= 1 ? date.add(1, 'year') : date).utc().format(),
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

  let week = -1;
  let points = 0;

  switch (type) {
    case activityTypes.ROSTER_TRANSACTION:
      details = { ...details, moves: parseRosterMove(cell) };
      break;
    case activityTypes.TROPHY_AWARDED:
      if (subType === activityTypes.TROPHY_WEEKLY) {
        if (trophy.type !== trophyTypes.WEEKLY_NON_PARTICIPANT) {
          week = parseWeekFromString(text);
          points = parsePointsFromString(text);

          details = {
            ...details,
            week,
            points,
          };
        }

        const isWeeklyPlayerTrophy =
          trophy.type.startsWith('WEEKLY') && ['WEEKLY_TEAM_HIGHEST_POINTS'].indexOf(trophy.type) === -1;

        if (week && points && isWeeklyPlayerTrophy) {
          details.player = parsePlayerNameFromString(text);
        }
      } else if (subType === activityTypes.TROPHY_YEARLY) {
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

export const parseRow = (row, season) => {
  const cells = $(row).find('td');

  const isMessageBoardPost = $(cells[1]).text().toLowerCase().indexOf('posted') > -1;

  if (isMessageBoardPost) {
    return null; // We don't give two shits about msg board posts
  }

  const activity = {
    ...parseDateCell(cells[0], season),
    season,
    ...parseTypeAndTrophyCell(cells[1]),
  };

  if (activity.trophy) {
    const trophyLink = $(cells[3]).find('a').first();
    const teamLink = $(cells[3]).find('a').last();

    activity.trophy.id = parseKeyFromUrl(trophyLink.attr('href'), 'trophyId', 'int');
    activity.trophy.team.id = parseKeyFromUrl(teamLink.attr('href'), 'teamId', 'int');

    if (activity.trophy.type.startsWith('YEARLY_')) {
      activity.season = parseYearFromTrophyNote($(cells[2]).text()) || activity.season;
    }
  }

  activity.details = parseActivityDetails(activity, cells[2]);

  if (activity.type === activityTypes.ROSTER_TRANSACTION) {
    const isWaiver = $(cells[3]).text().toLowerCase().indexOf('waiver') > -1;

    activity.details.isWaiver = isWaiver;
  }

  return activity;
};
