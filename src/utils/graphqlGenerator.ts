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

function escapeFieldName(value: string): string {
  return value.replace(/"/g, '\\"');
}

export function generateItemGraphqlQuery(
  itemName: string,
  fields: Array<{ name: string; value: string }>
): string {
  const operationName = `Get${toPascalCase(itemName) || 'SitecoreItem'}`;

  const fieldSelections = fields
    .map((field) => {
      const alias = toCamelCase(field.name) || 'unknownField';
      const safeFieldName = escapeFieldName(field.name);

      return `    ${alias}: field(name: "${safeFieldName}") {
      jsonValue
    }`;
    })
    .join('\n');

  return `query ${operationName}($path: String!, $language: String!) {
  item(path: $path, language: $language) {
    id
    name
    path
${fieldSelections}
  }
}
`;
}