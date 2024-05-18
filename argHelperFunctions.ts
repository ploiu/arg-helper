import type {
  Argument,
  ScriptDefinition,
  ValidateArgsParams,
} from './models.ts';
import { type Args, parseArgs } from '@std/cli';
import { cyan, magenta, red, yellow } from '@std/fmt/colors';

/**
 * Parses the passed `args` with `@std/cli#parseArgs`, and validates them against the passed definition.
 *
 * If the arguments do not pass the definition, help text is displayed and the program will exit using `Deno.exit`.
 * This should be called before you invoke anything else, but just in case that's unnatainable you can pass a callback function that can be used to cleanup anything you've set up, before the program exits
 *
 * If all the arguments validate successfully, they are returned back to the caller.
 * @param args the arguments as a string Array. `Deno.args` can return this, or you can pass your own argument array.
 * @param definition the Argument definitions for validation and help text building
 * @param parseOptions options to parse your parameters.
 * @param cleanupFunction a function that can be called in case argument validation fails, called before calling `Deno.exit`.
 */
export function validateArgs(params: ValidateArgsParams): Args {
  const { args, definition, parseOptions, cleanupFunction } = params;
  const parsedArgs = parseArgs(args, parseOptions);
  const helpFlags = definition.helpFlags ?? ['help', 'h'];
  if (helpFlags[0] in parsedArgs || helpFlags[1] as string in parsedArgs) {
    console.log(buildHelpText(definition));
  }
  for (const arg of definition.arguments) {
    if (validateArgument(parsedArgs, arg)) {
      // deleting short name and setting long name makes it easier for script writer.
      // shortName will always be not null here if there is no value for long name
      const value = parsedArgs[arg.name] ?? parsedArgs[arg.shortName!];
      delete parsedArgs[arg.shortName ?? ''];
      parsedArgs[arg.name] = value;
    } else {
      cleanupFunction?.();
      Deno.exit(1);
    }
  }

  return parsedArgs;
}

export function validateArgument(parsedArgs: Args, arg: Argument): boolean {
  // deno-lint-ignore no-explicit-any
  const defaultValidationFunction = (value: any) =>
    !!value || arg.required === false;
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
 * Optional arguments are marked, required are unmarked
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
