#!/bin/bash
set -e

LOG_DIR="./data"
LOG_FILE="${LOG_DIR}/scrape.log"
CURRENT_MONTH="$(date +%m | sed 's/^0*//')"

YEAR_START=2007
YEAR_END="$(date +%Y)"
MONTH_NOW=$((CURRENT_MONTH + 0))

if [ $MONTH_NOW -lt 8 ]; then
  YEAR_END=$((YEAR_END - 1))
fi

SEASONS=$(seq -s, "$YEAR_START" "$YEAR_END"| sed 's/,$//')
mkdir -p "$LOG_DIR"

echo "Scraping league info for the following years: ${SEASONS}"
echo -n "" > "$LOG_FILE" && SEASONS="$SEASONS" yarn run start -s | tee -a "$LOG_FILE"

set +e
