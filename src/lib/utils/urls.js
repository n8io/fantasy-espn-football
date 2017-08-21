import url from 'url';
import qs from 'querystring';

import config from '../../config';

const { espn: { league: leagueId } } = config;

const ROOT_URL = 'http://games.espn.com/ffl';

const parseUrl = (baseUrl, { protocol, host, pathname, search = {} } = {}) => {
  const rootURl = `${ROOT_URL}/${baseUrl}`;
  const origUrlObj = url.parse(rootURl, true);
  const { query, ...newUrlObj } = origUrlObj;

  const urlObj = {
    ...newUrlObj,
    protocol: protocol || newUrlObj.protocol,
    host: host || newUrlObj.host,
    pathname: pathname || newUrlObj.pathname,
    search: qs.stringify({
      ...query,
      leagueId,
      ...search,
    }),
  };

  return {
    obj: urlObj,
    url: url.format(urlObj),
  };
};

const parseKeyFromUrl = (href, key, castType) => {
  const { query } = url.parse(href, true);

  switch (castType) {
    case 'int':
      return ~~query[key]; // eslint-disable-line no-bitwise
    case 'float':
      return parseFloat(query[key], 10) || null;
    default:
      return query[key];
  }
};

export { parseUrl, parseKeyFromUrl }; // eslint-disable-line import/prefer-default-export
