"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const ABILITY_LABEL: Record<string, string> = {
  "students.create": "create students",
  "students.edit": "edit student records",
  "students.import": "import students",
  "students.view": "view students",
  "classes.manage": "manage classes",
  "subjects.manage": "manage subjects",
  "academic-years.manage": "manage academic years",
  "users.manage": "manage staff users",
  "attendance.mark": "mark attendance",
  "attendance.view-all": "view school-wide attendance",
  "attendance.view-own-children": "view your children's attendance",
  "announcements.send": "send announcements",
  "announcements.send-school-wide": "send school-wide announcements",
  "announcements.view": "view announcements",
  "notifications.view-all": "view the notifications log",
  "marks.edit": "edit marks",
  "marks.lock": "lock marks",
  "fees.view": "view fees",
  "fees.refund": "refund fees",
  "admissions.approve": "approve admissions",
};

export function AccessDeniedToast() {
  const router = useRouter();
  const params = useSearchParams();
  const denied = params.get("denied");

  useEffect(() => {
    if (!denied) return;
    const action = ABILITY_LABEL[denied] ?? denied;
    toast.error("You don't have access to that page", {
      description: `Your role doesn't allow you to ${action}.`,
    });
    // Clear the query param so a refresh doesn't repeat the toast.
    const next = new URLSearchParams(params.toString());
    next.delete("denied");
    const qs = next.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
  }, [denied, params, router]);

  return null;
}
