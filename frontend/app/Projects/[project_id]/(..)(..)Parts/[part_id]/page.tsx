"use client";

import { useParams } from "next/navigation";
import PartDetails from "@/app/Parts/[part_id]/PartDetails";

export default function PartDetailsModal() {
  const params = useParams(); // ✅ Correct way to get dynamic parameters in a client component
  const part_id = params.part_id as string; // ✅ Ensure it's a string
  console.log("Intercepting Part ID:", part_id);
  return <PartDetails part_id={part_id} />;
}
