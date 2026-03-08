import * as vscode from 'vscode';
import { getItemByPath } from '../sitecore/contentService';

export async function openItemFromExplorer(path: string) {
  try {
    const item = await getItemByPath(path);

    if (!item) {
      vscode.window.showWarningMessage(`No Sitecore item found for path: ${path}`);
      return;
    }

    const doc = await vscode.workspace.openTextDocument({
      content: JSON.stringify(item, null, 2),
      language: 'json',
    });

    await vscode.window.showTextDocument(doc);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Open item failed: ${message}`);
  }
}