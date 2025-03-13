"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface Part {
  id: number;
  part_id: string;
  slug: string;
  project_id: string;
  name: string; // ✅ Changed from `part_name`
  file_name: string;
  file_path: string;
  analysis?: {
    bounding_box?: { width: number; depth: number; height: number };
    volume?: number;
    surface_area?: number;
    faces?: number;
    edges?: number;
    components?: number;
  };
  projection?: string;
  thumbnail?: string;
}

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchParts() {
      try {
        const response = await axios.get<{ parts: Part[] }>(
          "http://127.0.0.1:8000/cad/stored_data/"
        );

        console.log("API Response:", response.data); // ✅ Debugging API response

        // ✅ Extract parts array directly from response
        setParts(response.data.parts || []);
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
              className="cursor-pointer hover:shadow-lg transition w-full h-20"
            >
              <Link href={`/Parts/${part.part_id}`}>
                <CardContent className="inline-flex gap-4 h-15">
                  {part.thumbnail ? (
                    <img
                      src={`http://127.0.0.1:8000/cad/thumbnail/${
                        part.project_id
                      }/${part.thumbnail.split("/").pop()}`}
                      alt="Part Thumbnail"
                      className="h-10 object-contain"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gray-300 flex items-center justify-center">
                      📷
                    </div>
                  )}
                  <h3 className="text-lg font-semibold">{part.name}</h3>
                  <h3 className="text-lg font-semibold">
                    Project ID: {part.project_id}
                  </h3>
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
