import { listAllNotifications } from "@/server/notifications";

export default async function NotificationsPage() {
  const rows = await listAllNotifications();
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-serif">Notifications log</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-rule">
            <th className="py-2">Time</th><th>Channel</th><th>Template</th><th>Phone</th><th>Status</th><th>Provider</th><th>Error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-rule/50">
              <td className="py-2">{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.channel}</td>
              <td>{r.templateKey}</td>
              <td>{r.recipientPhone}</td>
              <td>{r.status}</td>
              <td>{r.provider}</td>
              <td className="text-red-600 text-xs">{r.errorMessage ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
