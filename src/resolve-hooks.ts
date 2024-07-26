import { fileURLToPath } from 'url';

export const RESOLVE_HOOKS_PATH = fileURLToPath(
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore for tshy
  new URL('./resolve-hooks.js', import.meta.url),
);
