// Cross-user access sweep. Run against a local server (see tests/scs/api.test.mjs header for the env).
//   node tests/scs/idor-sweep.mjs
// Student B creates data. Then, for every API route that needs sign-in, student A (a different account) and a visitor with
// no sign-in try it using B's ids. Any route that answers a visitor with data, or lets A read or change B's things, is
// reported. Routes that are public on purpose are listed in PUBLIC below.
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3001";
const API = `${BASE}/api/openapi`;
const OUT = process.env.OUT ?? "/tmp/idor-report.json";
const stamp = Date.now().toString(36);

// Public by design: published résumés, signed links, counters, the sign-in provider list.
const PUBLIC = [
	/^\/resumes\/\{username\}\/\{slug\}/,
	/^\/feedback\/\{token\}/,
	/^\/statistics/,
	/^\/flags$/,
	/^\/auth\/providers$/,
	/^\/scs\/beta$/,
	/^\/api\/health$/,
	/^\/pdf-checks$/,
	/^\/applications\/\{id\}\/documents\/\{kind\}$/,
];

const spec = await (await fetch(`${API}/spec.json`)).json();

async function signUp(tag) {
	const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: BASE },
		body: JSON.stringify({
			name: `Sweep ${tag}`,
			email: `${tag}${stamp}@example.com`,
			password: "Sup3rSecret!pass",
			username: `${tag}${stamp}`,
			displayUsername: `${tag}${stamp}`,
		}),
	});
	const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
	return { cookie, id: (await res.json()).user?.id };
}
const A = await signUp("a");
const B = await signUp("b");
if (!A.cookie || !B.cookie) throw new Error("sign-up failed");

const call = async (who, method, path, body) => {
	const res = await fetch(`${API}${path}`, {
		method,
		headers: { "content-type": "application/json", origin: BASE, ...(who?.cookie ? { cookie: who.cookie } : {}) },
		body: body === undefined || method === "GET" || method === "DELETE" ? undefined : JSON.stringify(body),
		redirect: "manual",
	});
	let json = null;
	try {
		json = await res.json();
	} catch {}
	return { status: res.status, json };
};

// ---------- a minimal body that gets past validation, built from the spec ----------
const deref = (s, depth = 0) => {
	if (!s || depth > 8) return {};
	if (s.$ref) return deref(spec.components?.schemas?.[s.$ref.split("/").pop()], depth + 1);
	return s;
};
function sample(schema, depth = 0) {
	const s = deref(schema, depth);
	if (s.enum) return s.enum[0];
	if (s.const !== undefined) return s.const;
	for (const key of ["oneOf", "anyOf"])
		if (s[key]) return sample(s[key].find((x) => x.type !== "null") ?? s[key][0], depth + 1);
	if (s.allOf) return Object.assign({}, ...s.allOf.map((x) => sample(x, depth + 1)));
	const type = Array.isArray(s.type) ? s.type.find((t) => t !== "null") : s.type;
	if (type === "string") {
		if (s.format === "email") return `x${stamp}@example.com`;
		if (s.format === "uuid") return "00000000-0000-7000-8000-000000000000";
		if (s.format === "uri" || s.format === "url") return "https://example.com";
		return "x".repeat(Math.max(s.minLength ?? 1, 1));
	}
	if (type === "integer" || type === "number") return s.minimum ?? 1;
	if (type === "boolean") return false;
	if (type === "array") return s.minItems ? Array.from({ length: s.minItems }, () => sample(s.items, depth + 1)) : [];
	if (type === "object" || s.properties) {
		const o = {};
		for (const k of s.required ?? []) o[k] = sample(s.properties?.[k], depth + 1);
		return o;
	}
	return {};
}
const bodyFor = (op) => {
	const schema = op.requestBody?.content?.["application/json"]?.schema;
	return schema ? sample(schema) : {};
};

const ops = [];
for (const [path, item] of Object.entries(spec.paths))
	for (const [method, op] of Object.entries(item))
		if (["get", "post", "put", "patch", "delete"].includes(method))
			ops.push({ method: method.toUpperCase(), path, op });
const needsAuth = (o) => !PUBLIC.some((re) => re.test(o.path));

