// Server-side guarantees for the founding beta. Run against a server started with:
//   SCS_BETA_MAX_USERS=4 SCS_BETA_INVITE_CODE=beta-code-1 SCS_LIMIT_CHAT_PER_DAY=10 SCS_LIMIT_UPLOADS_TOTAL=3
//   GEMINI_API_KEY=fake SCS_GEMINI_BASE_URL=http://localhost:4010/v1beta  (stand-in Gemini: node tests/scs/fake-gemini.mjs)
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE ?? "http://localhost:3001";
const API = `${BASE}/api/openapi`;
const pass = [];
const fail = [];
const check = (name, ok, extra = "") => {
	(ok ? pass : fail).push(name);
	console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + extra}`);
};
const psql = (q) =>
	execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", "scs", "-Atc", q]).toString().trim();

async function http(method, path, { body, cookie, headers = {} } = {}) {
	const res = await fetch(`${API}${path}`, {
		method,
		headers: {
			"content-type": "application/json",
			origin: "http://localhost:3000",
			...(cookie ? { cookie } : {}),
			...headers,
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	let json = null;
	try {
		json = await res.json();
	} catch {}
	return { status: res.status, json, headers: res.headers };
}
async function signUp(tag, code = "beta-code-1") {
	const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			origin: "http://localhost:3000",
			...(code ? { "x-beta-code": code } : {}),
		},
		body: JSON.stringify({
			name: `Student ${tag}`,
			email: `${tag}@example.com`,
			password: "Sup3rSecret!pass",
			username: tag,
			displayUsername: tag,
		}),
	});
	const json = await res.json().catch(() => ({}));
	const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
	return { status: res.status, json, cookie, id: json?.user?.id };
}
async function signIn(tag) {
	const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: "http://localhost:3000" },
		body: JSON.stringify({ email: `${tag}@example.com`, password: "Sup3rSecret!pass" }),
	});
	return { status: res.status, cookie: (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ") };
}
const run = Date.now().toString(36);
const u = (n) => `s${run}${n}`;

// ---------- 1. Founding beta cap, enforced server-side ----------
const beta0 = await http("GET", "/scs/beta");
check(
	"beta info is public and reports the cap",
	beta0.status === 200 && beta0.json.maxSeats === 4 && beta0.json.inviteRequired === true,
	JSON.stringify(beta0),
);
check("sign-up WITHOUT invite code is refused", (await signUp(u("x0"), null)).status === 403);
check("sign-up with WRONG invite code is refused", (await signUp(u("x1"), "nope")).status === 403);
const A = await signUp(u("a"));
const B = await signUp(u("b"));
check("sign-up with invite code works (A,B)", A.status === 200 && B.status === 200, JSON.stringify([A.json, B.json]));
// Two seats left; 6 people race for them. Exactly two may win.
const race = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => signUp(u(`r${n}`))));
const won = race.filter((r) => r.status === 200);
const lost = race.filter((r) => r.status === 403);
check(
	"race: 6 simultaneous sign-ups for 2 seats -> exactly 2 succeed",
	won.length === 2 && lost.length === 4,
	`won=${won.length} lost=${lost.length}`,
);
check("full-beta refusal explains why", /full/i.test(JSON.stringify(lost[0]?.json)), JSON.stringify(lost[0]?.json));
check(
	"seat table holds exactly 4 bound seats (A,B + 2 race winners), never more",
	Number(psql("select count(*) from scs_beta_seat where user_id is not null")) === 4,
	psql("select count(*) from scs_beta_seat"),
);
const beta1 = await http("GET", "/scs/beta");
check("seatsLeft is 0 when full", beta1.json.seatsLeft === 0, JSON.stringify(beta1.json));
const D = won[1]; // won[0] becomes the admin below; D stays a student

// ---------- 2. Admin by CLI only ----------
check(
	"a student is NOT admin by default (even the first to sign up)",
	(await http("GET", "/scs/admin/stats", { cookie: A.cookie })).status === 403,
);
const adminEmail = won[0].json.user.email;
execFileSync("node", ["tooling/scs/make-admin.mjs", adminEmail], {
	env: { ...process.env, DATABASE_URL: "postgresql://postgres@localhost:5432/scs" },
});
// ---------- 3. Consent gate ----------
let r = await http("POST", "/scs/chat/send", {
	cookie: A.cookie,
	body: { message: "I organized a university event." },
});
check(
	"AI refused before consent (CONSENT_REQUIRED)",
	r.status === 403 && JSON.stringify(r.json).includes("CONSENT_REQUIRED"),
	JSON.stringify(r),
);
r = await http("POST", "/scs/consent", { cookie: A.cookie });
check("consent accepted", r.status === 200 || r.status === 204, JSON.stringify(r));
await http("POST", "/scs/consent", { cookie: B.cookie });

// ---------- 4. Chat with preserved context + approve facts -> saved profile ----------
r = await http("POST", "/scs/chat/send", { cookie: A.cookie, body: { message: "I organized a university event." } });
const threadId = r.json?.threadId;
check("chat reply + thread created", r.status === 200 && threadId && r.json.reply.length > 5, JSON.stringify(r));
check(
	"chat proposes a fact but does NOT save it as approved",
	r.json?.proposedFacts?.[0]?.status === "proposed" && /Tech Week/.test(r.json.proposedFacts[0].text),
	JSON.stringify(r.json),
);
let facts = await http("GET", "/scs/facts", { cookie: A.cookie });
check("profile has 0 approved facts before approval", facts.json.filter((f) => f.status === "approved").length === 0);
r = await http("POST", "/scs/chat/send", {
	cookie: A.cookie,
	body: { threadId, message: "I was in charge of speakers." },
});
check(
	"conversation context preserved across turns",
	r.status === 200 && /Earlier you said/.test(r.json.reply),
	JSON.stringify(r.json),
);
const seen = await (await fetch("http://localhost:4010/__seen")).json();
check("Gemini received the prior turns (history is sent)", seen.at(-1)?.turns >= 3, JSON.stringify(seen.at(-1)));
const factId = facts.json[0].id;
r = await http("POST", `/scs/facts/${factId}/approve`, { cookie: A.cookie });
check("approve fact", r.status === 200 && r.json.status === "approved", JSON.stringify(r));
facts = await http("GET", "/scs/facts", { cookie: A.cookie });
check(
	"approved fact is in the saved profile",
	facts.json.some((f) => f.id === factId && f.status === "approved"),
);
const sx = await signIn(u("a"));
facts = await http("GET", "/scs/facts", { cookie: sx.cookie });
check(
	"profile persists after signing out and back in",
	facts.json.some((f) => f.id === factId && f.status === "approved"),
	JSON.stringify(facts),
);
const history = await http("GET", `/scs/chat/threads/${threadId}`, { cookie: sx.cookie });
check(
	"chat history persists after sign-in",
	history.status === 200 && history.json.length === 4,
	JSON.stringify(history.json?.length),
);
r = await http("POST", "/scs/chat/send", {
	cookie: A.cookie,
	body: { threadId, message: "What do you know about me?" },
});
const seen2 = await (await fetch("http://localhost:4010/__seen")).json();
check(
	"approved facts are sent to Gemini as profile context",
	/Organized Tech Week/.test(seen2.at(-1)?.system ?? ""),
	seen2.at(-1)?.system?.slice(-300),
);

// ---------- 5. LinkedIn Studio from the shared profile ----------
r = await http("POST", "/scs/linkedin/generate", { cookie: B.cookie, body: { section: "headline" } });
check(
	"LinkedIn generation with no approved facts is refused & NOT charged",
	r.status === 412 || r.status === 400 || /facts/i.test(JSON.stringify(r.json)),
	JSON.stringify(r),
);
check("…and used no quota", Number(psql(`select count(*) from scs_ai_usage where user_id='${B.id}'`)) === 0);
r = await http("POST", "/scs/linkedin/generate", { cookie: A.cookie, body: { section: "headline" } });
check(
	"LinkedIn headline suggestions are generated from approved facts, with provenance",
	r.status === 200 &&
		r.json.suggestions.length >= 1 &&
		r.json.suggestions[0].basedOn[0] === "Organized Tech Week at university",
	JSON.stringify(r.json),
);
r = await http("PUT", "/scs/linkedin/drafts/headline", {
	cookie: A.cookie,
	body: { section: "headline", content: "CS student | Tech Week organizer" },
});
const drafts = await http("GET", "/scs/linkedin/drafts", { cookie: A.cookie });
check(
	"accepted LinkedIn draft is saved",
	drafts.json?.headline?.content === "CS student | Tech Week organizer",
	JSON.stringify(drafts),
);

// ---------- 6. Quotas ----------
let st = await http("GET", "/scs/usage", { cookie: A.cookie });
check(
	"usage counts chat+linkedin together (4 used so far: 3 chat + 1 linkedin)",
	st.json.chat.used === 4 && st.json.chat.limit === 10,
	JSON.stringify(st.json),
);
r = await http("POST", "/scs/chat/send", { cookie: A.cookie, body: { threadId, message: "FAIL429 please" } });
check(
	"Gemini 429 -> friendly 503, not a crash",
	r.status === 503 && /Nothing was used/.test(JSON.stringify(r.json)),
	JSON.stringify(r),
);
r = await http("POST", "/scs/chat/send", { cookie: A.cookie, body: { threadId, message: "FAIL500 please" } });
r = await http("POST", "/scs/chat/send", { cookie: A.cookie, body: { threadId, message: "GARBAGE please" } });
st = await http("GET", "/scs/usage", { cookie: A.cookie });
check("failed AI calls are refunded (still 4 used)", st.json.chat.used === 4, JSON.stringify(st.json));
// 15 parallel sends from one user with 7 left: exactly 7 may pass.
const burst = await Promise.all(
	Array.from({ length: 15 }, (_, i) =>
		http("POST", "/scs/chat/send", { cookie: A.cookie, body: { threadId, message: `burst ${i}` } }),
	),
);
const ok = burst.filter((x) => x.status === 200).length;
const limited = burst.filter((x) => x.status === 429).length;
check(
	"race: 15 parallel chats with 6 left -> exactly 7 succeed, 8 are 429",
	ok === 6 && limited === 9,
	`ok=${ok} limited=${limited}`,
);
r = await http("POST", "/scs/chat/send", { cookie: A.cookie, body: { threadId, message: "one more" } });
check(
	"11th message of the day -> 429 with limit/reset info",
	r.status === 429 && r.json?.data?.limit === 10 && r.json?.data?.resetsAt,
	JSON.stringify(r),
);
check(
	"DB ledger never exceeds 10 counted rows today for A",
	Number(psql(`select count(*) from scs_ai_usage where user_id='${A.id}' and status<>'error'`)) === 10,
);

// ---------- 7. Uploads (3 per user) ----------
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF").toString("base64");
const up = (body, c = B.cookie) => http("POST", "/scs/chat/analyze", { cookie: c, body });
r = await up({ filename: "x.exe", mimeType: "application/x-msdownload", dataBase64: pdf });
check("upload: disallowed type refused", r.status === 400);
r = await up({
	filename: "fake.pdf",
	mimeType: "application/pdf",
	dataBase64: Buffer.from("MZ not a pdf").toString("base64"),
});
check("upload: content must match declared type", r.status === 400, JSON.stringify(r));
r = await up({
	filename: "big.pdf",
	mimeType: "application/pdf",
	dataBase64: Buffer.alloc(5 * 1024 * 1024, 65).toString("base64"),
});
check("upload: oversize refused", r.status === 400, JSON.stringify(r).slice(0, 200));
check(
	"rejected uploads used no quota",
	Number(psql(`select count(*) from scs_ai_usage where user_id='${B.id}' and kind='upload'`)) === 0,
);
const ups = [];
for (let i = 0; i < 4; i++) ups.push(await up({ filename: "cv.pdf", mimeType: "application/pdf", dataBase64: pdf }));
check(
	"uploads 1-3 succeed and propose facts",
	ups.slice(0, 3).every((x) => x.status === 200 && x.json.proposedFacts),
	JSON.stringify(ups.map((x) => x.status)),
);
check(
	"4th upload is refused (limit 3)",
	ups[3].status === 429 && /3/.test(JSON.stringify(ups[3].json)),
	JSON.stringify(ups[3]),
);
check(
	"upload bytes are never stored (no column holds them)",
	Number(psql(`select count(*) from scs_chat_message where content like '%PDF-1.4%'`)) === 0,
);

// ---------- 8. Privacy between students ----------
const resA = await http("POST", "/resumes", {
	cookie: A.cookie,
	body: { name: "A Secret Résumé", slug: `a-secret-${run}`, tags: [], withSampleData: true },
});
const resumeId = resA.json?.id ?? resA.json;
check("A can create a résumé", resA.status === 200 && typeof resumeId === "string", JSON.stringify(resA));
check("A can read own résumé", (await http("GET", `/resumes/${resumeId}`, { cookie: A.cookie })).status === 200);
check(
	"B CANNOT read A's résumé",
	[403, 404].includes((await http("GET", `/resumes/${resumeId}`, { cookie: B.cookie })).status),
);
check(
	"B's résumé list does not include A's",
	!JSON.stringify((await http("GET", "/resumes", { cookie: B.cookie })).json).includes("A Secret"),
);
check("anonymous cannot read A's résumé", [401, 403, 404].includes((await http("GET", `/resumes/${resumeId}`)).status));
check(
	"B CANNOT read A's chat thread",
	(await http("GET", `/scs/chat/threads/${threadId}`, { cookie: B.cookie })).status === 404,
);
check(
	"B CANNOT approve/reject/edit/delete A's fact",
	(
		await Promise.all([
			http("POST", `/scs/facts/${factId}/approve`, { cookie: B.cookie }),
			http("POST", `/scs/facts/${factId}/reject`, { cookie: B.cookie }),
			http("PUT", `/scs/facts/${factId}`, { cookie: B.cookie, body: { id: factId, text: "hacked fact" } }),
			http("DELETE", `/scs/facts/${factId}`, { cookie: B.cookie }),
		])
	).every((x) => x.status === 404),
);
check(
	"B CANNOT send into A's thread",
	(await http("POST", "/scs/chat/send", { cookie: B.cookie, body: { threadId, message: "hi" } })).status === 404,
);
check(
	"B CANNOT delete A's thread",
	(await http("DELETE", `/scs/chat/threads/${threadId}`, { cookie: B.cookie })).status === 404,
);
check(
	"B's facts list does not contain A's facts",
	!JSON.stringify((await http("GET", "/scs/facts", { cookie: B.cookie })).json).includes("Tech Week"),
);
check(
	"A's fact was not modified by B's attempts",
	JSON.parse(psql(`select row_to_json(t) from (select text,status from scs_career_fact where id='${factId}') t`))
		.text === "Organized Tech Week at university",
);
check(
	"unauthenticated AI/profile endpoints are refused",
	[
		(await http("GET", "/scs/facts")).status,
		(await http("POST", "/scs/chat/send", { body: { message: "x" } })).status,
	].every((s) => s === 401),
);
check(
	"admin endpoints refuse non-admins (B, D)",
	(await Promise.all([B, D].map((x) => http("GET", "/scs/admin/users", { cookie: x.cookie })))).every(
		(x) => x.status === 403,
	),
);

// ---------- 9. Import facts from résumé (no AI, no quota) ----------
r = await http("POST", "/scs/facts/import-resumes", { cookie: A.cookie, body: {} });
check(
	"résumé -> proposed profile facts (no quota used)",
	r.status === 200 &&
		r.json.proposed.length > 0 &&
		r.json.proposed.every((f) => f.status === "proposed" && f.source === "resume"),
	JSON.stringify(r).slice(0, 300),
);

// ---------- 10. Feedback + admin dashboard ----------
r = await http("POST", "/scs/feedback", {
	cookie: A.cookie,
	body: { rating: 4, category: "idea", message: "Please add dark mode", page: "/dashboard" },
});
check("feedback saved", r.status === 200 || r.status === 204, JSON.stringify(r));
const adm = await (async () => {
	const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: "http://localhost:3000" },
		body: JSON.stringify({ email: adminEmail, password: "Sup3rSecret!pass" }),
	});
	return { cookie: (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ") };
})();
const stats = await http("GET", "/scs/admin/stats", { cookie: adm.cookie });
check(
	"admin sees stats (users, résumés, AI, errors, feedback)",
	stats.status === 200 &&
		stats.json.registeredUsers === 3 &&
		stats.json.allAccounts === 4 &&
		stats.json.totalResumes >= 1 &&
		stats.json.aiTotal >= 10 &&
		stats.json.aiErrors24h >= 3 &&
		stats.json.feedbackCount >= 1,
	JSON.stringify(stats.json),
);
const users = await http("GET", "/scs/admin/users", { cookie: adm.cookie });
check(
	"admin user list has no résumé/chat content",
	users.status === 200 &&
		!JSON.stringify(users.json).includes("Tech Week") &&
		!JSON.stringify(users.json).includes("A Secret"),
);
const errs = await http("GET", "/scs/admin/errors", { cookie: adm.cookie });
check(
	"admin sees AI errors with reason codes, no content",
	errs.status === 200 &&
		errs.json.some((e) => e.reason === "gemini_429_quota") &&
		!JSON.stringify(errs.json).includes("please"),
	JSON.stringify(errs.json).slice(0, 300),
);
check(
	"admin sees feedback",
	(await http("GET", "/scs/admin/feedback", { cookie: adm.cookie })).json?.[0]?.message === "Please add dark mode",
);

// ---------- 11. Export, account deletion, seat freed ----------
const exp = await http("GET", "/scs/export", { cookie: A.cookie });
check(
	"data export contains the student's own data",
	exp.status === 200 &&
		exp.json.careerProfile.length > 0 &&
		exp.json.chatMessages.length > 0 &&
		exp.json.resumes.length === 1,
);
const beforeSeats = (await http("GET", "/scs/beta")).json.seatsLeft;
const fresh = await signIn(u("a"));
r = await http("DELETE", "/auth/account", { cookie: fresh.cookie });
check("account deletion succeeds", r.status === 200 || r.status === 204, JSON.stringify(r));
const left = [
	"scs_career_fact",
	"scs_chat_thread",
	"scs_chat_message",
	"scs_ai_usage",
	"scs_feedback",
	"scs_linkedin_draft",
	"scs_user_state",
	"scs_beta_seat",
].map((t) => [t, Number(psql(`select count(*) from ${t} where user_id='${A.id}'`))]);
check(
	"ALL of A's beta data is gone after deletion",
	left.every(([, n]) => n === 0),
	JSON.stringify(left),
);
check("A's résumé is gone", Number(psql(`select count(*) from resume where user_id='${A.id}'`)) === 0);
check("A can no longer sign in", (await signIn(u("a"))).status !== 200);
check("deleting A freed a seat", (await http("GET", "/scs/beta")).json.seatsLeft === beforeSeats + 1);
const late = await signUp(u("late"));
check("a new student can take the freed seat", late.status === 200, JSON.stringify(late.json));

console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (fail.length) {
	console.log("FAILED:", fail);
	process.exit(1);
}
