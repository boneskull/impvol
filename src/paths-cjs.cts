import {pathToFileURL} from 'url';

export const DEFAULT_HOOKS_PATH = require.resolve('./impvol-hooks.js');

export const IMPVOL_URL = pathToFileURL(require.resolve('./impvol.js'));
