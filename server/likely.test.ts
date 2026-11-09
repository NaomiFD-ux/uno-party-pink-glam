import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newLikely,fairQuestions} from './likely';
import {LIKELY_TOPICS} from '../src/data/likelyTopics';
test('each topic can fill a unique ten-question round using only its own prompts',()=>{for(const topic of LIKELY_TOPICS){const allowed=new Set(topic.prompts.map(p=>`Who’s most likely to ${p}?`));const r=newLikely([],[topic.id]);assert.equal(r.questions.length,10);assert.equal(new Set(r.questions).size,10);assert(r.questions.every(q=>allowed.has(q)));assert(r.questions.every(q=>q.length<=120));}});
test('a full group gets one contribution each before any player gets a second',()=>{const groups=Array.from({length:10},(_,i)=>Array.from({length:10},(_,j)=>`Player ${i} question ${j}`));const r=newLikely(fairQuestions(groups));assert.equal(r.questions.length,10);for(let i=0;i<10;i++)assert(r.questions.some(q=>q.startsWith(`Player ${i} `)));});
