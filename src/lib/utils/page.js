import config from '../../config';

export default async browser => {
  const { browser: emulateOptions } = config;
  const page = await browser.newPage();

  await page.emulate({
    ...emulateOptions,
  });

  await page.setViewport({
    height: emulateOptions.viewport.height,
    width: emulateOptions.viewport.width,
  });

  // await page.setRequestInterception(true);
  //
  // page.on('request', interceptedRequest => {
  //   if (interceptedRequest.url.endsWith('.png')
  //     // || interceptedRequest.url.endsWith('.jpg')
  //     //   || interceptedRequest.url.endsWith('.jpeg')
  //         || interceptedRequest.url.endsWith('.gif')
  //           || interceptedRequest.url.endsWith('.png')
  //             || interceptedRequest.url.endsWith('.svg')
  //               || interceptedRequest.url.endsWith('.mp4')) {
  //     interceptedRequest.abort();
  //   } else {
  //     interceptedRequest.continue();
  //   }
  // });

  return page;
};
