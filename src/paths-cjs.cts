import {pathToFileURL} from 'url';

export const HOOKS_PATH = pathToFileURL(require.resolve('./impvol-hooks.js'));

export const IMPVOL_URL = pathToFileURL(require.resolve('./impvol.js'));
