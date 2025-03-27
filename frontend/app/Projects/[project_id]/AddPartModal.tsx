"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api"; // ✅ Use centralized API module
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

interface AddPartModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPartModal({
  projectId,
  isOpen,
  onClose,
}: AddPartModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedPartId, setUploadedPartId] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "manual">("upload"); // ✅ Toggle between Upload & Manual Entry
  const [classifications, setClassifications] = useState<
    { id: number; name: string }[]
  >([]);
  const [selectedClassification, setSelectedClassification] = useState<
    string | null
  >(null);
  const router = useRouter();

  // ✅ State for Manual Entry
  const [partName, setPartName] = useState("");
  const [boundingBox, setBoundingBox] = useState({
    width: "",
    depth: "",
    height: "",
  });
  const [volume, setVolume] = useState("");
  const [surfaceArea, setSurfaceArea] = useState("");

  // ✅ Fetch Classifications from Backend
  useEffect(() => {
    fetchClassifications();
    console.log({ classifications });
  }, []);

  const fetchClassifications = async () => {
    try {
      const response = await api.get(`/settings/part_classification/`);

      // ✅ Ensure response is an array and map it correctly
      if (Array.isArray(response.data)) {
        setClassifications(
          response.data.map((item: any) => ({ id: item.id, name: item.name }))
        );
      }
    } catch (error) {
      toast.error("Failed to fetch classifications.");
    }
  };

  // ✅ Handle File Selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  // ✅ Handle Upload Submission
  const handleUpload = async () => {
    if (!selectedFile || !selectedClassification) return;

    const classificationId = parseInt(selectedClassification, 10);

    if (!classificationId) {
      toast.error("Invalid classification selected.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile); // ✅ Only the file goes in FormData

    try {
      const response = await api.post(
        `cad/upload/?project_id=${projectId}&classification_id=${classificationId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.status === "success") {
        setUploadedPartId(response.data.data.part_id);
        router.push(`/Parts/${response.data.data.part_id}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload part.");
    } finally {
      setUploading(false);
    }
  };

  // ✅ Handle Manual Entry Submission
  const handleManualEntry = async () => {
    if (!partName || !selectedClassification) return;

    const classificationId = parseInt(selectedClassification, 10); // ✅ Convert back to integer

    if (isNaN(classificationId)) {
      toast.error("Invalid classification selected.");
      return;
    }

    const payload = {
      project_id: projectId,
      name: partName,
      classification_id: classificationId, // ✅ Send as an integer
      geometry_details: {
        bounding_box: { width: 0, depth: 0, height: 0, unit: "mm" },
        volume: { value: 0, unit: "mm³" },
        surface_area: { value: 0, unit: "mm²" },
      },
    };

    try {
      const response = await api.post("cad/manual_entry/", payload);
      if (response.data.status === "success") {
        setUploadedPartId(response.data.data.part_id);
        router.push(`/Parts/${response.data.data.part_id}`);
      }
    } catch (error) {
      console.error("Manual Entry Error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {uploadedPartId ? "Part Details" : "Add New Part"}
          </DialogTitle>
        </DialogHeader>

        {uploadedPartId ? (
          <p>Loading part details...</p> // ✅ This will be replaced by the intercepted modal
        ) : (
          <>
            {/* ✅ Mode Selector (Upload vs. Manual Entry) */}
            <Tabs
              defaultValue="upload"
              onValueChange={(value) => setMode(value as "upload" | "manual")}
            >
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="upload">Upload CAD File</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>

              {/* ✅ Upload Section */}
              <TabsContent value="upload">
                <Select
                  onValueChange={(value) => setSelectedClassification(value)}
                >
                  <SelectTrigger className="w-full mt-4 mb-4">
                    <SelectValue placeholder="Select Part Classification" />
                  </SelectTrigger>
                  <SelectContent>
                    {classifications.map((classification) => (
                      <SelectItem
                        key={classification.id}
                        value={classification.id.toString()}
                      >
                        {classification.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="file"
                  onChange={handleFileChange}
                  accept=".step"
                  className="mt-4 mb-4"
                />
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </TabsContent>

              {/* ✅ Manual Entry Section */}
              <TabsContent value="manual">
                <Input
                  placeholder="Part Name"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="mt-4 mb-4"
                />
                <Select
                  onValueChange={(value) => setSelectedClassification(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Part Classification" />
                  </SelectTrigger>
                  <SelectContent>
                    {classifications.map((classification) => (
                      <SelectItem
                        key={classification.id}
                        value={classification.id.toString()}
                      >
                        {classification.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleManualEntry} className="w-full mt-4">
                  Save Part
                </Button>
              </TabsContent>
            </Tabs>
          </>
        )}

        <DialogFooter>
          {uploadedPartId ? (
            <>
              <Button onClick={() => setUploadedPartId(null)} variant="outline">
                Add Another Part
              </Button>
              <Button onClick={onClose}>Close</Button>
            </>
          ) : (
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
