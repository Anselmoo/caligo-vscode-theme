declare module "vscode" {
  // biome-ignore lint/suspicious/noExplicitAny: VS Code's vscode module is dynamically typed
  const vscode: any;
  export = vscode;
}
