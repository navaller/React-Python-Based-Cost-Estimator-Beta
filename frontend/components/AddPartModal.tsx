"use client";

import { useState } from "react";
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
        setUploadedPartId(response.data.data.part_id); // ✅ Store the uploaded part ID
        router.push(
          `/Projects/${projectId}?part=${response.data.data.part_id}`,
          { scroll: false }
        );
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {uploadedPartId ? "Part Details" : "Add New Part"}
          </DialogTitle>
        </DialogHeader>

        {uploadedPartId ? (
          // ✅ Intercept the route and render the Part Page inside the modal
          <PartDetails params={{ part_id: uploadedPartId }} />
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
