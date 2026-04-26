import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildSummary, main, runImportCommand, runUpdateCommand, WorkLoop } from './index.ts';

export { buildSummary, main, runImportCommand, runUpdateCommand, WorkLoop };

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  main();
}
