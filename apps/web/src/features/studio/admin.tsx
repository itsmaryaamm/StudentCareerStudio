import { ORPCError } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@reactive-resume/ui/components/badge";
import { EmptyState } from "@reactive-resume/ui/components/empty-state";
import { ErrorBlock, LoadingBlock } from "./shared";
import { orpc } from "@/libs/orpc/client";

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
	return (
		<div className="rounded-xl border border-line bg-raised p-4">
			<dt className="text-[13px] text-ink-3">{label}</dt>
			<dd className="mt-1 text-2xl font-semibold">{value}</dd>
			{sub && <p className="mt-0.5 text-xs text-ink-3">{sub}</p>}
		</div>
	);
}

export function AdminPage() {
	const stats = useQuery(orpc.scs.admin.stats.queryOptions());
	const users = useQuery(orpc.scs.admin.users.queryOptions());
	const errors = useQuery(orpc.scs.admin.errors.queryOptions());
	const feedback = useQuery(orpc.scs.admin.feedback.queryOptions());

	if (stats.error instanceof ORPCError && stats.error.code === "FORBIDDEN")
		return <EmptyState title="Admins only" description="This page is for the beta team." />;
	if (stats.isPending) return <LoadingBlock rows={4} label="Loading dashboard" />;
	if (stats.error || !stats.data) return <ErrorBlock error={stats.error} onRetry={() => void stats.refetch()} />;
	const s = stats.data;
	const today = (kind: string, status?: string) =>
		s.aiToday.filter((r) => r.kind === kind && (!status || r.status === status)).reduce((a, r) => a + r.n, 0);

	return (
		<div className="grid gap-6">
			<dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<Stat
					label="Registered students"
					value={`${s.registeredUsers}`}
					sub={`${s.seatsTaken} of ${s.maxSeats} founding seats used`}
				/>
				<Stat
					label="Completed résumés"
					value={s.completedResumes}
					sub={`${s.totalResumes} total · ${s.usersWithResume} students have one`}
				/>
				<Stat
					label="AI requests (all time)"
					value={s.aiTotal}
					sub={`Today: ${today("chat", "ok")} chat · ${today("linkedin", "ok")} LinkedIn · ${today("upload", "ok")} uploads`}
				/>
				<Stat label="AI errors (24h)" value={s.aiErrors24h} sub="Students aren't charged for these" />
				<Stat
					label="Feedback"
					value={s.feedbackCount}
					sub={s.feedbackCount ? `Average ${s.feedbackAverage} / 5` : "None yet"}
				/>
			</dl>
			<p className="text-[13px] text-ink-3">
				Limits (set by environment variables): {s.limits.chatPerDay} AI messages / student / day ·{" "}
				{s.limits.uploadsTotal} uploads / student · {s.limits.globalPerDay} AI requests / day shared · model{" "}
				{s.limits.model} · Gemini {s.limits.geminiConfigured ? "configured" : "NOT configured"}.
			</p>

			<section aria-labelledby="a-users">
				<h2 id="a-users" className="mb-2 text-base font-semibold">
					Students
				</h2>
				{users.isPending ? (
					<LoadingBlock rows={2} />
				) : users.error ? (
					<ErrorBlock error={users.error} onRetry={() => void users.refetch()} />
				) : (
					<div className="overflow-x-auto rounded-xl border border-line">
						<table className="w-full min-w-[560px] text-start text-sm">
							<thead className="bg-sunken text-[13px] text-ink-3">
								<tr>
									<th scope="col" className="p-2.5 text-start">
										Name
									</th>
									<th scope="col" className="p-2.5 text-start">
										Email
									</th>
									<th scope="col" className="p-2.5 text-start">
										Joined
									</th>
									<th scope="col" className="p-2.5 text-end">
										Résumés
									</th>
									<th scope="col" className="p-2.5 text-end">
										AI
									</th>
								</tr>
							</thead>
							<tbody>
								{users.data.map((u) => (
									<tr key={u.id} className="border-t border-line">
										<td className="p-2.5">
											{u.name} {u.isAdmin && <Badge variant="accent">admin</Badge>}
										</td>
										<td className="p-2.5 [overflow-wrap:anywhere]">{u.email}</td>
										<td className="p-2.5">{new Date(u.createdAt).toLocaleDateString()}</td>
										<td className="p-2.5 text-end">{u.resumes}</td>
										<td className="p-2.5 text-end">{u.aiRequests}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
				<p className="mt-1.5 text-xs text-ink-3">
					Admins see names, emails and counts only — never résumé or chat content.
				</p>
			</section>

			<section aria-labelledby="a-err">
				<h2 id="a-err" className="mb-2 text-base font-semibold">
					Recent AI errors
				</h2>
				{errors.isPending ? (
					<LoadingBlock rows={1} />
				) : errors.error ? (
					<ErrorBlock error={errors.error} onRetry={() => void errors.refetch()} />
				) : errors.data.length === 0 ? (
					<EmptyState variant="compact" title="No errors recorded." />
				) : (
					<ul className="grid gap-1.5 text-sm">
						{errors.data.map((e) => (
							<li key={e.id} className="flex flex-wrap gap-x-3 rounded-lg border border-line bg-raised px-3 py-2">
								<span className="font-mono text-xs">{new Date(e.at).toLocaleString()}</span>
								<Badge variant="danger">{e.kind}</Badge>
								<span className="font-mono text-xs">{e.reason}</span>
							</li>
						))}
					</ul>
				)}
			</section>

			<section aria-labelledby="a-fb">
				<h2 id="a-fb" className="mb-2 text-base font-semibold">
					Feedback
				</h2>
				{feedback.isPending ? (
					<LoadingBlock rows={1} />
				) : feedback.error ? (
					<ErrorBlock error={feedback.error} onRetry={() => void feedback.refetch()} />
				) : feedback.data.length === 0 ? (
					<EmptyState variant="compact" title="No feedback yet." />
				) : (
					<ul className="grid gap-2">
						{feedback.data.map((f) => (
							<li key={f.id} className="rounded-lg border border-line bg-raised p-3">
								<div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
									<Badge variant="info">{f.category}</Badge>
									<span aria-label={`${f.rating} out of 5`}>{"★".repeat(f.rating)}</span>
									<span>{f.name}</span>
									<span>{new Date(f.at).toLocaleString()}</span>
									{f.page && <span className="font-mono">{f.page}</span>}
								</div>
								<p className="mt-1 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">{f.message}</p>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
