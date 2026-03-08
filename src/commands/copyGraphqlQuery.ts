import * as vscode from 'vscode';
import { getItemByPath } from '../sitecore/contentService';
import { generateItemGraphqlQuery } from '../utils/graphqlGenerator';

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

export async function copyGraphqlQuery(input: unknown) {
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

    if (fields.length === 0) {
      vscode.window.showWarningMessage(
        `Item "${item.name}" does not contain any fields to generate a GraphQL query from.`
      );
      return;
    }

    const query = generateItemGraphqlQuery(item.name, fields);

    await vscode.env.clipboard.writeText(query);
    vscode.window.showInformationMessage(`GraphQL query for "${item.name}" copied to clipboard.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Copy GraphQL query failed: ${message}`);
  }
}