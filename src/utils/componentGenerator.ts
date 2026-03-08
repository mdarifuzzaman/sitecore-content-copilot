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

export type GeneratorField = {
  name: string;
  value: string;
};

export type ComponentVariant = 'basic' | 'withTypes' | 'tailwind';

export function buildComponentName(itemName: string): string {
  return toPascalCase(itemName) || 'SitecoreComponent';
}

export function buildPropsTypeName(componentName: string): string {
  return `${componentName}Props`;
}

export function buildFieldsTypeName(componentName: string): string {
  return `${componentName}Fields`;
}

export function generateFieldsType(
  componentName: string,
  fields: GeneratorField[]
): string {
  const fieldsTypeName = buildFieldsTypeName(componentName);

  const imports = new Set<string>(['Field']);
  const lines = fields.map((field) => {
    const propertyName = toCamelCase(field.name) || 'unknownField';
    const typeName = inferJssFieldType(field.name, field.value);

    if (typeName === 'ImageField') imports.add('ImageField');
    if (typeName === 'LinkField') imports.add('LinkField');
    if (typeName === 'RichTextField') imports.add('RichTextField');

    return `  ${propertyName}: ${typeName};`;
  });

  return `import { ${Array.from(imports).sort().join(', ')} } from '@sitecore-jss/sitecore-jss-nextjs';

export type ${fieldsTypeName} = {
${lines.join('\n')}
};
`;
}

export function generateComponentTsx(
  componentName: string,
  fields: GeneratorField[],
  variant: ComponentVariant,
  useSeparateTypesFile: boolean
): string {
  const fieldsTypeName = buildFieldsTypeName(componentName);
  const propsTypeName = buildPropsTypeName(componentName);

  const needsImage = fields.some((f) =>
    /image|icon|thumbnail/i.test(f.name)
  );

  const needsLink = fields.some((f) =>
    /link|url|cta/i.test(f.name)
  );

  const needsRichText = fields.some((f) =>
    /rich text|richtext|html|body|description/i.test(f.name)
  );

  const imports = new Set<string>(['Field', 'Text']);
  if (needsImage) imports.add('Image');
  if (needsLink) imports.add('Link');
  if (needsRichText) imports.add('RichText');

  const importLine = `import { ${Array.from(imports).sort().join(', ')} } from '@sitecore-jss/sitecore-jss-nextjs';`;

  const localTypes = useSeparateTypesFile
    ? `import type { ${fieldsTypeName} } from './${componentName}.types';`
    : generateFieldsType(componentName, fields);

  const propsBlock = `
type ${propsTypeName} = {
  fields: ${fieldsTypeName};
};
`.trim();

  const renderLines = fields.map((field) => {
    const propertyName = toCamelCase(field.name) || 'unknownField';
    const typeName = inferJssFieldType(field.name, field.value);

    if (typeName === 'ImageField') {
      return `      <Image field={fields.${propertyName}} />`;
    }

    if (typeName === 'LinkField') {
      return `      <Link field={fields.${propertyName}} />`;
    }

    if (typeName === 'RichTextField') {
      return `      <RichText field={fields.${propertyName}} />`;
    }

    return `      <Text field={fields.${propertyName}} />`;
  });

  const wrapperClass =
    variant === 'tailwind' ? ` className="space-y-4"` : '';

  return `${importLine}
${useSeparateTypesFile ? localTypes : `\n${localTypes}`}
${useSeparateTypesFile ? `\n${propsBlock}` : `\n${propsBlock}`}

export const ${componentName} = ({ fields }: ${propsTypeName}) => {
  return (
    <section${wrapperClass}>
${renderLines.join('\n')}
    </section>
  );
};

export default ${componentName};
`;
}