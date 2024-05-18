import type { ParseOptions } from '@std/cli';

/**
 * Represents an individual argument for your script. Each argument is defined by the argument name and a description for help text.
 *
 * Optionally, you can specify:
 * - shortName
 * - required
 * - validationFunction
 * - validationErrorMessage
 *
 * @example Barebones Argument Definition
 * ```ts
 * import type {Argument} from '@ploiu/arg-helper'
 * const arg: Argument = {
 *  name: "testArgument",
 *  description: "this is the argument description. If you're reading this, you're pretty cool"
 * }
 * ```
 *
 * @example Requiring Specific Values With An Error Message
 * ```ts
 * import type {Argument} from '@ploiu/arg-helper'
 * const arg: Argument = {
 *   name: "environment",
 *   description: "the environment this script is targeting. Valid values are `dev` and `prod`",
 *   validationFunction: value => ['dev', 'prod'].includes(value?.toLowerCase()),
 *   validationFailedMessage: value => `${value} is not a valid value for environment. Valid values are \`dev\` and \`prod\``
 * }
 * ```
 */
export type Argument = {
  /** The long name of the argument. E.g. "test" would be parsed from `--test` */
  name: string;
  /** The short name of the argument, must be 1 character. E.g. "t" would be parsed from `-t` */
  shortName?: string;
  /** The description of the argument. Displayed in help text */
  description: string;
  /** Whether this argument is required. Defaults to true */
  required?: boolean;
  /** Function used to validate the argument's value. Returning true from the function marks this argument as valid. Returning false will cause the script to exit with `Deno.exit(1)`, after displaying a user-defined error message */
  // deno-lint-ignore no-explicit-any
  validationFunction?: (argValue?: any) => boolean;
  /** The message to display before exiting if the {@linkcode Argument.validationFunction} returns false. Defaults to "The value passed for <name> is invalid." This value only needs to be populated if you supplied a `validationFunction` */
  // deno-lint-ignore no-explicit-any
  validationFailedMessage?: (incorrectValue?: any) => string;
};

/**
 * represents the overall description for your script.
 *
 * This includes the list of {@linkcode Argument}s, the description line for your script, and optional help flag definitions (if you don't want to use `--help` and `-h`)
 */
export interface ScriptDefinition {
  /** the defined arguments for your script */
  arguments: Argument[];
  /** the description of what your script does */
  scriptDescription: string;
  /** flags the user can pass to explicitly show the help message for your script. Defaults to `--help` and `-h` */
  helpFlags?: [string, string?];
}

/**
 * Exists to give script writers more freedom in how they pass their parameters to `validateArgs`
 * while also avoiding having to pass `undefined` for parseOptions in 99% of use cases
 */

export type ValidateArgsParams = {
  args: string[];
  definition: ScriptDefinition;
  parseOptions?: ParseOptions;
  cleanupFunction?: () => void;
};
