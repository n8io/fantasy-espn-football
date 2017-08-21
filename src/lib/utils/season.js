import moment from 'moment-timezone';

const getCurrentYear = season => {
  const now = moment();
  const { month = now.month(), year = now.year() } = {};

  return season || month >= 7 ? year : year - 1;
};

const getStartDate = season => moment.tz(`${season}-05-01 00:00:00`, 'YYYY-MM-DD HH:mm:ss', 'America/New_York');

const getEndDate = season => moment.tz(`${season + 1}-02-01 00:00:00`, 'YYYY-MM-DD HH:mm:ss', 'America/New_York');

export { getCurrentYear, getStartDate, getEndDate };
