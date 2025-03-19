"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export default function AdvancedSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [costingMethods, setCostingMethods] = useState<string[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);

  useEffect(() => {
    fetchAdvancedSettings();
    fetchCostingMethods();
    fetchCurrencies();
  }, []);

  const fetchAdvancedSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/advanced_settings");

      if (!response || !response.data) {
        throw new Error("Invalid API response");
      }

      // ✅ Ensure folders are parsed correctly
      const parsedSettings = {
        ...response.data,
        folders:
          typeof response.data.folders === "string"
            ? JSON.parse(response.data.folders)
            : response.data.folders,
      };

      setSettings(parsedSettings);
    } catch (error) {
      toast.error("Failed to fetch advanced settings.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCostingMethods = async () => {
    try {
      const response = await api.get("/settings/costing_defaults");
      const methods = response.data.map((item: any) => item.type);
      setCostingMethods(methods);
    } catch (error) {
      toast.error("Failed to fetch costing methods.");
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await api.get("/settings/units/symbols");
      setCurrencies(response.data.currency || []);
    } catch (error) {
      toast.error("Failed to fetch currency symbols.");
    }
  };

  const handleChange = (setting: string, newValue: string) => {
    setPendingChanges((prev) => ({
      ...prev,
      [setting]: newValue,
    }));

    setSettings((prev: any) => ({
      ...prev,
      [setting]: newValue,
    }));
  };

  const handleFolderChange = (folderKey: string, newPath: string) => {
    setPendingChanges((prev) => ({
      ...prev,
      folders: {
        ...(prev.folders || settings.folders),
        [folderKey]: newPath,
      },
    }));

    setSettings((prev: any) => ({
      ...prev,
      folders: {
        ...prev.folders,
        [folderKey]: newPath,
      },
    }));
  };

  const saveChanges = async () => {
    try {
      if (pendingChanges.folders) {
        pendingChanges.folders = JSON.stringify(pendingChanges.folders);
      }

      await api.put("/settings/advanced_settings", pendingChanges);
      toast.success("Advanced settings updated successfully!");
      setPendingChanges({});
      setEditing(false);
      fetchAdvancedSettings();
    } catch (error) {
      toast.error("Failed to update advanced settings.");
    }
  };

  return (
    <div className="p-6 w-full">
      <div className="inline-flex justify-between w-full">
        <h1 className="text-2xl font-bold mb-4">Advanced Settings</h1>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                onClick={saveChanges}
                disabled={Object.keys(pendingChanges).length === 0}
              >
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>Edit</Button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : settings ? (
        <Card className="mb-4">
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Setting</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ✅ Default Costing Method */}
                <TableRow>
                  <TableCell className="font-semibold">
                    Default Costing Method
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Select
                        value={settings.default_costing_method}
                        onValueChange={(value) =>
                          handleChange("default_costing_method", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {settings.default_costing_method}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {costingMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method.replace("_", " ").toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      settings.default_costing_method.replace("_", " ")
                    )}
                  </TableCell>
                </TableRow>

                {/* ✅ Default Currency */}
                <TableRow>
                  <TableCell className="font-semibold">
                    Default Currency
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Select
                        value={settings.default_currency}
                        onValueChange={(value) =>
                          handleChange("default_currency", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>{settings.default_currency}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      settings.default_currency
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">
                    Rounding Precision
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        type="number"
                        value={settings.rounding_precision}
                        onChange={(e) =>
                          handleChange("rounding_precision", e.target.value)
                        }
                      />
                    ) : (
                      <span>{settings.rounding_precision}</span>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">
                    Enable Taxation
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        type="string"
                        value={settings.enable_taxation}
                        onChange={(e) =>
                          handleChange("rounding_precision", e.target.value)
                        }
                      />
                    ) : (
                      <span>{settings.enable_taxation}</span>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">
                    Display Units In Ui
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        type="string"
                        value={settings.display_units_in_ui}
                        onChange={(e) =>
                          handleChange("rounding_precision", e.target.value)
                        }
                      />
                    ) : (
                      <span>{settings.display_units_in_ui}</span>
                    )}
                  </TableCell>
                </TableRow>

                {/* ✅ Folders */}
                {Object.entries(settings.folders || {}).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-semibold">
                      {key.replace("_", " ").toUpperCase()}
                    </TableCell>
                    <TableCell>
                      {editing ? (
                        <Input
                          type="text"
                          value={String(value) || ""}
                          onChange={(e) =>
                            handleFolderChange(key, e.target.value)
                          }
                        />
                      ) : (
                        <span>{String(value)}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <p className="text-gray-500">Failed to load advanced settings.</p>
      )}
    </div>
  );
}
