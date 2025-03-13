"use client";

//* app/settings/units/unit_settings.tsx *//
import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
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
      await api.post(`/settings/units/custom_units/${newCustomUnit.name}`, {
        default: newCustomUnit.default,
        options: newCustomUnit.options.split(",").map((opt) => opt.trim()),
      });
      fetchUnits();
      setIsDialogOpen(false);
      toast.success("Custom unit added successfully!");
    } catch (error) {
      toast.error("Failed to add custom unit.");
    }
  };

  const handleDeleteCustomUnit = async (unitName: string) => {
    try {
      await api.delete(`/settings/units/custom_units/${unitName}`);
      fetchUnits();
      toast.success("Custom unit deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete custom unit.");
    }
  };

  const saveChanges = async () => {
    try {
      for (const key in pendingChanges) {
        const { category, unitName, default_unit } = pendingChanges[key];

        // ✅ Send API request & log the response
        const response = await api.put(
          `/settings/units/${category}/${unitName}`,
          { default: default_unit }
        );
        console.log("API Response:", response.data);

        // ✅ Manually update the state
        setUnits((prev: any) => ({
          ...prev,
          [category]: {
            ...prev[category],
            [unitName]: { ...prev[category][unitName], default: default_unit },
          },
        }));
      }

      setPendingChanges({}); // ✅ Clear pending changes
      toast.success("All changes saved successfully!");
    } catch (error) {
      console.error("API Error:", error);
      toast.error("Failed to save changes.");
    }
  };

  return (
    <div className="p-6 w-full">
      <div className="inline-flex justify-between w-full">
        <h1 className="text-2xl font-bold mb-4">Unit Settings</h1>
        <div className="flex gap-2">
          <Button
            onClick={saveChanges}
            disabled={Object.keys(pendingChanges).length === 0}
          >
            Save Changes
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>Add Custom Unit</Button>
          <Button variant="outline" onClick={fetchUnits}>
            Reset
          </Button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : units ? (
        <>
          <Card className="mb-4">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-2">Basic Units</h2>
              {Object.keys(units.basic_units || {}).map((category) => (
                <div key={category} className="mb-4 grid grid-cols-6">
                  <Label>{category.replace("_", " ").toUpperCase()}</Label>
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
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-2">Custom Units</h2>
              {Object.keys(units.custom_units || {}).map((unit) => (
                <div key={unit} className="mb-4 grid grid-cols-6 items-center">
                  <Label>{unit.replace("_", " ").toUpperCase()}</Label>
                  <span>{units.custom_units[unit].default}</span>
                  <span>{units.custom_units[unit].options.join(", ")}</span>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteCustomUnit(unit)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
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
