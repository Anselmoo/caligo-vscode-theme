import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("caligo-test.openFile", async (filePath: string) => {
      try {
        if (!filePath) return;
        const uri = vscode.Uri.file(filePath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
        console.log("caligo-test.openFile: opened", filePath);
      } catch (e) {
        console.error("caligo-test.openFile failed", e);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caligo-test.applyTheme", async (themeName: string) => {
      try {
        if (!themeName) return;
        await vscode.workspace
          .getConfiguration()
          .update("workbench.colorTheme", themeName, vscode.ConfigurationTarget.Global);
        console.log("caligo-test.applyTheme: applied", themeName);
      } catch (e) {
        console.error("caligo-test.applyTheme failed", e);
      }
    })
  );
}

export function deactivate() {}
