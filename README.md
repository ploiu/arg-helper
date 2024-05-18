# Arg-Helper, the argument helper for js cmd scripts.

This is a library of helper functions that let you define and validate your
command line arguments, and automatically display help text if the user misuses
your script.

This is inspired by how Powershell lets you define parameters for ps1 scripts
and will automatically validate them, combined with how I render help text for
my own custom shell/deno scripts

## Planned Features

- [x] argument definitions as simple objects
- [x] automatic argument validation
- [x] automatic help text if arguments aren't passed correctly, or if user asks
      for it
- [x] pretty-printed help text
