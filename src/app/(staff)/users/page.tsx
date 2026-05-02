import { listStaff } from "@/server/users";
import { UserForm } from "@/components/staff/user-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  principal: "Principal",
  office_staff: "Office staff",
  accountant: "Accountant",
  class_teacher: "Class teacher",
  subject_teacher: "Subject teacher",
};

export default async function UsersPage() {
  const staff = await listStaff();
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access"
        title="Staff users"
        description="People who can sign in to the staff console."
      />

      <Card className="bg-white p-0">
        {staff.length === 0 ? (
          <CardContent className="py-10 text-center text-sm text-mute">
            No staff users yet — add the first one below.
          </CardContent>
        ) : (
          <ul className="divide-y divide-rule">
            {staff.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-medium text-ink">
                    {u.name}
                    {!u.isActive && (
                      <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                        Inactive
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-mute">{u.email}</p>
                </div>
                <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11px] font-medium text-mute">
                  {ROLE_LABEL[u.role] ?? u.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">
          Add staff user
        </h2>
        <UserForm />
      </div>
    </div>
  );
}
