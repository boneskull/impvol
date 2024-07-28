import {fileURLToPath} from 'url';

export const RESOLVE_HOOKS_PATH = fileURLToPath(
  new URL('./impvol-hooks.js', import.meta.url),
);

export const IMPVOL_URL = new URL('./impvol.js', import.meta.url).href;
