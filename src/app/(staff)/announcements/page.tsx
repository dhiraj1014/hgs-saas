import Link from "next/link";
import { listAnnouncements } from "@/server/announcements";

export default async function AnnouncementsPage() {
  const items = await listAnnouncements();
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif">Announcements</h1>
        <Link href="/announcements/new" className="border border-rule rounded px-3 py-1 text-sm">New</Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-rule"><th className="py-2">Sent at</th><th>Audience</th><th>Recipients</th><th>Body</th></tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="border-b border-rule/50">
              <td className="py-2">{new Date(a.sentAt).toLocaleString()}</td>
              <td>{a.audienceType}</td>
              <td>{a.recipientCount}</td>
              <td className="max-w-md truncate">{a.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
