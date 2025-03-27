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
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { toast } from "sonner";

interface RawMaterialDetailsProps {
  rawMaterial: {
    raw_material_details?: {
      material_id?: number;
      profile_id?: number;
    };
  };
  onUpdate: (data: any) => void;
}

export default function RawMaterialDetails({
  rawMaterial,
  onUpdate,
}: RawMaterialDetailsProps) {
  const part = rawMaterial;
  const [editing, setEditing] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [units, setUnits] = useState<{ [key: string]: string[] }>({});

  const [materialId, setMaterialId] = useState<number | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

  const [rawDetails, setRawDetails] = useState(
    part?.raw_material_details || {}
  );

  useEffect(() => {
    fetchMaterials();
    fetchProfiles();
    fetchUnits();
  }, []);

  useEffect(() => {
    if (part?.raw_material_details) {
      setRawDetails(part.raw_material_details);
      setMaterialId(part.raw_material_details.material_id || null);
      setProfileId(part.raw_material_details.profile_id || null);
    }
  }, [part]);

  useEffect(() => {
    if (profileId) {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile) setSelectedProfile(profile);
    }
  }, [profileId, profiles]);

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

  const localMaterial = materials.find((m) => m.id === materialId);

  return (
    <div className="border border-gray-300 p-4 rounded-2xl shadow-md space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Raw Material</h3>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={() => onUpdate(rawDetails)}>Save</Button>
          </div>
        ) : (
          <Button onClick={() => setEditing(true)}>Edit</Button>
        )}
      </div>

      <p>
        Material Type: <strong>{localMaterial?.type || "N/A"}</strong>
      </p>

      {editing && (
        <div className="space-y-4">
          {/* Material Selector */}
          <div>
            <Label>Material</Label>
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

          {/* Profile Selector */}
          <div>
            <Label>Profile</Label>
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

          {/* Profile SVG Preview */}
          {selectedProfile?.profile_svg && (
            <div className="my-4 p-2 border rounded bg-white shadow-sm">
              <img
                src={selectedProfile.profile_svg}
                alt="Profile Diagram"
                className="max-w-md w-full mx-auto"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
