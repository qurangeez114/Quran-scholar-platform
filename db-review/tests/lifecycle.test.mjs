// Offline database tests for the Global Equb backend.
// Runs against a real local Postgres (see db-review/README.md).
// Baseline mode (default): existing migrations only. Defects should FAIL here.
// Review mode (EQUB_WITH_REVIEW=1): adds 0003. These should PASS.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { applyAll } from "./apply-migrations.mjs";

const WITH_REVIEW = process.env.EQUB_WITH_REVIEW === "1";
const PG_HOST = process.env.EQUB_PG_URL || "postgres://postgres:postgres@localhost:54329";
const DB = `equb_${WITH_REVIEW ? "review" : "baseline"}_${Date.now()}`;

const U = {
  O: "00000000-0000-4000-8000-000000000001", // organizer
  P1: "00000000-0000-4000-8000-000000000002",
  P2: "00000000-0000-4000-8000-000000000003",
  P3: "00000000-0000-4000-8000-000000000004",
  P4: "00000000-0000-4000-8000-000000000005",
  X: "00000000-0000-4000-8000-000000000009", // outsider
};
const MEMBERS = [U.O, U.P1, U.P2, U.P3, U.P4];

let admin, pool;

before(async () => {
  admin = new pg.Client({ connectionString: `${PG_HOST}/postgres` });
  await admin.connect();
  await admin.query(`create database "${DB}"`);
  const c = new pg.Client({ connectionString: `${PG_HOST}/${DB}` });
  await c.connect();
  await applyAll(c, { withReview: WITH_REVIEW });
  await c.end();
  pool = new pg.Pool({ connectionString: `${PG_HOST}/${DB}`, max: 10 });
  pool.on("error", () => {}); // idle-client errors during teardown are not test failures
  for (const id of Object.values(U)) {
    await pool.query("insert into auth.users(id) values ($1)", [id]);
  }
});

after(async () => {
  await pool?.end();
  await admin?.query(`drop database if exists "${DB}" with (force)`);
  await admin?.end();
});

// Run SQL as a signed-in user (or anon when uid is null), like PostgREST does.
async function as(uid, sql, params = []) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    if (uid) {
      await c.query("set local role authenticated");
      await c.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
    } else {
      await c.query("set local role anon");
    }
    const r = await c.query(sql, params);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

const admin_q = (sql, params) => pool.query(sql, params);

const baseTerms = (over = {}) => ({
  name: "Test circle", description: null, currency: "usd", periodicity: "monthly",
  amount: 100, max_members: 5, start_date: "2027-01-01", timezone: "UTC",
  payout_method: "manual", rules: null, eligibility: null,
  missed_payment_rules: "Late after 3 days", dropout_rules: "Pay out to remaining", dispute_rules: "Organizer decides",
  refund_rules: null, ...over,
});

// Build a circle. Organizer O creates it, invites P1..P4 (or fewer), each accepts current terms.
async function circle({ maxMembers = 5, joiners = [U.P1, U.P2, U.P3, U.P4], promoteP1 = false, terms = {} } = {}) {
  const created = await as(U.O, "select create_circle($1::jsonb) as id", [JSON.stringify(baseTerms({ max_members: maxMembers, ...terms }))]);
  const gid = created.rows[0].id;
  const inv = await as(U.O, "select create_invite($1, 7, $2) as code", [gid, Math.max(1, joiners.length)]);
  const code = inv.rows[0].code;
  for (const u of joiners) {
    const pv = await as(u, "select preview_invite($1) as p", [code]);
    await as(u, "select accept_invite_with_terms($1, $2)", [code, pv.rows[0].p.terms_version]);
  }
  if (promoteP1) {
    // Fixture only: the app has no promote-to-organizer flow yet.
    await admin_q("update public.group_members set role='organizer' where group_id=$1 and user_id=$2", [gid, U.P1]);
  }
  return gid;
}

async function setOrder(gid, order, actor = U.O) {
  return as(actor, "select set_payout_order($1, $2::uuid[])", [gid, order]);
}

async function startSchedule(gid, actor = U.O) {
  return as(actor, "select generate_schedule($1) as n", [gid]);
}

async function roundsOf(gid) {
  const r = await admin_q(
    "select id, round_number, recipient_id, payout_recorded_at, recipient_confirmed_at from public.equb_rounds where group_id=$1 order by round_number",
    [gid],
  );
  return r.rows;
}

