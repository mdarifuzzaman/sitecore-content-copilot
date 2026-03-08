type SitecoreField = {
  name: string;
  value: string;
};

type SitecoreItem = {
  name: string;
  path: string;
  fields?: SitecoreField[];
};

export function buildExplainItemPrompt(item: SitecoreItem): string {
  const fieldsText =
    item.fields?.map((f) => `- ${f.name}: ${String(f.value).slice(0, 500)}`).join('\n') ||
    '- No fields found';

  return `You are a helpful Sitecore XM Cloud developer assistant.

        Explain this Sitecore item for a developer.

        Item name: ${item.name}
        Item path: ${item.path}

        Fields:
        ${fieldsText}

        Please provide:
        1. A short summary of what this item likely represents
        2. A field-by-field explanation
        3. Suggested React/JSS component usage
        4. Suggested GraphQL usage
        5. Any implementation notes or cautions

        Format the response in markdown.`;
}