function toCamelCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (index === 0) {
        return lower;
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function inferTsType(rawValue: unknown): string {
  if (typeof rawValue !== 'string') {
    return 'string';
  }

  const value = rawValue.trim();

  if (value === 'true' || value === 'false') {
    return 'boolean';
  }

  if (value !== '' && !Number.isNaN(Number(value))) {
    return 'number';
  }

  if (
    (value.startsWith('{') && value.endsWith('}')) ||
    (value.startsWith('[') && value.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return 'unknown[]';
      }

      if (parsed && typeof parsed === 'object') {
        return 'Record<string, unknown>';
      }
    } catch {
      // ignore JSON parse errors and fall back to string
    }
  }

  return 'string';
}

export function buildInterfaceName(itemName: string): string {
  const name = toPascalCase(itemName);
  return name || 'SitecoreItem';
}

export function generateTypescriptInterface(
  itemName: string,
  fields: Array<{ name: string; value: string }>
): string {
  const interfaceName = buildInterfaceName(itemName);

  const body = fields
    .map((field) => {
      const propertyName = toCamelCase(field.name) || 'unknownField';
      const propertyType = inferTsType(field.value);
      return `  ${propertyName}: ${propertyType};`;
    })
    .join('\n');

  return `export interface ${interfaceName} {\n${body}\n}\n`;
}