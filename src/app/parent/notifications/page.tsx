import { listNotificationsForParent } from "@/server/notifications";

export default async function ParentNotificationsPage() {
  const rows = await listNotificationsForParent();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-serif">Messages we&apos;ve sent you</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-mute">Nothing yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="border border-rule rounded p-3 text-sm">
              <p className="text-xs text-mute">{new Date(r.createdAt).toLocaleString()} · {r.templateKey} · {r.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
