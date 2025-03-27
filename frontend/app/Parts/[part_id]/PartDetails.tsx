"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PartInfo from "./PartInfo";
import GeometryDetails from "./GeometryDetails";
import RawMaterialDetails from "./RawMaterialDetails";
import MachiningDetails from "./MachiningDetails";
import CostingDetails from "./CostingDetails";

interface PartDetailsProps {
  part_id: string;
}

export default function PartDetails({ part_id }: PartDetailsProps) {
  const [part, setPart] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPartDetails = async () => {
      if (!part_id) return;
      try {
        const response = await api.get(`parts/${part_id}`);
        setPart(response.data);
        console.log(part);
      } catch (error) {
        setError("Failed to fetch part details.");
        console.error("Error fetching part:", error);
      }
    };

    fetchPartDetails();
  }, [part_id]);

  const handleUpdate = async (updatedFields: Partial<any>) => {
    if (!part) return;

    const updatedPart = { ...part, ...updatedFields };
    setPart(updatedPart);

    console.log({ updatedFields });

    try {
      await api.put(`parts/${part.part_id}/`, updatedFields);
    } catch (error) {
      console.error("Failed to update part:", error);
    }
  };

  if (error) return <p className="text-red-500">{error}</p>;
  if (!part) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <Button onClick={() => router.back()} className="mb-4">
        ← Back
      </Button>

      <Card className="border border-gray-300 shadow-md">
        <CardContent className="p-4 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side: Part Info & Geometry */}
          <div className="space-y-4">
            <PartInfo part={part} onUpdate={handleUpdate} />
            <GeometryDetails part={part} onUpdate={handleUpdate} />
          </div>

          {/* Right Side: Raw Material, Machining, Costing */}
          <div className="space-y-4">
            <RawMaterialDetails part={part} onUpdate={handleUpdate} />
            <MachiningDetails machining={part} onUpdate={handleUpdate} />
            <CostingDetails
              costing={part.costing_details}
              onUpdate={handleUpdate}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
