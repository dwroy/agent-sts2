import { isAbsolute, join } from 'node:path';
/** Only test fixtures may use the pinned pre-S1 snapshot. Production never reads it. */
export function knowledgeFixtureFile(key: string): string {
 const root = process.env['STS2_TEST_KNOWLEDGE_ROOT'];
 if (!root || isAbsolute(key) || key.split(/[\\/]/).some(part => part === '..')) throw Error('invalid fixed knowledge fixture');
 return join(root, key);
}
