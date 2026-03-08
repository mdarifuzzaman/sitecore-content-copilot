function toCamelCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part, index) => {
      const normalized = part.toLowerCase();
      if (index === 0) {
        return normalized;
      }

      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join('');
}

function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => {
      const normalized = part.toLowerCase();
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join('');
}

function inferJssFieldType(fieldName: string, fieldValue: string): string {
  const lowerName = fieldName.toLowerCase();
  const trimmed = fieldValue.trim();

  if (lowerName.includes('image') || lowerName.includes('icon') || lowerName.includes('thumbnail')) {
    return 'ImageField';
  }

  if (lowerName.includes('link') || lowerName.includes('url') || lowerName.includes('cta')) {
    return 'LinkField';
  }

  if (
    lowerName.includes('rich text') ||
    lowerName.includes('richtext') ||
    lowerName.includes('html') ||
    lowerName.includes('body') ||
    lowerName.includes('description')
  ) {
    return 'RichTextField';
  }

  if (trimmed === 'true' || trimmed === 'false') {
    return 'Field<boolean>';
  }

  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
    return 'Field<number>';
  }

  return 'Field<string>';
}

export function buildJssModelName(itemName: string): string {
  const name = toPascalCase(itemName);
  return `${name || 'Sitecore'}Fields`;
}

export function generateJssFieldModel(
  itemName: string,
  fields: Array<{ name: string; value: string }>
): string {
  const typeName = buildJssModelName(itemName);

  const usedImports = new Set<string>(['Field']);
  const lines = fields.map((field) => {
    const propertyName = toCamelCase(field.name) || 'unknownField';
    const jssType = inferJssFieldType(field.name, field.value);

    if (jssType.startsWith('ImageField')) {
      usedImports.add('ImageField');
    } else if (jssType.startsWith('LinkField')) {
      usedImports.add('LinkField');
    } else if (jssType.startsWith('RichTextField')) {
      usedImports.add('RichTextField');
    }

    return `  ${propertyName}: ${jssType};`;
  });

  const imports = Array.from(usedImports).sort().join(', ');

  return `import { ${imports} } from '@sitecore-jss/sitecore-jss-nextjs';

export type ${typeName} = {
${lines.join('\n')}
};
`;
}