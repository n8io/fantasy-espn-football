#!/bin/bash
set -e

LOG_DIR="./data"
LOG_FILE="${LOG_DIR}/scrape.log"
CURRENT_MONTH="$(date +%m | sed 's/^0*//')"

YEAR_START=2018
YEAR_END="$(date +%Y)"
MONTH_NOW=$((CURRENT_MONTH + 0))

if [ $MONTH_NOW -lt 8 ]; then
  YEAR_END=$((YEAR_END - 1))
fi

SEASONS=$(seq -s, "$YEAR_START" "$YEAR_END"| sed 's/,$//')
mkdir -p "$LOG_DIR"

scrape_data() {
  echo "$(date): 👓 Scraping league info for the following years: ${SEASONS}" | tee -a "$LOG_FILE"
  SEASONS="$SEASONS" yarn run start -s | tee -a "$LOG_FILE"
}

run_reports() {
  echo "$(date): 📊 Running alltime reports..." | tee -a "$LOG_FILE" && \
  QUICKHITS=1 MAX_RESULTS=10 yarn reporting -s | tee -a "$LOG_FILE" && QUICKHITS= && \
  echo "$(date): 📊 Running 15 year rollup reports..." | tee -a "$LOG_FILE" && \
  YEARS_BACK=15 yarn reporting -s | tee -a "$LOG_FILE" && \
  echo "$(date): 📊 Running 10 year rollup reports..." | tee -a "$LOG_FILE" && \
  YEARS_BACK=10 yarn reporting -s | tee -a "$LOG_FILE" && \
  echo "$(date): 📊 Running 5 year rollup reports..." | tee -a "$LOG_FILE" && \
  YEARS_BACK=5  yarn reporting -s | tee -a "$LOG_FILE" && \
  echo "$(date): 📊 Running 3 year rollup reports..." | tee -a "$LOG_FILE" && \
  YEARS_BACK=3  yarn reporting -s | tee -a "$LOG_FILE" && \
  echo "$(date): 📊 Running last year's reports..." | tee -a "$LOG_FILE" && \
  YEARS_BACK=1 yarn reporting -s | tee -a "$LOG_FILE" && \
  echo "$(date): ✔ Reports finished successfully." | tee -a "$LOG_FILE";
}

echo -n "" > "$LOG_FILE" && ([ -z "$NOSCRAPE" ] && scrape_data) || true && run_reports

set +e
