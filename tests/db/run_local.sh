#!/bin/bash
# Local-only runner. Usage: run_local.sh <postgres-socket-dir> <port>
set -euo pipefail
SOCK=$1; PORT=$2; DIR=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$DIR/../.." && pwd)
P="psql -h $SOCK -p $PORT -U postgres -X -q -v ON_ERROR_STOP=1"
$P -d postgres -c "drop database if exists qh_owner_test" -c "create database qh_owner_test"
$P -d qh_owner_test -f "$DIR/00_supabase_stub.sql"
$P -d qh_owner_test -f "$REPO/supabase/accounts/001_accounts.sql"
$P -d qh_owner_test -f "$REPO/supabase/accounts/004_owner_staff_minimal.sql"
$P -d qh_owner_test -f "$DIR/owner_staff.test.sql"
# Negative checks: 004 must refuse to run in these states (each in its own database).
for case in recovery_installed owner_missing; do
  $P -d postgres -c "drop database if exists qh_guard_$case" -c "create database qh_guard_$case"
  $P -d qh_guard_$case -f "$DIR/00_supabase_stub.sql"
  $P -d qh_guard_$case -f "$REPO/supabase/accounts/001_accounts.sql"
  if [ $case = recovery_installed ]; then
    $P -d qh_guard_$case -c "create table public.qh_account_deletions (user_id uuid primary key)"
  else
    $P -d qh_guard_$case -c "update auth.users set email = 'someone-else@example.test' where lower(email) = 'magicallife19@gmail.com'"
  fi
  if $P -d qh_guard_$case -f "$REPO/supabase/accounts/004_owner_staff_minimal.sql" >/dev/null 2>&1; then
    echo "FAILED: 004 ran in state $case"; exit 1
  fi
  echo "ok: 004 refused in state $case"
done
echo "ALL DB TESTS PASSED"
