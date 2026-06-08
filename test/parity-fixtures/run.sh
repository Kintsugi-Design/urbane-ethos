#!/usr/bin/env bash
set -e

PASS=0
FAIL=0

run_case() {
  local name="$1"
  local dir="$2"
  local expected_code="$3"

  set +e
  bin/check-i18n-parity.rb "$dir/en" "$dir/ms" > /dev/null 2>&1
  local actual=$?
  set -e

  if [ "$actual" -eq "$expected_code" ]; then
    echo "PASS: $name (exit $actual)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name (expected $expected_code, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

run_case "good fixtures parity" test/parity-fixtures/good 0
run_case "missing ms keys"       test/parity-fixtures/missing-ms 1

echo
echo "$PASS passed, $FAIL failed"
exit "$FAIL"
