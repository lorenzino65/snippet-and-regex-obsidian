import compile from 'dfa/compile';
import fs from 'fs';
 
let stateMachine = compile(fs.readFileSync('hangul.machine', 'utf8'));
 
// find matches
for (let [startIndex, endIndex, tag] of stateMachine.match([0, 1, 2, 3, 0, 4, 6])) {
  console.log('match:', startIndex, endIndex, tag);
}