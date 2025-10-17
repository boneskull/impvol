import {expect} from 'bupkis';
import {Volume} from 'memfs';
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import {describe, it} from 'node:test';

import {ImportableVolume, impvol} from '../src/impvol.js';

const TEST_DIR = '/__impvol__';

describe('impvol', () => {
  describe('impvol()', () => {
    it('should return a ImportableVolume instance', () => {
      const vol = impvol();
      expect(vol, 'to be an', ImportableVolume, 'and', 'to be a', Volume);
    });

    it('should import a script', async () => {
      const content = 'module.exports = "Hello, world!";';

      impvol(
        {
          'test.cjs': content,
        },
        TEST_DIR,
      );

      const result = (await import(`${TEST_DIR}/test.cjs`)) as {
        default: string;
      };

      expect(result.default, 'to be', 'Hello, world!');
    });

    it('should import a module', async () => {
      const content = 'export default "Hello, world!";';

      const vol = impvol();
      vol.fromJSON(
        {
          'test.mjs': content,
        },
        TEST_DIR,
      );

      const result = (await import(`${TEST_DIR}/test.mjs`)) as {
        default: string;
      };

      expect(result.default, 'to be', 'Hello, world!');
    });

    it('should import a module using the custom protocol', async () => {
      const content = 'export default "Hello, world!";';

      impvol(
        {
          'test.mjs': content,
        },
        TEST_DIR,
      );

      const result = (await import(`impvol://${TEST_DIR}/test.mjs`)) as {
        default: string;
      };

      expect(result.default, 'to be', 'Hello, world!');
    });
  });
});
