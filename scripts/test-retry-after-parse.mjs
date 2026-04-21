import { parseRetryAfterSeconds } from '../src/net/retryAfter.js';

function hdr(map) {
  return new Headers(map);
}

let h = hdr({ 'retry-after': '120' });
if (parseRetryAfterSeconds(h) !== 120) throw new Error('numeric');

h = hdr({ 'retry-after': '0' });
if (parseRetryAfterSeconds(h) !== 0) throw new Error('zero');

const future = new Date(Date.now() + 5000).toUTCString();
h = hdr({ 'retry-after': future });
const s = parseRetryAfterSeconds(h);
if (s == null || s < 0 || s > 86400) throw new Error('http-date');

h = hdr({});
if (parseRetryAfterSeconds(h) !== null) throw new Error('empty');

console.log('retry-after parse: ok');
