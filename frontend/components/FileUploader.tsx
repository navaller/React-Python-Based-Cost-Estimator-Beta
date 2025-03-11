"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import MaterialSelector from "./MaterialSelector";
import ConfigPanel from "./ConfigPanel";
import RawMaterialSize from "./RawMaterialSize";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import MaterialCostEstimator from "./MaterialCostEstimator";

interface GeometryData {
  dimensions: { width: number; depth: number; height: number };
  surface_area: number;
  volume: number;
  center_of_mass: { x: number; y: number; z: number };
  faces: number;
  edges: number;
  component_count: number;
  machining_time: number;
}

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [geometry, setGeometry] = useState<GeometryData | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setError(null);
      setGeometry(null);
      setSvgUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a STEP file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setGeometry(null);
    setSvgUrl(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Upload STEP file
      const response = await axios.post(
        "http://127.0.0.1:8000/upload/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.status === "success") {
        setGeometry(response.data);
      } else {
        setError(response.data.message || "Failed to process the file.");
      }

      // Generate 2D Projection (SVG)
      const svgResponse = await axios.post(
        "http://127.0.0.1:8000/generate_svg/",
        null,
        {
          params: { file_name: file.name },
        }
      );

      if (svgResponse.data.status === "success") {
        setSvgUrl(svgResponse.data.svg_url);
      } else {
        setError("Failed to generate 2D projection.");
      }
    } catch (error) {
      setError("Upload failed. Please check the server.");
      console.error("Upload error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 flex flex-col items-center">
      {/* Upload Section */}
      <div className="w-full max-w-xl">
        <h2 className="text-xl font-semibold mb-2 text-center">
          Upload STEP File
        </h2>
        <div className="flex items-center gap-2">
          <Input type="file" onChange={handleFileChange} accept=".step" />
          <Button onClick={handleUpload} disabled={loading} className="w-1/3">
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </div>
        {error && (
          <p className="text-red-500 text-sm text-center mt-2">{error}</p>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 w-full max-w-7xl">
        {/* STEP File Analysis */}
        {geometry && (
          <Card className="border border-gray-300 shadow-md">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-lg font-semibold">STEP File Analysis</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <strong>Bounding Box:</strong>{" "}
                  {geometry.dimensions.width.toFixed(2)} ×{" "}
                  {geometry.dimensions.depth.toFixed(2)} ×{" "}
                  {geometry.dimensions.height.toFixed(2)} mm
                </p>
                <p>
                  <strong>Volume:</strong> {geometry.volume.toFixed(2)} mm³
                </p>
                <p>
                  <strong>Surface Area:</strong>{" "}
                  {geometry.surface_area.toFixed(2)} mm²
                </p>
                <p>
                  <strong>Center of Mass:</strong> X=
                  {geometry.center_of_mass.x.toFixed(2)}, Y=
                  {geometry.center_of_mass.y.toFixed(2)}, Z=
                  {geometry.center_of_mass.z.toFixed(2)}
                </p>
                <p>
                  <strong>Faces:</strong> {geometry.faces},{" "}
                  <strong>Edges:</strong> {geometry.edges}
                </p>
                <p>
                  <strong>Components in Assembly:</strong>{" "}
                  {geometry.component_count}
                </p>
                <p>
                  <strong>Machining Time:</strong>{" "}
                  {geometry.machining_time.toFixed(2)} minutes
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Material Selector (Placed in the second column) */}
        {geometry && <MaterialSelector volume={geometry.volume} />}

        {/* Raw Material Size */}
        {geometry && <RawMaterialSize fileName={file?.name || null} />}

        {/*{geometry && <MaterialCostEstimator fileName={file?.name || null} />}*/}

        {/* 2D Projection */}
        {svgUrl && (
          <Card className="border border-gray-300 shadow-md">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold">2D Projection</h3>
              <img
                src={svgUrl}
                alt="2D Projection"
                className="w-full h-auto mt-2 border rounded-md"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Config Panel Button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="mt-6">
            Open Config
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[600px]">
          <SheetHeader>
            <SheetTitle>Configuration Settings</SheetTitle>
          </SheetHeader>
          <ConfigPanel />
        </SheetContent>
      </Sheet>
    </div>
  );
}
