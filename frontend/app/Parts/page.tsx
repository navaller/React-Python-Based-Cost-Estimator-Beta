"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface Part {
  part_name: string;
  file_name: string;
  file_path: string;
  project_id: string;
  analysis: {
    bounding_box: { width: number; depth: number; height: number };
    volume: number;
    surface_area: number;
    faces: number;
    edges: number;
    components: number;
  };
  projection: string;
  thumbnail: string;
}

interface Project {
  project_name: string;
  parts: Part[];
}

export default function PartsPage() {
  const [parts, setParts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // ✅ Define searchQuery

  useEffect(() => {
    async function fetchParts() {
      try {
        const response = await axios.get<{ [key: string]: Project }>(
          "http://127.0.0.1:8000/cad/stored_data/"
        );

        console.log("API Response:", response.data); // Debugging API response

        // Ensure TypeScript recognizes it as an array of parts
        const allParts: Part[] = Object.values(response.data).flatMap(
          (project: Project) => project.parts || []
        );

        console.log("Extracted Parts:", allParts); // Debugging extracted parts

        setParts([...allParts]); // ✅ Ensure state is updated correctly
      } catch (error) {
        console.error("Error fetching parts:", error);
      }
    }
    fetchParts();
  }, []);

  const filteredParts = parts.filter(
    (part) =>
      part.part_name &&
      part.part_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Parts</h1>
      <Input
        placeholder="Search parts..."
        className="mb-4"
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
                  <img
                    src={`http://127.0.0.1:8000/cad/thumbnail/${
                      part.project_id
                    }/${part.thumbnail.split("/").pop()}`}
                    alt="Part Thumbnail"
                    className="h-10"
                    object-fit="contain"
                  />
                  <h3 className="text-lg font-semibold">{part.part_name}</h3>
                  <h3 className="text-lg font-semibold">{part.project_name}</h3>
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
