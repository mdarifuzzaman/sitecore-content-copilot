import * as vscode from 'vscode';
import { connectSitecore } from './commands/connect';
import { searchItem } from './commands/searchItem';
import { openItemFromExplorer } from './commands/openItemFromExplorer';
import { generateTypes } from './commands/generateTypes';
import { generateJssModel } from './commands/generateJssModel';
import { copyGraphqlQuery } from './commands/copyGraphqlQuery';
import { generateComponent } from './commands/generateComponent';
import { SitecoreTreeProvider } from './providers/sitecoreTreeProvider';
import { GraphqlExplorerPanel } from './panels/graphqlExplorerPanel';
import { openItemInGraphqlExplorer } from './commands/openItemInGraphqlExplorer';
import { runSetupWizard } from './setup/setupWizard';

export async function activate(context: vscode.ExtensionContext) {
  await runSetupWizard(context);
  const treeProvider = new SitecoreTreeProvider();

  vscode.window.registerTreeDataProvider('sitecoreExplorer', treeProvider);

  const connectCommand = vscode.commands.registerCommand('sitecore.connect', async () => {
    await connectSitecore();
    const config = vscode.workspace.getConfiguration('sitecoreCopilot');
    const endpoint = config.get<string>('endpoint');
    treeProvider.setConnected(!!endpoint);
  });

  const searchItemCommand = vscode.commands.registerCommand('sitecore.searchItem', async () => {
    await searchItem();
  });

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

  const generateJssModelCommand = vscode.commands.registerCommand(
    'sitecore.generateJssModel',
    async (input: unknown) => {
      await generateJssModel(input);
    }
  );

  const copyGraphqlQueryCommand = vscode.commands.registerCommand(
    'sitecore.copyGraphqlQuery',
    async (input: unknown) => {
      await copyGraphqlQuery(input);
    }
  );

  const generateComponentCommand = vscode.commands.registerCommand(
    'sitecore.generateComponent',
    async (input: unknown) => {
      await generateComponent(input);
    }
  );

  const openGraphqlExplorerCommand = vscode.commands.registerCommand(
    'sitecore.openGraphqlExplorer',
    async () => {
      GraphqlExplorerPanel.createOrShow(context);
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

  const openItemInGraphqlExplorerCommand = vscode.commands.registerCommand(
    'sitecore.openItemInGraphqlExplorer',
    async (input: unknown) => {
      await openItemInGraphqlExplorer(input, context);
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
    generateJssModelCommand,
    copyGraphqlQueryCommand,
    generateComponentCommand,
    openGraphqlExplorerCommand,
    refreshExplorerCommand,
    openItemInGraphqlExplorerCommand
  );
}

export function deactivate() {}