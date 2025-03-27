"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Check } from "lucide-react";
import api from "@/lib/api";

interface PartInfoProps {
  part: any;
  onUpdate: (fields: Partial<any>) => void;
}

export default function PartInfo({ part, onUpdate }: PartInfoProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingClassification, setIsEditingClassification] = useState(false);
  const [editedName, setEditedName] = useState(part?.name || "");
  const [classificationOptions, setClassificationOptions] = useState<any[]>([]);
  const [selectedClassification, setSelectedClassification] = useState<
    number | null
  >(part?.classification_id || null);
  const [projectName, setProjectName] = useState<string>("");

  useEffect(() => {
    fetchClassifications();
    fetchProjectName();
  }, []);

  const fetchClassifications = async () => {
    try {
      const response = await api.get("/settings/part_classification/");
      setClassificationOptions(response.data);
    } catch (err) {
      console.error("Failed to fetch classifications", err);
    }
  };

  const fetchProjectName = async () => {
    try {
      const response = await api.get(`/projects/${part.project_id}`);
      setProjectName(response.data.name);
    } catch (err) {
      console.error("Failed to fetch project name", err);
    }
  };

  const handleNameSave = () => {
    onUpdate({ name: editedName });
    setIsEditingName(false);
  };

  const handleClassificationSave = () => {
    onUpdate({ classification_id: selectedClassification });
    setIsEditingClassification(false);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div>
          {isEditingName ? (
            <div className="max-w-fit inline-flex gap-3">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
              />
              <Button size="icon" variant="outline" onClick={handleNameSave}>
                <Check />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold mb-4">{part.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditingName(true)}
                className="opacity-0 hover:opacity-100"
              >
                <Pencil />
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Project Name */}
            <div className="items-center justify-between flex-1 gap-4">
              <label className="text-sm font-semibold mb-4">Project:</label>
              <div>{projectName}</div>
            </div>

            {/* Classification */}
            <div className="flex-1 items-center justify-between group gap-4">
              <label className="text-sm font-semibold mb-4">
                Classification:
              </label>
              {isEditingClassification ? (
                <div className="flex gap-2">
                  <Select
                    value={selectedClassification?.toString() || ""}
                    onValueChange={(value) =>
                      setSelectedClassification(parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select classification" />
                    </SelectTrigger>
                    <SelectContent>
                      {classificationOptions.map((option) => (
                        <SelectItem
                          key={option.id}
                          value={option.id.toString()}
                        >
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleClassificationSave}
                  >
                    <Check />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>
                    {classificationOptions.find(
                      (c) => c.id === part.classification_id
                    )?.name || "N/A"}
                  </span>
                  <Pencil
                    className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer"
                    onClick={() => setIsEditingClassification(true)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div>
            {part.thumbnail && (
              <img
                src={`http://127.0.0.1:8000/cad/thumbnail/${
                  part.project_id
                }/${part.thumbnail.split("/").pop()}`}
                alt="Part Thumbnail"
                className=" object-contain"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
