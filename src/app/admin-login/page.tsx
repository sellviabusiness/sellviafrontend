import { AdminLoginView } from "./admin-login-view";

export const metadata = {
  title: "Admin sign-in",
  // Never indexed — this URL isn't meant to be discoverable, IP restriction aside.
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminLoginView />;
}
