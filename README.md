# impvol

> _Importable Volume_ — a drop-in replacement for `memfs`'s `Volume`
>
> Import scripts and modules from [memfs](https://npm.im/memfs)' virtual filesystems.

## Usage

```js
import {impvol} from 'impvol';

/**
 * `impVol` is a `memfs.Volume` -- except it is ✨special✨
 *
 * @type {import('impvol').ImportableVolume}
 */
const impVol = impvol({
  '/foo.mjs': 'export const foo = 42;',
  '/bar.cjs': 'exports.bar = 42;',
});

await impVol.promises.writeFile('/baz.mjs', 'export const baz = 42;');

const foo = await import('/foo.mjs'); // {foo: 42}
const bar = await import('/bar.cjs'); // {bar: 42}
const baz = await import('/baz.mjs'); // {baz: 42}
```

Once an `ImportableVolume` has been created, any specifier in the virtual filesystem _will be preferred_ over one in the _real_ file system. In other words: _as long as `/foo.mjs` exists in the `ImportableVolume`_, a real `foo.mjs` living in your FS root (`/`) **cannot be imported** via `import()`. You must first _remove_ `/foo.mjs` from the `ImportableVolume` (e.g., via `impvol.unlink()` or otherwise).

**Note:** `impvol` _only_ works with `import()`. It does not work with `require()`.

> [!CAUTION]
>
> This lib is horrible. In descending order of horror:
>
> - This lib overrides `memfs` internals. This is a bad idea. I am bad.
> - `impvol` **leaks memory**. It is intended for use in _tests_, not production systems. However, if you _do_ use it in production, please drop me a line so I can have a good laugh.
> - TS will not love importing from these magical imaginary files. This can probably be mitigated with ambient module declarations.

## Requirements

- Node.js v20.0.0+
- `memfs` v4.0.0+

## Installation

```sh
npm install impvol memfs -D
```

`impvol` is a dual ESM/CJS package. Thanks, [tshy](https://npm.im/tshy)!

## How it Works

`ImportableVolume` creates a "customization hook", which runs in a worker thread. The worker thread maintains a "clone" of the `ImportableVolume`'s underlying filesystem (it's just a standard `Volume` in the worker thread).

When an `ImportableVolume`'s filesystem changes, it generates a snapshot of the filesystem and stores this in a temp file, then sets a "dirty bit" which is shared with the worker thread.

When the worker thread's resolve hook is hit, the dirty bit is checked. If it's set, the worker overwrites its virtual filesystem with the contents of the snapshot temp file, then finally resets the dirty bit. After the refresh, the resolve hook checks if the requested specifier matches a file in its filesystem.

If there's a match, the resolve hook short-circuits with a URL using a custom protocol -- which is subsequently handled by the loader hook. The loader hook reads the file from the worker thread's filesystem if the custom protocol is detected.

### Memory Leaks

Repeatedly creating `ImportableVolume` instances will result in memory leaks because the worker threads running customization hooks are never terminated. As far as I can tell, such "module loader" worker threads are unable to be terminated by the parent process.

## Future

- JSON support
- WASM support, if anyone uses WASM in Node.js
- If Node.js ever allows _de-registration_ of customization hooks, then we can theoretically prevent memory leaks.
- How can `impvol` be used via `--import`? Does that even make sense?

## License

©️ 2024 [Christopher "boneskull" Hiller](https://github.com/boneskull). Licensed Apache-2.0
