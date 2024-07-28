/* eslint-disable @typescript-eslint/ban-ts-comment */
import {fileURLToPath} from 'url';

export const RESOLVE_HOOKS_PATH = fileURLToPath(
  // @ts-ignore
  new URL('./impvol-hooks.js', import.meta.url),
);

// @ts-ignore
export const IMPVOL_URL = new URL('./impvol.js', import.meta.url).href;
