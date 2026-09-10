/** Playback EQ, after character pitch. High-pass Q is expressed in dB by Web Audio. */
export function createPiperClarity(context: BaseAudioContext) {
  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 150;
  highpass.Q.value = 20 * Math.log10(0.8);
  const presence = context.createBiquadFilter();
  presence.type = 'highshelf';
  presence.frequency.value = 1500;
  presence.gain.value = 2;
  const headroom = context.createGain();
  headroom.gain.value = 10 ** (-3 / 20);
  highpass.connect(presence); presence.connect(headroom); headroom.connect(context.destination);
  return { input: highpass, highpass, presence, headroom,
    disconnect: () => { highpass.disconnect(); presence.disconnect(); headroom.disconnect(); } };
}
