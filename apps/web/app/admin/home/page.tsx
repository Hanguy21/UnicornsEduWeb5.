import { redirect } from "next/navigation";

/**
 * Trang chủ admin nối với landing page: chuyển hướng về "/".
 */
export default function AdminHomePage() {
  redirect("/");
}
