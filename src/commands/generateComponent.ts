import * as vscode from 'vscode';
import { getItemByPath } from '../sitecore/contentService';
import {
  buildComponentName,
  generateComponentTsx,
  generateFieldsType,
  type ComponentVariant,
} from '../utils/componentGenerator';

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

export async function generateComponent(input: unknown) {
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
        `Item "${item.name}" does not contain fields to generate a component from.`
      );
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('Open a workspace folder before generating files.');
      return;
    }

    const defaultName = buildComponentName(item.name);

    const componentName = await vscode.window.showInputBox({
      prompt: 'Component name',
      value: defaultName,
      ignoreFocusOut: true,
    });

    if (!componentName) {
      return;
    }

    const variantSelection = await vscode.window.showQuickPick(
      [
        { label: 'Basic JSS component', value: 'basic' },
        { label: 'JSS component + types file', value: 'withTypes' },
        { label: 'JSS component + Tailwind starter', value: 'tailwind' },
      ],
      {
        title: 'Select component variant',
        ignoreFocusOut: true,
      }
    );

    if (!variantSelection) {
      return;
    }

    const outputFolder = await vscode.window.showInputBox({
      prompt: 'Output folder (relative to workspace)',
      value: 'src/components',
      ignoreFocusOut: true,
    });

    if (!outputFolder) {
      return;
    }

    const variant = variantSelection.value as ComponentVariant;
    const useSeparateTypesFile = variant === 'withTypes';

    const componentDir = vscode.Uri.joinPath(
      workspaceFolder.uri,
      outputFolder,
      componentName
    );

    await vscode.workspace.fs.createDirectory(componentDir);

    const tsxContent = generateComponentTsx(
      componentName,
      fields,
      variant,
      useSeparateTypesFile
    );

    const tsxUri = vscode.Uri.joinPath(componentDir, `${componentName}.tsx`);
    await vscode.workspace.fs.writeFile(
      tsxUri,
      Buffer.from(tsxContent, 'utf8')
    );

    if (useSeparateTypesFile) {
      const typesContent = generateFieldsType(componentName, fields);
      const typesUri = vscode.Uri.joinPath(componentDir, `${componentName}.types.ts`);
      await vscode.workspace.fs.writeFile(
        typesUri,
        Buffer.from(typesContent, 'utf8')
      );
    }

    const doc = await vscode.workspace.openTextDocument(tsxUri);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
      `Component "${componentName}" generated successfully.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Generate component failed: ${message}`);
  }
}