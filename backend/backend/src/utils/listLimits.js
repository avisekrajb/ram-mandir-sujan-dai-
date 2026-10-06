// Upper bounds for list endpoints so a single request can never pull an entire
// collection into memory / over the wire as the data grows. MAX_LIST is a
// safety ceiling for endpoints whose callers expect the full list (the admin
// panel renders and filters client-side); paginated endpoints clamp the
// client-supplied ?limit instead.
const MAX_LIST = 2000;

const clampInt = (value, fallback, min, max) => {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

// Parse ?page/?limit with sane bounds: page >= 1, 1 <= limit <= maxLimit.
const parsePagination = (query, { defaultLimit = 50, maxLimit = 200 } = {}) => {
  const limit = clampInt(query.limit, defaultLimit, 1, maxLimit);
  const page = clampInt(query.page, 1, 1, 100000);
  return { limit, page, skip: (page - 1) * limit };
};

module.exports = { MAX_LIST, clampInt, parsePagination };