// ---------- 1. B creates things (best effort: every create-style route with no path params) ----------
const created = [];
const harvest = (value, into) => {
	if (!value || typeof value !== "object") return;
	if (Array.isArray(value)) return value.forEach((v) => harvest(v, into));
	for (const [k, v] of Object.entries(value)) {
		if ((k === "id" || k.endsWith("Id")) && typeof v === "string" && v.length >= 8 && v.length <= 64) into.add(v);
		harvest(v, into);
	}
};
const bIds = new Set();
const firstPass = ops.filter(
	(o) =>
		o.method === "POST" &&
		!o.path.includes("{") &&
		needsAuth(o) &&
		!/\/(auth|agent|ai|ai-providers|integrations|custom-domain|files|api-keys)\b/.test(o.path),
);
for (const o of firstPass) {
	const r = await call(B, o.method, o.path, bodyFor(o.op));
	if (r.status < 300) {
		created.push(`${o.method} ${o.path}`);
		harvest(r.json, bIds);
		if (typeof r.json === "string") bIds.add(r.json);
	}
}
// plus every list/read route with no params, as B
for (const o of ops.filter((x) => x.method === "GET" && !x.path.includes("{") && needsAuth(x))) {
	const r = await call(B, "GET", o.path);
	if (r.status === 200) harvest(r.json, bIds);
}
// second round: creates that need an id that now exists (children of B's résumés/applications/...)
for (const o of ops
	.filter(
		(x) =>
			x.method === "POST" &&
			x.path.includes("{") &&
			needsAuth(x) &&
			!/\/(auth|agent|ai|ai-providers|integrations|custom-domain|files|statistics)\b/.test(x.path),
	)
	.slice(0, 80)) {
	const params = [...o.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
	const id = [...bIds][0];
	if (!id || params.length !== 1) continue;
	const r = await call(B, o.method, o.path.replace(`{${params[0]}}`, encodeURIComponent(id)), bodyFor(o.op));
	if (r.status < 300) {
		created.push(`${o.method} ${o.path}`);
		harvest(r.json, bIds);
	}
}
const ids = [...bIds].filter((v) => !/^(en|ar|x+)$/.test(v));
console.log(`B created via ${created.length} routes and owns ${ids.length} distinct ids`);

// ---------- 2. snapshot of B's data (all param-less GETs) so we can see if A changed anything ----------
const snapshot = async () => {
	const out = {};
	for (const o of ops.filter((x) => x.method === "GET" && !x.path.includes("{") && needsAuth(x)))
		out[o.path] = JSON.stringify((await call(B, "GET", o.path)).json);
	return out;
};
const before = await snapshot();

// ---------- 3. the sweep ----------
const findings = [];
const inconclusive = [];
// Coverage: for each route that takes an id, did the OWNER (B) get through with at least one of the ids? If not, the
// sweep proved nothing about that route (nothing of that kind exists), and it is listed as uncovered.
const covered = new Set();
const uncovered = [];
for (const o of ops.filter((x) => x.method === "GET" && x.path.includes("{") && needsAuth(x))) {
	let ok = false;
	for (const id of ids.slice(0, 25)) {
		const r = await call(
			B,
			"GET",
			o.path.replace(/\{(\w+)\}/g, () => encodeURIComponent(id)),
		);
		if (r.status === 200) {
			ok = true;
			break;
		}
	}
	if (ok) covered.add(o.path);
	else uncovered.push(`GET ${o.path}`);
}
let tried = 0;
const fill = (path, id) => path.replace(/\{(\w+)\}/g, () => encodeURIComponent(id));
for (const o of ops.filter(needsAuth)) {
	const hasParams = o.path.includes("{");
	const candidates = hasParams ? ids.slice(0, 25) : [null];
	// (a) a visitor with no sign-in must be refused outright
	const bare = await call(
		null,
		o.method,
		hasParams ? fill(o.path, ids[0] ?? "x") : o.path,
		o.method === "GET" || o.method === "DELETE" ? undefined : bodyFor(o.op),
	);
	if (bare.status < 400 && !/\/(auth)\b/.test(o.path))
		findings.push({ kind: "visitor-allowed", route: `${o.method} ${o.path}`, status: bare.status });
	if (!hasParams && o.method === "GET") continue; // A's own lists show A's own data: checked via the snapshot below
	for (const id of candidates) {
		tried++;
		const path = hasParams ? fill(o.path, id) : o.path;
		const r = await call(A, o.method, path, o.method === "GET" || o.method === "DELETE" ? undefined : bodyFor(o.op));
		if (r.status < 300 && hasParams) {
			// A 2xx using B's id. Reads: does the body contain B's data? Writes: it changed something.
			const text = JSON.stringify(r.json ?? "");
			const holdsB = ids.some((x) => text.includes(x)) || text.includes(B.id ?? "~");
			findings.push({
				kind: o.method === "GET" ? (holdsB ? "A-read-B-data" : "A-got-200-no-B-data") : "A-write-accepted",
				route: `${o.method} ${o.path}`,
				id,
				status: r.status,
			});
			break;
		}
		if (r.status === 400 || r.status === 422) inconclusive.push(`${o.method} ${o.path}`);
	}
}

// A's own param-less GETs must not contain any of B's ids.
for (const o of ops.filter((x) => x.method === "GET" && !x.path.includes("{") && needsAuth(x))) {
	const r = await call(A, "GET", o.path);
	if (r.status === 200) {
		const text = JSON.stringify(r.json ?? "");
		const leaked = ids.filter((x) => text.includes(x));
		if (leaked.length)
			findings.push({ kind: "A-list-contains-B-id", route: `GET ${o.path}`, leaked: leaked.slice(0, 3) });
	}
}

const after = await snapshot();
const changed = Object.keys(before).filter((k) => before[k] !== after[k]);
for (const k of changed) findings.push({ kind: "B-data-changed-during-sweep", route: `GET ${k}` });

const report = {
	coveredReadRoutes: covered.size,
	uncoveredReadRoutes: uncovered.length,
	operations: ops.length,
	authRoutes: ops.filter(needsAuth).length,
	bIds: ids.length,
	attempts: tried,
	findings,
	inconclusive: new Set(inconclusive).size,
};
writeFileSync(OUT, JSON.stringify({ ...report, uncovered, inconclusiveRoutes: [...new Set(inconclusive)] }, null, 1));
console.log(JSON.stringify(report, null, 1));
for (const f of findings) console.log("FINDING", JSON.stringify(f));
process.exit(findings.some((f) => f.kind !== "A-got-200-no-B-data") ? 1 : 0);
