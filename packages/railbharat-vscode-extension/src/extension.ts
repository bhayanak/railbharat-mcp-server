import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const serverPath = vscode.Uri.joinPath(
    context.extensionUri,
    'dist',
    'server',
    'index.js'
  ).fsPath;

  // Emitter to tell VS Code to re-query the provider when settings change
  const emitter = new vscode.EventEmitter<void>();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('railbharat')) {
        emitter.fire();
      }
    })
  );

  const disposable = vscode.lm.registerMcpServerDefinitionProvider('railbharat', {
    onDidChangeMcpServerDefinitions: emitter.event,

    provideMcpServerDefinitions(_token: vscode.CancellationToken) {
      const config = vscode.workspace.getConfiguration('railbharat');

      // ALWAYS return the server definition — never return []
      // Pass empty strings for missing values; the server handles missing config gracefully
      return [
        new vscode.McpStdioServerDefinition(
          'RailBharat — Indian Railways',
          process.execPath,
          [serverPath],
          {
            RAILBHARAT_MCP_RAPIDAPI_KEY: config.get<string>('rapidApiKey') ?? '',
            RAILBHARAT_MCP_RAPIDAPI_HOST:
              config.get<string>('rapidApiHost') ?? 'irctc1.p.rapidapi.com',
            RAILBHARAT_MCP_INDIANRAIL_KEY: config.get<string>('indianRailApiKey') ?? '',
            RAILBHARAT_MCP_INDIANRAIL_URL:
              config.get<string>('indianRailApiUrl') ?? 'https://indianrailapi.com/api/v2',
            RAILBHARAT_MCP_DATAGOV_KEY: config.get<string>('dataGovKey') ?? '',
            RAILBHARAT_MCP_OVERPASS_URL:
              config.get<string>('overpassApiUrl') ?? 'https://overpass-api.de/api/interpreter',
            RAILBHARAT_MCP_CACHE_TTL_MS: String(config.get<number>('cacheTtlMs') ?? 300000),
            RAILBHARAT_MCP_TIMEOUT_MS: String(config.get<number>('timeoutMs') ?? 15000),
          },
          '0.1.0'
        ),
      ];
    },
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
