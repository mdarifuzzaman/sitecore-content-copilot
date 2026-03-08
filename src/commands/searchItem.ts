import * as vscode from 'vscode';
import { getItemByPath } from '../sitecore/contentService';

export async function searchItem() {
  try {
    const path = await vscode.window.showInputBox({
      prompt: 'Enter Sitecore item path',
      placeHolder: '/sitecore/content/Home',
      ignoreFocusOut: true,
    });

    if (!path) {
      return;
    }

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
    vscode.window.showErrorMessage(`Sitecore search failed: ${message}`);
  }
}