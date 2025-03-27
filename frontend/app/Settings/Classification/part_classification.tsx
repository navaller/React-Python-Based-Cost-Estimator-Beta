"use client";

//* app/settings/part_classification.tsx *//
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import api from "@/lib/api";
import { Pencil, Check, Trash, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function PartClassification() {
  const [partClassifications, setPartClassifications] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({ name: "", pricing_type: "" });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPart, setNewPart] = useState({
    name: "",
    pricing_type: "block_price",
  });

  useEffect(() => {
    fetchPartClassifications();
  }, []);

  const fetchPartClassifications = async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/part_classification");
      setPartClassifications(response.data);
    } catch (error) {
      toast.error("Failed to fetch part classifications.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Editing
  const handleEditPart = (id: number) => {
    const existing = partClassifications.find((item: any) => item.id === id);
    setEditingRow(id);
    setEditValues({ name: existing.name, pricing_type: existing.pricing_type });
  };

  // ✅ Handle Save Edits
  const handleSavePart = async (id: number) => {
    if (!editValues.name.trim() || !editValues.pricing_type.trim()) {
      toast.error("Both fields are required.");
      return;
    }

    try {
      await api.put(`/settings/part_classification/${id}`, editValues);

      setPartClassifications((prev: any) =>
        prev.map((item: any) =>
          item.id === id ? { ...item, ...editValues } : item
        )
      );

      toast.success(`Part classification updated successfully!`);
      setEditingRow(null);
    } catch (error) {
      toast.error("Failed to update part classification.");
    }
  };

  // ✅ Handle Delete
  const handleDeletePart = async (id: number) => {
    try {
      await api.delete(`/settings/part_classification/${id}`);
      setPartClassifications((prev: any) =>
        prev.filter((item: any) => item.id !== id)
      );
      toast.success("Part classification deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete part classification.");
    }
  };

  // ✅ Handle Add New Part Classification
  const handleAddPart = async () => {
    if (!newPart.name.trim()) {
      toast.error("Name is required.");
      return;
    }

    try {
      await api.post("/settings/part_classification", newPart);
      fetchPartClassifications();
      toast.success("New part classification added!");
      setIsDialogOpen(false);
      setNewPart({ name: "", pricing_type: "block_price" });
    } catch (error) {
      toast.error("Failed to add part classification.");
    }
  };

  return (
    <div className="p-6 w-full">
      <div className="inline-flex justify-between w-full">
        <h1 className="text-2xl font-bold mb-4">Part Classifications</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Part Classification
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : partClassifications.length > 0 ? (
        <Card className="mb-4">
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Name</TableHead>
                  <TableHead className="w-[200px]">Pricing Type</TableHead>
                  <TableHead className="w-[150px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partClassifications.map((item: any) => {
                  const isEditing = editingRow === item.id;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editValues.name}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <div className="font-semibold">
                            {item.name.replace("_", " ").toUpperCase()}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editValues.pricing_type}
                            onValueChange={(value) =>
                              setEditValues((prev) => ({
                                ...prev,
                                pricing_type: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue>
                                {editValues.pricing_type}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="block_price">
                                Block Price
                              </SelectItem>
                              <SelectItem value="sheet_price">
                                Sheet Price
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          item.pricing_type.replace("_", " ").toUpperCase()
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSavePart(item.id)}
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditPart(item.id)}
                          >
                            <Pencil />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeletePart(item.id)}
                        >
                          <Trash />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <p className="text-gray-500">No part classifications available.</p>
      )}

      {/* ✅ Modal for Adding New Part Classification */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Part Classification</DialogTitle>
            <Separator />
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Label>Name</Label>
              <Input
                type="text"
                value={newPart.name}
                onChange={(e) =>
                  setNewPart((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-3">
              <Label>Pricing Type</Label>
              <Select
                value={newPart.pricing_type}
                onValueChange={(value) =>
                  setNewPart((prev) => ({ ...prev, pricing_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick One">
                    {newPart.pricing_type}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block_price">Block Price</SelectItem>
                  <SelectItem value="sheet_price">Sheet Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddPart}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
