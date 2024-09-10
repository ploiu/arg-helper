import type { Argument, ScriptDefinition, ValidateArgsParams } from './models.ts';
import { type Args, parseArgs } from '@std/cli';
import { cyan, magenta, red, yellow } from '@std/fmt/colors';

/**
 * Parses arguments and validates them against a schema you define, and returns the parsed arguments on success.
 *
 * # Description
 * Arguments should be parseable by `parseArgs` from {@link https://jsr.io/@std/cli|@std/cli}.
 *
 * If any of the help flags are passed (default `--help` or `-h`), then generated help text is displayed with {@linkcode buildHelpText}; the `cleanupFunction` is called (if specified); and the script is exited with `Deno.exit(0)`.
 *
 * Arguments are by default validated to make sure they exist if marked `required`. If a `validationFunction` is specified for the argument, that function is used instead.
 * If an argument fails validation, then an error message is displayed; generated help text will print below; the `cleanupFunction` is called (if specified); and the script is exited with `Deno.exit(1)`. This ensures that your users know how to use your script while preventing the script from acting upon invalid arguments.
 *
 * For ease of use, parsed arguments are renamed to their full name when returned. This allows the script writer to only have to search for 1 key in the return value.
 *
 * If no arguments are passed and all arguments are optional, this function will not show the help text unless {@linkcode ScriptDefinition}'s `anyArgRequired` field is set to `true`
 *
 * ## Examples
 * @example Basic Usage
 * ```ts
 * import { validateArgs, type ScriptDefinition } from '@ploiu/arg-helper';
 * const args = Deno.args;
 * const definition: ScriptDefinition = {
 *   arguments: [
 *     {
 *       name: 'firstArg',
 *       description: 'first argument'
 *     },
 *     {
 *         name: 'env',
 *         shortName: 'e',
 *         description: 'The environment to do the thing for. Must be either `dev` or `prod`',
 *         validationFunction: value => ['dev', 'prod'].includes(String(value).toLowerCase()),
 *         validationFailedMessage: value => `${value} is not either \`dev\` or \`prod\``
 *     }
 *   ],
 *   scriptDescription: 'This script does the thing'
 * }
 *
 * const validatedArgs = validateArgs({ args, definition })
 * ```
 *
 * @example renamed args
 * ```ts
 * import { validateArgs, type ScriptDefinition } from '@ploiu/arg-helper'
 * const args = ['-f', 'firstArgValue'];
 * const definition: ScriptDefinition = {
 *   arguments: [
 *     {
 *       name: 'firstArg',
 *       shortName: 'f',
 *       description: 'first argument'
 *     }
 *   ],
 *   scriptDescription: 'This script does the thing'
 * }
 *
 * const validatedArgs = validateArgs({ args, definition })
 * // {firstArg: 'firstArgValue', _: []}
 * ```
 *
 * @see {@link https://jsr.io/@std/cli/doc/~/ParseOptions}
 */
export function validateArgs(params: ValidateArgsParams): Args {
  const { args, definition, parseOptions, cleanupFunction } = params;
  const parsedArgs = parseArgs(args, parseOptions);
  const helpFlags = definition.helpFlags ?? ['help', 'h'];
  const helpText = buildHelpText(definition);
  if (
    (args.length === 0 && definition.anyArgRequired) || helpFlags[0] in parsedArgs ||
    helpFlags[1] as string in parsedArgs
  ) {
    console.log(helpText);
    cleanupFunction?.();
    Deno.exit(0);
  }
  for (const arg of definition.arguments) {
    if (validateArgument(parsedArgs, arg)) {
      // deleting short name and setting long name makes it easier for script writer.
      // shortName will always be not null here if there is no value for long name
      const value = parsedArgs[arg.name] ?? parsedArgs[arg.shortName!];
      delete parsedArgs[arg.shortName ?? ''];
      parsedArgs[arg.name] = value;
    } else {
      console.log(helpText);
      cleanupFunction?.();
      Deno.exit(1);
    }
  }

  return parsedArgs;
}

