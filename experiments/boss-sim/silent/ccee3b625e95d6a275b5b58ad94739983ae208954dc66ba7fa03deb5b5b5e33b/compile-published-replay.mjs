import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = "/home/dw/Projects/agent-sts2/learner/runs/20261017-170120-62ee45ff-d6c7-407f-88be-efad3ce5199b-silent-boss-calibration/.published-model";
const scratch = '/home/dw/Projects/agent-sts2/learner/runs/20261017-170120-62ee45ff-d6c7-407f-88be-efad3ce5199b-silent-boss-calibration';
const require = createRequire(root + '/agent/package.json');
const esbuild = require('esbuild');
mkdirSync(scratch + '/published-compiled', { recursive: true });
const result = await esbuild.build({
  absWorkingDir: root + '/agent', entryPoints: ['tools/boss-sim/backtest.ts'],
  outfile: scratch + '/published-compiled/backtest.mjs', bundle: true,
  platform: 'node', format: 'esm', target: 'node22', packages: 'external',
  metafile: true, sourcemap: false,
  banner: { js: "import { createRequire as __replayCreateRequire } from 'node:module'; const require = __replayCreateRequire(import.meta.url);" },
  plugins: [{ name: 'preserve-original-module-locations', setup(build) {
    build.onLoad({ filter: /\.ts$/ }, args => ({
      contents: readFileSync(args.path, 'utf8').replace(/\bimport\.meta\.url\b/g, JSON.stringify(pathToFileURL(args.path).href)),
      loader: 'ts',
    }));
  } }],
});
writeFileSync(scratch + '/published-compiled/metafile.json', JSON.stringify(result.metafile, null, 2) + '\n');
writeFileSync(scratch + '/published-compiled/compiler.json', JSON.stringify({ esbuild: esbuild.version,
  entry: root + '/agent/tools/boss-sim/backtest.ts',
  method: 'Bundle unchanged replay and dependencies; preserve each original import.meta.url; isolated thread shards keep full input indices and original seed=1+index*101.',
  samples: 200, starts: ['t1', 'pre'], shards: 3,
}, null, 2) + '\n');
