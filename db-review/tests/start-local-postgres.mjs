// Starts a throwaway local Postgres on port 54329 for the tests (data dir in /tmp).
import EmbeddedPostgres from "embedded-postgres";
const pg = new EmbeddedPostgres({
  databaseDir: "/tmp/equb-review-pgdata", user: "postgres", password: "postgres",
  port: 54329, persistent: false, onLog: () => {}, onError: () => {},
});
await pg.initialise();
await pg.start();
console.log("Postgres ready on localhost:54329 (Ctrl+C to stop)");
process.stdin.resume();
