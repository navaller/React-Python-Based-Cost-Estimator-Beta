"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PartDetails from "@/app/Parts/[part_id]/page"; // Import Part Page Component

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
  const [error, setError] = useState<string | null>(null);
  const [uploadedPartId, setUploadedPartId] = useState<string | null>(null); // ✅ Store uploaded part ID
  const [loadingPart, setLoadingPart] = useState(false); // ✅ Track if we're waiting for the part
  const [partData, setPartData] = useState<any>(null); // ✅ Store fetched part data
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file.");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // ✅ Upload file and include `project_id`
      const response = await axios.post(
        `http://127.0.0.1:8000/cad/upload/?project_id=${projectId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.data.status === "success") {
        const newPartId = response.data.data.part_id;
        setUploadedPartId(newPartId);

        // ✅ Redirect to the part details page
        router.push(`/Parts/${newPartId}`);
      } else {
        setError("Upload failed. Please try again.");
      }
    } catch (error) {
      setError("Upload error. Please check the server.");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  // ✅ Fetch Part Details After Upload
  useEffect(() => {
    if (!uploadedPartId) return;

    const fetchPartDetails = async () => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/parts/${uploadedPartId}/`
        );
        setPartData(response.data);
        setLoadingPart(false);
      } catch (error) {
        console.error("Error fetching part:", error);
        setTimeout(fetchPartDetails, 1000); // 🔄 Retry fetching after 1s
      }
    };

    fetchPartDetails();
  }, [uploadedPartId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {uploadedPartId ? "Part Details" : "Add New Part"}
          </DialogTitle>
        </DialogHeader>

        {uploadedPartId ? (
          loadingPart ? (
            <p>Loading part details...</p> // ✅ Show loading state
          ) : partData ? (
            <PartDetails params={{ part_id: uploadedPartId }} /> // ✅ Render PartDetails when data is ready
          ) : (
            <p>Error loading part.</p>
          )
        ) : (
          // ✅ Show Upload Form Before Upload
          <>
            <Input type="file" onChange={handleFileChange} accept=".step" />
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
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
