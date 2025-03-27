"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { Plus, Trash, Pencil, Check, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface MaterialDetailsProps {
  materialId: number;
  onClose: () => void;
}

export default function MaterialDetails({
  materialId,
  onClose,
}: MaterialDetailsProps) {
  const [properties, setProperties] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [editPricing, setEditPricing] = useState<any | null>(null);
  const [unitTypes, setUnitTypes] = useState<string[]>([]);
  const [filteredBlockUnits, setFilteredBlockUnits] = useState<string[]>([]);
  const [filteredSheetUnits, setFilteredSheetUnits] = useState<string[]>([]);
  const [selectedBlockUnitType, setSelectedBlockUnitType] =
    useState<string>("");
  const [selectedSheetUnitType, setSelectedSheetUnitType] =
    useState<string>("");
  const [filteredPropertyUnits, setFilteredPropertyUnits] = useState<string[]>(
    []
  );
  const [selectedPropertyUnitType, setSelectedPropertyUnitType] =
    useState<string>("");

  // ✅ State for new property
  const [newProperty, setNewProperty] = useState({
    property_name: "",
    property_value: "",
    property_unit: "",
  });

  const [editingPropertyId, setEditingPropertyId] = useState<number | null>(
    null
  );
  const [editPropertyValues, setEditPropertyValues] = useState<any>(null);
  const [units, setUnits] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    fetchMaterialData();
    fetchUnitTypes();
    fetchUnits();
  }, [materialId]);

  // ✅ Fetch Material Properties & Pricing
  const fetchMaterialData = async () => {
    setLoading(true);
    try {
      const [propertiesResponse, pricingResponse] = await Promise.all([
        api.get(`/settings/materials/${materialId}/properties`),
        api.get(`/settings/materials/${materialId}/costing`),
      ]);

      setProperties(propertiesResponse.data);
      setPricing(pricingResponse.data);
      setEditPricing(pricingResponse.data);
    } catch (error) {
      toast.error("Failed to fetch material details.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Unit Types (Excluding Currency)
  const fetchUnitTypes = async () => {
    try {
      const response = await api.get("/settings/units/symbols");
      const availableUnitTypes = Object.keys(response.data).filter(
        (type) => type !== "currency"
      ); // ✅ Exclude currency
      setUnitTypes(availableUnitTypes);

      // ✅ Auto-select first unit type if available
      if (availableUnitTypes.length > 0) {
        handleBlockUnitTypeChange(availableUnitTypes[0]);
        handleSheetUnitTypeChange(availableUnitTypes[0]);
      }
    } catch (error) {
      toast.error("Failed to fetch unit types.");
    }
  };

  // ✅ Fetch Available Units & Unit Types
  const fetchUnits = async () => {
    try {
      const response = await api.get("/settings/units/symbols");
      setUnits(response.data || {});
      const availableUnitTypes = Object.keys(response.data).filter(
        (type) => type !== "currency"
      );
      setUnitTypes(availableUnitTypes);
    } catch (error) {
      toast.error("Failed to fetch unit types.");
    }
  };

  // ✅ Handle Block Unit Type Selection & Filter Units
  const handleBlockUnitTypeChange = async (unitType: string) => {
    setSelectedBlockUnitType(unitType);
    try {
      const response = await api.get("/settings/units/symbols");
      setFilteredBlockUnits(response.data[unitType] || []);
    } catch (error) {
      toast.error("Failed to fetch block pricing units.");
    }
  };

  // ✅ Handle Sheet Unit Type Selection & Filter Units
  const handleSheetUnitTypeChange = async (unitType: string) => {
    setSelectedSheetUnitType(unitType);
    try {
      const response = await api.get("/settings/units/symbols");
      setFilteredSheetUnits(response.data[unitType] || []);
    } catch (error) {
      toast.error("Failed to fetch sheet pricing units.");
    }
  };

  // ✅ Handle Pricing Update
  const handleSavePricing = async () => {
    try {
      await api.put(`/settings/materials/${materialId}/costing`, editPricing);
      setPricing(editPricing);
      toast.success("Pricing updated successfully!");
    } catch (error) {
      toast.error("Failed to update pricing.");
    }
  };

  // ✅ Handle Property Unit Type Selection & Filter Units
  const handlePropertyUnitTypeChange = (unitType: string) => {
    setSelectedPropertyUnitType(unitType);
    setFilteredPropertyUnits(units[unitType] || []);
  };

  // ✅ Handle Adding a New Property
  const handleAddProperty = async () => {
    if (
      !newProperty.property_name.trim() ||
      !newProperty.property_value.trim() ||
      !newProperty.property_unit.trim()
    ) {
      toast.error("Property name, value, and unit are required.");
      return;
    }

    try {
      const response = await api.post(`/settings/materials/properties`, {
        material_id: materialId,
        ...newProperty,
      });

      if (!response.data.id) {
        toast.error("Failed to retrieve property ID.");
        return;
      }

      setProperties((prev) => [
        ...prev,
        { id: response.data.id, ...newProperty },
      ]);
      toast.success("Property added successfully!");
      setNewProperty({
        property_name: "",
        property_value: "",
        property_unit: "",
      });
    } catch (error) {
      toast.error("Failed to add property.");
    }
  };

  // ✅ Handle Deleting a Property
  const handleDeleteProperty = async (propertyId: number) => {
    try {
      await api.delete(`/settings/materials/properties/${propertyId}`);
      setProperties((prev) => prev.filter((prop) => prop.id !== propertyId));
      toast.success("Property deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete property.");
    }
  };

  // ✅ Handle Editing a Property
  const handleEditProperty = (property: any) => {
    setEditingPropertyId(property.id);
    setEditPropertyValues({ ...property });

    // ✅ Dynamically detect the unit type and update filtered units
    const detectedUnitType = Object.keys(units).find((type) =>
      units[type].includes(property.property_unit)
    );
    if (detectedUnitType) {
      setSelectedPropertyUnitType(detectedUnitType);
      setFilteredPropertyUnits(units[detectedUnitType]);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Material Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {/* ✅ Block Pricing */}
            <div className="mt-4">
              {pricing ? (
                <div>
                  <div className="inline-flex justify-between gap-4 w-full">
                    <h2 className="text-lg font-bold">Raw Material Pricing</h2>
                    <Button onClick={handleSavePricing}>Save Changes</Button>
                  </div>
                  <Separator className="mt-2 mb-4" />
                  <div className="gap-3 w-full">
                    <h2 className="text-md font-semibold mb-2">
                      Block Pricing
                    </h2>
                    <div className="flex gap-3">
                      {/* Block Unit Type Selection */}
                      <Input
                        type="number"
                        value={editPricing?.block_price || ""}
                        onChange={(e) =>
                          setEditPricing((prev: any) => ({
                            ...prev,
                            block_price: e.target.value,
                          }))
                        }
                      />
                      <div className="align-bottom">/</div>
                      <Select
                        value={selectedBlockUnitType}
                        onValueChange={handleBlockUnitTypeChange}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {selectedBlockUnitType || "Select Unit Type"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {unitTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Block Price Unit + Value */}
                      <Select
                        value={editPricing?.block_price_unit || ""}
                        onValueChange={(value) =>
                          setEditPricing((prev: any) => ({
                            ...prev,
                            block_price_unit: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {editPricing?.block_price_unit || "Select Unit"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {filteredBlockUnits.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ✅ Sheet Pricing */}
                    <h2 className="text-lg font-semibold mb-2 mt-4">
                      Sheet Pricing
                    </h2>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        value={editPricing?.sheet_price || ""}
                        onChange={(e) =>
                          setEditPricing((prev: any) => ({
                            ...prev,
                            sheet_price: e.target.value,
                          }))
                        }
                      />
                      <div>/</div>
                      {/* Sheet Unit Type Selection */}
                      <Select
                        value={selectedSheetUnitType}
                        onValueChange={handleSheetUnitTypeChange}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {selectedSheetUnitType || "Select Unit Type"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {unitTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Sheet Price Unit + Value */}
                      <Select
                        value={editPricing?.sheet_price_unit || ""}
                        onValueChange={(value) =>
                          setEditPricing((prev: any) => ({
                            ...prev,
                            sheet_price_unit: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {editPricing?.sheet_price_unit || "Select Unit"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSheetUnits.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <p>No pricing data available.</p>
              )}
            </div>
            {/* ✅ Display Material Properties */}
            <div className="mt-4">
              <h2 className="text-lg font-semibold">Material Properties</h2>
              <Separator className="mt-2 mb-4" />
              {properties.length > 0 ? (
                properties.map((prop) => {
                  const isEditing = editingPropertyId === prop.id;

                  return (
                    <div key={prop.id} className="flex items-center gap-3">
                      {/* Property Name */}
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editPropertyValues.property_name}
                          onChange={(e) =>
                            setEditPropertyValues((prev: any) => ({
                              ...prev,
                              property_name: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <p className="flex-1">
                          <strong>{prop.property_name}:</strong>{" "}
                          {prop.property_value} ({prop.property_unit})
                        </p>
                      )}

                      {/* Property Unit Selection (Now Dynamic) */}
                      {isEditing ? (
                        <Select
                          value={editPropertyValues.property_unit}
                          onValueChange={(value) =>
                            setEditPropertyValues((prev: any) => ({
                              ...prev,
                              property_unit: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {editPropertyValues.property_unit}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {filteredPropertyUnits.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}

                      {/* Actions: Edit, Save, Cancel, Delete */}
                      {isEditing ? (
                        <>
                          <Button onClick={() => setEditingPropertyId(null)}>
                            <Check />
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingPropertyId(null)}
                          >
                            <X />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditProperty(prop)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteProperty(prop.id)}
                          >
                            <Trash />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <p>No properties available.</p>
              )}
            </div>

            {/* ✅ Add New Property */}
            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-4">
                Add New Material Property
              </h2>
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Property Name"
                  value={newProperty.property_name}
                  onChange={(e) =>
                    setNewProperty((prev) => ({
                      ...prev,
                      property_name: e.target.value,
                    }))
                  }
                />
                <Input
                  type="text"
                  placeholder="Property Value"
                  value={newProperty.property_value}
                  onChange={(e) =>
                    setNewProperty((prev) => ({
                      ...prev,
                      property_value: e.target.value,
                    }))
                  }
                />
                <Select
                  value={selectedPropertyUnitType}
                  onValueChange={handlePropertyUnitTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {selectedPropertyUnitType || "Select Unit Type"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {unitTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newProperty.property_unit}
                  onValueChange={(value) =>
                    setNewProperty((prev) => ({
                      ...prev,
                      property_unit: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {newProperty.property_unit || "Select Unit"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPropertyUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddProperty}>
                  <Plus />
                </Button>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
