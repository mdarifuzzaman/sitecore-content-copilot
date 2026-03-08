import * as vscode from 'vscode';
import { getItemChildren } from '../sitecore/contentService';

export type SitecoreNodeType = 'root' | 'item' | 'message';

export class SitecoreTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly nodeType: SitecoreNodeType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemPath?: string,
    public readonly hasChildren?: boolean
  ) {
    super(label, collapsibleState);

    this.contextValue = nodeType;
    this.description = itemPath;

    if (itemPath) {
      this.tooltip = itemPath;
    }

    if (nodeType === 'item' && itemPath) {
      this.command = {
        command: 'sitecore.openItemFromExplorer',
        title: 'Open Sitecore Item',
        arguments: [itemPath],
      };
    }
  }
}

export class SitecoreTreeProvider
  implements vscode.TreeDataProvider<SitecoreTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    SitecoreTreeItem | undefined | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private connected = false;
  private readonly rootPath = '/sitecore/content';

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setConnected(connected: boolean): void {
    this.connected = connected;
    this.refresh();
  }

  getTreeItem(element: SitecoreTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SitecoreTreeItem): Promise<SitecoreTreeItem[]> {
    if (!this.connected) {
      if (!element) {
        return [
          new SitecoreTreeItem(
            'Not connected',
            'message',
            vscode.TreeItemCollapsibleState.None
          ),
        ];
      }

      return [];
    }

    try {
      if (!element) {
        return [
          new SitecoreTreeItem(
            'Content',
            'root',
            vscode.TreeItemCollapsibleState.Expanded,
            this.rootPath,
            true
          ),
        ];
      }

      const targetPath = element.itemPath;

      if (!targetPath) {
        return [];
      }

      const children = await getItemChildren(targetPath);

      return children.map(
        (child) =>
          new SitecoreTreeItem(
            child.name,
            'item',
            child.hasChildren
              ? vscode.TreeItemCollapsibleState.Collapsed
              : vscode.TreeItemCollapsibleState.None,
            child.path,
            child.hasChildren
          )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return [
        new SitecoreTreeItem(
          `Error: ${message}`,
          'message',
          vscode.TreeItemCollapsibleState.None
        ),
      ];
    }
  }
}