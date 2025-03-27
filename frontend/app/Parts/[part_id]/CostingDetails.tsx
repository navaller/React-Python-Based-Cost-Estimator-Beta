"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface CostingDetailsProps {
  costing: any;
  onUpdate: (updatedFields: Partial<any>) => void;
}

export default function CostingDetails({
  costing,
  onUpdate,
}: CostingDetailsProps) {
  const [editing, setEditing] = useState(false);
  const [localCosting, setLocalCosting] = useState(costing);

  const handleChange = (field: string, value: any) => {
    const updatedCosting = {
      ...localCosting,
      [field]: value,
    };
    setLocalCosting(updatedCosting);
    onUpdate({ costing_details: updatedCosting });
  };

  return (
    <div className="border border-gray-300 p-4 rounded-md shadow-md">
      <h3 className="text-lg font-semibold mb-2">Costing Details</h3>

      <div className="space-y-2">
        <p>
          <strong>Material Cost:</strong>{" "}
          {editing ? (
            <Input
              type="number"
              value={localCosting.material_cost || ""}
              onChange={(e) =>
                handleChange("material_cost", parseFloat(e.target.value))
              }
              className="w-24"
            />
          ) : (
            `$${localCosting.material_cost || "N/A"}`
          )}
        </p>

        <p>
          <strong>Machining Cost:</strong>{" "}
          {editing ? (
            <Input
              type="number"
              value={localCosting.machining_cost || ""}
              onChange={(e) =>
                handleChange("machining_cost", parseFloat(e.target.value))
              }
              className="w-24"
            />
          ) : (
            `$${localCosting.machining_cost || "N/A"}`
          )}
        </p>

        <p>
          <strong>Total Cost:</strong>{" "}
          {editing ? (
            <Input
              type="number"
              value={localCosting.total_cost || ""}
              onChange={(e) =>
                handleChange("total_cost", parseFloat(e.target.value))
              }
              className="w-24"
            />
          ) : (
            `$${localCosting.total_cost || "N/A"}`
          )}
        </p>
      </div>

      <button
        className="mt-2 text-blue-500"
        onClick={() => setEditing(!editing)}
      >
        {editing ? "Save" : "Edit"}
      </button>
    </div>
  );
}
