import { NotFoundScreen } from "@/components/shared/not-found-screen";

export default function ParentNotFound() {
  return (
    <NotFoundScreen
      description="That page isn't available. Head back to your dashboard to see your child's updates."
      primary={{ href: "/parent/dashboard", label: "Back to home" }}
      variant="embedded"
    />
  );
}
