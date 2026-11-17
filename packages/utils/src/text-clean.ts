// Cleaning for text people type into forms. React already escapes what it draws; this is the second layer, so that what we
// STORE (and later put in emails, exports, prompts or other pages) carries no markup, hidden characters or script links.

// Control characters (except tab and newline), zero-width and direction-override characters that can hide or reorder text.
// oxlint-disable-next-line no-control-regex -- removing control characters is the point
const HIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g;
// Tags and the start of tags: "<b>", "</p>", "<script", "<!--", "<?xml".
const TAGS = /<\/?[a-zA-Z!?][^>]*>?/g;

/** Free text that may be long and multi-line (a chat message, a pasted résumé): hidden characters out, nothing else. */
export function cleanText(value: string): string {
	return value.normalize("NFC").replace(HIDDEN, "").replace(/\r\n?/g, "\n");
}

// Any "<" or ">" left after the tags are gone ("GPA > 3.5") becomes its full-width twin, which reads the same but can never
// open or close a tag.
const defang = (value: string) => value.replace(/</g, "\uFF1C").replace(/>/g, "\uFF1E");

/** A short, single-line field (a name, a fact, a title): also drops tags, and folds line breaks and runs of spaces. */
export function cleanLine(value: string): string {
	return defang(cleanText(value).replace(TAGS, "")).replace(/\s+/g, " ").trim();
}

/** Plain multi-line text without markup (feedback, a pasted About section): keeps line breaks, drops tags. */
export function cleanPlain(value: string): string {
	return defang(cleanText(value).replace(TAGS, ""))
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/** An http(s) link, or null. Anything else (javascript:, data:, file:) is refused, as are links with a login in them. */
export function safeHttpUrl(value: string): string | null {
	const text = cleanLine(value);
	try {
		const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
		if (
			(url.protocol !== "https:" && url.protocol !== "http:") ||
			url.username ||
			url.password ||
			!url.hostname.includes(".")
		)
			return null;
		return url.toString().slice(0, 300);
	} catch {
		return null;
	}
}

/** A phone number as people write it: digits, spaces, + ( ) - . and nothing else. */
export const cleanPhone = (value: string) =>
	cleanLine(value)
		.replace(/[^\d+()\-.\s]/g, "")
		.slice(0, 40);

export const looksLikeEmail = (value: string) =>
	/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(value) && value.length <= 254;