// Payer records and confirms own contribution; a different organizer confirms receipt.
async function payAndConfirm(gid, roundId, payer, amount = 100) {
  const rec = await as(payer, "select record_contribution($1, $2, $3, null) as id", [roundId, payer, amount]);
  const cid = rec.rows[0].id;
  await as(payer, "select confirm_contribution($1)", [cid]);
  const confirmer = payer === U.O ? U.P1 : U.O;
  await as(confirmer, "select confirm_contribution($1)", [cid]);
  return cid;
}

const expectReject = (p, pattern) => assert.rejects(p, pattern ? { message: pattern } : undefined);

// ---------------------------------------------------------------------
describe("authorization", () => {
  let gid;
  before(async () => { gid = await circle(); await setOrder(gid, MEMBERS); await startSchedule(gid); });

  test("outsider cannot see the circle, its members' invites, or its ledger", async () => {
    assert.equal((await as(U.X, "select id from public.equb_groups where id=$1", [gid])).rows.length, 0);
    assert.equal((await as(U.X, "select id from public.contributions where group_id=$1", [gid])).rows.length, 0);
    assert.equal((await as(U.P2, "select id from public.group_invites where group_id=$1", [gid])).rows.length, 0,
      "only organizers may read invites");
  });

  test("outsider cannot record, order, schedule, pay out, or invite", async () => {
    const r = (await as(U.P2, "select id from public.equb_rounds where group_id=$1 limit 1", [gid])).rows[0];
    await expectReject(as(U.X, "select record_contribution($1,$2,100,null)", [r.id, U.X]), /Not allowed/);
    await expectReject(setOrder(gid, MEMBERS, U.X), /Only the organizer/);
    await expectReject(startSchedule(gid, U.X), /Only the organizer/);
    await expectReject(as(U.X, "select record_payout($1,null)", [r.id]), /Only the organizer/);
    await expectReject(as(U.X, "select create_invite($1,7,1)", [gid]), /Only the organizer/);
  });

  test("a participant cannot record for another member or act as organizer", async () => {
    const r = (await roundsOf(gid))[0];
    await expectReject(as(U.P2, "select record_contribution($1,$2,100,null)", [r.id, U.P3]), /Only the organizer/);
    await expectReject(setOrder(gid, MEMBERS, U.P2), /Only the organizer/);
    await expectReject(as(U.P2, "select record_payout($1,null)", [r.id]), /Only the organizer/);
  });

  test("anonymous callers cannot run any circle RPC or read circle data", async () => {
    await expectReject(as(null, "select create_circle($1::jsonb)", [JSON.stringify(baseTerms())]));
    await expectReject(as(null, "select record_contribution($1,$2,100,null)", [(await roundsOf(gid))[0].id, U.O]));
    await expectReject(as(null, "select id from public.equb_groups"), /permission denied/);
  });

  test("internal helpers are not executable by anon or authenticated", async () => {
    const internal = [
      "public._terms_snapshot(uuid)",
      "public._publish_terms(uuid,text)",
      "public._log(uuid,text,text,uuid,jsonb)",
      "public.has_accepted_current_terms(uuid,uuid)",
    ];
    for (const sig of internal) {
      for (const role of ["anon", "authenticated"]) {
        const r = await admin_q("select has_function_privilege($1, $2, 'EXECUTE') as ok", [role, sig]);
        assert.equal(r.rows[0].ok, false, `${role} must not execute ${sig}`);
      }
    }
  });

  test("anon has no EXECUTE on any public function", async () => {
    const r = await admin_q(`
      select p.oid::regprocedure::text as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')`);
    assert.deepEqual(r.rows.map((x) => x.sig), []);
  });

  test("anon cannot read private group terms through _terms_snapshot", async () => {
    await expectReject(as(null, "select public._terms_snapshot($1)", [gid]));
  });
});

