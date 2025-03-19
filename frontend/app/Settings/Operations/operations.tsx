"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Plus, Trash } from "lucide-react";
import api from "@/lib/api";
import OperationForm from "./OperationForm";
import { Checkbox } from "@/components/ui/checkbox";

export default function Operations() {
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [costingDefaults, setCostingDefaults] = useState<any[]>([]);
  const [units, setUnits] = useState<{ [key: string]: string[] }>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState<any>(null);
  const [newOperation, setNewOperation] = useState({
    category: "",
    name: "",
    enabled: true,
    costing_default_id: "",
    costing_unit_type: "",
    default_rate: "",
    costing_unit: "",
    universal: false,
  });

  useEffect(() => {
    fetchOperations();
    fetchCostingDefaults();
    fetchUnits();
  }, []);

  // ✅ Fetch Operations
  const fetchOperations = async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/operations_settings");
      setOperations(response.data);
    } catch (error) {
      toast.error("Failed to fetch operations.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Costing Defaults
  const fetchCostingDefaults = async () => {
    try {
      const response = await api.get("/settings/costing_defaults");
      setCostingDefaults(response.data);
    } catch (error) {
      toast.error("Failed to fetch costing defaults.");
    }
  };

  // ✅ Fetch Available Units
  const fetchUnits = async () => {
    try {
      const response = await api.get("/settings/units/symbols");
      setUnits(response.data || {});
    } catch (error) {
      toast.error("Failed to fetch units.");
      setUnits({});
    }
  };

  // ✅ Open Edit Operation Modal
  const handleEditOperation = (operationId: number) => {
    const operation = operations.find((op) => op.id === operationId);
    if (operation) {
      const selectedCostingDefault = costingDefaults.find(
        (cd) => cd.id === operation.costing_default_id
      );

      setEditValues({
        ...operation,
        costing_unit_type: selectedCostingDefault?.unit_type || "",
      });
      setIsEditDialogOpen(true);
    }
  };

  // ✅ Save Edited Operation
  const handleUpdateOperation = async () => {
    if (!editValues) return;

    try {
      const payload = {
        ...editValues,
        costing_default_id: Number(editValues.costing_default_id),
        default_rate: Number(editValues.default_rate),
      };

      await api.put(`/settings/operations_settings/${editValues.id}`, payload);

      setOperations((prev) =>
        prev.map((op) => (op.id === editValues.id ? { ...editValues } : op))
      );

      toast.success("Operation updated successfully!");
      setIsEditDialogOpen(false);
      setEditValues(null);
    } catch (error) {
      toast.error("Failed to update operation.");
    }
  };

  // ✅ Handle Adding a New Operation
  const handleAddOperation = async () => {
    if (
      !newOperation.name.trim() ||
      !newOperation.category.trim() ||
      !newOperation.costing_default_id ||
      !newOperation.default_rate ||
      !newOperation.costing_unit
    ) {
      toast.error("All fields are required.");
      return;
    }

    try {
      const payload = {
        category: newOperation.category.trim(),
        name: newOperation.name.trim(),
        enabled: newOperation.enabled,
        costing_default_id: Number(newOperation.costing_default_id),
        default_rate: Number(newOperation.default_rate),
        costing_unit: newOperation.costing_unit,
        universal: newOperation.universal,
      };

      const response = await api.post("/settings/operations_settings", payload);

      setOperations([
        ...operations,
        { ...newOperation, id: response.data.operation_id },
      ]);

      toast.success("Operation added successfully!");
      setIsAddDialogOpen(false);
      resetNewOperation();
    } catch (error) {
      toast.error("Failed to add operation.");
    }
  };

  // ✅ Handle Deleting an Operation
  const handleDeleteOperation = async (operationId: number) => {
    try {
      await api.delete(`/settings/operations_settings/${operationId}`);

      // ✅ Remove the deleted operation from the UI
      setOperations((prev) => prev.filter((op) => op.id !== operationId));

      toast.success("Operation deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete operation.");
    }
  };

  // ✅ Reset New Operation Form
  const resetNewOperation = () => {
    setNewOperation({
      category: "",
      name: "",
      enabled: true,
      costing_default_id: "",
      costing_unit_type: "",
      default_rate: "",
      costing_unit: "",
      universal: false,
    });
  };

  const uniqueCategories = Array.from(
    new Set(operations.map((op) => op.category))
  );

  return (
    <div className="p-6 w-full">
      <div className="inline-flex justify-between w-full">
        <h1 className="text-2xl font-bold mb-4">Operations</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Operation
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <Card className="mb-4">
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Costing Default</TableHead>
                  <TableHead>Default Rate</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-semibold">
                      {op.name
                        ? op.name.replace("_", " ").toUpperCase()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {op.category
                        ? op.category.replace("_", " ").toUpperCase()
                        : "N/A"}
                    </TableCell>
                    <TableCell>{op.enabled ? "✔" : "✖"}</TableCell>
                    <TableCell>
                      {op.costing_default
                        ? op.costing_default.replace("_", " ").toUpperCase()
                        : "N/A"}
                    </TableCell>
                    <TableCell>{op.default_rate}</TableCell>
                    <TableCell>{op.costing_unit}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditOperation(op.id)}
                      >
                        <Pencil />
                      </Button>

                      {/* ✅ Add Delete Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteOperation(op.id)}
                      >
                        <Trash />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ✅ Add Operation Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Operation</DialogTitle>
          </DialogHeader>

          <OperationForm
            operationData={newOperation}
            setOperationData={setNewOperation}
            onSubmit={handleAddOperation}
            costingDefaults={costingDefaults}
            units={units}
            isEditing={false}
            uniqueCategories={uniqueCategories}
          />
        </DialogContent>
      </Dialog>

      {/* ✅ Edit Operation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Operation</DialogTitle>
          </DialogHeader>

          {editValues && (
            <OperationForm
              operationData={editValues}
              setOperationData={setEditValues}
              onSubmit={handleUpdateOperation}
              costingDefaults={costingDefaults}
              units={units}
              isEditing={true}
              uniqueCategories={uniqueCategories}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
