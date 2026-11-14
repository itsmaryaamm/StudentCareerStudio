// Usage: DATABASE_URL=... node tooling/scs/make-admin.mjs founder@example.com [--revoke]
// Run on the server. Admin is never granted by sign-up alone, so nobody can claim it by registering an address first.
import pg from "pg";

const [email, flag] = process.argv.slice(2);
if (!email || !process.env.DATABASE_URL) {
	console.error("Usage: DATABASE_URL=... node tooling/scs/make-admin.mjs <email> [--revoke]");
	process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const role = flag === "--revoke" ? "user" : "admin";
const res = await client.query('update "user" set role = $1 where lower(email) = lower($2) returning id', [
	role,
	email,
]);
console.log(res.rowCount ? `${email} is now ${role}.` : `No account found for ${email}. Sign up first, then re-run.`);
await client.end();
process.exit(res.rowCount ? 0 : 2);
