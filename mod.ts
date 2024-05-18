/**
 * Validates your arguments and generates formatted help text for your simple scripts.
 *
 * This is not meant for entire CLIs where each argument is like its own entire program. Rather, this is for simple scripts that you could hack together in 30 minutes,
 * but don't want to spend time creating, formatting, and tweaking help text; or manually validating those arguments.
 *
 * {@link ./models.ts#Argument}
 * @module
 */

export type {
  Argument,
  ScriptDefinition,
  ValidateArgsParams,
} from './models.ts';
export { buildHelpText, validateArgs } from './argHelperFunctions.ts';
