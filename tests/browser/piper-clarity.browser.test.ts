import { expect, test } from 'vitest';
import { createPiperClarity } from '../../src/audio/piper-clarity';

test.each([44100,48000])('Piper clarity curve cuts bass and retains presence with headroom at %s Hz', sampleRate => {
  const context = new OfflineAudioContext(1,sampleRate,sampleRate);
  const filter = createPiperClarity(context);
  const frequencies = new Float32Array([50,75,150,300,1000,1500,4000,8000]);
  const highpass = new Float32Array(frequencies.length); const shelf = new Float32Array(frequencies.length);
  const phase = new Float32Array(frequencies.length);
  filter.highpass.getFrequencyResponse(frequencies,highpass,phase);
  filter.presence.getFrequencyResponse(frequencies,shelf,phase);
  const db = Array.from(highpass,(gain,index)=>20*Math.log10(gain*shelf[index]!*filter.headroom.gain.value));
  expect(db[0]).toBeLessThan(-21); expect(db[1]).toBeLessThan(-14);
  expect(db[2]).toBeCloseTo(-4.94,1);
  expect(db[6]! - db[4]!).toBeGreaterThan(1.4);
  expect(db.slice(3).every(value=>value>-3 && value<-0.8)).toBe(true);
  filter.disconnect();
});

test('Piper filtering preserves rendered length, silence, and signal headroom', async () => {
  const rate=48000; const context=new OfflineAudioContext(1,rate*2,rate);
  const filter=createPiperClarity(context);
  const buffer=context.createBuffer(1,rate,rate); const samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=0.65*Math.sin(2*Math.PI*75*i/rate)+0.2*Math.sin(2*Math.PI*2500*i/rate);
  const source=context.createBufferSource(); source.buffer=buffer; source.connect(filter.input); source.start();
  const output=await context.startRendering(); const pcm=output.getChannelData(0);
  expect(output.length).toBe(rate*2); expect(pcm.every(Number.isFinite)).toBe(true);
  expect(pcm.reduce((peak,sample)=>Math.max(peak,Math.abs(sample)),0)).toBeLessThan(1);
  expect(pcm.slice(rate+2400).every(sample=>Math.abs(sample)<0.00001)).toBe(true);
  const energy=(frequency:number)=>{
    let real=0;let imaginary=0;
    for(let i=rate/4;i<rate*3/4;i++){
      real+=pcm[i]!*Math.cos(2*Math.PI*frequency*i/rate);
      imaginary+=pcm[i]!*Math.sin(2*Math.PI*frequency*i/rate);
    }
    return Math.hypot(real,imaginary)*4/rate;
  };
  expect(energy(75)/0.65).toBeLessThan(0.2);
  expect(energy(2500)/0.2).toBeGreaterThan(0.8);
  filter.disconnect();
});
