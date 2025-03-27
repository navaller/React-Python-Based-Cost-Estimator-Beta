"use client";
import { useParams } from "next/navigation";
import PartDetails from "./PartDetails";

export default function PartDetailsPage() {
  const params = useParams(); // ✅ Correct way to get dynamic parameters in a client component
  const part_id = params.part_id as string; // ✅ Ensure it's a string

  return <PartDetails part_id={part_id} />;
}
