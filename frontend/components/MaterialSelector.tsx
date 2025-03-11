"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

export default function MaterialSelector({ volume }: { volume: number }) {
  const [materials, setMaterials] = useState<{
    [key: string]: { density: number };
  }>({});
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [density, setDensity] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/materials/");
      setMaterials(response.data);
    } catch (error) {
      console.error("Failed to fetch materials:", error);
    }
  };

  const handleMaterialChange = (materialName: string) => {
    setSelectedMaterial(materialName);
    setDensity(materials[materialName]?.density || null);
  };

  const calculateWeight = async () => {
    if (!selectedMaterial || !density) {
      alert("Please select a material.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/calculate_weight/",
        null,
        {
          params: { volume, density },
        }
      );

      setWeight(response.data.weight);
    } catch (error) {
      setError("Error calculating weight.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-gray-300 shadow-md">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-lg font-semibold">Material Selection</h3>

        <Select onValueChange={handleMaterialChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a Material" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(materials).map((material) => (
              <SelectItem key={material} value={material}>
                {material} ({materials[material].density} g/cm³)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={calculateWeight} disabled={loading} className="w-full">
          {loading ? "Calculating..." : "Get Weight"}
        </Button>

        {weight !== null && (
          <p className="text-gray-700">
            <strong>Calculated Weight:</strong> {weight.toFixed(2)} grams
          </p>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </CardContent>
    </Card>
  );
}
