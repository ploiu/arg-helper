import {
  assert,
  assertEquals,
  assertFalse,
  assertObjectMatch,
} from '@std/assert';
import { stripAnsiCode } from '@std/fmt/colors';
import { validateArgs } from '../argHelperFunctions.ts';
// a separate test file for this function because we have to overwrite more
// than a couple functions that could interfere with other tests

// allows us to verify that we use error messages properly
function replaceConsoleMethod(fn) {
  const original = globalThis.console[fn.name];
  const overwritten = (globalThis.console[fn.name] = fn);
  return { original, overwritten };
}

Deno.test('Test that validateArgs shows help text if no help flag is defined and --help is passed', () => {
  const definition = {
    arguments: [],
    scriptDescription: '',
  };

  let loggedText;
  replaceConsoleMethod(function log(value) {
    loggedText = value;
  });

  const args = ['--help', '--whatever', 'whateverValue'];
  validateArgs({ args, definition });
  assertEquals(
    stripAnsiCode(loggedText),
    '\nArguments:\n\n  --help, -h    - show this help text',
  );
});

Deno.test('Test that validateArgs shows help text if no help flag is defined and -h is passed', () => {
  const definition = {
    arguments: [],
    scriptDescription: '',
  };

  let loggedText;
  replaceConsoleMethod(function log(value) {
    loggedText = value;
  });

  const args = ['-h', '--whatever', 'whateverValue'];
  validateArgs({ args, definition });
  assertEquals(
    stripAnsiCode(loggedText),
    '\nArguments:\n\n  --help, -h    - show this help text',
  );
});

Deno.test('Test that validateArgs shows help text if a help flag is defined and it is passed', () => {
  const definition = {
    arguments: [],
    scriptDescription: '',
    helpFlags: ['test'],
  };

  let loggedText;
  replaceConsoleMethod(function log(value) {
    loggedText = value;
  });

  const args = ['--test', '--whatever', 'whateverValue'];
  validateArgs({ args, definition });
  assertEquals(
    stripAnsiCode(loggedText),
    '\nArguments:\n\n  --test    - show this help text',
  );
});

Deno.test('Test that validateArgs shows help text if a short flag is defined and passed', () => {
  const definition = {
    arguments: [],
    scriptDescription: '',
    helpFlags: ['test', 't'],
  };

  let loggedText;
  replaceConsoleMethod(function log(value) {
    loggedText = value;
  });

  const args = ['-t', '--whatever', 'whateverValue'];
  validateArgs({ args, definition });
  assertEquals(
    stripAnsiCode(loggedText),
    '\nArguments:\n\n  --test, -t    - show this help text',
  );
});

Deno.test('Test that validateArgs calls Deno.exit if any of the args do not pass validation', () => {
  const definition = {
    arguments: [
      {
        name: 'test',
        description: '',
        validationFunction: () => false,
      },
    ],
    scriptDescription: '',
  };
  const args = ['--test'];
  let exitCalled = false;
  Deno.exit = () => exitCalled = true;
  validateArgs({ args, definition });
  assert(exitCalled);
});

Deno.test('Test that validateArgs returns the args if all args pass validation', () => {
  const definition = {
    arguments: [
      {
        name: 'test',
        description: '',
        validationFunction: () => true,
      },
    ],
    scriptDescription: '',
  };
  const args = ['--test', 'test value', 'miscValue'];
  const parsed = validateArgs({ args, definition });
  assertObjectMatch(parsed, { test: 'test value', _: ['miscValue'] });
});

Deno.test('Test that validateArgs calls cleanup function if any arg fails, before Deno.exit is called', () => {
  const definition = {
    arguments: [
      {
        name: 'arg',
        description: 'whatever',
      },
    ],
    scriptDescription: '',
  };
  let cleanupCalled = false;
  const cleanupFunction = () => cleanupCalled = true;
  const args = [];
  Deno.exit = () => {};
  validateArgs({ definition, args, cleanupFunction });
  assert(cleanupCalled);
});

Deno.test('Test that validateArgs transforms all shortName args to their full name', () => {
  const definition = {
    arguments: [
      {
        name: 'test',
        shortName: 't',
      },
      {
        name: 'test2',
        shortName: 'T', // also tests that we don't mess with case sensitivity
      },
    ],
  };
  const args = ['--test', 'fullNameValue', '-T', 'shortNameValue'];
  const parsed = validateArgs({ args, definition });
  assertObjectMatch(parsed, {
    test: 'fullNameValue',
    'test2': 'shortNameValue',
    _: [],
  });
});

Deno.test('Test that validateArgs shows the argument help text if it fails validation', () => {
  let failedMessageCreated = false;
  const definition = {
    arguments: [
      {
        name: 'test',
        description: '',
        validationFunction: () => false,
        validationFailedMessage: () => failedMessageCreated = true,
      },
    ],
  };
  Deno.exit = () => {};
  assertFalse(failedMessageCreated);
  const args = ['--test'];
  validateArgs({ args, definition });
  assert(failedMessageCreated);
});
