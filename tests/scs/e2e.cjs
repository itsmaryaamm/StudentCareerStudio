// Browser end-to-end test of the five beta workflows, through the real UI.
// Requires: server on :3001, stand-in Gemini on :4010, Postgres, playwright.
const { chromium } = require("playwright");
const fs = require("node:fs");
const BASE = process.env.BASE || "http://localhost:3001";
const SHOTS = process.env.SHOTS || "/tmp/claude-0/e2e";
const stamp = Date.now().toString(36);
const EMAIL = `student${stamp}@example.com`;
const PASSWORD = "Sup3rSecret!pass";
const NAME = "Layla Hassan";
const results = [];
const check = (name, ok, extra = "") => {
	results.push([name, !!ok]);
	console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + extra}`);
	return !!ok;
};

(async () => {
	const browser = await chromium.launch();
	const ctx = await browser.newContext({
		viewport: { width: 1280, height: 860 },
		acceptDownloads: true,
		permissions: ["clipboard-read", "clipboard-write"],
	});
	const page = await ctx.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));
	page.on("console", (m) => {
		if (m.type() === "error" && !/favicon|Failed to load resource.*(40[134]|429|503)/.test(m.text()))
			errors.push("console: " + m.text().slice(0, 200));
	});
	const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });

	// ===== Workflow 1: sign up -> save account -> sign back in =====
	await page.goto(`${BASE}/`);
	await page.waitForURL(/\/auth\/login/);
	check("W1 landing redirects a visitor to sign-in", true);
	await page.goto(`${BASE}/auth/register`);
	await page.getByLabel("Name", { exact: true }).fill(NAME);
	await page.getByLabel("Email address").fill(EMAIL);
	await page.locator('input[type="password"]').first().fill(PASSWORD);
	check(
		"W1 sign-up needs no invite code and offers an optional friend code",
		await page.getByLabel("Friend's code (optional)").isVisible(),
	);
	await page.getByRole("button", { name: "Create account" }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
	check("W1 sign-up lands on the dashboard", true);
	// First sign-in is a chat-only onboarding: name -> stage -> what they have -> contact -> guided steps -> dashboard.
	await page.getByText("Hi, I'm your career coach.").waitFor();
	check(
		"W1 first sign-in shows only the coach chat (no navigation)",
		(await page.getByRole("link", { name: "Documents" }).count()) === 0,
	);
	await page.getByLabel("Your name").fill("Layla");
	await page.getByRole("button", { name: "Send", exact: true }).click();
	await page.getByText("Where are you at right now").waitFor();
	await page.getByRole("button", { name: "Looking for a co-op" }).click();
	await page.getByText("Do you already have any of these?").waitFor();
	check(
		"W1 the coach asks what they already have (résumé / LinkedIn / portfolio)",
		await page.getByRole("button", { name: "A LinkedIn profile" }).isVisible(),
	);
	await page.getByRole("button", { name: "A résumé" }).click();
	await page.getByRole("button", { name: "Continue" }).click();
	await page.getByText("contact details").waitFor();
	await page.getByLabel("Phone").fill("555-0100");
	await page.getByRole("button", { name: "Continue" }).click();
	await page.getByText("Let's start with your résumé").waitFor();
	check("W1 the coach starts with the document they have", true);
	await page.getByRole("button", { name: "Skip this", exact: true }).click();
	await page.getByRole("button", { name: "Go to my dashboard" }).click();
	await page.getByText("Welcome, Layla").waitFor();
	check(
		"W1 after the chat they reach the dashboard with the coach on the side",
		await page.getByRole("complementary", { name: "Career coach" }).isVisible(),
	);
	await shot("w1-onboarding");
	// sign out via settings, then sign back in
	await ctx.clearCookies();
	await page.goto(`${BASE}/dashboard`);
	await page.waitForURL(/\/auth\/login/);
	await page
		.getByLabel(/Email|Username/i)
		.first()
		.fill(EMAIL);
	await page.locator('input[type="password"]').first().fill(PASSWORD);
	await page.getByRole("button", { name: /^Sign in$/ }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
	check("W1 signing back in works and shows the dashboard", true);
	await shot("w1-signed-back-in");

	// ===== Workflow 2: chat with Gemini -> approve career facts -> see saved profile =====
	await page.getByRole("link", { name: "Career Coach" }).first().click();
	await page.getByText("Before you use the AI coach").waitFor();
	check("W2 the Gemini data notice is shown before any AI use", true);
	await shot("w2-consent");
	await page.getByRole("button", { name: /I understand/ }).click();
	const box = page.getByLabel("Message to your career coach");
	await box.waitFor();
	await box.fill("I organized a university event called Tech Week.");
	await page.getByRole("button", { name: "Send", exact: true }).click();
	await page.getByText("What were you personally responsible for").first().waitFor({ timeout: 15000 });
	check("W2 the coach replies in the conversation", true);
	await page.getByText("Verify before saving").first().waitFor();
	check(
		"W2 a proposed fact appears for verification (not yet saved)",
		await page.getByText("Organized Tech Week at university").first().isVisible(),
	);
	await shot("w2-proposed");
	await box.fill("I was in charge of the speakers.");
	await page.getByRole("button", { name: "Send", exact: true }).click();
	await page
		.getByText(/Earlier you said/)
		.first()
		.waitFor({ timeout: 15000 });
	check("W2 the coach remembers earlier turns of the conversation", true);
	check(
		"W2 the daily allowance counter went down",
		await page.getByText("5 of 7 messages left today").first().isVisible(),
	);
	await page.getByRole("button", { name: "Save to profile" }).first().click();
	await page.getByText("Verified", { exact: true }).first().waitFor();
	check("W2 approving saves the fact to the profile as Verified", true);
	await page.reload();
	await page.getByText("Organized Tech Week at university").first().waitFor();
	check(
		"W2 the saved profile survives a page reload",
		await page.getByText("Verified", { exact: true }).first().isVisible(),
	);
	await shot("w2-profile");
	// document analysis
	fs.writeFileSync("/tmp/claude-0/sample.pdf", "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
	await page.locator("#chat-file").setInputFiles("/tmp/claude-0/sample.pdf");
	await page
		.getByText(/A résumé for a computer science student/)
		.first()
		.waitFor({ timeout: 15000 });
	check(
		"W2 uploading a PDF returns a summary and proposes facts to review",
		await page.getByText("B.Sc. Computer Science, expected May 2027").first().isVisible(),
	);
	await shot("w2-upload");

	// Missions can be attached to the chat; sending them starts the mission with the coach's opener and no AI call.
	await page.goto(`${BASE}/dashboard/chat`);
	const usedBefore = (await page.evaluate(() => fetch("/api/openapi/scs/usage").then((r) => r.json()))).chat.used;
	await page.getByRole("button", { name: "Discover Me" }).first().click();
	check(
		"W2 clicking a mission chip attaches it to the message box",
		await page.getByRole("button", { name: "Remove Discover Me" }).isVisible(),
	);
	await page.getByRole("button", { name: "Send", exact: true }).click();
	await page.getByText(/Starting Discover Me/).waitFor();
	check(
		"W2 sending a mission starts it with the coach's opener and a link to the workbook",
		await page.getByRole("link", { name: "Open the Discover Me workbook" }).isVisible(),
	);
	check(
		"W2 starting a mission used none of the daily messages",
		(await page.evaluate(() => fetch("/api/openapi/scs/usage").then((r) => r.json()))).chat.used === usedBefore,
	);

	// ===== Workflow 3: create résumé -> edit -> download a real PDF =====
	await page.goto(`${BASE}/dashboard/documents`);
	await page.getByRole("button", { name: "Start blank" }).click();
	await page.waitForURL(/\/builder\//, { timeout: 20000 });
	check("W3 creating a résumé opens the editor", true);
	await page.getByRole("button", { name: "Education", exact: true }).click();
	await page.getByLabel("School").fill("King Saud University");
	await page.getByLabel("Degree").fill("B.Sc.");
	await page.getByLabel("Area of study").fill("Computer Science");
	await page.getByText(/Saved/).first().waitFor({ timeout: 15000 });
	await page.waitForTimeout(1800); // autosave debounce
	check("W3 the editor confirms autosave ('Saved')", await page.getByText(/Saved/).first().isVisible());
	await shot("w3-editor");
	await page.reload();
	await page.getByRole("button", { name: "Education", exact: true }).click();
	check(
		"W3 edits persisted: reloading the editor keeps the school",
		(await page
			.getByLabel("School")
			.inputValue()
			.catch(() => "")) === "King Saud University" ||
			(await page.getByText("King Saud University").first().isVisible()),
	);
	const [download] = await Promise.all([
		page.waitForEvent("download", { timeout: 60000 }),
		page
			.getByRole("button", { name: /Download PDF/ })
			.first()
			.click(),
	]);
	const pdfPath = "/tmp/claude-0/e2e/resume.pdf";
	await download.saveAs(pdfPath);
	const pdf = fs.readFileSync(pdfPath);
	check(
		"W3 the download is a real PDF (%PDF header, > 5 KB)",
		pdf.subarray(0, 5).toString() === "%PDF-" && pdf.length > 5000,
		`${pdf.length} bytes`,
	);
	const text = require("node:child_process").execFileSync("pdftotext", [pdfPath, "-"]).toString();
	check(
		"W3 the PDF contains the edited content and the student's name",
		/King Saud University/.test(text) && /Layla Hassan/.test(text),
		text.slice(0, 200),
	);
	check("W3 the PDF is named sensibly", /\.pdf$/i.test(download.suggestedFilename()), download.suggestedFilename());

	// ===== Workflow 4: résumé -> profile -> LinkedIn Studio -> improve and copy =====
	await page.goto(`${BASE}/dashboard`);
	await page.getByRole("button", { name: "Add from my résumés" }).click();
	await page
		.getByText(/Found \d+ items? in your résumés/)
		.first()
		.waitFor({ timeout: 15000 });
	check(
		"W4 'Add from my résumés' proposes profile facts from the résumé",
		await page
			.getByText(/King Saud University/)
			.first()
			.isVisible(),
	);
	await page.getByRole("button", { name: "Save to profile" }).first().click();
	await page.waitForTimeout(800);

	await page.goto(`${BASE}/dashboard/linkedin`);
	await page.getByRole("heading", { name: "Start from your LinkedIn link" }).waitFor();
	await page.getByLabel("Your LinkedIn profile link").fill("https://example.com/not-linkedin");
	await page.getByRole("button", { name: "Import" }).click();
	check(
		"W4 a link that isn't a LinkedIn profile is refused with a clear message",
		await page.getByText(/doesn't look like a LinkedIn profile link/).isVisible(),
	);
	await page.getByLabel("Your LinkedIn profile link").fill("www.linkedin.com/in/layla-hassan");
	await page.getByRole("button", { name: "Import" }).click();
	await page.getByText("0 of 6 sections improved").waitFor();
	check(
		"W4 a profile link opens the studio with the six sections",
		(await page.getByRole("navigation", { name: "LinkedIn sections" }).getByRole("button").count()) === 6,
	);
	check("W4 the coach panel lists the headline checks", (await page.getByText("Say what you want next").count()) > 0);
	await page.getByRole("button", { name: /Rewrite my headline/ }).click();
	await page
		.getByText("Computer Science student building data tools people actually use")
		.first()
		.waitFor({ timeout: 15000 });
	check(
		"W4 coach suggestions appear, with 'Based on' provenance",
		await page
			.getByText(/Based on:/)
			.first()
			.isVisible(),
	);
	await shot("w4-suggestions");
	await page.getByRole("button", { name: "Use", exact: true }).first().click();
	check(
		"W4 using a suggestion puts it in the editable headline",
		(await page.locator("#li-text").inputValue()).startsWith("Computer Science student"),
	);
	await page.getByText("Saved", { exact: true }).first().waitFor({ timeout: 10000 });
	check("W4 the draft autosaves with a visible confirmation", true);
	await page.getByRole("button", { name: "Copy to clipboard" }).click();
	const clip = await page.evaluate(() => navigator.clipboard.readText());
	check("W4 'Copy to clipboard' really copies the headline", clip.startsWith("Computer Science student"), clip);
	await page.reload();
	await page.waitForTimeout(1200);
	check(
		"W4 the saved draft and link are still there after reload",
		(await page.locator("#li-text").inputValue()).startsWith("Computer Science student") &&
			(await page.getByText("linkedin.com/in/layla-hassan").isVisible()),
	);
	await page.getByRole("button", { name: "Change link" }).click();
	check(
		"W4 'Change link' returns to the link step",
		await page.getByRole("heading", { name: "Start from your LinkedIn link" }).isVisible(),
	);
	await page.getByRole("button", { name: "Keep my current link" }).click();

	// ===== Workflow 5: Career Lab missions for ChatGPT and Claude =====
	const before = await page.evaluate(() => fetch("/api/openapi/scs/usage").then((r) => r.json()));
	await page.goto(`${BASE}/dashboard/prompts`);
	await page.waitForURL(/\/dashboard\/lab/);
	check("W5 the old Career Prompts address lands on the Career Lab", true);
	for (const name of ["Discover Me", "LinkedIn Creator", "Opportunity Scout", "Company Intelligence"])
		await page.getByRole("heading", { name }).waitFor();
	check("W5 the Career Lab shows the four missions", true);
	await page.getByRole("button", { name: "Start mission" }).first().click();
	await page.getByText("Step 1 of 5").waitFor();
	await page.getByRole("button", { name: "Let's build my mission" }).click();
	await page.getByText("Step 2 of 5").waitFor();
	check(
		"W5 the first question is filled in from the verified profile",
		await page.getByText("From your career profile").first().isVisible(),
	);
	// Walk the six questions: required ones need an answer, optional ones can be skipped.
	await page.getByRole("button", { name: "Next" }).click();
	await page.getByRole("button", { name: /Organized Tech Week/ }).waitFor();
	await page.getByRole("button", { name: "Next" }).click();
	await page.getByRole("button", { name: "Building things" }).click();
	await page.getByRole("button", { name: "Next" }).click();
	await page
		.getByRole("textbox", { name: "What kinds of tasks do you dislike or want to avoid?" })
		.fill("Cold calling");
	await page.getByRole("button", { name: "Next" }).click();
	await page.getByRole("button", { name: "Skip" }).click();
	await page.getByRole("button", { name: "Skip" }).click();
	await page.getByText("Step 3 of 5").waitFor();
	await page.getByLabel(/one result, number or moment/).fill("300 riders in a month");
	await page.getByRole("button", { name: "Generate my mission" }).click();
	await page.getByText("Your mission is ready").waitFor();
	const gpt = await page.getByLabel("Your mission prompt").inputValue();
	check(
		"W5 the prompt starts with the required header",
		gpt.startsWith("STUDENT CAREER STUDIO\nMISSION ID: DISCOVER_ME\nMISSION VERSION: 1\n\nSTART THIS MISSION NOW."),
		gpt.slice(0, 120),
	);
	check(
		"W5 the prompt carries the verified facts, the answers and the clarification",
		/Organized Tech Week/.test(gpt) &&
			/Cold calling/.test(gpt) &&
			/300 riders in a month/.test(gpt) &&
			/Building things/.test(gpt),
		gpt.slice(0, 300),
	);
	await page.getByRole("checkbox", { name: /Organized Tech Week/ }).uncheck();
	check("W5 changing what's included marks the prompt out of date", await page.getByText("out of date").isVisible());
	await page.getByRole("button", { name: "Regenerate it" }).click();
	check(
		"W5 an unticked fact is NOT in the regenerated prompt",
		!/Organized Tech Week/.test(await page.getByLabel("Your mission prompt").inputValue()),
	);
	await page.getByRole("button", { name: "Save mission" }).click();
	await page.getByText("Mission saved to My missions").waitFor();
	await page.getByRole("button", { name: "Copy prompt" }).click();
	await page.getByText("Step 5 of 5").waitFor();
	const copied = await page.evaluate(() => navigator.clipboard.readText());
	check(
		"W5 Copy prompt puts the mission on the clipboard and reaches the launch step",
		copied.startsWith("STUDENT CAREER STUDIO"),
	);
	check(
		"W5 the launch step is honest that nothing is pasted for you",
		await page.getByText("Nothing is pasted or controlled automatically").isVisible(),
	);
	await shot("w5-lab");
	await page.goto(`${BASE}/dashboard/lab`);
	await page.getByRole("heading", { name: "My missions" }).waitFor();
	await page.getByRole("button", { name: "Duplicate" }).first().waitFor();
	check(
		"W5 the saved mission is listed under My missions",
		await page.getByRole("button", { name: "Open", exact: true }).first().isVisible(),
	);
	await page.getByRole("button", { name: "Duplicate" }).first().click();
	await page.getByText("Discover Me (copy)").waitFor();
	check("W5 a saved mission can be duplicated", true);
	await page.getByRole("button", { name: "Delete" }).first().click();
	await page.waitForTimeout(800);
	check(
		"W5 a saved mission can be deleted",
		(await page.getByText("Discover Me (copy)").count()) +
			(await page.getByText("Discover Me", { exact: true }).count()) <=
			2,
	);
	const after = await page.evaluate(() => fetch("/api/openapi/scs/usage").then((r) => r.json()));
	check(
		"W5 building missions used none of the AI allowance",
		before.chat.used === after.chat.used && before.upload.used === after.upload.used,
		JSON.stringify([before.chat, after.chat]),
	);

	// ===== Extra: feedback, data export, account deletion (UI) =====
	await page.goto(`${BASE}/dashboard`);
	await page.getByRole("button", { name: "Send feedback" }).first().click();
	await page.getByRole("radio", { name: "5 out of 5" }).click();
	await page.getByLabel("Your message").fill("The coach felt natural. Please add Arabic.");
	await page.getByRole("button", { name: "Send", exact: true }).click();
	await page
		.getByText(/Thanks, feedback sent/)
		.first()
		.waitFor({ timeout: 10000 });
	check("X1 feedback can be sent from the app shell", true);
	await page.goto(`${BASE}/dashboard/settings/privacy`);
	const [exp] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Download my data" }).click(),
	]);
	const data = JSON.parse(fs.readFileSync(await exp.path(), "utf8"));
	check(
		"X2 'Download my data' returns profile, chats, résumés and feedback",
		data.careerProfile.length >= 2 &&
			data.chatMessages.length >= 4 &&
			data.resumes.length === 1 &&
			data.feedback.length === 1,
		JSON.stringify(Object.keys(data)),
	);
	await page.goto(`${BASE}/dashboard/settings/account`);
	await page
		.getByRole("button", { name: /Delete (my )?account/i })
		.first()
		.click();
	await page.getByRole("textbox").last().fill("delete");
	await page
		.getByRole("button", { name: /Delete (my )?account|Delete forever|Delete/ })
		.last()
		.click();
	await page.waitForURL((u) => !/dashboard/.test(u.pathname), { timeout: 20000 });
	check("X3 deleting the account in the UI signs the student out", true);
	const signin = await page.evaluate(
		async ({ email, password }) =>
			(
				await fetch("/api/auth/sign-in/email", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ email, password }),
				})
			).status,
		{ email: EMAIL, password: PASSWORD },
	);
	check("X3 the deleted account can no longer sign in", signin !== 200, String(signin));
	console.log("\nCONSOLE/PAGE ERRORS:", errors.length ? errors : "none");
	const failed = results.filter(([, ok]) => !ok);
	console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
	await browser.close();
	process.exit(failed.length ? 1 : 0);
})().catch((e) => {
	console.error("E2E CRASH:", e.message.split("\n").slice(0, 6).join("\n"));
	process.exit(2);
});
