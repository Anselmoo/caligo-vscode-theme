/**
 * Shell Script Language Intent Mappings
 *
 * Maps Shell-specific semantic tokens to intent layers.
 * Handles Shell idioms like pipes, redirects, variable expansion, etc.
 */

import type { LanguageMapper } from "./types.js";

export const shellMapper: LanguageMapper = {
  language: "shellscript",
  displayName: "Shell",
  extensions: [".sh", ".bash", ".zsh", ".fish"],

  mappings: {
    // PIPES → CONTROL FLOW
    "operator.pipe": {
      layer: "controlFlow",
      description: "Pipe operators",
      examples: ["cat file.txt | grep pattern", "ls | wc -l"],
    },

    // REDIRECTS → CONTROL FLOW
    "operator.redirect": {
      layer: "controlFlow",
      description: "I/O redirection",
      examples: ["echo 'text' > file.txt", "command 2>&1"],
    },

    // VARIABLE EXPANSION → USAGE
    "variable.expansion": {
      layer: "usage",
      description: "Variable expansion",
      examples: ["$VAR", "$HOME", "$1"],
    },

    // COMMAND SUBSTITUTION → CONTROL FLOW
    "string.commandSubstitution": {
      layer: "controlFlow",
      description: "Command substitution",
      examples: ["$(command)", "`command`"],
    },

    // FUNCTION DEFINITIONS → DECLARATION
    "function.declaration": {
      layer: "declaration",
      description: "Function definitions",
      examples: ["function name() {", "name() {"],
    },

    // IF/WHILE/FOR → CONTROL FLOW
    "keyword.controlFlow": {
      layer: "controlFlow",
      description: "Control flow keywords",
      examples: ["if", "while", "for", "case"],
    },

    // TEST EXPRESSIONS → CONTROL FLOW
    "keyword.test": {
      layer: "controlFlow",
      description: "Test expressions",
      examples: ["[[ -f file ]]", '[ -z "$var" ]'],
    },

    // && / || → CONTROL FLOW
    "operator.logical": {
      layer: "controlFlow",
      description: "Logical operators",
      examples: ["command1 && command2", "command || fallback"],
    },

    // EXPORT/LOCAL → MUTATION
    "keyword.export": {
      layer: "mutation",
      description: "Variable scope modifiers",
      examples: ["export PATH", "local var=value"],
    },

    // SOURCE/DOT → CONTROL FLOW
    "keyword.source": {
      layer: "controlFlow",
      description: "Script sourcing",
      examples: ["source config.sh", ". ~/.bashrc"],
    },

    // HERE-DOCUMENTS → DATA
    "string.heredoc": {
      layer: "data",
      description: "Here-documents",
      examples: ["<<EOF", "<<-'END'"],
    },

    // POSITIONAL PARAMETERS → USAGE
    "variable.positional": {
      layer: "usage",
      description: "Positional parameters",
      examples: ["$1", "$@", "$#", "$*"],
    },

    // SPECIAL VARIABLES → USAGE
    "variable.special": {
      layer: "usage",
      modifiers: ["builtin"],
      description: "Special shell variables",
      examples: ["$?", "$$", "$!", "$-"],
    },

    // PROCESS SUBSTITUTION → CONTROL FLOW
    "operator.processSubstitution": {
      layer: "controlFlow",
      description: "Process substitution",
      examples: ["diff <(cmd1) <(cmd2)"],
    },

    // GLOB PATTERNS → DATA
    "string.glob": {
      layer: "data",
      description: "Glob patterns",
      examples: ["*.txt", "file[0-9].log"],
    },
  },
};
