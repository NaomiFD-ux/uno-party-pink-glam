import {test} from 'node:test';
import assert from 'node:assert/strict';
import {santaLettersAt} from '../src/utils/santaReveal';
test('reveal typing starts at media time six seconds and progresses at sixty milliseconds per character',()=>{
 for(const time of [0,3,5.9,5.999999,NaN])assert.equal(santaLettersAt(time,6),0);
 assert.equal(santaLettersAt(6,6),1);assert.equal(santaLettersAt(6.059,6),1);assert.equal(santaLettersAt(6.06,6),2);assert.equal(santaLettersAt(6.3,6),6);assert.equal(santaLettersAt(10,6),6);
 assert.equal(santaLettersAt(0,6),0,'replay restarts from no characters');assert.equal(santaLettersAt(7.38,24),24,'long names complete before the video ends');
});
