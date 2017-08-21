export default (arr = [], sort) => {
  const items = Array.from(new Set(arr));

  if (typeof sort === 'function') {
    return items.sort(sort);
  } else if (sort) {
    return items.sort();
  }

  return items;
};
