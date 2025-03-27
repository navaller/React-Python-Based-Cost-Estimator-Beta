"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";
import { convertUnits, normalizeUnit } from "@/lib/unitUtils";
import { Label } from "@/components/ui/label";

interface GeometryDetailsProps {
  part: any;
  onUpdate: (updatedFields: Partial<any>) => void;
}

export default function GeometryDetails({
  part,
  onUpdate,
}: GeometryDetailsProps) {
  const [editing, setEditing] = useState(false);
  const [localGeometry, setLocalGeometry] = useState(
    part?.geometry_details || {}
  );
  const [isManual, setIsManual] = useState(part?.is_manual ?? false);
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    if (part?.geometry_details) {
      setLocalGeometry(part.geometry_details);
      setIsManual(part.is_manual ?? false);
    }
    fetchUnits();
  }, [part]);

  const fetchUnits = async () => {
    try {
      const response = await api.get("/settings/units/symbols");
      setUnits(response.data);
    } catch (err) {
      toast.error("Failed to fetch unit symbols.");
    }
  };

  const handleChange = (path: string, value: number | string) => {
    const keys = path.split(".");
    const updated = { ...localGeometry };
    let ref: any = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      ref[keys[i]] = ref[keys[i]] || {};
      ref = ref[keys[i]];
    }
    ref[keys[keys.length - 1]] = value;
    setLocalGeometry(updated);
  };

  const handleUnitChange = (section: string, newUnit: string) => {
    const currentUnit = localGeometry[section]?.unit;
    if (!currentUnit || currentUnit === newUnit) return;

    const converted = { ...localGeometry };
    const keysToConvert =
      section === "bounding_box" ? ["width", "depth", "height"] : ["value"];

    keysToConvert.forEach((key) => {
      converted[section][key] = convertUnits(
        converted[section][key],
        normalizeUnit(currentUnit),
        normalizeUnit(newUnit)
      );
    });

    converted[section].unit = newUnit;
    setLocalGeometry(converted);
  };

  const handleSave = async () => {
    try {
      await api.put(`/parts/${part.part_id}/`, {
        geometry_details: localGeometry,
        is_manual: isManual,
        modified_by: "ui",
      });
      onUpdate({ geometry_details: localGeometry, is_manual: isManual });
      toast.success("Geometry updated.");
      setEditing(false);
    } catch (err) {
      toast.error("Failed to update geometry.");
    }
  };

  const handleRecalculate = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/cad/recalculate/${part.part_id}`);
      onUpdate(response.data.data);
      toast.success("Geometry recalculated from CAD file.");
    } catch (err) {
      toast.error("Recalculation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!part?.geometry_details) {
    return <p className="text-sm text-muted">No geometry data available.</p>;
  }

  return (
    <div className="border border-gray-300 p-4 rounded-2xl shadow-md space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Geometry</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="manual-mode-toggle">Manual Mode</Label>
          <Switch
            id="manual-mode-toggle"
            checked={isManual}
            onCheckedChange={async (checked) => {
              setIsManual(checked);
              try {
                await api.put(`/parts/${part.part_id}/`, {
                  is_manual: checked,
                  modified_by: "ui",
                });
                onUpdate({ is_manual: checked });
                toast.success("Manual mode updated.");
                setEditing(checked); // only enable editing on toggle ON
              } catch (err) {
                toast.error("Failed to update manual mode.");
              }
            }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {/* Bounding Box Section */}
        <div>
          <p className="font-semibold mb-2">Bounding Box</p>
          <div className="grid grid-cols-3 pl-4 gap-2 items-center">
            <div className="space-y-4 col-span-2">
              {["width", "depth", "height"].map((dim) => (
                <div key={dim} className="flex gap-3">
                  <Label
                    htmlFor={`bounding-box-${dim}`}
                    className="mb-1 capitalize"
                  >
                    {dim}:
                  </Label>
                  <Input
                    id={`bounding-box-${dim}`}
                    className="w-60"
                    type="number"
                    value={localGeometry.bounding_box?.[dim] || ""}
                    disabled={!editing}
                    onChange={(e) =>
                      handleChange(
                        `bounding_box.${dim}`,
                        parseFloat(e.target.value)
                      )
                    }
                    placeholder={dim}
                  />
                </div>
              ))}
            </div>
            <div className="col-span-1">
              <Select
                value={localGeometry.bounding_box?.unit}
                onValueChange={(unit) => handleUnitChange("bounding_box", unit)}
                disabled={!editing}
              >
                <SelectTrigger className="col-span-1">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {(units.length || []).map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Volume Section */}
        <div className="flex gap-2 items-center">
          <p className="font-semibold">Volume</p>
          <div className="flex gap-2">
            <Input
              className="w-60"
              type="number"
              disabled={!editing}
              value={localGeometry.volume?.value || ""}
              onChange={(e) =>
                handleChange("volume.value", parseFloat(e.target.value))
              }
            />
            <Select
              value={localGeometry.volume?.unit}
              disabled={!editing}
              onValueChange={(unit) => handleUnitChange("volume", unit)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {(units.volume || []).map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Surface Area Section */}
        <div className="flex gap-2 items-center">
          <p className="font-semibold">Surface Area</p>
          <div className="flex gap-2">
            <Input
              className="w-60"
              disabled={!editing}
              type="number"
              value={localGeometry.surface_area?.value || ""}
              onChange={(e) =>
                handleChange("surface_area.value", parseFloat(e.target.value))
              }
            />
            <Select
              value={localGeometry.surface_area?.unit}
              disabled={!editing}
              onValueChange={(unit) => handleUnitChange("surface_area", unit)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {(units.area || []).map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div>
            Faces: <strong>{localGeometry.faces}</strong>
          </div>
          <div>
            Edges: <strong>{localGeometry.edges}</strong>
          </div>
          <div>
            Components: <strong>{localGeometry.components}</strong>
          </div>
        </div>
      </div>

      {isManual ? (
        <div className="mt-4 flex justify-end gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>Edit</Button>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <Button onClick={handleRecalculate} disabled={loading}>
            {loading ? "Recalculating..." : "Recalculate from CAD"}
          </Button>
        </div>
      )}
    </div>
  );
}
