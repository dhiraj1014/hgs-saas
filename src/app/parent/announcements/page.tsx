import { listAnnouncementsForParent } from "@/server/announcements";

export default async function ParentAnnouncementsPage() {
  const items = await listAnnouncementsForParent();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-serif">Announcements</h1>
      {items.length === 0 ? (
        <p className="text-sm text-mute">No announcements yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="border border-rule rounded p-4">
              <p className="text-xs text-mute">{new Date(a.sentAt).toLocaleString()}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
