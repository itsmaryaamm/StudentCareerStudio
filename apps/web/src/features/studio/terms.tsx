export function TermsOfUse() {
	return (
		<article className="mx-auto grid max-w-2xl gap-5 px-4 py-10 text-sm leading-6 text-ink-2">
			<header>
				<h1 className="text-3xl font-semibold text-ink">Terms of use</h1>
				<p className="mt-1 text-ink-3">Last updated 17 November 2026.</p>
			</header>
			<section>
				<h2 className="text-lg font-semibold text-ink">Who we are</h2>
				<p>
					Student Career Studio (&ldquo;we&rdquo;, &ldquo;the service&rdquo;) is a free beta run by Maryam Imran. By
					creating an account or using the service you agree to these terms and to the beta privacy notice. If you do
					not agree, please do not use it.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Who can use it</h2>
				<p>
					You must be at least 16 years old, or have a parent or guardian&rsquo;s permission if the law where you live
					requires it. One account per person. Keep your password private; you are responsible for what happens under
					your account.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">What the service is</h2>
				<p>
					A free beta tool that helps you build a résumé, improve your LinkedIn profile and get AI career suggestions.
					It is early software: features, limits and availability can change, break or end at any time, with notice by
					email where we can give it.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">AI suggestions are not advice</h2>
				<ul className="list-disc ps-5">
					<li>
						AI output can be wrong, out of date or not suited to you. Check everything before you send it to an
						employer, school or anyone else.
					</li>
					<li>Nothing here is professional, legal, immigration, financial or career-counselling advice.</li>
					<li>We do not promise you a job, an interview, a better ATS score or any other result.</li>
					<li>You are responsible for the accuracy of what you put in your résumé and profile.</li>
				</ul>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Your content</h2>
				<p>
					You keep ownership of everything you add. You give us permission to store it and to process it (including
					sending it to Google&rsquo;s AI when you use AI features) only so the service can work for you. Do not upload
					anything unlawful, anything that belongs to someone else without permission, anyone else&rsquo;s private
					details, malware, or content that is hateful, harassing or sexual.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">What you must not do</h2>
				<ul className="list-disc ps-5">
					<li>Try to break, probe or overload the service, or get around its limits.</li>
					<li>Access other people&rsquo;s accounts or data.</li>
					<li>Use automated tools to sign up, scrape or send requests in bulk.</li>
					<li>Sell, resell or share your account or friend codes for money.</li>
					<li>Use the service to deceive others, for example with false qualifications.</li>
				</ul>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Friend codes and limits</h2>
				<p>
					AI messages, uploads and seats are limited during the beta. We may change limits, remove codes or accounts
					that abuse them, and close sign-ups when the beta is full.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Ending your account</h2>
				<p>
					You can delete your account in Settings at any time, which erases your data. We may suspend or remove accounts
					that break these terms or put the service or other students at risk.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">No warranty, limited liability</h2>
				<p>
					The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, free of charge, without promises
					that it will be uninterrupted, error-free or fit for a particular purpose. To the fullest extent the law
					allows, we are not liable for lost data, lost opportunities or any indirect or consequential loss from using
					it. Keep your own copy of important résumés (PDF or JSON export). Nothing in these terms limits rights you
					have by law that cannot be limited.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Open-source software</h2>
				<p>
					Student Career Studio is built on Reactive Resume (MIT licence) and is not affiliated with its authors.
					Third-party names and logos belong to their owners.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Changes and contact</h2>
				<p>
					We may update these terms; the date above changes when we do, and continuing to use the service means you
					accept the update. Questions or requests:{" "}
					<a href="mailto:hello@maryamimran.com" className="underline">
						hello@maryamimran.com
					</a>
					.
				</p>
			</section>
			<p>
				<a href="/" className="underline">
					Back to Student Career Studio
				</a>
			</p>
		</article>
	);
}
