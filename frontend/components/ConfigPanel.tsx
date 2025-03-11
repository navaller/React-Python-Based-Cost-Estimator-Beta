"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";

export default function ConfigPanel() {
  const [materials, setMaterials] = useState<{
    [key: string]: {
      density: number;
      block_price: number;
      sheet_price: number;
    };
  }>({});
  const [newMaterial, setNewMaterial] = useState("");
  const [newDensity, setNewDensity] = useState("");
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

  const updateMaterial = async (
    name: string,
    field: "density" | "block_price" | "sheet_price",
    value: string
  ) => {
    if (!value || isNaN(parseFloat(value))) return;

    try {
      await axios.put("http://127.0.0.1:8000/materials/", null, {
        params: { name, [field]: parseFloat(value) },
      });

      setMaterials({
        ...materials,
        [name]: { ...materials[name], [field]: parseFloat(value) },
      });
    } catch (error) {
      console.error("Failed to update material:", error);
    }
  };

  const addMaterial = async () => {
    if (!newMaterial || !newDensity || isNaN(parseFloat(newDensity))) {
      alert("Enter valid material name and density.");
      return;
    }

    try {
      await axios.post("http://127.0.0.1:8000/materials/", null, {
        params: { name: newMaterial, density: parseFloat(newDensity) },
      });

      setNewMaterial("");
      setNewDensity("");
      fetchMaterials();
    } catch (error) {
      setError("Failed to add material.");
      console.error(error);
    }
  };

  const deleteMaterial = async (name: string) => {
    try {
      await axios.delete("http://127.0.0.1:8000/materials/", {
        params: { name },
      });
      fetchMaterials();
    } catch (error) {
      setError("Failed to delete material.");
      console.error(error);
    }
  };

  return (
    <Card className="border border-gray-300 shadow-md">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-lg font-semibold">Material List</h3>

        {Object.entries(materials).map(
          ([name, { density, block_price, sheet_price }]) => (
            <div key={name} className="flex items-center space-x-2">
              <Input value={name} className="w-40" disabled />
              <Input
                type="number"
                value={density}
                onChange={(e) =>
                  updateMaterial(name, "density", e.target.value)
                }
                className="w-24"
              />
              <Input
                type="number"
                value={block_price}
                onChange={(e) =>
                  updateMaterial(name, "block_price", e.target.value)
                }
                placeholder="Block Price"
                className="w-24"
              />
              <Input
                type="number"
                value={sheet_price}
                onChange={(e) =>
                  updateMaterial(name, "sheet_price", e.target.value)
                }
                placeholder="Sheet Price"
                className="w-24"
              />
              <Button
                variant="destructive"
                size="icon"
                onClick={() => deleteMaterial(name)}
              >
                <Trash size={18} />
              </Button>
            </div>
          )
        )}

        <div className="flex space-x-2 mt-4">
          <Input
            placeholder="Material Name"
            value={newMaterial}
            onChange={(e) => setNewMaterial(e.target.value)}
            className="w-40"
          />
          <Input
            placeholder="Density (g/cm³)"
            type="number"
            value={newDensity}
            onChange={(e) => setNewDensity(e.target.value)}
            className="w-24"
          />
          <Button onClick={addMaterial}>Add</Button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </CardContent>
    </Card>
  );
}
