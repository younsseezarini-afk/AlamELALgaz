"""Final mix for the Typography reel: music bed + ElevenLabs voiceover + ElevenLabs sound effects.

Usage (from this folder):
  REEL=typography-reel.html node render-reel.js cues      # .sfx.json (timeline cue list)
  MUSIC_ONLY=1 python3 make-audio.py && mv .audio.wav .music.wav
  python3 mix-voice.py                                     # writes .final-audio.wav

Each voice line is trimmed, its long pauses shortened, and sped up (at most 1.22x) only when it
would overrun its scene. The music ducks under the voice. Sound effects are placed on the same
cues the animation exports, mapped to the ElevenLabs takes in audio/elevenlabs/.
"""
import json
import os
import subprocess
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
EL = os.path.join(HERE, 'audio', 'elevenlabs')
SR = 48000

# (file, start second, latest end second) — slots follow the scenes in typography-reel.html
VOICE = [
    ('vo01_your-words.mp3', 0.12, 1.95),
    ('vo02_typography.mp3', 2.0, 4.45),
    ('vo03_choose-type.mp3', 5.55, 9.05),
    ('vo04_rule-one-short.mp3', 9.3, 13.65),
    ('vo05_rule-two.mp3', 13.85, 18.2),
    ('vo06_rule-three.mp3', 18.45, 22.75),
    ('vo07_five-slides.mp3', 22.85, 25.3),
    ('vo08_like-follow.mp3', 25.6, 29.4),
]

# cue type → (file, gain, max seconds kept, seconds trimmed from the start)
SFX = {
    'swish': ('sfx_whoosh_b.mp3', 0.55, None, 0), 'whoosh': ('sfx_whoosh_a.mp3', 0.6, None, 0),
    'thunk': ('sfx_impact.mp3', 0.9, None, 0), 'hit': ('sfx_impact.mp3', 0.55, 0.6, 0), 'slam': ('sfx_impact.mp3', 0.8, None, 0),
    'riser': ('sfx_riser.mp3', 0.55, None, 1.4), 'pop': ('sfx_pop.mp3', 0.6, 0.5, 0),
    'click': ('sfx_click.mp3', 0.7, 0.35, 0), 'tap': ('sfx_click.mp3', 0.7, 0.35, 0), 'tick': ('sfx_click.mp3', 0.25, 0.2, 0),
    'ding': ('sfx_chime.mp3', 0.6, None, 0), 'lock': ('sfx_chime.mp3', 0.35, None, 0), 'ping': ('sfx_chime.mp3', 0.3, None, 0),
    'shimmer': ('sfx_chime.mp3', 0.25, None, 0), 'swell': ('sfx_whoosh_c.mp3', 0.35, None, 0), 'stretch': ('sfx_whoosh_c.mp3', 0.35, None, 0),
    'slide': ('sfx_whoosh_c.mp3', 0.4, None, 0), 'whir': ('sfx_whoosh_c.mp3', 0.25, None, 0),
}


def decode(path, filters=None):
    """Decode any audio file to a mono float array at SR, optionally through an ffmpeg filter chain."""
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', path, '-ac', '1', '-ar', str(SR)]
        if filters:
            cmd += ['-af', filters]
        subprocess.run(cmd + [tmp.name], check=True)
        with wave.open(tmp.name) as w:
            x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
    return x


def place(buf, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i:i + len(sig)] += sig * gain


cfg = json.load(open(os.path.join(HERE, '.sfx.json')))
music = decode(os.path.join(HERE, '.music.wav'))
N = len(music)
voice = np.zeros(N)
fx = np.zeros(N)

# voice: trim edges, shorten pauses, fit to slot
TIGHT = 'silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.18:stop_threshold=-45dB:stop_silence=0.14'
prev_end = 0.0
for name, start, end in VOICE:
    start = max(start, prev_end + 0.15)  # never overlap the previous line
    x = decode(os.path.join(EL, name), TIGHT)
    slot, dur = end - start, len(x) / SR
    speed = min(1.22, max(1.0, dur / slot))
    if speed > 1.0:
        x = decode(os.path.join(EL, name), f'{TIGHT},atempo={speed:.3f}')
    print(f'{name:26s} {dur:5.2f}s -> {len(x) / SR:5.2f}s  at {start:5.2f}s  (speed {speed:.2f})')
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    place(voice, x, start)
    prev_end = start + len(x) / SR

# sound effects on the animation's cues; typing replaces the per-key cues with one take
cache = {}
typed = False
for c in cfg['sfx']:
    kind = c['type']
    if kind == 'key':
        if not typed:
            place(fx, decode(os.path.join(EL, 'sfx_typing.mp3')), c['t'], 0.6)
            typed = True
        continue
    if kind not in SFX:
        continue
    f, gain, keep, skip = SFX[kind]
    key = (f, keep, skip)
    if key not in cache:
        x = decode(os.path.join(EL, f))
        x = x[int(skip * SR):]
        if keep:
            x = x[: int(keep * SR)]
            x[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
        cache[key] = x / (np.max(np.abs(x)) + 1e-9)
    t = c['t'] - (len(cache[key]) / SR if kind == 'riser' else 0) + (c['len'] if kind == 'riser' else 0)
    place(fx, cache[key], t, gain)

# duck the music under the voice (40 ms attack, 300 ms release)
env = np.abs(voice)
win = int(0.05 * SR)
env = np.convolve(env, np.ones(win) / win, mode='same')
env = np.clip(env / 0.05, 0, 1)
rel = int(0.3 * SR)
env = np.maximum(env, np.convolve(env, np.ones(rel) / rel, mode='same'))
duck = 1 - 0.6 * np.clip(env, 0, 1)

mix = music * 0.85 * duck + fx * 0.45 + voice * 0.95
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.89
stereo = np.repeat((mix * 32767).astype('<i2')[:, None], 2, axis=1)
with wave.open(os.path.join(HERE, '.final-audio.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(stereo.tobytes())
print('wrote .final-audio.wav')
