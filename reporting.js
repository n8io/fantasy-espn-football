require('babel-register');
require('dotenv-safe').load();
require('./src/reporting');

if (process.env.QUICKHITS) {
  require('./src/reporting/quickhits'); // eslint-disable-line
}
