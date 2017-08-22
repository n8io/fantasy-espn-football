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

scrape_data() {
  echo "Scraping league info for the following years: ${SEASONS}"
  SEASONS="$SEASONS" yarn run start -s | tee -a "$LOG_FILE"
}

run_reports() {
  echo "Running summary reports..." && \
                yarn reporting -s | tee -a "$LOG_FILE" && \
  YEARS_BACK=10 yarn reporting -s | tee -a "$LOG_FILE" && \
  YEARS_BACK=5  yarn reporting -s | tee -a "$LOG_FILE" && \
  YEARS_BACK=3  yarn reporting -s | tee -a "$LOG_FILE" && \
  YEARS_BACK=1  yarn reporting -s | tee -a "$LOG_FILE" && \
  echo "done";
}

echo -n "" > "$LOG_FILE" && scrape_data && run_reports

set +e
