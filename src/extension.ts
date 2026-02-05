// Use vscode types directly in the extension host.
import * as vscode from "vscode";

export function activate(context: any) {
  console.log("Caligo test helper extension activated");

  const openFile = vscode.commands.registerCommand("caligo-test.openFile", async (arg: unknown) => {
    try {
      if (!arg) return false;
      if (typeof arg === "string") {
        const uri = vscode.Uri.file(arg);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
        return true;
      }

      if (typeof arg === "object" && arg !== null && (arg as any).content) {
        const content = (arg as any).content as string;
        const doc = await vscode.workspace.openTextDocument({ content, language: "typescript" });
        await vscode.window.showTextDocument(doc, { preview: false });
        return true;
      }

      return false;
    } catch (e) {
      console.warn("caligo-test.openFile failed", e);
      return false;
    }
  });

  const applyTheme = vscode.commands.registerCommand(
    "caligo-test.applyTheme",
    async (themeName: unknown) => {
      try {
        if (!themeName || typeof themeName !== "string") return false;
        await vscode.workspace
          .getConfiguration()
          .update("workbench.colorTheme", themeName, vscode.ConfigurationTarget.Global);
        return true;
      } catch (e) {
        console.warn("caligo-test.applyTheme failed", e);
        return false;
      }
    }
  );

  context.subscriptions.push(openFile, applyTheme);
}

export function deactivate() {
  // noop
}
