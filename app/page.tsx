import { redirect } from "next/navigation"

// The platform opens on its own sign-in screen.
export default function Home() {
  redirect("/login")
}
