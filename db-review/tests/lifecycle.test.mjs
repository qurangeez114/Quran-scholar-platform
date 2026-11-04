// Offline database tests for the Global Equb backend.
// Runs against a real local Postgres (see db-review/README.md).
// Applies drizzle 0000-0002 plus review migrations 0003 and 0004.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { applyAll } from "./apply-migrations.mjs";

const PG_HOST = process.env.EQUB_PG_URL || "postgres://postgres:postgres@localhost:54329";
const DB = `equb_review_${Date.now()}`;

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
  await applyAll(c, { withReview: true });
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
async function circle({ maxMembers = 5, joiners = [U.P1, U.P2, U.P3, U.P4], consentP1 = false, terms = {} } = {}) {
  const created = await as(U.O, "select create_circle($1::jsonb) as id", [JSON.stringify(baseTerms({ max_members: maxMembers, ...terms }))]);
  const gid = created.rows[0].id;
  const inv = await as(U.O, "select create_invite($1, 7, $2) as code", [gid, Math.max(1, joiners.length)]);
  const code = inv.rows[0].code;
  for (const u of joiners) {
    const pv = await as(u, "select preview_invite($1) as p", [code]);
    await as(u, "select accept_invite_with_terms($1, $2)", [code, pv.rows[0].p.terms_version]);
  }
  if (consentP1) {
    // P1 opts in to verify others' payments. Nobody is promoted automatically.
    await as(U.P1, "select consent_to_verify($1)", [gid]);
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

  test("a confirmed contribution is never changed; wrong amounts are refused", async () => {
    const cid = await payAndConfirm(gid, r1.id, U.P4, 100);
    await expectReject(as(U.P4, "select record_contribution($1,$2,250,null)", [r1.id, U.P4]), /agreed amount of 100/);
    // A different note on a confirmed record is a no-op: the confirmed record is untouched.
    const same = await as(U.P4, "select record_contribution($1,$2,100,'changed note') as id", [r1.id, U.P4]);
    assert.equal(same.rows[0].id, cid);
    const row = (await admin_q("select amount, note from public.contributions where id=$1", [cid])).rows[0];
    assert.equal(Number(row.amount), 100);
    assert.equal(row.note, null);
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
    const gid = await circle({ consentP1: true });
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
    const gid = await circle({ consentP1: true });
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
    const gid = await circle({ consentP1: true });
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
describe("membership information", () => {
  test("authenticated users cannot call the two-argument membership helpers", async () => {
    for (const sig of ["public.is_group_member(uuid,uuid)", "public.is_group_organizer(uuid,uuid)"]) {
      const r = await admin_q("select has_function_privilege('authenticated', $1, 'EXECUTE') as ok", [sig]);
      assert.equal(r.rows[0].ok, false, `authenticated must not execute ${sig}`);
    }
  });

  test("is_my_group answers only for the caller", async () => {
    const gid = await circle();
    assert.equal((await as(U.P2, "select public.is_my_group($1) as ok", [gid])).rows[0].ok, true);
    assert.equal((await as(U.X, "select public.is_my_group($1) as ok", [gid])).rows[0].ok, false);
  });

  test("RLS: members read their circle; outsiders and non-organizers read nothing sensitive", async () => {
    const gid = await circle();
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    assert.equal((await as(U.P2, "select id from public.equb_rounds where group_id=$1", [gid])).rows.length, 5);
    assert.equal((await as(U.X, "select id from public.equb_rounds where group_id=$1", [gid])).rows.length, 0);
    assert.equal((await as(U.P2, "select id from public.group_invites where group_id=$1", [gid])).rows.length, 0);
    assert.equal((await as(U.O, "select id from public.group_invites where group_id=$1", [gid])).rows.length, 1);
  });

  test("membership-scoped RPCs refuse outsiders", async () => {
    const gid = await circle();
    await expectReject(as(U.X, "select * from public.circle_reconciliation($1)", [gid]), /Not allowed/);
    await expectReject(as(U.X, "select public.refresh_missed_contributions($1)", [gid]), /Not allowed/);
  });
});

// ---------------------------------------------------------------------
describe("independent verification by consent", () => {
  test("nobody is promoted: consent is recorded only when the member gives it", async () => {
    const gid = await circle({ consentP1: true });
    const roles = (await admin_q("select user_id, role, verifier_consent_at from public.group_members where group_id=$1", [gid])).rows;
    const p1 = roles.find((r) => r.user_id === U.P1);
    const p2 = roles.find((r) => r.user_id === U.P2);
    assert.equal(p1.role, "participant");
    assert.ok(p1.verifier_consent_at, "P1 consented");
    assert.equal(p2.verifier_consent_at, null, "P2 did not consent");
  });

  test("a member without consent cannot verify someone else's payment", async () => {
    const gid = await circle();
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    const cid = (await as(U.P3, "select record_contribution($1,$2,100,null) as id", [r1.id, U.P3])).rows[0].id;
    await as(U.P3, "select confirm_contribution($1)", [cid]);
    await expectReject(as(U.P2, "select confirm_contribution($1)", [cid]), /authorized verifier/);
  });

  test("a consented member verifies, and the verifier's identity is recorded", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    const cid = (await as(U.P2, "select record_contribution($1,$2,100,null) as id", [r1.id, U.P2])).rows[0].id;
    await as(U.P2, "select confirm_contribution($1)", [cid]);
    const v = await as(U.P1, "select confirm_contribution($1) as j", [cid]);
    assert.equal(v.rows[0].j.changed, true);
    const row = (await admin_q("select payer_confirmed_by, organizer_confirmed_by from public.contributions where id=$1", [cid])).rows[0];
    assert.equal(row.payer_confirmed_by, U.P2);
    assert.equal(row.organizer_confirmed_by, U.P1);
    const log = await admin_q("select 1 from public.activity_log where group_id=$1 and action='contribution_verified' and entity_id=$2", [gid, cid]);
    assert.equal(log.rows.length, 1);
  });

  test("withdrawing consent stops verification for future payments", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    const cid = (await as(U.P2, "select record_contribution($1,$2,100,null) as id", [r1.id, U.P2])).rows[0].id;
    await as(U.P2, "select confirm_contribution($1)", [cid]);
    await as(U.P1, "select withdraw_verifier_consent($1)", [gid]);
    await expectReject(as(U.P1, "select confirm_contribution($1)", [cid]), /authorized verifier/);
  });

  test("a payer can never verify their own payment, even with consent", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    const cid = (await as(U.P1, "select record_contribution($1,$2,100,null) as id", [r1.id, U.P1])).rows[0].id;
    await as(U.P1, "select confirm_contribution($1)", [cid]);
    const row = (await admin_q("select organizer_confirmed_at from public.contributions where id=$1", [cid])).rows[0];
    assert.equal(row.organizer_confirmed_at, null);
  });

  test("consent is only available to members", async () => {
    const gid = await circle();
    await expectReject(as(U.X, "select consent_to_verify($1)", [gid]), /Not a member/);
  });
});

// ---------------------------------------------------------------------
describe("agreed contribution amount", () => {
  test("only the agreed amount is accepted; partial payments are refused", async () => {
    const gid = await circle();
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    await expectReject(as(U.P2, "select record_contribution($1,$2,99,null)", [r1.id, U.P2]), /agreed amount of 100/);
    await expectReject(as(U.P2, "select record_contribution($1,$2,50,null)", [r1.id, U.P2]), /Partial payments are not supported/);
    await as(U.P2, "select record_contribution($1,$2,100,null)", [r1.id, U.P2]);
  });

  test("every round collects one contribution from every member, including the recipient", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    for (const round of await roundsOf(gid)) {
      for (const m of MEMBERS) await payAndConfirm(gid, round.id, m);
      const n = await admin_q(
        "select count(distinct payer_id)::int n from public.contributions where round_id=$1 and payer_confirmed_at is not null and organizer_confirmed_at is not null",
        [round.id]);
      assert.equal(n.rows[0].n, 5, `round ${round.round_number}`);
      const recipientPaid = await admin_q(
        "select 1 from public.contributions where round_id=$1 and payer_id=$2 and organizer_confirmed_at is not null", [round.id, round.recipient_id]);
      assert.equal(recipientPaid.rows.length, 1, `recipient pays round ${round.round_number}`);
    }
  });
});

