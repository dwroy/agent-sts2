/** Native type stripping avoids an additional transpiler worker for S1 WAL IO. */
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

registerHooks({
 resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && specifier.endsWith('.js') && context.parentURL?.startsWith('file:')) {
   const source = new URL(specifier.slice(0, -3) + '.ts', context.parentURL);
   if (existsSync(fileURLToPath(source))) return nextResolve(source.href, context);
  }
  return nextResolve(specifier, context);
 },
});
