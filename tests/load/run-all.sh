#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIO_DIR="${BASE_DIR}/scenarios"
RESULTS_DIR="${BASE_DIR}/results"

mkdir -p "${RESULTS_DIR}"

run_scenario() {
  local name="$1"
  local file="$2"

  echo "\n==> Running ${name} (${file})"
  k6 run "${SCENARIO_DIR}/${file}"
}

latest_report() {
  local prefix="$1"
  ls -1t "${RESULTS_DIR}/${prefix}"*.html 2>/dev/null | head -n 1 || true
}

generate_index() {
  local baseline_html peak_html abuse_html recovery_html
  baseline_html="$(latest_report "baseline-")"
  peak_html="$(latest_report "peak-disruption-")"
  abuse_html="$(latest_report "abuse-burst-")"
  recovery_html="$(latest_report "recovery-")"

  cat > "${RESULTS_DIR}/combined-report.html" <<EOF
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Suraksha k6 Combined Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; background: #f6f8fa; }
    h1 { margin-bottom: 1rem; }
    .card { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    a { color: #0366d6; text-decoration: none; }
  </style>
</head>
<body>
  <h1>Suraksha Weekly Load Test Reports</h1>
  <div class="card"><strong>Baseline:</strong> <a href="$(basename "${baseline_html}")">$(basename "${baseline_html}")</a></div>
  <div class="card"><strong>Peak Disruption:</strong> <a href="$(basename "${peak_html}")">$(basename "${peak_html}")</a></div>
  <div class="card"><strong>Abuse Burst:</strong> <a href="$(basename "${abuse_html}")">$(basename "${abuse_html}")</a></div>
  <div class="card"><strong>Recovery:</strong> <a href="$(basename "${recovery_html}")">$(basename "${recovery_html}")</a></div>
</body>
</html>
EOF

  echo "Combined report: ${RESULTS_DIR}/combined-report.html"
}

run_scenario "baseline" "baseline.js"
run_scenario "peak disruption" "peak_disruption.js"
run_scenario "abuse burst" "abuse_burst.js"

if [[ "${ENABLE_DOCKER_FAILURE:-0}" == "1" ]]; then
  echo "\n==> Starting controlled container failure during recovery"
  export RECOVERY_START_TS="$(( $(date +%s) * 1000 + 150000 ))"

  (
    sleep 90
    docker compose stop api || true
    echo "Stopped api container for failure simulation"
    sleep "${FAILURE_DURATION_SECONDS:-60}"
    docker compose start api || true
    echo "Recovered api container"
  ) &
fi

run_scenario "recovery" "recovery.js"

generate_index
