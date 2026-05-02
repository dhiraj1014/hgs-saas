import { NotFoundScreen } from "@/components/shared/not-found-screen";

export default function NotFound() {
  return (
    <NotFoundScreen
      primary={{ href: "/login", label: "Go to staff login" }}
      secondary={{ href: "/parent-login", label: "Parent login" }}
    />
  );
}
