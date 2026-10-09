import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real splash effect with a deterministic media clock and RAF.
function fixture({duration=6,blocked=false}={}){
 const effects=[],states=[],attrs={},listeners=new Map(),timers=new Map();
 let now=0,raf,refIndex=0,stateIndex=0,timerId=0;
 const audio={duration,currentTime:0,muted:false,paused:true,error:null,
  addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n),
  pause(){this.paused=true;listeners.get('pause')?.()},
  play(){if(blocked)return Promise.reject(new Error('autoplay'));this.paused=false;listeners.get('playing')?.();return Promise.resolve()}};
 const node={setAttribute:(k,v)=>attrs[k]=v};
 const context={exports:{},performance:{now:()=>now},sessionStorage:{getItem:()=>null,setItem(){}},document:{hidden:false,documentElement:{dataset:{}},addEventListener(){},removeEventListener(){}},requestAnimationFrame:f=>{raf=f;return 1},cancelAnimationFrame:()=>{raf=null},setTimeout:(f,ms)=>{timers.set(++timerId,{f,ms});return timerId},clearTimeout:id=>timers.delete(id),require:n=>n==='react'?{useId:()=> 'ring-test',useRef:()=>({current:[audio,node,node][refIndex++]}),useState:v=>{const index=stateIndex++;return [index===1?true:v,x=>states[index]=x]},useEffect:f=>effects.push(f)}:n==='react/jsx-runtime'?{jsx:()=>null,jsxs:()=>null,Fragment:'fragment'}:{}};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/opening-splash.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
 context.exports.OpeningSplash({enabled:true,logo:'/logo.png',children:null});
 const cleanup=effects[2]();
 return {audio,attrs,states,timers,context,cleanup,emit:n=>listeners.get(n)?.(),tick:ms=>{now=ms;raf?.(now)}};
}

test('progress follows audio.currentTime and actual duration; only ended reveals after 500ms',()=>{
 const f=fixture({duration:8});f.audio.currentTime=4;f.tick(1000);assert.equal(f.attrs['aria-valuenow'],'50');assert.equal(f.attrs['stroke-dashoffset'],'50');
 f.audio.currentTime=8;f.emit('ended');assert.equal(f.attrs['aria-valuenow'],'100');assert.equal(f.states[3],true);
 const exit=[...f.timers.values()].find(t=>t.ms===500);assert.ok(exit);assert.notEqual(f.states[0],false);exit.f();assert.equal(f.states[0],false);f.cleanup();
});
test('blocked autoplay uses metadata duration without trapping the user',async()=>{
 const f=fixture({duration:6,blocked:true});await Promise.resolve();f.tick(3000);assert.equal(f.attrs['aria-valuenow'],'50');f.tick(6000);assert.equal(f.attrs['aria-valuenow'],'100');assert.equal(f.states[3],true);f.cleanup();
});
test('failed audio uses three-second fallback and cleanup cancels scheduled work',()=>{
 const f=fixture({duration:NaN});f.emit('error');f.tick(1500);assert.equal(f.attrs['aria-valuenow'],'50');f.tick(3000);assert.equal(f.attrs['aria-valuenow'],'100');assert.equal(f.states[3],true);f.cleanup();assert.equal(f.timers.size,0);
});
test('a stalled recording falls back instead of covering the homepage forever',()=>{
 const f=fixture();f.tick(3600);f.tick(6600);assert.equal(f.attrs['aria-valuenow'],'100');assert.equal(f.states[3],true);f.cleanup();
});