export function validateArgument(parsedArgs: Args, arg: Argument): boolean {
  // deno-lint-ignore no-explicit-any
  const defaultValidationFunction = (value: any) => !!value || arg.required === false;
  const defaultErrorMessage = arg.validationFailedMessage ??
    // this gets paired with us logging the argument name at the end
    (() => `is a required argument`);
  // deno-lint-ignore no-explicit-any
  const validationFunction: (it: any) => boolean = arg.validationFunction ??
    defaultValidationFunction;
  const errorMessage = arg.validationFailedMessage ?? defaultErrorMessage;
  // because an arg can be set to either the name or the short name
  // deno-lint-ignore no-explicit-any
  const argValue: any = arg.name in parsedArgs
    ? parsedArgs[arg.name]
    : parsedArgs[arg.shortName ?? ''];
  if (!validationFunction(argValue)) {
    console.error(red(arg.name + ': ' + errorMessage(argValue)));
    return false;
  }
  return true;
}

/**
 * creates formatted help text for the passed {@linkcode ScriptDefinition}
 *
 * This function generates help text based on the overall script description, arguments, and argument descriptions.
 * Arguments are listed as required or optional based on what is set for that argument's `required` field. `required` is assumed `true` by default if unspecified
 *
 * @example HelpText Input And Associated Output
 * ```ts
 * import {ScriptDefinition, buildHelpText} from '@ploiu/arg-helper'
 * const definition: ScriptDefinition = {
 *   arguments: [
 *       {
 *           name: 'firstArg',
 *           description: 'the first argument'
 *       },
 *       {
 *           name: 'secondArg',
 *           shortName: 's',
 *           description: 'the second argument'
 *       },
 *       {
 *           name: 'thirdArg',
 *           description: 'the third argument',
 *           required: false
 *       }
 *   ],
 *   scriptDescription: 'this script does the thing'
 * }
 * console.log(buildHelpText(definition))
 * // this script does the thing
 * // Arguments:
 * //   --firstArg       (required) - the first argument
 * //   --secondArg, -s  (required) - the second argument
 * //   --thirdArg       (optional) - the third argument
 * //
 * //   --help, -h       - show this help text
 * ```
 */
export function buildHelpText(definition: ScriptDefinition): string {
  let helpText = definition.scriptDescription + '\nArguments:\n';
  const argNames: [string, string?][] = definition.arguments.map((
    { name, shortName },
  ) => [name, shortName]);
  // if there are no defined args, we can't outright crash - use a 0-width string
  argNames.push(['']);
  const maxArgLineLength = argNames
    .map(getArgLineLength)
    .reduce((max, current) => max < current ? current : max);
  for (const arg of definition.arguments) {
    helpText += buildArgLine(arg, maxArgLineLength) + '\n';
  }
  helpText += '\n';
  // help flag part
  if (Array.isArray(definition.helpFlags)) {
    helpText += buildHelpLine(definition.helpFlags, maxArgLineLength);
  } else {
    helpText += buildHelpLine(['help', 'h'], maxArgLineLength);
  }
  return helpText;
}

/**
 * builds the text for the line description of the passed Argument
 */
export function buildArgLine(arg: Argument, maxArgLineLength: number): string {
  // initial arg string
  let argText = '--' + arg.name;
  if (arg.shortName) {
    argText += ', -' + arg.shortName;
  }
  // add end padding
  const argLength = argText.length;
  const extraEndSpaceCount = Math.max(
    maxArgLineLength - argLength + 4,
    4,
  );
  argText = '  ' + colorArg(argText, cyan);
  argText += ' '.repeat(extraEndSpaceCount);
  // required or not
  if (arg.required !== undefined && !arg.required) {
    argText += yellow('(optional)');
  } else {
    argText += magenta('(required)');
  }
  return argText + ' - ' + arg.description;
}

/**
 * similar to {@linkcode buildArgLine}, but for the help script flag
 */
function buildHelpLine(
  arg: [string, string?],
  maxArgLineLength: number,
): string {
  const [name, shortName] = arg;
  let helpLine = '--' + name;
  if (shortName) {
    helpLine += ', ' + '-' + shortName;
  }
  const spaceCount = Math.max(3, maxArgLineLength - helpLine.length + 3);
  helpLine = colorArg(helpLine, cyan);
  helpLine += ' '.repeat(spaceCount) + ' - show this help text';
  return '  ' + helpLine;
}

function colorArg(argText: string, colorFn: (text: string) => string): string {
  return argText.split(',')
    .map((it) => colorFn(it))
    .join(',');
}

/**
 * returns the length of an argument line. Used for aligning argument descriptions
 */
function getArgLineLength([name, shortName]: [string, string?]): number {
  return ('--' + name + (shortName ? ', -' + shortName : '')).length;
}
