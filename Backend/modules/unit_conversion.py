import pint

# Initialize unit registry
ureg = pint.UnitRegistry()

def convert_units(value, from_unit, to_unit):
    """
    Converts values from one unit to another using the `pint` library.
    
    - value: Numeric value to convert.
    - from_unit: The original unit (e.g., "mm", "mm²", "mm³", "g/mm³").
    - to_unit: The target unit (e.g., "in", "in²", "in³", "kg/m³").
    
    Returns:
        Converted value with the target unit.
    """
    try:
        converted_value = (value * ureg(from_unit)).to(to_unit).magnitude
        return converted_value
    except pint.errors.DimensionalityError:
        print(f"❌ Conversion error: Cannot convert {from_unit} to {to_unit}.")
        return value  # Return the original value if conversion is not possible
