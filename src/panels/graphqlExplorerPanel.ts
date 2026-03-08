import * as vscode from 'vscode';
import { sitecoreRequest } from '../sitecore/client';

type ExplorerRequestMessage = {
  type: 'runQuery';
  query: string;
  variablesText: string;
};

export class GraphqlExplorerPanel {
  public static currentPanel: GraphqlExplorerPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (GraphqlExplorerPanel.currentPanel) {
      GraphqlExplorerPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'sitecoreGraphqlExplorer',
      'Sitecore GraphQL Explorer',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    GraphqlExplorerPanel.currentPanel = new GraphqlExplorerPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.html = this.getHtml(this.panel.webview);

    this.panel.webview.onDidReceiveMessage(
      async (message: ExplorerRequestMessage) => {
        if (message.type === 'runQuery') {
          await this.handleRunQuery(message);
        }
      },
      null,
      this.disposables
    );
  }

  public dispose() {
    GraphqlExplorerPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const item = this.disposables.pop();
      if (item) {
        item.dispose();
      }
    }
  }

  private async handleRunQuery(message: ExplorerRequestMessage) {
    try {
      const config = vscode.workspace.getConfiguration('sitecoreCopilot');
      const endpoint = config.get<string>('endpoint');
      const apiKey = config.get<string>('apiKey');

      if (!endpoint) {
        this.panel.webview.postMessage({
          type: 'queryResult',
          ok: false,
          error: 'No endpoint configured. Run "Sitecore: Connect" first.',
        });
        return;
      }

      let variables: Record<string, unknown> | undefined = undefined;

      if (message.variablesText.trim()) {
        variables = JSON.parse(message.variablesText);
      }

      const result = await sitecoreRequest<unknown>(
        endpoint,
        message.query,
        variables,
        apiKey
      );

      this.panel.webview.postMessage({
        type: 'queryResult',
        ok: true,
        data: result,
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);

      this.panel.webview.postMessage({
        type: 'queryResult',
        ok: false,
        error: messageText,
      });
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sitecore GraphQL Explorer</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      margin: 0;
      padding: 16px;
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      height: calc(100vh - 32px);
    }

    .panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .label {
      font-size: 12px;
      margin-bottom: 8px;
      opacity: 0.8;
    }

    textarea, pre {
      width: 100%;
      flex: 1;
      box-sizing: border-box;
      border: 1px solid var(--vscode-input-border, #555);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      padding: 12px;
      border-radius: 6px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 13px;
      resize: none;
      min-height: 0;
      overflow: auto;
      white-space: pre-wrap;
    }

    .vars {
      height: 140px;
      flex: unset;
      margin-top: 12px;
    }

    .toolbar {
      display: flex;
      gap: 8px;
      margin: 0 0 12px 0;
    }

    button {
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
    }

    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .status {
      margin-bottom: 8px;
      font-size: 12px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button id="runBtn">Run</button>
    <button id="copyBtn" class="secondary">Copy Query</button>
    <button id="formatVarsBtn" class="secondary">Format Variables</button>
  </div>

  <div class="layout">
    <div class="panel">
      <div class="label">Query</div>
      <textarea id="queryEditor">query GetHome($path: String!, $language: String!) {
  item(path: $path, language: $language) {
    id
    name
    path
  }
}</textarea>

      <div class="label" style="margin-top:12px;">Variables</div>
      <textarea id="variablesEditor" class="vars">{
  "path": "/sitecore/content/Home",
  "language": "en"
}</textarea>
    </div>

    <div class="panel">
      <div class="status" id="status">Ready</div>
      <div class="label">Result</div>
      <pre id="resultViewer">{}</pre>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    const queryEditor = document.getElementById('queryEditor');
    const variablesEditor = document.getElementById('variablesEditor');
    const resultViewer = document.getElementById('resultViewer');
    const status = document.getElementById('status');
    const runBtn = document.getElementById('runBtn');
    const copyBtn = document.getElementById('copyBtn');
    const formatVarsBtn = document.getElementById('formatVarsBtn');

    runBtn.addEventListener('click', () => {
      status.textContent = 'Running query...';
      resultViewer.textContent = '';

      vscode.postMessage({
        type: 'runQuery',
        query: queryEditor.value,
        variablesText: variablesEditor.value
      });
    });

    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(queryEditor.value);
      status.textContent = 'Query copied';
    });

    formatVarsBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(variablesEditor.value || '{}');
        variablesEditor.value = JSON.stringify(parsed, null, 2);
        status.textContent = 'Variables formatted';
      } catch (error) {
        status.textContent = 'Variables JSON is invalid';
      }
    });

    window.addEventListener('message', event => {
      const message = event.data;

      if (message.type === 'queryResult') {
        if (message.ok) {
          status.textContent = 'Success';
          resultViewer.textContent = JSON.stringify(message.data, null, 2);
        } else {
          status.textContent = 'Error';
          resultViewer.textContent = message.error;
        }
      }
    });
  </script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}