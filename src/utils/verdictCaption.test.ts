import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verdictCaption} from './verdictCaption';
test('verdict commentary is question-specific and identical across players',()=>{assert.equal(verdictCaption('Who says “I’m on my way” while at home?'),'Still getting dressed 😂');assert.equal(verdictCaption('Who eats your fries?'),'Your fries were never safe 😂');assert.equal(verdictCaption('Who knows every Lil Wayne ad-lib?'),'Ad-libs included, obviously 😂');assert.equal(verdictCaption('Anything',true),'Double the accusations. 😂');assert.equal(verdictCaption('A new question'),verdictCaption('A new question'));});
