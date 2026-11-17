export function CookieNotice() {
	return (
		<article className="mx-auto grid max-w-2xl gap-5 px-4 py-10 text-sm leading-6 text-ink-2">
			<header>
				<h1 className="text-3xl font-semibold text-ink">Cookie notice</h1>
				<p className="mt-1 text-ink-3">Last updated 17 November 2026.</p>
			</header>
			<section>
				<h2 className="text-lg font-semibold text-ink">Short version</h2>
				<p>
					We use only the cookies and browser storage the service needs to work. No advertising cookies, no cross-site
					tracking.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">What we set</h2>
				<ul className="list-disc ps-5">
					<li>
						<strong>Session cookie</strong>: keeps you signed in. Needed for the service to work.
					</li>
					<li>
						<strong>Preference cookies</strong>: your language and theme.
					</li>
					<li>
						<strong>Security tokens</strong>: protect sign-in and forms from forgery.
					</li>
					<li>
						<strong>Local storage</strong>: remembers unsent drafts and small settings on your device.
					</li>
				</ul>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Third parties</h2>
				<p>
					If you choose &ldquo;Continue with Google&rdquo;, Google&rsquo;s sign-in script loads from Google and Google
					may set its own cookies under its policy. We do not load any other third-party scripts or trackers.
				</p>
			</section>
			<section>
				<h2 className="text-lg font-semibold text-ink">Your choices</h2>
				<p>
					You can clear cookies and storage in your browser at any time; you will be signed out. Blocking the essential
					cookies stops sign-in from working. Contact:{" "}
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
