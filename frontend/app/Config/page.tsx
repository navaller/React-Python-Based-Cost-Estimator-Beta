"use client";

import ConfigPanel from "@/components/ConfigPanel";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ConfigPage() {
  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-2xl font-semibold mb-4">Configuration Settings</h1>
      <ConfigPanel />
      <Link href="/">
        <Button variant="outline" className="mt-4">
          Back to Home
        </Button>
      </Link>
    </div>
  );
}
