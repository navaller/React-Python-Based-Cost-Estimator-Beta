"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/cad/upload/?project_id=${projectId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (response.data.status === "success") {
        setUploadedPartId(response.data.data.part_id);
        // ✅ Use Intercepting Route Instead of Full Navigation
        router.push(`/Parts/${response.data.data.part_id}`);
      }
    } catch (error) {
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
          <p>Loading part details...</p> // ✅ This will be replaced by the intercepted modal
        ) : (
          <>
            <Input type="file" onChange={handleFileChange} accept=".step" />
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
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
