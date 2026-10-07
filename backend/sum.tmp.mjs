import { readFileSync, writeFileSync } from 'node:fs';
const raw = readFileSync('full-tests.tmp.log');
const text = raw[0] === 0xff && raw[1] === 0xfe ? raw.toString('utf16le') : raw.toString('utf8');
const keep = text.split(/\r?\n/).filter((l) => /(tests|pass|fail|cancelled) \d+$|failed to start|failing/.test(l));
writeFileSync('sum.tmp.txt', `${keep.join('\n')}\nlen=${text.length}\n`, 'utf8');
