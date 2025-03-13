"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // ✅ Use Sooner for toast notifications

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<
    { id: string; name: string; description: string; project_id: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState(""); // ✅ Search state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.warning("Project name is required");
      return;
    }

    try {
      const response = await axios.post("http://127.0.0.1:8000/projects/", {
        name: newProjectName,
        description: newProjectDesc,
      });

      // ✅ Update the UI immediately
      setProjects([...projects, response.data]);
      toast.success("Project created successfully");

      // Reset state & close modal
      setNewProjectName("");
      setNewProjectDesc("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating project", error);
      toast.error("Failed to create project");
    }
  };

  // ✅ Filter projects based on search input (name or description)
  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="inline-flex justify-between w-full">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setIsModalOpen(true)}>+ New Project</Button>
      </div>

      {/* ✅ Search Input */}
      <Input
        placeholder="Search projects by name or description..."
        className="mb-4 mt-4 lg:w-1/2"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <Card
              key={project.project_id}
              className="cursor-pointer hover:shadow-lg transition h-60"
              onClick={() => router.push(`/Projects/${project.project_id}`)}
            >
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold">{project.name}</h2>
                <p className="text-gray-500">{project.description}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>No projects found.</p>
        )}

        {Array.from({ length: Math.max(0, 15 - filteredProjects.length) }).map(
          (_, index) => (
            <div
              key={`empty-${index}`}
              className="aspect-square rounded-xl bg-none border border-dashed flex items-center justify-center text-gray-500 h-60 w-full"
            ></div>
          )
        )}
      </div>

      {/* ✅ Project Creation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Project</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Project Name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="mb-2"
          />
          <Input
            placeholder="Project Description (optional)"
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
          />

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>Create Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
