import { NotFoundScreen } from "@/components/shared/not-found-screen";

export default function StaffNotFound() {
  return (
    <NotFoundScreen
      description="That page doesn't exist or you may not have access. Try returning to the dashboard."
      primary={{ href: "/dashboard", label: "Back to dashboard" }}
      secondary={{ href: "/students", label: "View students" }}
      variant="embedded"
    />
  );
}
