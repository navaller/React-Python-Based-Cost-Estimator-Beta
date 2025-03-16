"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Pencil, Check, X } from "lucide-react"; // ✅ Icons for edit, save, cancel
import AddPartModal from "@/app/Projects/[project_id]/AddPartModal";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function ProjectDetailsPage() {
  const router = useRouter();
  const { project_id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState(""); // ✅ Search state for parts
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<
    "name" | "description" | null
  >(null);
  const [editedName, setEditedName] = useState("");
  const [editedDesc, setEditedDesc] = useState("");

  useEffect(() => {
    fetchProjectDetails();
  }, []);

  const fetchProjectDetails = async () => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/projects/${project_id}/`
      );
      setProject(response.data);
      setEditedName(response.data.name);
      setEditedDesc(response.data.description);
    } catch (error) {
      console.error("Error fetching project details", error);
    }
  };

  const handleUpdateProject = async () => {
    try {
      await axios.put(`http://127.0.0.1:8000/projects/${project_id}/`, {
        name: editedName,
        description: editedDesc,
      });

      // ✅ Optimistically update the UI
      setProject((prev: any) => ({
        ...prev,
        name: editedName,
        description: editedDesc,
      }));

      toast.success("Project updated successfully");

      setEditingField(null); // Exit edit mode

      // ✅ Refetch updated data from backend after UI update
      fetchProjectDetails();
    } catch (error) {
      console.error("Error updating project", error);
      toast.error("Failed to update project");
    }
  };

  const handleDeleteProject = async () => {
    try {
      await axios.delete(`http://127.0.0.1:8000/projects/${project_id}/`);
      toast.success("Project deleted", {
        description: "The project was successfully deleted.",
      });
      router.push("/Projects");
    } catch (error) {
      console.error("Error deleting project", error);
      toast.error("Error", { description: "Failed to delete project." });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  if (!project) return <p>Loading...</p>;

  // ✅ Filter parts based on search input
  const filteredParts = project.parts.filter((part: any) =>
    part.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="inline-flex justify-between w-full items-center">
        <div>
          {/* ✅ Editable Project Name */}
          <div className="flex items-center group">
            {editingField === "name" ? (
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpdateProject()}
                autoFocus
                className="text-2xl font-bold"
              />
            ) : (
              <h1 className="text-2xl font-bold">{project.name}</h1>
            )}
            {editingField !== "name" && (
              <Pencil
                className="w-5 h-5 text-gray-500 opacity-0 group-hover:opacity-100 cursor-pointer ml-2"
                onClick={() => setEditingField("name")}
              />
            )}
          </div>

          {/* ✅ Editable Project Description */}
          <div className="flex items-center group mt-2">
            {editingField === "description" ? (
              <Input
                value={editedDesc}
                onChange={(e) => setEditedDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpdateProject()}
                autoFocus
                className="text-gray-500"
              />
            ) : (
              <p className="text-gray-500">{project.description}</p>
            )}
            {editingField !== "description" && (
              <Pencil
                className="w-5 h-5 text-gray-500 opacity-0 group-hover:opacity-100 cursor-pointer ml-2"
                onClick={() => setEditingField("description")}
              />
            )}
          </div>

          {/* ✅ Save & Cancel Buttons (Visible Only in Edit Mode) */}
          {editingField && (
            <div className="flex gap-2 mt-2">
              <Button onClick={handleUpdateProject}>
                <Check className="w-4 h-4" /> Save
              </Button>
              <Button variant="outline" onClick={() => setEditingField(null)}>
                <X className="w-4 h-4" /> Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button onClick={() => setIsModalOpen(true)}>Add New Part</Button>
          <Button
            variant="ghost"
            className="text-gray-600 hover:text-red-600"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* ✅ Search Input for Filtering Parts */}
      <Input
        placeholder="Search parts..."
        className="mb-4 mt-4 lg:w-1/2"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <h2 className="text-xl font-semibold mt-6 mb-2">Parts in this Project</h2>
      <div className="grid grid-cols-1 gap-4">
        {filteredParts.length > 0 ? (
          filteredParts.map((part: any) => (
            <Card
              key={part.part_id}
              className="cursor-pointer hover:shadow-lg transition"
              onClick={() => router.push(`/Parts/${part.part_id}`)}
            >
              <CardContent className="ml-4 mr-4 inline-flex gap-4">
                {part.thumbnail && (
                  <img
                    src={`http://127.0.0.1:8000/cad/thumbnail/${
                      project.project_id
                    }/${part.thumbnail.split("/").pop()}`}
                    alt="Part Thumbnail"
                    className="h-20 object-contain"
                  />
                )}
                <h3 className="text-lg font-semibold">{part.name}</h3>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>No parts found.</p>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {project.parts.length > 0
                ? "This project contains parts. Are you sure you want to delete it?"
                : "Are you sure you want to delete this empty project?"}
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddPartModal
        projectId={project_id as string}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
