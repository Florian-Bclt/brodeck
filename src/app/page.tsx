import Link from "next/link";
import { Suspense } from "react";
import LoginClient from "./login/page";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
