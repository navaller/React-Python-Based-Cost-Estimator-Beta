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
import { Separator } from "@/components/ui/separator";
import { Check } from "lucide-react";

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
      <Separator />
      {/* Name */}
      <div className="flex gap-3">
        <label className="block text-sm font-medium w-55">Operation Name</label>
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
      </div>

      {/* Category */}
      <div className="flex gap-3">
        <label className="block text-sm font-medium w-55">Category</label>
        <div className="min-w-2/3">
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
        </div>
      </div>

      <div className="flex gap-3">
        {/* Enabled */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Enable Operation:</label>
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

        {/* Universal */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">
            Apply to all part classifications:
          </label>
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
      </div>
      <label className="block font-semibold mt-8">Costing Details</label>
      <Separator />
      {/* Costing Default */}
      <div className="flex gap-3">
        <label className="block text-sm font-medium w-55">
          Costing Default
        </label>
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
          <SelectTrigger className="min-w-2/3">
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
      </div>

      <div className="flex gap-3">
        {/* Default Rate */}
        <label className="block text-sm font-medium">Default Rate</label>
        <Input
          placeholder="Default Rate"
          className="w-1/3"
          type="number"
          value={operationData.default_rate}
          onChange={(e) =>
            setOperationData((prev: typeof operationData) => ({
              ...prev,
              default_rate: e.target.value,
            }))
          }
        />
        <div>/</div>
        {/* Costing Unit */}
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
        <label className="block text-sm font-medium">Costing Unit</label>
      </div>

      {/* Multi-Select for Classifications */}
      {isEditing && (
        <>
          <label className="block font-semibold mt-4">
            Part Classifications
          </label>

          <Separator />
          <div className="flex gap-3">
            <div className="max-w-2/3 min-w-2/3">
              <MultiSelect
                items={availableClassifications}
                selectedItems={selectedClassifications}
                onChange={setSelectedClassifications}
                label="Select Classifications"
              />
            </div>
            <Button
              onClick={handleSaveClassifications}
              variant="outline"
              size="icon"
            >
              <Check />
            </Button>
          </div>
        </>
      )}

      {/* Submit Button */}
      <Button onClick={onSubmit}>
        {isEditing ? "Save Changes" : "Add Operation"}
      </Button>
    </div>
  );
}
