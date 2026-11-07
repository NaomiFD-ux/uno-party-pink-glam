import {impactOffset} from './audioOnset';
/**
 * Procedural Web Audio synthesizer for Pink Glam Game Night
 * Delivers crisp tactile feedback, whooshes, chimes, and victory fanfares without external audio assets.
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private clips=new Set<HTMLAudioElement>();
  private skipAudio:HTMLAudioElement|null=null;
  private skipBuffer:AudioBuffer|null=null;
  private skipOffset=0;
  private skipReady:Promise<void>;
  private activeImpacts=new Set<AudioBufferSourceNode>();
  private isMuted: boolean = false;

  constructor() {
    this.skipAudio=new Audio('/audio/skip.mp3');
    this.skipAudio.preload='auto';
    this.skipReady=fetch('/audio/skip.mp3').then(response=>{if(!response.ok)throw new Error('Audio unavailable');return response.arrayBuffer();}).then(bytes=>new OfflineAudioContext(1,1,44100).decodeAudioData(bytes)).then(buffer=>{
      this.skipBuffer=buffer;this.skipOffset=impactOffset(buffer.getChannelData(0),buffer.sampleRate);
    }).catch(()=>{});
    const saved = localStorage.getItem('glam_sound_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if(this.isMuted){this.clips.forEach(a=>a.pause());this.clips.clear();this.activeImpacts.forEach(source=>{try{source.stop();}catch{}});this.activeImpacts.clear();}
    localStorage.setItem('glam_sound_muted', String(this.isMuted));
    if (!this.isMuted) {
      this.playTap();
    }
    return this.isMuted;
  }

  public playCardDeal() {
    if (this.isMuted) return;
    this.initCtx(); if (!this.ctx) return;
    const ctx=this.ctx,now=ctx.currentTime;
    // A close, papery swish followed by the card landing on the hand.
    const output=ctx.createGain();output.gain.value=.8;
    const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-9;limiter.knee.value=8;limiter.ratio.value=5;
    output.connect(limiter);limiter.connect(ctx.destination);
    const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.15),ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const paper=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();paper.buffer=buffer;
    filter.type='bandpass';filter.Q.value=.8;filter.frequency.setValueAtTime(4200,now);filter.frequency.exponentialRampToValueAtTime(1100,now+.14);
    gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(.7,now+.018);gain.gain.exponentialRampToValueAtTime(.001,now+.145);
    paper.connect(filter);filter.connect(gain);gain.connect(output);paper.start(now);paper.stop(now+.15);
    const snap=ctx.createOscillator(),body=ctx.createGain();snap.type='triangle';snap.frequency.setValueAtTime(390,now+.055);snap.frequency.exponentialRampToValueAtTime(120,now+.13);
    body.gain.setValueAtTime(.001,now);body.gain.setValueAtTime(.4,now+.055);body.gain.exponentialRampToValueAtTime(.001,now+.14);
    snap.connect(body);body.connect(output);snap.start(now+.055);snap.stop(now+.15);
  }

  public playCardPlay() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Crisp tactile card snap
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.09);
  }

  private playClip(path:string,limit?:number,startAt=0) {
    if(this.isMuted)return;
    const audio=path==='/audio/skip.mp3'&&this.skipAudio?this.skipAudio.cloneNode(true) as HTMLAudioElement:new Audio(path);audio.volume=1;
    audio.currentTime=startAt;
    this.clips.add(audio);
    const cleanup=()=>{this.clips.delete(audio);};
    audio.addEventListener('ended',cleanup,{once:true});
    audio.addEventListener('error',cleanup,{once:true});
    void audio.play().catch(cleanup);
    if(limit)setTimeout(()=>{audio.pause();cleanup();},limit);
  }
  public playSkipPunch(){
    if(this.isMuted)return;
    this.initCtx();
    const play=()=>{
      if(this.isMuted)return;
      if(!this.ctx||!this.skipBuffer){this.playClip('/audio/skip.mp3');return;}
      const source=this.ctx.createBufferSource();source.buffer=this.skipBuffer;
      source.connect(this.ctx.destination);this.activeImpacts.add(source);
      source.onended=()=>{this.activeImpacts.delete(source);source.disconnect();};
      source.start(this.ctx.currentTime,this.skipOffset);
    };
    if(this.skipBuffer)play();else void this.skipReady.then(play);
  }
  public playReverse(){this.playClip('/audio/reverse.mp3',750);}
  public playShuffle(){this.playClip('/audio/shuffle.mp3',2200);}

  public playTap() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.05);
  }

  public playSparkle() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [587.33, 739.99, 880, 1174.66, 1479.98]; // D5, F#5, A5, D6, F#6 glam sparkle
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const start = this.ctx.currentTime + idx * 0.05;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  public playGlamShout() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chord = [440, 554.37, 659.25, 880]; // A major triumphant chime
    chord.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.52);
    });
  }

  public playActionPower() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Dramatic descending laser/power drop
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.22);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playVictory() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const melody = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.14 }, // G5
      { f: 1046.50, d: 0.4 }, // C6
      { f: 880.00, d: 0.12 }, // A5
      { f: 1046.50, d: 0.6 }  // C6 grand
    ];

    let time = this.ctx.currentTime;
    melody.forEach((note) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, time);

      gain.gain.setValueAtTime(0.22, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + note.d + 0.05);

      time += note.d * 0.9;
    });
  }

  public playSpinTick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900 + Math.random() * 200, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.025);
  }
}

export const soundFX = new SoundEffectsManager();
