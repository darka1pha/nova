const fs = require('fs');
const p = 'D:/nova/templates/base/src/lib/api/client.ts';
let s = fs.readFileSync(p, 'utf8');
const search1 = 'if (token) headers.set("Authorization", `******;';
const replace1 = 'if (token) headers.set("Authorization", `Bearer ${token}`);';
const search2 = 'headers.set("Authorization", `******;';
const replace2 = 'headers.set("Authorization", `Bearer ${refreshed}`);';

let idx = s.indexOf(search1);
if (idx !== -1) {
  s = s.slice(0, idx) + replace1 + s.slice(idx + search1.length);
}

let k = s.indexOf('if (refreshed)');
if (k !== -1) {
  let idx2 = s.indexOf(search2, k);
  if (idx2 !== -1) {
    s = s.slice(0, idx2) + replace2 + s.slice(idx2 + search2.length);
  }
}

fs.writeFileSync(p, s, 'utf8');
console.log('patched');
