Scratch audit development failures are retained; none changed model parameters or admission thresholds.

- prepare-refresh.py first attempt: KeyError('files_sha256') because audit-manifest.json is a flat path/hash map. Corrected the schema reader.
- Second attempt: assertion on C48LLXBGKXQ9 F17 t1 because timing is stored at sim.ms. A recursive comparison found only sim.ms differences in all four partial rows; now omit timing fields recursively. The prior script and failing output remain in prepare-refresh-v2.py / prepare-refresh-v2.log.
