// Stand-in for Google's Gemini API, for tests only. It is NOT Gemini: it proves our server's plumbing
// (context, quota, errors, privacy), not Gemini's answer quality. Port: 4010.
import http from "node:http";

const seen = []; // last request bodies, for assertions
const server = http.createServer(async (req, res) => {
	if (req.method === "GET" && req.url?.startsWith("/v1beta/models")) {
		// Key check used when a student saves their own key: "badkey…" is rejected, anything else accepted.
		const key = req.headers["x-goog-api-key"] ?? "";
		res.statusCode = String(key).startsWith("badkey") ? 400 : 200;
		return res.end(JSON.stringify({ models: [] }));
	}
	if (req.url === "/__seen") return res.end(JSON.stringify(seen.slice(-20)));
	let body = "";
	for await (const c of req) body += c;
	const json = body ? JSON.parse(body) : {};
	const parts = (json.contents ?? []).flatMap((c) => c.parts ?? []);
	const texts = parts.filter((p) => p.text).map((p) => p.text);
	const hasFile = parts.some((p) => p.inlineData || p.fileData);
	const last = texts.at(-1) ?? "";
	seen.push({
		key: String(req.headers["x-goog-api-key"] ?? "").slice(0, 12),
		turns: (json.contents ?? []).length,
		system: JSON.stringify(json.systemInstruction ?? "").slice(0, 4000),
		last: last.slice(0, 300),
		hasFile,
	});
	const reply = (obj) => {
		res.setHeader("content-type", "application/json");
		res.end(
			JSON.stringify({
				candidates: [
					{ content: { role: "model", parts: [{ text: JSON.stringify(obj) }] }, finishReason: "STOP", index: 0 },
				],
				usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
			}),
		);
	};
	if (/FAIL429/.test(last)) {
		res.statusCode = 429;
		return res.end(JSON.stringify({ error: { code: 429, message: "quota", status: "RESOURCE_EXHAUSTED" } }));
	}
	if (/FAIL500/.test(last)) {
		res.statusCode = 500;
		return res.end(JSON.stringify({ error: { code: 500, message: "boom" } }));
	}
	if (/GARBAGE/.test(last)) {
		res.setHeader("content-type", "application/json");
		return res.end(
			JSON.stringify({
				candidates: [{ content: { role: "model", parts: [{ text: "not json" }] }, finishReason: "STOP" }],
			}),
		);
	}
	await new Promise((r) => setTimeout(r, /SLOW/.test(last) ? 400 : 20));
	if (hasFile)
		return reply({
			summary: "A résumé for a computer science student.",
			facts: [{ category: "education", text: "B.Sc. Computer Science, expected May 2027" }],
		});
	if (/<student_profile>/.test(last) && /Write:/.test(last)) {
		return reply({
			suggestions: [
				{ text: "Computer Science student building data tools people actually use", basedOn: [1] },
				{ text: "CS student | data & web | seeking 2027 internships", basedOn: [1] },
			],
		});
	}
	if (/organized/i.test(last))
		return reply({
			reply: "Nice start! What were you personally responsible for, and roughly how many people took part?",
			facts: [{ category: "experience", text: "Organized Tech Week at university" }],
		});
	const memory = texts.length > 1 ? `Earlier you said: "${texts[0].slice(0, 60)}". ` : "";
	reply({ reply: `${memory}Tell me more.`, facts: [] });
});
server.listen(4010, () => console.log("fake gemini on :4010"));
