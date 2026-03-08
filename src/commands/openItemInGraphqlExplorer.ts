import * as vscode from 'vscode';
import { getItemByPath } from '../sitecore/contentService';
import { generateItemGraphqlQuery } from '../utils/graphqlGenerator';
import { GraphqlExplorerPanel } from '../panels/graphqlExplorerPanel';

function resolvePath(input: unknown): string | undefined {
  if (typeof input === 'string') {
    return input;
  }

  if (input && typeof input === 'object' && 'itemPath' in input) {
    const maybePath = (input as { itemPath?: unknown }).itemPath;
    if (typeof maybePath === 'string') {
      return maybePath;
    }
  }

  return undefined;
}

export async function openItemInGraphqlExplorer(
  input: unknown,
  context: vscode.ExtensionContext
) {
  try {
    const path = resolvePath(input);

    if (!path) {
      vscode.window.showErrorMessage('Could not determine Sitecore item path.');
      return;
    }

    const item = await getItemByPath(path);

    if (!item) {
      vscode.window.showWarningMessage(`No Sitecore item found for path: ${path}`);
      return;
    }

    const fields = item.fields ?? [];

    const query =
      fields.length > 0
        ? generateItemGraphqlQuery(item.name, fields)
        : `query GetItem($path: String!, $language: String!) {
  item(path: $path, language: $language) {
    id
    name
    path
  }
}`;

    const config = vscode.workspace.getConfiguration('sitecoreCopilot');
    const language = config.get<string>('language') || 'en';

    const variablesText = JSON.stringify(
      {
        path,
        language,
      },
      null,
      2
    );

    GraphqlExplorerPanel.createOrShow(context, {
      query,
      variablesText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Open in GraphQL Explorer failed: ${message}`);
  }
}