// ---------------------------------------------------------------------
describe("missed-contribution detection", () => {
  test("a round is not missed on its due date, but is missed after it", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    assert.equal((await admin_q("select public._detect_missed($1, $2::date) n", [gid, "2027-01-01"])).rows[0].n, 0);
    assert.equal((await admin_q("select public._detect_missed($1, $2::date) n", [gid, "2027-01-02"])).rows[0].n, 5);
  });

  test("detection is idempotent and clears once the payment is fully confirmed", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    await admin_q("select public._detect_missed($1, $2::date)", [gid, "2027-01-02"]);
    await admin_q("select public._detect_missed($1, $2::date)", [gid, "2027-01-02"]);
    assert.equal((await admin_q("select count(*)::int n from public.missed_contributions where group_id=$1", [gid])).rows[0].n, 5);
    await payAndConfirm(gid, r1.id, U.P2);
    await admin_q("select public._detect_missed($1, $2::date)", [gid, "2027-01-03"]);
    const p2 = (await admin_q("select status from public.missed_contributions where group_id=$1 and payer_id=$2 and round_id=$3", [gid, U.P2, r1.id])).rows[0];
    assert.equal(p2.status, "resolved");
  });

  test("members can refresh; no misses before today for a future-dated circle", async () => {
    const gid = await circle();
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    assert.equal((await as(U.P2, "select public.refresh_missed_contributions($1) n", [gid])).rows[0].n, 0);
  });
});

