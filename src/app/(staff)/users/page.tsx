import { listStaff } from "@/server/users";
import { UserForm } from "@/components/staff/user-form";

export default async function UsersPage() {
  const staff = await listStaff();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-display font-semibold text-ink">Staff users</h1>
      <ul className="divide-y divide-rule rounded border border-rule bg-white">
        {staff.map((u) => (
          <li key={u.id} className="px-4 py-2 text-sm flex justify-between">
            <span>{u.name} <span className="text-mute">· {u.email}</span></span>
            <span className="text-mute">{u.role}{u.isActive ? "" : " (inactive)"}</span>
          </li>
        ))}
      </ul>
      <div>
        <h2 className="font-display font-semibold mt-4 mb-2">Add staff user</h2>
        <UserForm />
      </div>
    </div>
  );
}
