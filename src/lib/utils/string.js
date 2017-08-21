/* eslint-disable import/prefer-default-export */
export const properCase = str =>
  str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