// ---------------------------------------------------------------------
describe("contribution integrity", () => {
  let gid, r1;
  before(async () => {
    gid = await circle();
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    r1 = (await roundsOf(gid))[0];
  });

  test("simultaneous duplicate submissions produce one record and no unique-constraint error", async () => {
    const results = await Promise.allSettled([
      as(U.P2, "select record_contribution($1,$2,100,'a') as id", [r1.id, U.P2]),
      as(U.P2, "select record_contribution($1,$2,100,'b') as id", [r1.id, U.P2]),
      as(U.P2, "select record_contribution($1,$2,100,'c') as id", [r1.id, U.P2]),
    ]);
    const failed = results.filter((x) => x.status === "rejected").map((x) => x.reason.message);
    assert.deepEqual(failed, [], "all duplicate submissions should resolve");
    const rows = await admin_q("select id from public.contributions where round_id=$1 and payer_id=$2", [r1.id, U.P2]);
    assert.equal(rows.rows.length, 1);
  });

  test("identical retry returns the same record", async () => {
    const a = await as(U.P3, "select record_contribution($1,$2,100,null) as id", [r1.id, U.P3]);
    const b = await as(U.P3, "select record_contribution($1,$2,100,null) as id", [r1.id, U.P3]);
    assert.equal(a.rows[0].id, b.rows[0].id);
  });

  test("a confirmed contribution cannot be changed; identical retry still succeeds", async () => {
    const cid = await payAndConfirm(gid, r1.id, U.P4, 100);
    await expectReject(as(U.P4, "select record_contribution($1,$2,250,null)", [r1.id, U.P4]), /cannot be changed/);
    const same = await as(U.P4, "select record_contribution($1,$2,100,null) as id", [r1.id, U.P4]);
    assert.equal(same.rows[0].id, cid);
    const row = await admin_q("select amount from public.contributions where id=$1", [cid]);
    assert.equal(Number(row.rows[0].amount), 100);
  });

  test("an organizer who is the payer cannot satisfy both confirmations", async () => {
    const rec = await as(U.O, "select record_contribution($1,$2,100,null) as id", [r1.id, U.O]);
    const cid = rec.rows[0].id;
    const c1 = await as(U.O, "select confirm_contribution($1) as j", [cid]);
    assert.equal(c1.rows[0].j.changed, true);
    const row = (await admin_q("select payer_confirmed_at, organizer_confirmed_at from public.contributions where id=$1", [cid])).rows[0];
    assert.ok(row.payer_confirmed_at, "payer confirmation recorded");
    assert.equal(row.organizer_confirmed_at, null, "payer must not supply organizer confirmation");
  });

  test("confirm reports changed=false when nothing new was recorded", async () => {
    const cid = (await admin_q("select id from public.contributions where round_id=$1 and payer_id=$2", [r1.id, U.P4])).rows[0].id;
    const again = await as(U.P4, "select confirm_contribution($1) as j", [cid]);
    assert.equal(again.rows[0].j.changed, false);
  });
});

// ---------------------------------------------------------------------
describe("payout order", () => {
  test("duplicate member IDs are rejected and no positions change", async () => {
    const gid = await circle();
    const snap = async () => (await admin_q(
      "select user_id, payout_position from public.group_members where group_id=$1 order by user_id", [gid])).rows;
    const before = await snap();
    await expectReject(setOrder(gid, [U.O, U.O, U.P1, U.P2, U.P3]), /twice|exactly once/);
    assert.deepEqual(await snap(), before);
  });

  test("missing, wrong-count, null and outsider IDs are rejected", async () => {
    const gid = await circle();
    await expectReject(setOrder(gid, [U.O, U.P1, U.P2, U.P3]), /exactly once/);
    await expectReject(setOrder(gid, [U.O, U.P1, U.P2, U.P3, null]), /exactly once/);
    await expectReject(setOrder(gid, [U.O, U.P1, U.P2, U.P3, U.X]), /exactly once/);
  });

  test("a valid order is accepted and recorded", async () => {
    const gid = await circle();
    await setOrder(gid, [U.P2, U.O, U.P4, U.P1, U.P3]);
    const r = await admin_q("select user_id, payout_position from public.group_members where group_id=$1 order by payout_position", [gid]);
    assert.deepEqual(r.rows.map((x) => x.user_id), [U.P2, U.O, U.P4, U.P1, U.P3]);
  });

  test("order is locked once the schedule exists", async () => {
    const gid = await circle();
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    await expectReject(setOrder(gid, [U.P1, U.O, U.P2, U.P3, U.P4]), /locked/);
  });

  test("concurrent order change and schedule generation leave positions matching the rounds", async () => {
    const gid = await circle();
    await setOrder(gid, MEMBERS);
    await Promise.allSettled([
      setOrder(gid, [U.P4, U.P3, U.P2, U.P1, U.O]),
      startSchedule(gid),
    ]);
    const rounds = await roundsOf(gid);
    if (rounds.length === 0) return; // order won the race; nothing to check
    const pos = (await admin_q("select user_id from public.group_members where group_id=$1 order by payout_position", [gid])).rows;
    rounds.forEach((r, i) => assert.equal(r.recipient_id, pos[i].user_id, `round ${i + 1} recipient must match its position`));
  });
});