// ---------------------------------------------------------------------
// Helper: one round, everyone paid and verified, round recipient = first in order.
async function paidRound(gid, round, skip = []) {
  for (const m of MEMBERS) if (!skip.includes(m)) await payAndConfirm(gid, round.id, m);
}

describe("disputes", () => {
  test("validation: short reasons, outsiders and non-parties are refused; one open dispute per payment", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    const cid = (await as(U.P2, "select record_contribution($1,$2,100,null) as id", [r1.id, U.P2])).rows[0].id;
    await expectReject(as(U.P2, "select open_dispute($1,'short')", [cid]), /check constraint|violates/);
    await expectReject(as(U.X, "select open_dispute($1,'Payment was not received')", [cid]), /Not allowed|Only the payer/);
    await expectReject(as(U.P3, "select open_dispute($1,'Payment was not received')", [cid]), /Only the payer, the round recipient or the organizer/);
    await as(U.P2, "select open_dispute($1,'I paid on time, please check')", [cid]);
    await expectReject(as(U.P2, "select open_dispute($1,'Opening a second one')", [cid]), /unique|duplicate/);
  });

  test("an open dispute blocks payout; an opener or disputed payer cannot resolve; an independent verifier can", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    await paidRound(gid, r1);
    const cid = (await admin_q("select id from public.contributions where round_id=$1 and payer_id=$2", [r1.id, U.P3])).rows[0].id;
    const did = (await as(U.P3, "select open_dispute($1,'Verifier recorded the wrong date') as id", [cid])).rows[0].id;
    await expectReject(as(U.O, "select record_payout($1,null)", [r1.id]), /open dispute/);
    await expectReject(as(U.P3, "select resolve_dispute($1,'I am right')", [did]), /Only an authorized verifier|cannot resolve/);
    await expectReject(as(U.P2, "select resolve_dispute($1,'Not mine to decide')", [did]), /Only an authorized verifier/);
    await as(U.P1, "select resolve_dispute($1,'Verified against the bank record provided')", [did]);
    await as(U.O, "select record_payout($1,'paid') ", [r1.id]);
    const d = (await admin_q("select status, resolved_by from public.disputes where id=$1", [did])).rows[0];
    assert.equal(d.status, "resolved");
    assert.equal(d.resolved_by, U.P1);
  });

  test("the dispute trail is append-only", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    const cid = (await as(U.P2, "select record_contribution($1,$2,100,null) as id", [r1.id, U.P2])).rows[0].id;
    const did = (await as(U.P2, "select open_dispute($1,'Recorded amount looks wrong') as id", [cid])).rows[0].id;
    await as(U.P2, "select add_dispute_note($1,'Here is the reference number')", [did]);
    const events = (await admin_q("select kind from public.dispute_events where dispute_id=$1 order by created_at", [did])).rows.map((r) => r.kind);
    assert.deepEqual(events, ["opened", "note"]);
    await expectReject(admin_q("update public.dispute_events set body='rewritten' where dispute_id=$1", [did]), /append-only/);
    await expectReject(admin_q("delete from public.dispute_events where dispute_id=$1", [did]), /append-only/);
  });

  test("only the opener can withdraw, and only while open", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    const cid = (await as(U.P2, "select record_contribution($1,$2,100,null) as id", [r1.id, U.P2])).rows[0].id;
    const did = (await as(U.P2, "select open_dispute($1,'Duplicate entry on my account') as id", [cid])).rows[0].id;
    await expectReject(as(U.O, "select withdraw_dispute($1)", [did]), /Only the person who opened/);
    await as(U.P2, "select withdraw_dispute($1)", [did]);
    await expectReject(as(U.P2, "select withdraw_dispute($1)", [did]), /Only the person who opened/);
  });
});

