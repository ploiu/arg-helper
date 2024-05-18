import { assert, assertEquals, assertFalse } from '@std/assert';
import { stripAnsiCode } from '@std/fmt/colors';
import { buildArgLine, buildHelpText, validateArgument } from '../argHelperFunctions.ts';

// allows us to verify that we use error messages properly
function replaceConsoleMethod(fn) {
  const original = globalThis.console[fn.name];
  const overwritten = (globalThis.console[fn.name] = fn);
  return { original, overwritten };
}

Deno.test('buildArgLine lists both flag names if they exist', () => {
  const arg = {
    name: 'testArg',
    shortName: 't',
    description: '',
  };

  const argLine = buildArgLine(arg, 0);
  assertEquals(stripAnsiCode(argLine), '  --testArg, -t    (required) - ');
});

Deno.test('buildArgLine only lists the normal flag name if the short name does not exist', () => {
  const arg = {
    name: 'testArg',
    description: '',
  };

  const argLine = buildArgLine(arg, 0);
  assertEquals(stripAnsiCode(argLine), '  --testArg    (required) - ');
});

Deno.test('buildArgLine lists if the flag is optional required', () => {
  const required = {
    name: 'required',
    description: '',
  };
  const optional = {
    name: 'optional',
    description: '',
    required: false,
  };
  const requiredLine = buildArgLine(required, 0);
  const optionalLine = buildArgLine(optional, 0);

  assertEquals(stripAnsiCode(requiredLine), '  --required    (required) - ');
  assertEquals(stripAnsiCode(optionalLine), '  --optional    (optional) - ');
});

Deno.test('buildArgLine', () => {
  const arg = {
    name: 'arg',
    shortName: 'a',
    description: 'argument description',
  };

  const argLine = buildArgLine(arg, 0);
  assertEquals(
    stripAnsiCode(argLine),
    '  --arg, -a    (required) - argument description',
  );
});

Deno.test('Test that buildHelpText generates script description', () => {
  const definition = {
    arguments: [],
    scriptDescription: 'Test Description',
  };

  const actual = buildHelpText(definition);

  assert(actual.includes('Test Description'));
});

Deno.test('Test that validateArgument checks for arg existence if no validationFunction is passed', () => {
  const withArg = {
    name: 'test',
  };
  const withoutArg = {
    name: 'test2',
  };
  const parsedArgs = { test: 1, _: [] };
  assert(validateArgument(parsedArgs, withArg));
  assertFalse(validateArgument(parsedArgs, withoutArg));
});

Deno.test('Test that validateArgument uses the default error message if none is passed', () => {
  let setErrorMessage;
  replaceConsoleMethod(function error(message) {
    setErrorMessage = message;
  });
  const withoutArg = {
    name: 'test2',
  };
  const parsedArgs = { _: [] };
  assertFalse(validateArgument(parsedArgs, withoutArg));
  assertEquals(stripAnsiCode(setErrorMessage), 'test2: is a required argument');
});

Deno.test('Test that validateArgument uses the validation function if one is provided', () => {
  let validationFunctionCalled = false;
  const arg = {
    name: 'test',
    validationFunction: () => validationFunctionCalled = true,
  };

  assert(validateArgument({}, arg));
  assert(validationFunctionCalled);
});

Deno.test('Test that validateArgument uses the validation error message if one is provided', () => {
  let validationErrorMessage;
  const arg = {
    name: 'test',
    validationFailedMessage: () => 'validationFailedMessage called',
  };
  replaceConsoleMethod(function error(val) {
    validationErrorMessage = val;
  });
  assertFalse(validateArgument({}, arg));
  assertEquals(
    stripAnsiCode(validationErrorMessage),
    'test: validationFailedMessage called',
  );
});

Deno.test('Test that validateArgument uses the arg short name if it is passed and defined', () => {
  const arg = {
    name: 'test',
    shortName: 't',
  };
  assert(validateArgument({ t: 1 }, arg));
});

Deno.test('Test that validateArgument fails if no args are passed', () => {
  const args = { _: [] };
  const argument = {
    name: 'test',
    description: '',
  };
  assertFalse(validateArgument(args, argument));
});
