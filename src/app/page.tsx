import {redirect} from "next/navigation";
import {auth} from "./_lib/auth/auth";

export default async function Home() {
  const session = await auth();

  if (session) redirect("/dashboard");

  redirect("/login");
}