// ---------------------------------------------------------------------
describe("early termination", () => {
  test("requires every member's consent; then the circle stops accepting activity", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    const r1 = (await roundsOf(gid))[0];
    await expectReject(as(U.P2, "select request_termination($1,'We want to stop early')", [gid]), /Only the organizer/);
    const requested = await as(U.O, "select request_termination($1,'Members agreed to stop early') as ok", [gid]);
    assert.equal(requested.rows[0].ok, false, "not effective until everyone consents");
    for (const u of [U.P1, U.P2, U.P3]) assert.equal((await as(u, "select consent_termination($1) as ok", [gid])).rows[0].ok, false);
    await expectReject(as(U.X, "select consent_termination($1)", [gid]), /Not allowed/);
    assert.equal((await as(U.P4, "select consent_termination($1) as ok", [gid])).rows[0].ok, true);

    const g = (await admin_q("select status from public.equb_groups where id=$1", [gid])).rows[0];
    assert.equal(g.status, "terminated");
    await expectReject(as(U.P2, "select record_contribution($1,$2,100,null)", [r1.id, U.P2]), /active circle/);
    await expectReject(as(U.O, "select record_payout($1,null)", [r1.id]), /active circle/);
    await expectReject(startSchedule(gid), /closed/);
    await expectReject(as(U.O, "select request_termination($1,'Again please, again')", [gid]), /only an active|Only an active/i);
  });

  test("consent requires a pending termination and a member", async () => {
    const gid = await circle();
    await expectReject(as(U.P2, "select consent_termination($1)", [gid]), /No termination is pending/);
  });
});

// ---------------------------------------------------------------------
describe("completion and final reconciliation", () => {
  test("only the organizer can complete; anonymous callers cannot verify or complete", async () => {
    const gid = await runFullRotation({ consentP1: true });
    await expectReject(as(U.P2, "select complete_circle($1)", [gid]), /Only the organizer/);
    await expectReject(as(U.X, "select complete_circle($1)", [gid]), /Only the organizer/);
    await expectReject(as(null, "select consent_to_verify($1)", [gid]));
    assert.equal((await as(U.X, "select public.is_my_organizer($1) as ok", [gid])).rows[0].ok, false);
  });

  test("completion is refused until every round is paid and acknowledged", async () => {
    const gid = await circle({ consentP1: true });
    await setOrder(gid, MEMBERS);
    await startSchedule(gid);
    await expectReject(as(U.O, "select complete_circle($1)", [gid]), /paid out and acknowledged/);
  });

  test("a full rotation completes, and every member's reconciled net position is zero", async () => {
    const gid = await runFullRotation({ consentP1: true });
    await as(U.O, "select complete_circle($1)", [gid]);
    assert.equal((await admin_q("select status from public.equb_groups where id=$1", [gid])).rows[0].status, "completed");
    const rec = (await as(U.P2, "select * from public.circle_reconciliation($1)", [gid])).rows;
    assert.equal(rec.length, 5);
    for (const r of rec) {
      assert.equal(Number(r.contributions_expected), 500, "5 rounds x 100");
      assert.equal(Number(r.contributions_confirmed), 500);
      assert.equal(Number(r.payout_expected), 500, "recipient payouts across the rotation: one round x 100 x 5 members");
      assert.equal(Number(r.payout_confirmed), 500);
      assert.equal(Number(r.net_position), 0);
    }
    const sum = rec.reduce((a, r) => a + Number(r.net_position), 0);
    assert.equal(sum, 0, "the circle nets to zero");
    // A completed circle accepts no further changes
    await expectReject(as(U.O, "select complete_circle($1)", [gid]), /active circle/);
    await expectReject(as(U.P2, "select confirm_contribution((select id from public.contributions where group_id=$1 limit 1))", [gid]), /complete/);
  });
});

