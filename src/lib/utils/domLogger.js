import moment from 'moment-timezone';

const domLogger = async (message, page) => {
  const now = moment.tz('America/New_York').format('ddd MMM HH:mm:ss z YYYY');

  console.log(`${now}: ${message}`); // eslint-disable-line no-console

  if (page) {
    await page.evaluate(msg => {
      const id = 'page-scraper-message';
      const head = document.head || document.getElementsByTagName('head')[0];
      const style = document.createElement('style');

      const css = `
      #${id} {
        z-index: 9999;
        position: fixed;
        bottom: 0;
        padding: 10px;
        background: white;
        border-radius: 0 2px 0 0;
        box-shadow: 0px 0px 1px 1px #EEE;
      }
      `;

      style.type = 'text/css';

      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }

      head.appendChild(style);

      let $el = document.getElementById(id);

      if (!$el) {
        $el = document.createElement('div');
        $el.id = id;
        $el.innerText = msg;

        document.body.append($el);
      } else {
        $el.innerText = msg;
      }

      console.log(msg); // eslint-disable-line no-console
    }, message);
  }
};

export const dumbLogger = message => {
  const now = moment.tz('America/New_York').format('ddd MMM HH:mm:ss z YYYY');

  console.log(`${now}: ${message}`); // eslint-disable-line no-console
};

export default domLogger;
