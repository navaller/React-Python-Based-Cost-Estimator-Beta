"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, Pencil, Check, Trash, X, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import MaterialDetails from "./MaterialDetails";

export default function Materials() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [densityUnits, setDensityUnits] = useState<string[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    density: "",
    density_unit: "",
  });

  useEffect(() => {
    fetchMaterials();
    fetchDensityUnits();
  }, []);

  // ✅ Fetch Materials
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const response = await api.get("/materials");
      setMaterials(response.data);
    } catch (error) {
      toast.error("Failed to fetch materials.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Available Density Units
  const fetchDensityUnits = async () => {
    try {
      const response = await api.get("/settings/units/symbols");
      setDensityUnits(response.data["density"] || []);
    } catch (error) {
      toast.error("Failed to fetch density units.");
    }
  };

  // ✅ Handle Opening Material Details
  const handleOpenDetails = (material: any) => {
    setSelectedMaterial(material);
    setIsDetailsOpen(true);
  };

  // ✅ Handle Editing
  const handleEditMaterial = (id: number) => {
    const material = materials.find((item) => item.id === id);
    if (material) {
      setEditingRow(id);
      setEditValues({ ...material });
    }
  };

  // ✅ Handle Saving Edits
  const handleSaveMaterial = async (id: number) => {
    if (!editValues.name.trim() || !editValues.density) {
      toast.error("Material name and density are required.");
      return;
    }

    try {
      await api.put(`/materials/${id}`, {
        name: editValues.name,
        density: editValues.density,
        density_unit: editValues.density_unit,
      });

      setMaterials((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...editValues } : item))
      );

      toast.success("Material updated successfully!");
      setEditingRow(null);
    } catch (error) {
      toast.error("Failed to update material.");
    }
  };

  // ✅ Handle Deleting a Material
  const handleDeleteMaterial = async (id: number, name: string) => {
    try {
      await api.delete(`/materials/${id}`);
      setMaterials((prev) => prev.filter((item) => item.id !== id));
      toast.success(`Material '${name}' deleted successfully!`);
    } catch (error) {
      toast.error("Failed to delete material.");
    }
  };

  // ✅ Handle Adding a New Material
  const handleAddMaterial = async () => {
    if (!newMaterial.name.trim() || !newMaterial.density) {
      toast.error("Material name and density are required.");
      return;
    }

    try {
      const response = await api.post("/materials/", newMaterial);

      // ✅ Append new material to the list
      setMaterials((prev) => [
        ...prev,
        { ...newMaterial, id: response.data.material_id },
      ]);

      toast.success("Material added successfully!");
      setIsDialogOpen(false); // ✅ Close modal

      // ✅ Reset form fields
      setNewMaterial({
        name: "",
        density: "",
        density_unit: densityUnits[0] || "",
      });
    } catch (error) {
      toast.error("Failed to add material.");
    }
  };

  return (
    <div className="p-6 w-full">
      <div className="inline-flex justify-between w-full">
        <h1 className="text-2xl font-bold mb-4">Materials</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Material
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : materials.length > 0 ? (
        <Card className="mb-4">
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Material Name</TableHead>
                  <TableHead className="w-[150px]">Density</TableHead>
                  <TableHead className="w-[150px]">Density Unit</TableHead>
                  <TableHead className="w-[200px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((item) => {
                  const isEditing = editingRow === item.id;

                  return (
                    <TableRow key={item.id || item.name}>
                      <TableCell className="font-semibold">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editValues.name}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                name: e.target.value,
                              })
                            }
                          />
                        ) : (
                          item.name
                        )}
                      </TableCell>

                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editValues.density}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                density: e.target.value,
                              })
                            }
                          />
                        ) : (
                          item.density
                        )}
                      </TableCell>

                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editValues.density_unit}
                            onValueChange={(value) =>
                              setEditValues({
                                ...editValues,
                                density_unit: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue>
                                {editValues.density_unit}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {densityUnits.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          item.density_unit
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSaveMaterial(item.id)}
                            >
                              <Check />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingRow(null)}
                            >
                              <X />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDetails(item)}
                            >
                              <Eye />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditMaterial(item.id)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleDeleteMaterial(item.id, item.name)
                              }
                            >
                              <Trash />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <p className="text-gray-500">No materials available.</p>
      )}
      {/* ✅ Material Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Material Details</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <MaterialDetails
              materialId={selectedMaterial.id}
              onClose={() => setIsDetailsOpen(false)}
            />
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ✅ Add Material Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Material</DialogTitle>
          </DialogHeader>

          <div>
            <Label>Name</Label>
            <Input
              type="text"
              value={newMaterial.name}
              onChange={(e) =>
                setNewMaterial({ ...newMaterial, name: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Density</Label>
            <Input
              type="number"
              value={newMaterial.density}
              onChange={(e) =>
                setNewMaterial({ ...newMaterial, density: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Density Unit</Label>
            <Select
              value={newMaterial.density_unit}
              onValueChange={(value) =>
                setNewMaterial({ ...newMaterial, density_unit: value })
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {newMaterial.density_unit || "Select Unit"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {densityUnits.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button onClick={handleAddMaterial}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
