export function PrivacyNotice() {
	return (
		<article className="mx-auto grid max-w-2xl gap-5 px-4 py-10 text-sm leading-6 text-ink-2">
			<header>
				<h1 className="text-3xl font-semibold text-ink">Founding beta privacy notice</h1>
				<p className="mt-1 text-ink-3">
					Student Career Studio is a free beta for a small group of students. This is how your information is handled.
				</p>
			</header>
			<section>
				<h2 className="text-lg font-semibold text-ink">Your résumé is private</h2>
				<p>
					Every résumé, career profile item, chat and draft belongs to your account. Other students cannot see or open
					it, and the server checks ownership on every request. A résumé is only visible to others if you publish a link
					to it yourself.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">What we store</h2>
				<ul className="list-disc ps-5">
					<li>Your name, email and a hashed password.</li>
					<li>Your résumés, the career profile items you approved, your AI chat history and your LinkedIn drafts.</li>
					<li>Counts of AI requests (no content) so we can apply limits and fix errors.</li>
					<li>Feedback you send us.</li>
				</ul>
				<p>
					Uploaded documents and images are read once to extract facts and then discarded. We do not store the file.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">AI processing by Google Gemini</h2>
				<p>
					When you use the AI coach, LinkedIn suggestions or a document analysis, the text you send, the profile items
					you approved, and any file you upload are sent to Google's Gemini API to produce the answer. Do not share
					anything you would not want processed there (national IDs, health details, passwords). You must accept this
					notice before any AI feature works, and you can withdraw consent in Settings. Google's terms for the Gemini
					API apply to that processing; on the free tier Google may use API content to improve its products, so please
					keep sensitive information out.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Optional: your own Gemini key for the coach</h2>
				<p>
					In Settings → Privacy you can paste your own Google Gemini key. The coach, LinkedIn suggestions and document
					reading then run on your key, with no daily limit from us, and your messages are processed under your Google
					account's terms instead of ours. We store the key encrypted, never show it again, never include it in your
					download, and delete it when you remove it or delete your account.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Optional editor AI (your own key)</h2>
				<p>
					The résumé editor has optional "Assistant" and "Improve" buttons that only work if you connect an AI provider
					with your own API key. Those requests go from our server to the provider you choose, under that provider's
					terms, and are not part of our Gemini coach or its limits. Skip them if you are unsure.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Who can see what</h2>
				<p>
					The beta team can see your name, email, sign-up date and usage counts to run the beta. The team does not
					browse your résumés or chats. If you send feedback, the team reads it.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Your controls</h2>
				<ul className="list-disc ps-5">
					<li>
						<strong>Download my data</strong> in Settings gives you everything we hold as a file.
					</li>
					<li>
						<strong>Delete my account</strong> in Settings permanently erases your account, résumés, profile, chats and
						drafts, and frees your seat.
					</li>
					<li>You can remove any profile item or conversation at any time.</li>
				</ul>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Limits of a beta</h2>
				<p>
					This is early software run by a small team. Keep a copy of important résumés (use the PDF or JSON export).
					Features, limits and availability may change, and the beta may end with notice by email.
				</p>
			</section>
			<p className="text-ink-3">
				Student Career Studio is built on Reactive Resume (MIT licence) and is not affiliated with its authors.
			</p>
		</article>
	);
}
