import * as vscode from 'vscode';
import { connectSitecore } from './commands/connect';
import { searchItem } from './commands/searchItem';
import { openItemFromExplorer } from './commands/openItemFromExplorer';
import { generateTypes } from './commands/generateTypes';
import { SitecoreTreeProvider } from './providers/sitecoreTreeProvider';

export function activate(context: vscode.ExtensionContext) {
  const treeProvider = new SitecoreTreeProvider();

  vscode.window.registerTreeDataProvider('sitecoreExplorer', treeProvider);

  const connectCommand = vscode.commands.registerCommand(
    'sitecore.connect',
    async () => {
      await connectSitecore();

      const config = vscode.workspace.getConfiguration('sitecoreCopilot');
      const endpoint = config.get<string>('endpoint');

      treeProvider.setConnected(!!endpoint);
    }
  );

  const searchItemCommand = vscode.commands.registerCommand(
    'sitecore.searchItem',
    async () => {
      await searchItem();
    }
  );

  const openItemFromExplorerCommand = vscode.commands.registerCommand(
    'sitecore.openItemFromExplorer',
    async (input: unknown) => {
      await openItemFromExplorer(input);
    }
  );

  const generateTypesCommand = vscode.commands.registerCommand(
    'sitecore.generateTypes',
    async (input: unknown) => {
      await generateTypes(input);
    }
  );

  const refreshExplorerCommand = vscode.commands.registerCommand(
    'sitecore.refreshExplorer',
    async () => {
      const config = vscode.workspace.getConfiguration('sitecoreCopilot');
      const endpoint = config.get<string>('endpoint');

      treeProvider.setConnected(!!endpoint);
      treeProvider.refresh();
    }
  );

  const config = vscode.workspace.getConfiguration('sitecoreCopilot');
  const endpoint = config.get<string>('endpoint');
  treeProvider.setConnected(!!endpoint);

  context.subscriptions.push(
    connectCommand,
    searchItemCommand,
    openItemFromExplorerCommand,
    generateTypesCommand,
    refreshExplorerCommand
  );
}

export function deactivate() {}