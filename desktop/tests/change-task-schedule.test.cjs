const {test}=require('node:test');const assert=require('node:assert/strict');
const {changeTaskSchedule:change}=require('../src/changeTaskSchedule.ts');
const clock={time:'18:45',timezone:'America/New_York'};
test('weekday transitions retain existing days and time without stale month fields',()=>{
 assert.deepEqual(change({kind:'weekly',day:5,...clock},'customWeek','UTC'),{kind:'customWeek',days:[5],...clock});
 assert.deepEqual(change({kind:'weekdays',...clock},'customWeek','UTC'),{kind:'customWeek',days:[1,2,3,4,5],...clock});
 assert.deepEqual(change({kind:'daily',...clock},'customWeek','UTC'),{kind:'customWeek',days:[0,1,2,3,4,5,6],...clock});
 assert.deepEqual(change({kind:'customWeek',days:[5,2],...clock},'weekly','UTC'),{kind:'weekly',day:2,...clock});
 assert.deepEqual(change({kind:'monthly',monthDay:31,...clock},'daily','UTC'),{kind:'daily',...clock});
 assert.deepEqual(change({kind:'customWeek',days:[1],...clock},'monthly','UTC'),{kind:'monthly',monthDay:1,...clock});
});
test('interval and once transitions use explicit defaults, same kind clones unsaved edits',()=>{
 assert.deepEqual(change({kind:'interval',minutes:15},'daily','UTC'),{kind:'daily',time:'09:00',timezone:'UTC'});
 assert.deepEqual(change({kind:'daily',...clock},'interval','UTC'),{kind:'interval',minutes:60});
 assert.deepEqual(change({kind:'daily',...clock},'once','UTC',0),{kind:'once',at:'1970-01-01T01:00:00.000Z'});
 const source={kind:'customWeek',days:[],...clock};const copy=change(source,'customWeek','UTC');copy.days.push(1);assert.deepEqual(source.days,[]);
});