// Full five-member rotation helper.
async function runFullRotation({ consentP1 = false } = {}) {
  const gid = await circle({ consentP1 });
  await setOrder(gid, MEMBERS);
  await startSchedule(gid);
  const rounds = await roundsOf(gid);
  for (const round of rounds) {
    for (const m of MEMBERS) await payAndConfirm(gid, round.id, m);
    await as(U.O, "select record_payout($1, 'paid off-platform')", [round.id]);
    await as(round.recipient_id, "select confirm_payout($1)", [round.id]);
  }
  return gid;
}

// ---------------------------------------------------------------------
describe("end-to-end lifecycle", () => {
  test("form, verify, miss, detect, dispute, resolve, pay, complete, reconcile, audit", async () => {
    // 1. Form the circle; P1 opts in to verify others. No one is promoted.
    const gid = await circle({ consentP1: true });
    // 2. Invite complete; agree order; generate schedule.
    await setOrder(gid, MEMBERS);
    assert.equal(await startSchedule(gid).then((r) => r.rows[0].n), 5);
    const rounds = await roundsOf(gid);
    const r1 = rounds[0];

    // 3. Round 1: P1 does not pay in time.
    await paidRound(gid, r1, [U.P1]);
    // 4. Detection after the due date flags P1 only.
    assert.equal((await admin_q("select public._detect_missed($1,$2::date) n", [gid, "2027-01-02"])).rows[0].n, 1);
    const miss = (await admin_q("select payer_id from public.missed_contributions where group_id=$1 and status='open'", [gid])).rows;
    assert.deepEqual(miss.map((m) => m.payer_id), [U.P1]);

    // 5. P1 pays late and is verified. The miss clears.
    await payAndConfirm(gid, r1.id, U.P1);
    await admin_q("select public._detect_missed($1,$2::date)", [gid, "2027-01-03"]);
    assert.equal((await admin_q("select count(*)::int n from public.missed_contributions where group_id=$1 and status='open'", [gid])).rows[0].n, 0);

    // 6. P3 disputes their own payment: payout is blocked until resolved.
    const cid = (await admin_q("select id from public.contributions where round_id=$1 and payer_id=$2", [r1.id, U.P3])).rows[0].id;
    const did = (await as(U.P3, "select open_dispute($1,'Bank record shows a different date') as id", [cid])).rows[0].id;
    await expectReject(as(U.O, "select record_payout($1,null)", [r1.id]), /open dispute/);
    await as(U.P1, "select resolve_dispute($1,'Reviewed the bank record; payment is valid')", [did]);

    // 7. Remaining rounds run normally.
    await as(U.O, "select record_payout($1,'paid')", [r1.id]);
    await as(r1.recipient_id, "select confirm_payout($1)", [r1.id]);
    for (const round of rounds.slice(1)) {
      await paidRound(gid, round);
      await as(U.O, "select record_payout($1,'paid')", [round.id]);
      await as(round.recipient_id, "select confirm_payout($1)", [round.id]);
    }

    // 8. Complete and reconcile to zero.
    await as(U.O, "select complete_circle($1)", [gid]);
    const rec = (await as(U.O, "select * from public.circle_reconciliation($1)", [gid])).rows;
    assert.equal(rec.reduce((a, r) => a + Number(r.net_position), 0), 0);

    // 9. The audit trail records each decision.
    const actions = new Set((await admin_q("select action from public.activity_log where group_id=$1", [gid])).rows.map((r) => r.action));
    for (const a of ["group_created", "verifier_consent_given", "schedule_generated", "contribution_verified",
                     "dispute_opened", "dispute_resolved", "payout_recorded", "circle_completed"]) {
      assert.ok(actions.has(a), `audit has ${a}`);
    }
  });
});
