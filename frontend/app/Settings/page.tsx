"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/Settings/Units"); // ✅ Redirect user to /Settings/Units
  }, [router]);

  return null; // ✅ No need to render anything, since we redirect
}
