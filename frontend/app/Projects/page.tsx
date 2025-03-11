"use client"; // ✅ Ensure this is at the top

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<
    { id: string; name: string; description: string }[]
  >([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/projects/");
      setProjects(Object.values(response.data));
    } catch (error) {
      console.error("Error fetching projects", error);
    }
  };

  return (
    <div className="p-6">
      <div className="inline-flex justify-between w-full">
        <h1 className="text-2xl font-bold mb-4">Projects</h1>
        <Button className="mb-4" onClick={() => router.push("/Projects/new")}>
          Create New Project
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Render actual projects */}
        {projects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer hover:shadow-lg transition h-60"
            onClick={() => router.push(`/Projects/${project.id}`)}
          >
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold">{project.name}</h2>
              <p className="text-gray-500">{project.description}</p>
            </CardContent>
          </Card>
        ))}

        {/* Generate empty placeholders if there are fewer than 10 projects */}
        {Array.from({ length: Math.max(0, 15 - projects.length) }).map(
          (_, index) => (
            <div
              key={`empty-${index}`}
              className="aspect-square rounded-xl bg-none border border-dashed flex items-center justify-center text-gray-500 h-60 w-full"
            ></div>
          )
        )}
      </div>
    </div>
  );
}
