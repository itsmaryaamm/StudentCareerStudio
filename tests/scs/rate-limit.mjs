// Rate-limit check. Needs a server running in PRODUCTION mode (limits are off otherwise):
//   NODE_ENV=production CLIENT_IP_HEADER=CF-Connecting-IP APP_URL=http://localhost:3000 SCS_BETA_MAX_USERS=500 ... node apps/server/dist/index.mjs
//   node tests/scs/rate-limit.mjs
// It signs up one student and then hammers each limited route from made-up visitor addresses, and fails if a limit
// does not start where it should.
const B = process.env.BASE ?? "http://localhost:3000";
const A = B + "/api/openapi";
let failed = 0;
const hdr = (ip, extra = {}) => ({ "content-type": "application/json", origin: B, "CF-Connecting-IP": ip, ...extra });
const post = (path, body, ip, extra) =>
	fetch(B + path, { method: "POST", headers: hdr(ip, extra), body: JSON.stringify(body) });
const run = async (label, n, fn, expect) => {
	const codes = [];
	for (let i = 0; i < n; i++) codes.push((await fn(i)).status);
	const first429 = codes.indexOf(429) + 1;
	const ok = first429 === expect;
	if (!ok) failed++;
	console.log(
		ok ? "PASS" : "FAIL",
		label.padEnd(46),
		"first 429 at attempt",
		first429 || "never",
		"(expected",
		expect + ")",
	);
};
const tag = "r" + Date.now().toString(36);
// a real account to attack
const su = await post(
	"/api/auth/sign-up/email",
	{ name: "R", email: tag + "@example.com", password: "Sup3rSecret!pass", username: tag, displayUsername: tag },
	"10.0.0.1",
);
const cookie = su.headers
	.getSetCookie()
	.map((c) => c.split(";")[0])
	.join("; ");
await run(
	"sign-in, wrong password, ONE account (varied IPs)",
	14,
	(i) =>
		post("/api/auth/sign-in/email", { email: tag + "@example.com", password: "wrong-pass-" + i }, "10.1.0." + (i + 1)),
	11,
);
await run(
	"sign-in, many accounts, ONE address",
	26,
	(i) => post("/api/auth/sign-in/email", { email: `nobody${i}@example.com`, password: "wrong-pass-123" }, "10.2.0.1"),
	21,
);
await run(
	"sign-up, ONE address",
	16,
	(i) =>
		post(
			"/api/auth/sign-up/email",
			{
				name: "S",
				email: `s${i}${tag}@example.com`,
				password: "Sup3rSecret!pass",
				username: `s${i}${tag}`,
				displayUsername: `s${i}${tag}`,
			},
			"10.3.0.1",
		),
	13,
);
await run(
	"password reset email, ONE target (varied IPs)",
	7,
	(i) =>
		post(
			"/api/auth/request-password-reset",
			{ email: tag + "@example.com", redirectTo: "/auth/reset-password" },
			"10.4.0." + (i + 1),
		),
	5,
);
const authed = (m, p, b, ip) =>
	fetch(A + p, { method: m, headers: hdr(ip, { cookie }), body: b ? JSON.stringify(b) : undefined });
await run(
	"friend-code guesses, ONE account",
	14,
	(i) => authed("PUT", "/scs/referral", { code: "ZZZZZZ" + (10 + i) }, "10.5.0.1"),
	11,
);
await run(
	"feedback spam, ONE account",
	8,
	(i) => authed("POST", "/scs/feedback", { rating: 3, category: "idea", message: "spam spam " + i }, "10.6.0.1"),
	6,
);
await run("data export, ONE account", 7, () => authed("GET", "/scs/export", null, "10.7.0.1"), 5);
await run("public seat counter, ONE address", 70, () => fetch(A + "/scs/beta", { headers: hdr("10.8.0.1") }), 61);
await run(
	"write endpoint (add fact), ONE account",
	100,
	(i) => authed("POST", "/scs/facts", { category: "other", text: "fact number " + i }, "10.9.0.1"),
	91,
);
// header spoof: a visitor-supplied value can't dodge when the proxy overwrites it; here we only show distinct IPs get distinct buckets
if (failed) {
	console.log(failed, "check(s) failed");
	process.exit(1);
}
const r = await post("/api/auth/sign-in/email", { email: "x@example.com", password: "wrong-pass-123" }, "10.2.0.1");
console.log(
	"same address as an exhausted bucket ->",
	r.status,
	"| a new address ->",
	(await post("/api/auth/sign-in/email", { email: "x@example.com", password: "wrong-pass-123" }, "10.99.0.1")).status,
);
