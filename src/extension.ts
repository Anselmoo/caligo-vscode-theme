// Use vscode types directly in the extension host.
import * as vscode from "vscode";

function hasContentArg(arg: unknown): arg is { content: string } {
  return (
    typeof arg === "object" &&
    arg !== null &&
    "content" in arg &&
    typeof (arg as Record<string, unknown>).content === "string"
  );
}

export function activate(context: vscode.ExtensionContext) {
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

      if (hasContentArg(arg)) {
        const { content } = arg;
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
