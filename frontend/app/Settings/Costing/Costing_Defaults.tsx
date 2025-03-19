"use client";

//* app/settings/costing_defaults.tsx *//
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Pencil, Check, Trash, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function CostingDefaults() {
  const [costingDefaults, setCostingDefaults] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<any>({});
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({
    type: "",
    unit_type: "",
    default_unit: "",
    description: "",
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCostingDefault, setNewCostingDefault] = useState({
    type: "",
    unit_type: "",
    default_unit: "",
    description: "",
  });

  useEffect(() => {
    fetchCostingDefaults();
    fetchUnits();
  }, []);

  const fetchCostingDefaults = async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/costing_defaults");
      setCostingDefaults(response.data);
    } catch (error) {
      toast.error("Failed to fetch costing defaults.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await api.get("/settings/units/symbols");
      setUnits(response.data);
    } catch (error) {
      toast.error("Failed to fetch unit symbols.");
    }
  };

  // ✅ Handle Editing
  const handleEditCostingDefault = (id: number) => {
    const existing = costingDefaults.find((item: any) => item.id === id);
    if (!existing) return;

    setEditingRow(id);
    setEditValues({
      type: existing.type,
      unit_type: existing.unit_type,
      default_unit: existing.default_unit,
      description: existing.description,
    });
  };

  // ✅ Handle Save Edits
  const handleSaveCostingDefault = async (category: string) => {
    if (!category) {
      toast.error("Cannot update without a valid category.");
      return;
    }
    try {
      await api.put(`/settings/costing_defaults/${category}`, editValues);

      setCostingDefaults((prev: any) =>
        prev.map((item: any) =>
          item.type === category ? { ...item, ...editValues } : item
        )
      );

      toast.success(`Costing default '${category}' updated successfully!`);
      setEditingRow(null);
    } catch (error) {
      toast.error("Failed to update costing default.");
    }
  };

  // ✅ Handle Delete
  const handleDeleteCostingDefault = async (category: string) => {
    try {
      await api.delete(`/settings/costing_defaults/${category}`);

      setCostingDefaults(
        (prev: any) => prev.filter((item: any) => item.type !== category) // ✅ Match by category
      );

      toast.success(`Costing default '${category}' deleted successfully!`);
    } catch (error) {
      toast.error("Failed to delete costing default.");
    }
  };

  // ✅ Handle Add New Costing Default
  const handleAddCostingDefault = async () => {
    if (
      !newCostingDefault.type.trim() ||
      !newCostingDefault.description.trim()
    ) {
      toast.error("All fields are required.");
      return;
    }

    try {
      await api.post("/settings/costing_defaults", {
        category: newCostingDefault.type, // ✅ Change "type" to "category"
        unit_type: newCostingDefault.unit_type,
        default_unit: newCostingDefault.default_unit,
        description: newCostingDefault.description,
      });

      fetchCostingDefaults(); // ✅ Refresh the list after adding
      toast.success("New costing default added!");
      setIsDialogOpen(false);

      // ✅ Reset form fields
      setNewCostingDefault({
        type: "",
        unit_type: "",
        default_unit: "",
        description: "",
      });
    } catch (error) {
      toast.error("Failed to add costing default.");
    }
  };

  return (
    <div className="p-6 w-full">
      <div className="inline-flex justify-between w-full">
        <h1 className="text-2xl font-bold mb-4">Costing Defaults</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Costing Default
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : costingDefaults.length > 0 ? (
        <Card className="mb-4">
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Category</TableHead>
                  <TableHead className="w-[200px]">Unit Type</TableHead>
                  <TableHead className="w-[200px]">Default Unit</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[150px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costingDefaults.map((item: any) => {
                  const isEditing = editingRow === item.id;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold">
                        {item.type.replace("_", " ").toUpperCase()}
                      </TableCell>

                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editValues.unit_type}
                            onValueChange={(value) => {
                              setEditValues((prev) => ({
                                ...prev,
                                unit_type: value,
                                default_unit: units[value]?.[0] || "", // ✅ Update default unit dynamically
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue>{editValues.unit_type}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(units).map((unitCategory) => (
                                <SelectItem
                                  key={unitCategory}
                                  value={unitCategory}
                                >
                                  {unitCategory}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          item.unit_type
                        )}
                      </TableCell>

                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editValues.default_unit}
                            onValueChange={(value) =>
                              setEditValues((prev) => ({
                                ...prev,
                                default_unit: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue>
                                {editValues.default_unit}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {units[editValues.unit_type]?.map(
                                (option: string) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          item.default_unit
                        )}
                      </TableCell>

                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editValues.description}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          item.description
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleSaveCostingDefault(item.type)
                              }
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
                            onClick={() => handleEditCostingDefault(item.id)}
                          >
                            <Pencil />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteCostingDefault(item.type)}
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
        <p className="text-gray-500">No costing defaults available.</p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Costing Default</DialogTitle>
          </DialogHeader>

          {/* ✅ Input Fields for Adding New Costing Default */}
          <div className="space-y-4">
            {/* Category (Text Field) */}
            <Label>Category</Label>
            <Input
              type="text"
              value={newCostingDefault.type}
              onChange={(e) =>
                setNewCostingDefault({
                  ...newCostingDefault,
                  type: e.target.value,
                })
              }
            />

            {/* Unit Type (Dropdown) */}
            <Label>Unit Type</Label>
            <Select
              value={newCostingDefault.unit_type}
              onValueChange={(value) =>
                setNewCostingDefault((prev) => ({
                  ...prev,
                  unit_type: value,
                  default_unit: units[value]?.[0] || "", // ✅ Auto-select first available unit
                }))
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {newCostingDefault.unit_type || "Select Unit Type"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.keys(units).map((unitCategory) => (
                  <SelectItem key={unitCategory} value={unitCategory}>
                    {unitCategory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Default Unit (Dropdown) */}
            <Label>Default Unit</Label>
            <Select
              value={newCostingDefault.default_unit}
              onValueChange={(value) =>
                setNewCostingDefault((prev) => ({
                  ...prev,
                  default_unit: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {newCostingDefault.default_unit || "Select Default Unit"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {units[newCostingDefault.unit_type]?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Description (Text Field) */}
            <Label>Description</Label>
            <Input
              type="text"
              value={newCostingDefault.description}
              onChange={(e) =>
                setNewCostingDefault({
                  ...newCostingDefault,
                  description: e.target.value,
                })
              }
            />
          </div>

          <DialogFooter>
            <Button onClick={handleAddCostingDefault}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
