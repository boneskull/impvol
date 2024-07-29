import assert from 'node:assert';
import {describe, it} from 'node:test';
import {ImportableVolume, impvol} from '../src/impvol.js';
// eslint-disable-next-line n/no-missing-import
import {Volume} from 'memfs/lib/volume.js';

const TEST_DIR = '/__impvol__';

describe('impvol', () => {
  describe('impvol()', () => {
    it('should return a ImportableVolume instance', () => {
      const vol = impvol();
      assert.ok(vol instanceof ImportableVolume);
      assert.ok(vol instanceof Volume);
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

      assert.strictEqual(result.default, 'Hello, world!');
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

      assert.strictEqual(result.default, 'Hello, world!');
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

      assert.strictEqual(result.default, 'Hello, world!');
    });
  });
});
