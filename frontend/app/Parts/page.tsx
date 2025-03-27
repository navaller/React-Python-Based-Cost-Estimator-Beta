"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api"; // ✅ Use centralized API module
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface BoundingBox {
  width: number;
  depth: number;
  height: number;
  unit: string;
}

interface GeometryDetails {
  bounding_box?: BoundingBox;
  volume?: { value: number; unit: string };
  surface_area?: { value: number; unit: string };
}

interface Part {
  id: number;
  part_id: string;
  slug: string;
  project_id: string;
  name: string;
  file_name: string;
  file_path: string;
  geometry_details?: GeometryDetails;
  projection?: string;
  thumbnail?: string;
}

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchParts() {
      try {
        const response = await api.get<Record<string, Part>>("parts/");

        console.log("API Response:", response.data); // ✅ Debugging API response

        // ✅ Convert response (keyed by part_id) to an array & parse geometry details
        const formattedParts = Object.values(response.data).map((part) => ({
          ...part,
          geometry_details:
            typeof part.geometry_details === "string"
              ? JSON.parse(part.geometry_details)
              : part.geometry_details,
        }));

        setParts(formattedParts || []);
      } catch (error) {
        console.error("Error fetching parts:", error);
      }
    }

    fetchParts();
  }, []);

  const filteredParts = parts.filter((part) =>
    part.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Parts</h1>
      <Input
        placeholder="Search parts..."
        className="mb-4 mt-4 lg:w-1/2"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid grid-cols-1 gap-4">
        {filteredParts.length > 0 ? (
          filteredParts.map((part) => (
            <Card
              key={part.part_id}
              className="cursor-pointer hover:shadow-lg transition w-full h-24"
            >
              <Link href={`/Parts/${part.part_id}`}>
                <CardContent className="flex items-center gap-4">
                  {part.thumbnail ? (
                    <img
                      src={`http://127.0.0.1:8000/cad/thumbnail/${
                        part.project_id
                      }/${part.thumbnail.split("/").pop()}`}
                      alt="Part Thumbnail"
                      className="h-14 w-14 object-contain"
                    />
                  ) : (
                    <div className="h-14 w-14 bg-gray-300 flex items-center justify-center">
                      📷
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold">{part.name}</h3>
                    <p className="text-gray-500 text-sm">
                      Project ID: {part.project_id}
                    </p>

                    {part.geometry_details?.bounding_box && (
                      <p className="text-gray-500 text-sm">
                        📏 {part.geometry_details.bounding_box.width} ×{" "}
                        {part.geometry_details.bounding_box.depth} ×{" "}
                        {part.geometry_details.bounding_box.height}{" "}
                        {part.geometry_details.bounding_box.unit}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))
        ) : (
          <p>No parts found.</p>
        )}
      </div>
    </div>
  );
}
