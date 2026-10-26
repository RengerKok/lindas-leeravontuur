import browserify from 'browserify';
import { mkdir, writeFile } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { transformSync } from 'esbuild';
const output = await new Promise((resolve, reject) => {
  const bundler = browserify('node_modules/exceljs/lib/exceljs.bare.js', { standalone: 'ExcelJS' });
  bundler.transform(file => {
    let source = '';
    return new Transform({
      transform(chunk, _encoding, callback) { source += chunk; callback(); },
      flush(callback) {
        try { this.push(/[\\/]uuid[\\/].*\.js$/.test(file) ? transformSync(source, { target: 'es2017', loader: 'js' }).code : source); callback(); }
        catch (error) { callback(error); }
      }
    });
  }, { global: true });
  bundler.bundle((error, buffer) => error ? reject(error) : resolve(buffer));
}).catch(error => { console.error(error.message); process.exit(1); });
await mkdir('node_modules/.cache/linda', { recursive: true });
await writeFile('node_modules/.cache/linda/exceljs.cjs', output);
console.log('ExcelJS-browserbundel gegenereerd met actuele afhankelijkheden.');