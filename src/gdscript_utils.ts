import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';

/**
 * Interface for GDScript file creation parameters
 */
export interface CreateScriptParams {
  projectPath: string;
  scriptPath: string;
  className?: string;
  extends?: string;
  content?: string;
  template?: string;
}

/**
 * Result of script creation
 */
export interface CreateScriptResult {
  success: boolean;
  scriptPath: string;
  absolutePath: string;
  registered: boolean;
}

/**
 * Interface for modifying a GDScript file
 */
export interface ModifyScriptParams {
  projectPath: string;
  scriptPath: string;
  modifications: ScriptModification[];
}

/**
 * Types of modifications supported
 */
export type ScriptModification = 
  | AddFunctionMod
  | AddVariableMod
  | AddSignalMod
  | ReplaceFunctionMod
  | RemoveFunctionMod
  | AddExportMod;

export interface AddFunctionMod {
  type: "add_function";
  name: string;
  params?: string;
  returnType?: string;
  body: string;
  isAsync?: boolean;
  position?: "end" | "after_ready" | "after_init";
}

export interface AddVariableMod {
  type: "add_variable";
  name: string;
  varType?: string;
  defaultValue?: string;
  isExport?: boolean;
  exportHint?: string;
  isOnready?: boolean;
}

export interface AddSignalMod {
  type: "add_signal";
  name: string;
  params?: string;
}

export interface ReplaceFunctionMod {
  type: "replace_function";
  name: string;
  newBody: string;
}

export interface RemoveFunctionMod {
  type: "remove_function";
  name: string;
}

export interface AddExportMod {
  type: "add_export";
  name: string;
  varType: string;
  defaultValue?: string;
  hint?: string;
}

/**
 * Creates a new GDScript file
 */
export function createGDScript(params: CreateScriptParams): CreateScriptResult {
  const absolutePath = join(params.projectPath, params.scriptPath);
  const dir = dirname(absolutePath);
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let content = params.content || "";

  if (!content) {
    if (params.extends) {
      content += `extends ${params.extends}\n\n`;
    } else {
      content += `extends Node\n\n`;
    }

    if (params.className) {
      content += `class_name ${params.className}\n\n`;
    }

    // Basic templates
    if (params.template === 'singleton' || params.template === 'autoload') {
      // Singleton usually doesn't need special code, just registration
    } else if (params.template === 'state_machine') {
      content += `func _ready():\n\tpass\n\nfunc _process(delta):\n\tpass\n`;
    } else {
      content += `func _ready():\n\tpass\n\nfunc _process(delta):\n\tpass\n`;
    }
  }

  writeFileSync(absolutePath, content, 'utf-8');

  return {
    success: true,
    scriptPath: params.scriptPath,
    absolutePath,
    registered: !!params.className
  };
}

/**
 * Modifies an existing GDScript file
 */
export function modifyGDScript(params: ModifyScriptParams): { success: boolean, message?: string } {
  const absolutePath = join(params.projectPath, params.scriptPath);
  
  if (!existsSync(absolutePath)) {
    throw new Error(`Script file not found: ${absolutePath}`);
  }

  let content = readFileSync(absolutePath, 'utf-8');
  const lines = content.split('\n');

  for (const mod of params.modifications) {
    switch (mod.type) {
      case 'add_variable':
        content = addVariable(content, mod);
        break;
      case 'add_function':
        content = addFunction(content, mod);
        break;
      case 'add_signal':
        content = addSignal(content, mod);
        break;
      // Implement other mods as needed
    }
  }

  writeFileSync(absolutePath, content, 'utf-8');
  return { success: true };
}

function addVariable(content: string, mod: AddVariableMod): string {
  let varDecl = "";
  if (mod.isExport) {
    varDecl += `@export `;
    if (mod.exportHint) varDecl += `${mod.exportHint} `;
  }
  if (mod.isOnready) {
    varDecl += `@onready `;
  }
  
  varDecl += `var ${mod.name}`;
  if (mod.varType) varDecl += `: ${mod.varType}`;
  if (mod.defaultValue) varDecl += ` = ${mod.defaultValue}`;
  
  // Find where to insert (after extends/class_name)
  const lines = content.split('\n');
  let insertIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('extends') || lines[i].startsWith('class_name')) {
      insertIdx = i + 1;
    }
  }
  
  lines.splice(insertIdx, 0, varDecl);
  return lines.join('\n');
}

function addSignal(content: string, mod: AddSignalMod): string {
  let signalDecl = `signal ${mod.name}`;
  if (mod.params) signalDecl += `(${mod.params})`;
  
  const lines = content.split('\n');
  let insertIdx = 0;
  // Insert after variables
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('extends') || lines[i].startsWith('class_name') || lines[i].startsWith('var ') || lines[i].startsWith('@')) {
      insertIdx = i + 1;
    }
  }
  
  lines.splice(insertIdx, 0, signalDecl);
  return lines.join('\n');
}

function addFunction(content: string, mod: AddFunctionMod): string {
  let funcDecl = `\nfunc ${mod.name}(${mod.params || ''})`;
  if (mod.returnType) funcDecl += ` -> ${mod.returnType}`;
  funcDecl += `:\n`;
  
  // Indent body
  const bodyLines = mod.body.split('\n');
  for (const line of bodyLines) {
    funcDecl += `\t${line}\n`;
  }
  
  return content + funcDecl;
}
