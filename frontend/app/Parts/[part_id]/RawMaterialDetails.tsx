"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { convertUnits, normalizeUnit } from "@/lib/unitUtils";
import { Separator } from "@/components/ui/separator";

interface RawMaterialDetailsProps {
  part: any;
  onUpdate: (data: any) => void;
}

export default function RawMaterialDetails({
  part,
  onUpdate,
}: RawMaterialDetailsProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [units, setUnits] = useState<{ [key: string]: string[] }>({});
  const [classifications, setClassifications] = useState<any[]>([]);

  const [materialId, setMaterialId] = useState<number | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [boundingBoxModalOpen, setBoundingBoxModalOpen] = useState(false);
  const [margins, setMargins] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });
  const [dimensions, setDimensions] = useState<{ [key: string]: number }>({});
  const [dimensionsUnit, setDimensionsUnit] = useState<string>("mm");
  const [originalState, setOriginalState] = useState<any>({});

  const [volume, setVolume] = useState<number>(0);
  const [volumeUnit, setVolumeUnit] = useState<string>("mm³");
  const [weight, setWeight] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);

  const isMachined = classifications.find(
    (cls) => cls.id === part?.classification_id && cls.name === "Machined Part"
  );

  useEffect(() => {
    fetchMaterials();
    fetchProfiles();
    fetchUnits();
    fetchClassifications();
  }, []);

  useEffect(() => {
    if (part?.raw_material_details) {
      const details = part.raw_material_details;
      setMaterialId(details.material_id || null);
      setProfileId(details.profile_id || null);
      setMargins(details.bounding_box_margin || { x: 0, y: 0, z: 0 });
      setDimensions(details.dimensions || {});
      setDimensionsUnit(details.dimensions_unit || "mm");
      setVolumeUnit(details.volume_unit || "mm³");
      setOriginalState(details);
    }
  }, [part]);

  useEffect(() => {
    if (profileId && profiles.length > 0) {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile) {
        setSelectedProfile(profile);
        const fields = profile.fields_json || {};
        const restoredDims: { [key: string]: number } = {};
        Object.keys(fields).forEach((key) => {
          restoredDims[key] = dimensions[key] ?? 0;
        });
        setDimensions(restoredDims);
      }
    }
  }, [profileId, profiles]);

  useEffect(() => {
    calculateVolumeWeightCost();
  }, [dimensions, materials, materialId, dimensionsUnit]);

  useEffect(() => {
    if (volumeUnit !== "mm³") {
      const converted = convertUnits(
        volume,
        normalizeUnit("mm³"),
        normalizeUnit(volumeUnit)
      );
      setVolume(converted);
    }
  }, [volumeUnit]);

  const fetchMaterials = async () => {
    try {
      const res = await api.get("/settings/materials/");
      setMaterials(res.data);
    } catch {
      toast.error("Failed to fetch materials");
    }
  };

  const fetchProfiles = async () => {
    try {
      const res = await api.get("/settings/profiles/");
      setProfiles(res.data);
    } catch {
      toast.error("Failed to fetch profiles");
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await api.get("/settings/units/symbols");
      setUnits(res.data);
    } catch {
      toast.error("Failed to fetch unit symbols");
    }
  };

  const fetchClassifications = async () => {
    try {
      const res = await api.get("/settings/part_classification");
      setClassifications(res.data);
    } catch {
      toast.error("Failed to fetch classifications");
    }
  };

  const convertAllDimensions = (oldUnit: string, newUnit: string) => {
    const updatedDims: { [key: string]: number } = {};
    for (const key in dimensions) {
      updatedDims[key] = convertUnits(
        dimensions[key],
        normalizeUnit(oldUnit),
        normalizeUnit(newUnit)
      );
    }
    setDimensions(updatedDims);
  };

  const calculateVolumeWeightCost = () => {
    let vol = 1;
    Object.values(dimensions).forEach((val) => {
      vol *= val || 1;
    });
    setVolume(vol);

    const material = materials.find((m) => m.id === materialId);
    const density = material?.density || 0;
    const wt = (vol * density) / 1_000_000;
    setWeight(wt);

    const pricePerKg = 100;
    setCost(wt * pricePerKg);
  };

  const hasChanges =
    JSON.stringify({
      material_id: materialId,
      profile_id: profileId,
      bounding_box_margin: margins,
      dimensions,
      dimensions_unit: dimensionsUnit,
      volume_unit: volumeUnit,
    }) !==
    JSON.stringify({
      material_id: originalState.material_id,
      profile_id: originalState.profile_id,
      bounding_box_margin: originalState.bounding_box_margin,
      dimensions: originalState.dimensions,
      dimensions_unit: originalState.dimensions_unit,
      volume_unit: originalState.volume_unit,
    });

  const handleReset = () => {
    if (!originalState) return;
    setMaterialId(originalState.material_id || null);
    setProfileId(originalState.profile_id || null);
    setMargins(originalState.bounding_box_margin || { x: 0, y: 0, z: 0 });
    setDimensions(originalState.dimensions || {});
    setDimensionsUnit(originalState.dimensions_unit || "mm");
    setVolumeUnit(originalState.volume_unit || "mm³");
  };

  const handleSave = async () => {
    try {
      const updatedRawDetails = {
        material_id: materialId,
        profile_id: profileId,
        bounding_box_margin: margins,
        dimensions,
        dimensions_unit: dimensionsUnit,
        volume,
        volume_unit: volumeUnit,
        weight,
        cost,
      };

      await api.put(`/parts/${part.part_id}/`, {
        raw_material_details: updatedRawDetails,
        modified_by: "ui",
      });
      onUpdate({ raw_material_details: updatedRawDetails });
      setOriginalState(updatedRawDetails);
      toast.success("Raw material updated.");
    } catch (err) {
      toast.error("Failed to update raw material.");
    }
  };

  const handleBoundingBoxApply = () => {
    const bbox = part?.geometry_details?.bounding_box || {
      width: 0,
      depth: 0,
      height: 0,
    };
    const newDims = {
      length: bbox.width + margins.x,
      width: bbox.depth + margins.y,
      height: bbox.height + margins.z,
    };
    setDimensions(newDims);
    setBoundingBoxModalOpen(false);
  };

  return (
    <div className="border border-gray-300 p-4 rounded-2xl shadow-md space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Raw Material Cost Estimate</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            Save
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-6">
          <div>
            <Label className="font-semibold mb-3 mt-3">Material</Label>
            <Select
              value={materialId?.toString()}
              onValueChange={(val) => setMaterialId(Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((mat) => (
                  <SelectItem key={mat.id} value={mat.id.toString()}>
                    {mat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="font-semibold mb-3 mt-3">Profile</Label>
            <Select
              value={profileId?.toString()}
              onValueChange={(val) => setProfileId(Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select profile" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id.toString()}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        {selectedProfile && (
          <div className="flex-1 gap-4">
            <div className="flex justify-between">
              <Label className="font-semibold mb-4 mt-4">
                Raw Material Dimensions
              </Label>
              {isMachined && (
                <Button
                  variant="outline"
                  onClick={() => setBoundingBoxModalOpen(true)}
                >
                  Use Bounding Box
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 pl-4">
              <div>
                {Object.keys(selectedProfile.fields_json || {}).map((field) => (
                  <div key={field}>
                    <Label className="mb-3 mt-3 capitalize">{field}</Label>
                    <Input
                      type="number"
                      value={
                        dimensions[field] !== undefined &&
                        !isNaN(dimensions[field])
                          ? dimensions[field]
                          : ""
                      }
                      onChange={(e) =>
                        setDimensions({
                          ...dimensions,
                          [field]: parseFloat(e.target.value),
                        })
                      }
                      placeholder={field}
                    />
                  </div>
                ))}
              </div>
              <div>
                <Label className="mb-3 mt-3">Unit</Label>
                <Select
                  value={dimensionsUnit}
                  onValueChange={(newUnit) => {
                    convertAllDimensions(dimensionsUnit, newUnit);
                    setDimensionsUnit(newUnit);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
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
        )}
        <Separator />

        <div className="space-y-4">
          <div className="flex gap-3">
            <Label className="font-semibold">Raw Material Volume:</Label>
            <Input value={volume} disabled className="w-50" />
            <Select
              value={volumeUnit}
              onValueChange={(unit) => setVolumeUnit(unit)}
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
          <div className="flex gap-3">
            <Label className="font-semibold">Raw Material Weight:</Label>
            <Input value={weight} disabled className="w-50" />
            <Select
              value={volumeUnit}
              onValueChange={(unit) => setVolumeUnit(unit)}
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
          <div className="flex gap-3">
            <Label className="font-semibold">Raw Material Cost:</Label>
            <Input value={cost.toFixed(2)} disabled className="w-50" />
            <p>₹</p>
          </div>
          <div className="flex gap-3">
            <Label className="font-semibold">
              Raw Material Transport Cost:
            </Label>
            <Input className="w-50" />
            <p>₹</p>
          </div>
          <Separator />
          <div className="flex gap-3 justify-end">
            <Label className="font-semibold">Estimated Cost:</Label>
            <Input className="w-50" />
            <p>₹</p>
          </div>
        </div>
      </div>

      <Dialog
        open={boundingBoxModalOpen}
        onOpenChange={setBoundingBoxModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Margins</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {(["x", "y", "z"] as Array<keyof typeof margins>).map((axis) => (
              <div key={axis}>
                <Label>{axis.toUpperCase()} Margin</Label>
                <Input
                  type="number"
                  value={margins[axis]}
                  onChange={(e) =>
                    setMargins({
                      ...margins,
                      [axis]: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setBoundingBoxModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleBoundingBoxApply}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
