"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface RawMaterialSizeProps {
  fileName: string | null;
}

export default function RawMaterialSize({ fileName }: RawMaterialSizeProps) {
  const [extraX, setExtraX] = useState(0);
  const [extraY, setExtraY] = useState(0);
  const [extraZ, setExtraZ] = useState(0);
  const [applySameExtra, setApplySameExtra] = useState(false);
  const [rawMaterialSize, setRawMaterialSize] = useState<{
    raw_x: number;
    raw_y: number;
    raw_z: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRawMaterialSize = async () => {
    if (!fileName) {
      setError("No STEP file uploaded.");
      return;
    }

    setError(null);
    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/raw_material_size/",
        {
          params: {
            file_name: fileName,
            extra_x: extraX,
            extra_y: applySameExtra ? extraX : extraY,
            extra_z: applySameExtra ? extraX : extraZ,
          },
        }
      );

      if (response.data.status === "success") {
        setRawMaterialSize(response.data.raw_material_size);
      } else {
        setRawMaterialSize(null);
        setError("Failed to calculate raw material size.");
      }
    } catch (error) {
      setRawMaterialSize(null);
      setError("Error fetching raw material size.");
      console.error(error);
    }
  };

  return (
    <Card className="border border-gray-300 shadow-md mt-4">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold">Raw Material Size</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <Input
            type="number"
            placeholder="Extra X (mm)"
            value={extraX}
            onChange={(e) => setExtraX(parseFloat(e.target.value) || 0)}
          />
          <Input
            type="number"
            placeholder="Extra Y (mm)"
            value={extraY}
            onChange={(e) => setExtraY(parseFloat(e.target.value) || 0)}
            disabled={applySameExtra}
          />
          <Input
            type="number"
            placeholder="Extra Z (mm)"
            value={extraZ}
            onChange={(e) => setExtraZ(parseFloat(e.target.value) || 0)}
            disabled={applySameExtra}
          />
        </div>

        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            id="applySame"
            checked={applySameExtra}
            onChange={() => setApplySameExtra(!applySameExtra)}
          />
          <label htmlFor="applySame" className="ml-2 text-sm">
            Apply same extra material to all axes
          </label>
        </div>

        <Button onClick={fetchRawMaterialSize} className="mt-4 w-full">
          Get Raw Material Size
        </Button>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        {rawMaterialSize && (
          <div className="mt-4 text-sm">
            <p>
              <strong>Raw Material X:</strong>{" "}
              {rawMaterialSize.raw_x.toFixed(2)} mm
            </p>
            <p>
              <strong>Raw Material Y:</strong>{" "}
              {rawMaterialSize.raw_y.toFixed(2)} mm
            </p>
            <p>
              <strong>Raw Material Z:</strong>{" "}
              {rawMaterialSize.raw_z.toFixed(2)} mm
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
