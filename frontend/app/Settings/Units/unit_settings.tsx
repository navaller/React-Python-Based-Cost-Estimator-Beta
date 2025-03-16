"use client";

//* app/settings/units/unit_settings.tsx *//
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Pencil, Check, Trash, X } from "lucide-react";

export default function UnitSettings() {
  const [units, setUnits] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<
    Record<
      string,
      {
        category: string;
        unitName: string;
        default_unit: string;
      }
    >
  >({});
  const [newCustomUnit, setNewCustomUnit] = useState({
    name: "",
    default: "",
    options: "",
  });
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    unitName: "",
    options: [] as string[],
  });

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/units");
      setUnits(response.data);
    } catch (error) {
      toast.error("Failed to fetch unit settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnitChange = (
    category: string,
    unitName: string,
    newValue: string
  ) => {
    setPendingChanges((prev) => ({
      ...prev,
      [`${category}_${unitName}`]: {
        category,
        unitName,
        default_unit: newValue,
      },
    }));

    // ✅ Optimistically update UI
    setUnits((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [unitName]: { ...prev[category][unitName], default: newValue },
      },
    }));
  };

  const handleAddCustomUnit = async () => {
    if (
      !newCustomUnit.name.trim() ||
      !newCustomUnit.default.trim() ||
      !newCustomUnit.options.trim()
    ) {
      toast.error("All fields are required.");
      return;
    }

    try {
      // ✅ Ensure options are sent as a **list**
      const optionsArray = newCustomUnit.options
        .split(",")
        .map((opt) => opt.trim());

      await api.post(`/settings/units/custom_units/${newCustomUnit.name}`, {
        category: "custom_units", // ✅ Correct category
        unit_type: newCustomUnit.name, // ✅ This is the unit category
        unit_name: newCustomUnit.default, // ✅ Correctly maps to `unit_name`
        symbol: optionsArray, // ✅ Store options list
      });

      fetchUnits();
      setIsDialogOpen(false);
      toast.success("Custom unit added successfully!");
    } catch (error) {
      toast.error("Failed to add custom unit.");
    }
  };

  const handleDeleteCustomUnit = async (unitType: string) => {
    try {
      await api.delete(`/settings/units/custom_units/${unitType}`);
      fetchUnits(); // ✅ Refresh the UI after deleting
      toast.success(`Custom unit '${unitType}' deleted successfully!`);
    } catch (error) {
      toast.error("Failed to delete custom unit.");
    }
  };

  const saveChanges = async () => {
    try {
      // ✅ Group pending changes by category (e.g., "basic_units")
      const updatesByCategory: Record<string, Record<string, string>> = {};

      for (const key in pendingChanges) {
        const { category, unitName, default_unit } = pendingChanges[key];

        if (!updatesByCategory[category]) {
          updatesByCategory[category] = {};
        }
        updatesByCategory[category][unitName] = default_unit;
      }

      // ✅ Send each category update in a **single** request
      for (const category in updatesByCategory) {
        await api.put(
          `/settings/units/${category}`,
          updatesByCategory[category]
        );
      }

      setPendingChanges({}); // ✅ Clear pending changes
      toast.success("All unit settings updated successfully!");
      fetchUnits(); // ✅ Refresh the UI after update
    } catch (error) {
      console.error("API Error:", error);
      toast.error("Failed to save unit settings.");
    }
  };

  // ✅ Enter edit mode & store original values
  const handleEditCustomUnit = (unitType: string) => {
    setEditingUnit(unitType);
    setEditValues({
      unitName: units.custom_units[unitType].default,
      options: [...units.custom_units[unitType].options],
    });
  };

  // ✅ Cancel edit mode & restore original values
  const handleCancelEdit = (unitType: string) => {
    setEditingUnit(null);
    setEditValues({
      unitName: "",
      options: [],
    });
  };

  // ✅ Save changes & exit edit mode
  const handleSaveCustomUnit = async (unitType: string) => {
    try {
      await api.put(`/settings/units/custom_units/${unitType}`, {
        unit_name: editValues.unitName,
        symbol: editValues.options,
      });

      setUnits((prev: any) => ({
        ...prev,
        custom_units: {
          ...prev.custom_units,
          [unitType]: {
            default: editValues.unitName,
            options: editValues.options,
          },
        },
      }));

      toast.success(`Custom unit '${unitType}' updated successfully!`);
      setEditingUnit(null);
    } catch (error) {
      toast.error("Failed to update custom unit.");
    }
  };

  return (
    <div className="p-6 w-full">
      <div className="inline-flex justify-between w-full">
        <h1 className="text-2xl font-bold mb-4">Unit Settings</h1>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : units ? (
        <>
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="inline-flex justify-between w-full">
                <h2 className="text-lg font-semibold mb-4">Basic Units</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={saveChanges}
                    disabled={Object.keys(pendingChanges).length === 0}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      fetchUnits(); // ✅ Re-fetch original values
                      setPendingChanges({}); // ✅ Clear any tracked changes
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <Separator className="mb-4" />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Unit Type</TableHead>
                    <TableHead className="w-[250px]">Default Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(units.basic_units || {}).map((category) => (
                    <TableRow key={category}>
                      {/* ✅ Unit Type */}
                      <TableCell className="font-semibold">
                        {category.replace("_", " ").toUpperCase()}
                      </TableCell>

                      {/* ✅ Select Dropdown for Default Unit */}
                      <TableCell>
                        <Select
                          value={units.basic_units[category].default}
                          onValueChange={(value) =>
                            handleUnitChange("basic_units", category, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {units.basic_units[category].default}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {units.basic_units[category].options.map(
                              (option: string) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <h2 className="text-lg font-semibold mb-4 mt-4">
                Machining Units
              </h2>
              <Separator className="mb-4" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Unit Type</TableHead>
                    <TableHead className="w-[250px]">Default Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(units.machining_units || {}).map((category) => (
                    <TableRow key={category}>
                      {/* ✅ Unit Type */}
                      <TableCell className="font-semibold">
                        {category.replace("_", " ").toUpperCase()}
                      </TableCell>

                      {/* ✅ Select Dropdown for Default Unit */}
                      <TableCell>
                        <Select
                          value={units.machining_units[category].default}
                          onValueChange={(value) =>
                            handleUnitChange("machining_units", category, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {units.machining_units[category].default}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {units.machining_units[category].options.length >
                            0 ? (
                              units.machining_units[category].options.map(
                                (option: string) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                )
                              )
                            ) : (
                              <SelectItem
                                value={units.machining_units[category].default}
                              >
                                {units.machining_units[category].default}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="inline-flex justify-between w-full">
                <h2 className="text-lg font-semibold mb-4">Custom Units</h2>
                <div className="flex gap-2">
                  <Button onClick={() => setIsDialogOpen(true)}>
                    Add Custom Unit
                  </Button>
                </div>
              </div>
              <Separator className="mb-4" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Category</TableHead>
                    <TableHead className="w-[150px]">Default Unit</TableHead>
                    <TableHead className="w-[250px]">Options</TableHead>
                    <TableHead className="w-[150px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(units.custom_units || {}).map((unitType) => {
                    const isEditing = editingUnit === unitType;

                    return (
                      <TableRow key={unitType}>
                        {/* ✅ Category Name */}
                        <TableCell className="font-semibold">
                          {unitType.replace("_", " ").toUpperCase()}
                        </TableCell>

                        {/* ✅ Editable Default Unit */}
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editValues.unitName}
                              onChange={(e) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  unitName: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            units.custom_units[unitType].default
                          )}
                        </TableCell>

                        {/* ✅ Editable Options */}
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editValues.options.join(", ")}
                              onChange={(e) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  options: e.target.value
                                    .split(",")
                                    .map((opt) => opt.trim()),
                                }))
                              }
                            />
                          ) : (
                            units.custom_units[unitType].options.join(", ")
                          )}
                        </TableCell>

                        {/* ✅ Action Buttons */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveCustomUnit(unitType)}
                                >
                                  <Check />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelEdit(unitType)}
                                >
                                  <X />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditCustomUnit(unitType)}
                              >
                                <Pencil />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="hover:text-destructive"
                              onClick={() => handleDeleteCustomUnit(unitType)}
                            >
                              <Trash />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-gray-500">Failed to load settings.</p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Unit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Unit Name</Label>
            <Input
              type="text"
              value={newCustomUnit.name}
              onChange={(e) =>
                setNewCustomUnit({ ...newCustomUnit, name: e.target.value })
              }
            />
            <Label>Default Value</Label>
            <Input
              type="text"
              value={newCustomUnit.default}
              onChange={(e) =>
                setNewCustomUnit({ ...newCustomUnit, default: e.target.value })
              }
            />
            <Label>Options (comma-separated)</Label>
            <Input
              type="text"
              value={newCustomUnit.options}
              onChange={(e) =>
                setNewCustomUnit({ ...newCustomUnit, options: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button onClick={handleAddCustomUnit}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
