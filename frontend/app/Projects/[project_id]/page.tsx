"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddPartModal from "@/components/AddPartModal";
import { useRouter } from "next/navigation";

export default function ProjectDetailsPage() {
  const router = useRouter();
  const { project_id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
  }, []);

  const fetchProjectDetails = async () => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/projects/${project_id}/`
      );
      setProject(response.data);
    } catch (error) {
      console.error("Error fetching project details", error);
    }
  };

  if (!project) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <div className="inline-flex justify-between w-full">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-gray-500 mb-4">{project.description}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Add New Part</Button>
      </div>
      <h2 className="text-xl font-semibold mt-6 mb-2">Parts in this Project</h2>
      <div className="grid grid-cols-1 gap-4">
        {/* Render actual parts */}
        {project.parts.map((part: any) => (
          <Card
            key={part.part_id}
            className="cursor-pointer hover:shadow-lg transition"
            onClick={() => router.push(`/Parts/${part.part_id}`)}
          >
            <CardContent className="ml-4 mr-4 inline-flex gap-4">
              {part.thumbnail && (
                <img
                  src={`http://127.0.0.1:8000/cad/thumbnail/${
                    part.project_id
                  }/${part.thumbnail.split("/").pop()}`}
                  alt="Part Thumbnail"
                  className="h-20"
                  object-fit="contain"
                />
              )}
              <h3 className="text-lg font-semibold">{part.part_name}</h3>
            </CardContent>
          </Card>
        ))}

        {/* Generate empty placeholders if there are fewer than 24 parts */}
        {Array.from({ length: Math.max(0, 10 - project.parts.length) }).map(
          (_, index) => (
            <div
              key={`empty-${index}`}
              className="aspect-video h-30 w-full rounded-lg bg-none border border-dashed flex items-center justify-center text-gray-500"
            ></div>
          )
        )}
      </div>

      <AddPartModal
        projectId={project_id as string}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
