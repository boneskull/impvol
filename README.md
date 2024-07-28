# impvol

> Import scripts and modules from virtual filesystems with [memfs](https://npm.im/memfs)!

## Usage

```ts
import {memfs} from 'memfs';
import {impvol} from 'impvol';

const {vol} = memfs({
  '/foo.mjs': 'export const foo = 42;',
  '/bar.cjs': 'exports.bar = 42;',
});

// ivol is a new Volume
const ivol = impvol(vol);

await ivol.promises.writeFile('/baz.mjs', 'export const baz = 42;');

const foo = await import('/foo.mjs'); // {foo: 42}
const bar = await import('/bar.cjs'); // {bar: 42}
const baz = await import('/baz.mjs'); // {baz: 42}
```

This should be a _drop-in replacement_ for a `memfs` `Volume`, but it isn't quite there.

> [!CAUTION]
>
> - This lib monkeypatches `memfs` internals. _I'm_ not really comfortable with that, and you shouldn't be either.
> - Does not yet support JSON.
> - WASM support is unknown.
> - Interaction with other loaders is unknown.

## Requirements

- Node.js v20.0.0+
- `memfs` v4.0.0+

## Installation

```sh
npm install impvol memfs -D
```

## License

©️ 2024 Christopher "boneskull" Hiller. Licensed Apache-2.0
