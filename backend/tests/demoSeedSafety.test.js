import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldSeedDemoData } from '../utils/bootstrapDemoData.js';

/**
 * Demo-data seeding writes fake hotels, bookings, guests, payouts, refunds and
 * transactions into whatever database MONGODB_URI points at.
 *
 * The original gate was `NODE_ENV !== "production"`, which seeds BY DEFAULT.
 * NODE_ENV is unset in most local shells, so merely starting the server
 * injected fake financial records into the connected database -- and in this
 * repo the developer .env points at a live Atlas cluster. These tests pin the
 * boundary as strict opt-in so it cannot silently regress.
 *
 * shouldSeedDemoData() is a pure function over an env object, so this suite
 * needs no database and cannot touch real data.
 */
test('demo seed safety boundary', async t => {
    await t.test('does not seed when ENABLE_DEMO_SEED is absent', () => {
        assert.equal(shouldSeedDemoData({}), false);
        assert.equal(shouldSeedDemoData({ NODE_ENV: 'development' }), false);
        assert.equal(shouldSeedDemoData({ NODE_ENV: 'test' }), false);
        // The dangerous historical case: no NODE_ENV at all, which is the
        // default in a plain local shell and used to mean "seed away".
        assert.equal(shouldSeedDemoData({ MONGODB_URI: 'mongodb+srv://live-cluster/db' }), false);
    });

    await t.test('seeds only on explicit opt-in outside production', () => {
        assert.equal(shouldSeedDemoData({ ENABLE_DEMO_SEED: 'true' }), true);
        assert.equal(shouldSeedDemoData({ NODE_ENV: 'development', ENABLE_DEMO_SEED: 'true' }), true);
        assert.equal(shouldSeedDemoData({ NODE_ENV: 'test', ENABLE_DEMO_SEED: 'true' }), true);
    });

    await t.test('production refuses to seed even when explicitly enabled', () => {
        assert.equal(shouldSeedDemoData({ NODE_ENV: 'production', ENABLE_DEMO_SEED: 'true' }), false);
        assert.equal(shouldSeedDemoData({ NODE_ENV: 'production' }), false);
        assert.equal(
            shouldSeedDemoData({ NODE_ENV: 'production', ENABLE_DEMO_SEED: 'true', AUTO_SEED_DEMO: 'true' }),
            false,
        );
    });

    await t.test('only the exact string "true" opts in', () => {
        // Guards against a loose truthiness check creeping back in: any typo or
        // near-miss value must fail closed rather than seed a real database.
        for (const value of ['TRUE', 'True', '1', 'yes', 'on', 'enabled', '', ' true', 'true ', 'false', '0']) {
            assert.equal(
                shouldSeedDemoData({ NODE_ENV: 'development', ENABLE_DEMO_SEED: value }),
                false,
                `ENABLE_DEMO_SEED=${JSON.stringify(value)} must not enable seeding`,
            );
        }
    });

    await t.test('AUTO_SEED_DEMO=false remains an absolute kill switch', () => {
        assert.equal(
            shouldSeedDemoData({ NODE_ENV: 'development', ENABLE_DEMO_SEED: 'true', AUTO_SEED_DEMO: 'false' }),
            false,
        );
    });

    await t.test('reads process.env by default', () => {
        // Called with no argument it must consult the real process env, not a
        // stale snapshot captured at module load.
        const original = process.env.ENABLE_DEMO_SEED;
        const originalNodeEnv = process.env.NODE_ENV;
        try {
            delete process.env.ENABLE_DEMO_SEED;
            process.env.NODE_ENV = 'development';
            assert.equal(shouldSeedDemoData(), false);

            process.env.ENABLE_DEMO_SEED = 'true';
            assert.equal(shouldSeedDemoData(), true);

            process.env.NODE_ENV = 'production';
            assert.equal(shouldSeedDemoData(), false);
        } finally {
            if (original === undefined) delete process.env.ENABLE_DEMO_SEED;
            else process.env.ENABLE_DEMO_SEED = original;
            if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
            else process.env.NODE_ENV = originalNodeEnv;
        }
    });
});
