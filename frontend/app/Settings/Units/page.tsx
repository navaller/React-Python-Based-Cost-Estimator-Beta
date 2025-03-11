"use client";

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

export default function UnitsSettings() {
  const [units, setUnits] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: "", type: "basic_units" });

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/units");
      console.log("Fetched Units:", response.data);
      setUnits(response.data);
    } catch (error) {
      toast.error("Failed to fetch unit settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnitChange = (category: string, newUnit: string) => {
    setUnits((prev: any) => ({
      ...prev,
      basic_units: {
        ...prev.basic_units,
        [category]: {
          ...prev.basic_units[category],
          default: newUnit,
        },
      },
    }));
  };

  const handleMachiningUnitChange = (category: string, newUnit: string) => {
    setUnits((prev: any) => ({
      ...prev,
      machining_units: {
        ...prev.machining_units,
        [category]: {
          ...prev.machining_units[category],
          default: newUnit,
        },
      },
    }));
  };

  const saveChanges = async () => {
    setLoading(true);
    try {
      await axios.put("/settings/", { settings: { units } });
      toast.success("Unit settings updated successfully!");
    } catch (error) {
      toast.error("Failed to update unit settings.");
    } finally {
      setLoading(false);
    }
  };

  const addNewUnit = () => {
    if (!newUnit.name.trim()) {
      toast.error("Unit name cannot be empty.");
      return;
    }
    setUnits((prev: any) => ({
      ...prev,
      [newUnit.type]: {
        ...prev[newUnit.type],
        [newUnit.name]: {
          default: "",
          options: [],
        },
      },
    }));
    setIsDialogOpen(false);
    setNewUnit({ name: "", type: "basic_units" });
  };

  return (
    <div className="p-6 w-full">
      <div className="inline-flex justify-between w-full">
        <h1 className="text-2xl font-bold mb-4">Unit Settings</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsDialogOpen(true)}>Add Unit</Button>
          <Button onClick={saveChanges} disabled={loading}>
            Save Changes
          </Button>
          <Button variant="outline" onClick={fetchUnits}>
            Reset
          </Button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {units ? (
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
                          handleUnitChange(category, value)
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
                  <h2 className="text-lg font-semibold mb-2">
                    Machining Units
                  </h2>
                  {Object.keys(units.machining_units || {}).map((category) => (
                    <div key={category} className="mb-4 grid grid-cols-6">
                      <Label>{category.replace("_", " ").toUpperCase()}</Label>
                      <Select
                        value={units.machining_units[category].default}
                        onValueChange={(value) =>
                          handleMachiningUnitChange(category, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {units.machining_units[category].default}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {units.machining_units[category].options.map(
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
            </>
          ) : (
            <p className="text-gray-500">Failed to load settings.</p>
          )}
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Unit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Unit Name</Label>
            <Input
              type="text"
              value={newUnit.name}
              onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
            />
            <Label>Unit Type</Label>
            <Select
              value={newUnit.type}
              onValueChange={(value) => setNewUnit({ ...newUnit, type: value })}
            >
              <SelectTrigger>
                <SelectValue>
                  {newUnit.type.replace("_", " ").toUpperCase()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic_units">Basic Units</SelectItem>
                <SelectItem value="machining_units">Machining Units</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={addNewUnit}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
