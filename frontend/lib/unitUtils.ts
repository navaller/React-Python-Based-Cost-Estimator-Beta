import convert from "convert";

const superscriptMap: Record<string, string> = {
  "mm²": "mm2",
  "cm²": "cm2",
  "m²": "m2",
  "in²": "in2",
  "ft²": "ft2",
  "yd²": "yd2",
  "mm³": "mm3",
  "cm³": "cm3",
  "m³": "m3",
  "in³": "in3",
  "ft³": "ft3",
  "yd³": "yd3",
};

export function normalizeUnit(unit: string): string {
  return superscriptMap[unit] || unit;
}

export function convertUnits(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  const normalizedFrom = normalizeUnit(fromUnit);
  const normalizedTo = normalizeUnit(toUnit);

  if (normalizedFrom === normalizedTo || isNaN(value)) return value;

  try {
    return convert(value as number, normalizedFrom as any).to(
      normalizedTo as any
    ) as unknown as number;
  } catch (error) {
    console.warn(`Conversion failed: ${value} ${fromUnit} → ${toUnit}`, error);
    return value;
  }
}
