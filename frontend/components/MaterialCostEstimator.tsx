"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface MaterialCostEstimatorProps {
  fileName: string | null;
}

export default function MaterialCostEstimator({
  fileName,
}: MaterialCostEstimatorProps) {
  const [materials, setMaterials] = useState<{ [key: string]: any }>({});
  const [classifications, setClassifications] = useState<string[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<
    string | null
  >(null);
  const [cost, setCost] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMaterials() {
      try {
        const response = await axios.get("http://127.0.0.1:8000/materials/");
        setMaterials(response.data);
      } catch (error) {
        console.error("Error fetching materials:", error);
      }
    }

    async function fetchClassifications() {
      try {
        const response = await axios.get(
          "http://127.0.0.1:8000/part_classifications/"
        );
        setClassifications(response.data);
      } catch (error) {
        console.error("Error fetching classifications:", error);
      }
    }

    fetchMaterials();
    fetchClassifications();
  }, []);

  const calculateCost = async () => {
    if (!fileName || !selectedMaterial || !selectedClassification) {
      setError("Please select a file, material, and classification.");
      return;
    }

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/calculate_material_cost/",
        {
          file_name: fileName,
          material: selectedMaterial,
          classification: selectedClassification,
        }
      );

      setWeight(response.data.material_cost.weight_kg);
      setCost(response.data.material_cost.cost);
      setError(null);
    } catch (error) {
      setError("Error calculating cost.");
      console.error(error);
    }
  };

  return (
    <Card className="border border-gray-300 shadow-md mt-4">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold">Material Cost Estimator</h3>

        {/* Material Selector */}
        <Select onValueChange={setSelectedMaterial}>
          {Object.keys(materials).map((material) => (
            <SelectItem key={material} value={material}>
              {material} (Density: {materials[material].density} g/cm³)
            </SelectItem>
          ))}
        </Select>

        {/* Part Classification Selector */}
        <Select onValueChange={setSelectedClassification}>
          {classifications.map((classification) => (
            <SelectItem key={classification} value={classification}>
              {classification}
            </SelectItem>
          ))}
        </Select>

        {/* Calculate Cost Button */}
        <Button onClick={calculateCost} className="mt-4 w-full">
          Calculate Cost
        </Button>

        {/* Display Cost and Weight */}
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {cost !== null && (
          <div className="mt-4 text-sm">
            <p>
              <strong>Estimated Weight:</strong> {weight?.toFixed(2)} kg
            </p>
            <p>
              <strong>Total Material Cost:</strong> ${cost?.toFixed(2)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