// ---------------------------------------------------------------------
describe("scheduling and activation", () => {
  test("schedule needs at least two members", async () => {
    const gid = await circle({ maxMembers: 2, joiners: [] });
    await expectReject(startSchedule(gid), /At least 2 members/);
  });

  test("schedule waits until every member accepts the newest terms", async () => {
    const gid = await circle();
    await setOrder(gid, MEMBERS);
    await as(U.O, "select update_terms($1, $2::jsonb, $3)", [gid, JSON.stringify(baseTerms({ amount: 120 })), "Amount raised"]);
    await expectReject(startSchedule(gid), /accept the current terms/);
    for (const u of [U.P1, U.P2, U.P3, U.P4]) await as(u, "select accept_current_terms($1, 2)", [gid]);
    const n = await startSchedule(gid);
    assert.equal(n.rows[0].n, 5);
    const g = (await admin_q("select status from public.equb_groups where id=$1", [gid])).rows[0];
    assert.equal(g.status, "active");
  });

  test("rounds are one per member, with the recipient matching payout order", async () => {
    const gid = await circle();
    const order = [U.P3, U.P1, U.O, U.P4, U.P2];
    await setOrder(gid, order);
    await startSchedule(gid);
    const rounds = await roundsOf(gid);
    assert.equal(rounds.length, 5);
    assert.deepEqual(rounds.map((r) => r.recipient_id), order);
  });
});

// ---------------------------------------------------------------------
describe("five-member rotation, end to end", () => {
  test("complete rotation: contributions confirmed, payouts recorded and acknowledged", async () => {
    const gid = await circle({ promoteP1: true });
    const order = [U.O, U.P1, U.P2, U.P3, U.P4];
    await setOrder(gid, order);
    await startSchedule(gid);
    const rounds = await roundsOf(gid);

    for (const round of rounds) {
      for (const m of MEMBERS) await payAndConfirm(gid, round.id, m);
      await as(U.O, "select record_payout($1, 'paid off-platform') ", [round.id]);
      await as(round.recipient_id, "select confirm_payout($1)", [round.id]);
    }

    const after = await roundsOf(gid);
    assert.ok(after.every((r) => r.payout_recorded_at && r.recipient_confirmed_at), "every round paid and acknowledged");
    const total = await admin_q(
      "select count(*)::int n, sum(amount)::numeric t from public.contributions c join public.equb_rounds r on r.id=c.round_id where r.group_id=$1 and c.organizer_confirmed_at is not null and c.payer_confirmed_at is not null",
      [gid],
    );
    assert.equal(total.rows[0].n, 25);
    assert.equal(Number(total.rows[0].t), 2500);
  });

  test("a payout cannot be recorded until every contribution is confirmed by both sides", async () => {
    const gid = await circle({ promoteP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    for (const m of [U.O, U.P1, U.P2, U.P3]) await payAndConfirm(gid, r1.id, m);
    await expectReject(as(U.O, "select record_payout($1, null)", [r1.id]), /must be confirmed/);
    await payAndConfirm(gid, r1.id, U.P4);
    await as(U.O, "select record_payout($1, null)", [r1.id]);
    const after = (await roundsOf(gid))[0];
    assert.ok(after.payout_recorded_at);
  });

  test("only the recipient can acknowledge a payout, and only after it is recorded", async () => {
    const gid = await circle({ promoteP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    await expectReject(as(r1.recipient_id, "select confirm_payout($1)", [r1.id]), /has not recorded/);
    for (const m of MEMBERS) await payAndConfirm(gid, r1.id, m);
    await as(U.O, "select record_payout($1, null)", [r1.id]);
    await expectReject(as(U.P2, "select confirm_payout($1)", [r1.id]), /Only the recipient/);
    await as(r1.recipient_id, "select confirm_payout($1)", [r1.id]);
  });
});

// ---------------------------------------------------------------------
// Lifecycle features the brief lists that do not exist in the source yet.
describe("not yet implemented", () => {
  test.todo("missed contribution: overdue detection and organizer notice");
  test.todo("disputes: open, respond, resolve, with immutable history");
  test.todo("early termination with settlement rules");
  test.todo("final reconciliation and transition to 'completed'");
  test.todo("organizer-paid rounds: second-organizer or other independent confirmation path");
});
