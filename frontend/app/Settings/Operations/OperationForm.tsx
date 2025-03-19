import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import api from "@/lib/api";
import Combobox from "@/components/ui/Combobox";
import MultiSelect from "@/components/ui/MultiSelect";

interface OperationFormProps {
  operationData: any;
  setOperationData: (data: any) => void;
  onSubmit: () => Promise<void>;
  costingDefaults: any[];
  units: { [key: string]: string[] };
  isEditing: boolean;
  uniqueCategories: any[];
}

export default function OperationForm({
  operationData,
  setOperationData,
  onSubmit,
  costingDefaults,
  units,
  isEditing,
  uniqueCategories,
}: OperationFormProps) {
  const [classifications, setClassifications] = useState<any[]>([]);
  const [availableClassifications, setAvailableClassifications] = useState<
    any[]
  >([]);
  const [selectedClassifications, setSelectedClassifications] = useState<
    number[]
  >([]);

  useEffect(() => {
    if (isEditing && operationData.id) {
      fetchClassifications(operationData.id);
      fetchAvailableClassifications();
    }
  }, [operationData.id, isEditing]);

  // ✅ Add Classification to Operation
  const handleAddClassification = async (classificationId: number) => {
    try {
      await api.post(
        `/settings/operations_settings/${operationData.id}/classifications/${classificationId}`
      );
      fetchClassifications(operationData.id); // Refresh list
      toast.success("Classification added successfully!");
    } catch (error) {
      toast.error("Failed to add classification.");
    }
  };

  // ✅ Remove Classification from Operation
  const handleRemoveClassification = async (classificationId: number) => {
    try {
      await api.delete(
        `/settings/operations_settings/${operationData.id}/classifications/${classificationId}`
      );
      fetchClassifications(operationData.id); // Refresh list
      toast.success("Classification removed successfully!");
    } catch (error) {
      toast.error("Failed to remove classification.");
    }
  };

  // ✅ Fetch current classifications assigned to this operation
  const fetchClassifications = async (operationId: number) => {
    try {
      const response = await api.get(
        `/settings/operations_settings/${operationId}/classifications`
      );
      const assignedIds = response.data.map((cls: any) => cls.id);
      setClassifications(response.data);
      setSelectedClassifications(assignedIds);
    } catch (error) {
      toast.error("Failed to fetch classifications.");
    }
  };

  // ✅ Fetch available classifications
  const fetchAvailableClassifications = async () => {
    try {
      const response = await api.get(`/settings/part_classification`);
      setAvailableClassifications(response.data);
    } catch (error) {
      toast.error("Failed to fetch available classifications.");
    }
  };

  // ✅ Handle classification selection (toggle)
  const toggleClassification = (id: number) => {
    setSelectedClassifications((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // ✅ Handle "Select All" functionality
  const toggleSelectAll = () => {
    if (selectedClassifications.length === availableClassifications.length) {
      setSelectedClassifications([]); // Deselect all
    } else {
      setSelectedClassifications(availableClassifications.map((cls) => cls.id)); // Select all
    }
  };

  // ✅ Submit classifications in bulk
  const handleSaveClassifications = async () => {
    try {
      await api.put(
        `/settings/operations_settings/${operationData.id}/classifications`,
        {
          classifications: selectedClassifications,
        }
      );
      console.log({ selectedClassifications });
      toast.success("Classifications updated successfully!");
    } catch (error) {
      toast.error("Failed to update classifications.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <label className="block text-sm font-medium">Operation Name</label>
      <Input
        placeholder="Operation Name"
        value={operationData.name}
        onChange={(e) =>
          setOperationData((prev: typeof operationData) => ({
            ...prev,
            name: e.target.value,
          }))
        }
      />

      {/* Category */}
      <label className="block text-sm font-medium">Category</label>
      <Combobox
        value={operationData.category}
        onChange={(value) => {
          setOperationData((prev: typeof operationData) => ({
            ...prev,
            category: value,
          }));
        }}
        options={uniqueCategories.map((category) => ({
          label: category,
          value: category,
        }))} // ✅ Populate dropdown with existing categories
        placeholder="Select or type category..."
      />

      {/* Enabled */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Enabled:</label>
        <Switch
          checked={operationData.enabled}
          onCheckedChange={(checked) =>
            setOperationData((prev: typeof operationData) => ({
              ...prev,
              enabled: checked,
            }))
          }
        />
      </div>

      {/* Costing Default */}
      <label className="block text-sm font-medium">Costing Default</label>
      <Select
        value={operationData.costing_default_id?.toString() || ""}
        onValueChange={(value) => {
          const selectedDefault = costingDefaults.find(
            (cd) => cd.id.toString() === value
          );
          setOperationData((prev: typeof operationData) => ({
            ...prev,
            costing_default_id: value,
            costing_unit_type:
              selectedDefault?.unit_type || prev.costing_unit_type,
            costing_unit: selectedDefault?.unit_type
              ? units[selectedDefault.unit_type]?.[0] || ""
              : prev.costing_unit,
          }));
        }}
      >
        <SelectTrigger>
          <SelectValue>
            {operationData.costing_default_id
              ? costingDefaults.find(
                  (c) =>
                    c.id.toString() ===
                    operationData.costing_default_id?.toString()
                )?.type || "Select Costing Default"
              : "Select Costing Default"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {costingDefaults.map((c) => (
            <SelectItem key={c.id} value={c.id.toString()}>
              {c.type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Default Rate */}
      <label className="block text-sm font-medium">Default Rate</label>
      <Input
        placeholder="Default Rate"
        type="number"
        value={operationData.default_rate}
        onChange={(e) =>
          setOperationData((prev: typeof operationData) => ({
            ...prev,
            default_rate: e.target.value,
          }))
        }
      />

      {/* Costing Unit */}
      <label className="block text-sm font-medium">Costing Unit</label>
      <Select
        value={operationData.costing_unit}
        onValueChange={(value) =>
          setOperationData((prev: typeof operationData) => ({
            ...prev,
            costing_unit: value,
          }))
        }
      >
        <SelectTrigger>
          <SelectValue>
            {operationData.costing_unit || "Select Unit"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(units[operationData.costing_unit_type] || []).map((unit) => (
            <SelectItem key={unit} value={unit}>
              {unit}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Universal */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Universal:</label>
        <Switch
          checked={operationData.universal}
          onCheckedChange={(checked) =>
            setOperationData((prev: typeof operationData) => ({
              ...prev,
              universal: checked,
            }))
          }
        />
      </div>

      {/* Multi-Select for Classifications */}
      {isEditing && (
        <>
          <label className="block text-sm font-medium">Classifications</label>
          <MultiSelect
            items={availableClassifications}
            selectedItems={selectedClassifications}
            onChange={setSelectedClassifications}
            label="Select Classifications"
          />
          <Button onClick={handleSaveClassifications} className="mt-2">
            Save Classifications
          </Button>
        </>
      )}

      {/* Submit Button */}
      <Button onClick={onSubmit}>
        {isEditing ? "Save Changes" : "Add Operation"}
      </Button>
    </div>
  );
}
