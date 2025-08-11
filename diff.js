// diff.js

// Compute LCS table
function lcsTable(a, b) {
  const n = a.length, m = b.length;
  const table = Array(n+1).fill(null).map(()=>Array(m+1).fill(0));
  for (let i = n-1; i >=0; --i){
    for (let j = m-1; j >=0; --j){
      if (a[i] === b[j]) table[i][j] = 1 + table[i+1][j+1];
      else table[i][j] = Math.max(table[i+1][j], table[i][j+1]);
    }
  }
  return table;
}

// Walk LCS to produce diff ops
function lineDiff(a, b) {
  const table = lcsTable(a,b);
  const ops = [];
  let i=0,j=0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]){
      ops.push({type:'equal', text: a[i]}); i++; j++;
    } else if (table[i+1][j] >= table[i][j+1]){
      ops.push({type:'del', text: a[i]}); i++;
    } else {
      ops.push({type:'add', text: b[j]}); j++;
    }
  }
  while (i < a.length) { ops.push({type:'del', text: a[i]}); i++; }
  while (j < b.length) { ops.push({type:'add', text: b[j]}); j++; }
  return ops;
}

// Expose function for popup
window.lineDiff = lineDiff;