"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PartDetailsProps {
  part_id: string;
}

export default function PartDetails({ part_id }: PartDetailsProps) {
  const [part, setPart] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPartDetails = async () => {
      if (!part_id) return; // ✅ Avoid running if part_id is undefined
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/parts/${part_id}`
        );
        setPart(response.data);
      } catch (error) {
        setError("Failed to fetch part details.");
        console.error("Error fetching part:", error);
      }
    };

    fetchPartDetails();
  }, [part_id]);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!part) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <Button onClick={() => router.back()} className="mb-4">
        ← Back
      </Button>

      <Card className="border border-gray-300 shadow-md">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-xl font-semibold">{part.name}</h3>
          <p>
            <strong>File Name:</strong> {part.file_name}
          </p>
          <p>
            <strong>Project ID:</strong> {part.project_id}
          </p>

          {part.analysis && (
            <>
              <h4 className="text-lg font-semibold mt-4">Geometry Analysis</h4>
              <p>
                <strong>Bounding Box:</strong>{" "}
                {part.analysis.bounding_box?.width?.toFixed(2)} ×{" "}
                {part.analysis.bounding_box?.depth?.toFixed(2)} ×{" "}
                {part.analysis.bounding_box?.height?.toFixed(2)} mm
              </p>
              <p>
                <strong>Volume:</strong> {part.analysis.volume?.toFixed(2)} mm³
              </p>
              <p>
                <strong>Surface Area:</strong>{" "}
                {part.analysis.surface_area?.toFixed(2)} mm²
              </p>
              <p>
                <strong>Machining Time:</strong>{" "}
                {part.analysis.machining_time?.toFixed(2)} minutes
              </p>
            </>
          )}

          {part.thumbnail && (
            <h4 className="text-lg font-semibold mt-4">Preview</h4>
          )}

          {part.thumbnail && (
            <img
              src={`http://127.0.0.1:8000/cad/thumbnail/${
                part.project_id
              }/${part.thumbnail.split("/").pop()}`}
              alt="Part Thumbnail"
              className="w-48 h-48 border rounded-md"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
