"""Builds the reel soundtrack: a 105 BPM music bed plus sound effects placed from .sfx.json.

Usage: python3 make-audio.py   (after `node render-reel.js frames`, which writes .sfx.json)
Writes .audio.wav (48 kHz stereo).
"""
import json
import os
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
cfg = json.load(open(os.path.join(HERE, '.sfx.json')))
DUR, BAR = cfg['dur'], cfg['bar']
BEAT = BAR / 4
N = int(DUR * SR) + 1
mix = np.zeros((N, 2))
rng = np.random.default_rng(7)


def add(sig, t, gain=1.0, pan=0.0):
    """Mix a mono signal in at time t (s); pan -1 (left) … 1 (right)."""
    i = int(t * SR)
    if i >= N or i + len(sig) <= 0:
        return
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mix[i:i + len(sig), 0] += sig * gain * l * 1.41
    mix[i:i + len(sig), 1] += sig * gain * r * 1.41


def tt(d):
    return np.arange(int(d * SR)) / SR


def smooth(x, n):
    return np.convolve(x, np.ones(n) / n, mode='same')


def hz(note):
    return 440.0 * 2 ** ((note - 69) / 12)


# ── instruments
def kick():
    t = tt(0.45)
    f = 45 + 85 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + 0.25 * rng.standard_normal(len(t)) * np.exp(-t * 200)


def snare():
    t = tt(0.3)
    n = rng.standard_normal(len(t))
    n = n - smooth(n, 6)
    return 0.6 * n * np.exp(-t * 18) + 0.35 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25)


def hat(open_=False):
    t = tt(0.25 if open_ else 0.06)
    n = rng.standard_normal(len(t))
    n = n - smooth(n, 3)
    return n * np.exp(-t * (14 if open_ else 70))


def pad(notes, d):
    t = tt(d)
    out = np.zeros(len(t))
    for n in notes:
        for det in (-0.0018, 0.0, 0.0021):
            f = hz(n) * (1 + det)
            for h in range(1, 7):
                out += np.sin(2 * np.pi * f * h * t + h) / h ** 1.6
    env = np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.25)
    return out * env / (len(notes) * 3)


def sub(note, d):
    t = tt(d)
    return np.sin(2 * np.pi * hz(note) * t) * np.exp(-t * 2.2) * np.minimum(1, t / 0.01)


# ── sound effects
def sfx(kind, length):
    t = tt(max(length, 0.05))
    n = rng.standard_normal(len(t))
    if kind == 'click':
        t = tt(0.03); return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 260) + 0.3 * rng.standard_normal(len(t)) * np.exp(-t * 400)
    if kind == 'tap':
        t = tt(0.12); return np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 60) + 0.5 * np.sin(2 * np.pi * 3400 * t) * np.exp(-t * 90)
    if kind == 'key':
        t = tt(0.05); k = rng.standard_normal(len(t)); return (k - smooth(k, 4)) * np.exp(-t * 120) + 0.4 * np.sin(2 * np.pi * 900 * t) * np.exp(-t * 150)
    if kind == 'tick':
        t = tt(0.04); return np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 180)
    if kind == 'ping':
        t = tt(0.6); return (np.sin(2 * np.pi * 1320 * t) + 0.3 * np.sin(2 * np.pi * 2640 * t)) * np.exp(-t * 7)
    if kind == 'ding':
        t = tt(1.4); return (np.sin(2 * np.pi * 1568 * t) + 0.7 * np.sin(2 * np.pi * 2093 * t) + 0.2 * np.sin(2 * np.pi * 3136 * t)) * np.exp(-t * 3.5)
    if kind == 'lock':
        t = tt(0.18); return np.sin(2 * np.pi * 1100 * t) * np.exp(-t * 40) + 0.6 * np.sin(2 * np.pi * 1650 * t) * np.exp(-t * 55)
    if kind == 'pop':
        t = tt(0.12); f = 380 + 900 * t / 0.12; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)
    if kind == 'thunk':
        t = tt(0.9); f = 38 + 70 * np.exp(-t * 18)
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)
        ring = (np.sin(2 * np.pi * 523 * t) + 0.6 * np.sin(2 * np.pi * 787 * t) + 0.3 * np.sin(2 * np.pi * 1311 * t)) * np.exp(-t * 6) * 0.35
        return body + ring + 0.4 * rng.standard_normal(len(t)) * np.exp(-t * 90)
    if kind == 'slam':
        t = tt(0.6); f = 40 + 90 * np.exp(-t * 25)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + 0.6 * smooth(rng.standard_normal(len(t)), 3) * np.exp(-t * 30)
    if kind == 'hit':
        t = tt(0.35); f = 50 + 70 * np.exp(-t * 30)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + 0.5 * (rng.standard_normal(len(t))) * np.exp(-t * 40)
    if kind in ('whoosh', 'swish'):
        env = np.sin(np.pi * np.clip(t / len(t) * SR, 0, 1)) ** 2
        dark = smooth(n, 18 if kind == 'whoosh' else 8)
        return dark * env * (3.0 if kind == 'whoosh' else 2.2)
    if kind == 'squeak':
        f = 1900 + 300 * np.sin(2 * np.pi * 9 * t)
        return 0.35 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / t[-1]) + 0.25 * (n - smooth(n, 4)) * np.sin(np.pi * t / t[-1])
    if kind == 'slide':
        f = 140 + 60 * t / t[-1]
        return (0.6 * smooth(n, 30) * 3 + 0.25 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * t / t[-1]) ** 2
    if kind == 'stretch':
        f = 220 + 260 * (t / t[-1]) ** 1.5
        return 0.35 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / t[-1]) + 0.3 * smooth(n, 10) * np.sin(np.pi * t / t[-1])
    if kind == 'whir':
        f = 300 + 300 * (t / t[-1])
        return 0.22 * (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * t / t[-1]) ** 0.5
    if kind == 'shimmer':
        out = np.zeros(len(t))
        for k in range(10):
            f = 2000 + 3000 * rng.random(); d = rng.random() * 0.5
            out += np.sin(2 * np.pi * f * t) * np.exp(-np.maximum(0, t - d) * 8) * (t > d)
        return out * 0.12
    if kind == 'riser':
        f = 200 + 1400 * (t / t[-1]) ** 2
        tone = 0.25 * np.sin(2 * np.pi * np.cumsum(f) / SR)
        return (smooth(n, 5) * 1.6 + tone) * (t / t[-1]) ** 2.5
    if kind == 'swell':
        f = 330
        return 0.3 * (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t)) * (t / t[-1]) ** 2 * np.exp(-np.maximum(0, t - t[-1] * 0.9) * 20)
    raise ValueError(kind)


# ── arrangement
GAPS = cfg.get('gaps', [])
def in_gap(x):
    return any(g0 <= x < g1 for g0, g1 in GAPS)

PROG = [[53, 56, 60, 63, 67], [49, 53, 56, 60], [56, 60, 63, 67], [51, 55, 58, 60]]  # Fm9, Dbmaj7, Abmaj7, Eb6
ROOTS = [41, 37, 44, 39]
for b in range(20):
    t0 = b * BAR
    add(pad(PROG[b % 4], BAR + 0.2), t0, 0.15 if b >= 2 else 0.11)
    drums = 2 <= b <= 18
    for q in range(4):
        tb = t0 + q * BEAT
        if drums and not in_gap(tb):
            add(kick(), tb, 0.55)
            if q % 2 == 1:
                add(snare(), tb, 0.3)
            add(hat(open_=True), tb + BEAT / 2, 0.08, pan=0.3)
            add(hat(), tb, 0.05, pan=-0.2)
            add(sub(ROOTS[b % 4] + (12 if q == 3 else 0), BEAT * 0.9), tb + BEAT / 2, 0.22)
        elif b == 1:
            for e in range(2):
                add(hat(), tb + e * BEAT / 2, 0.05, pan=-0.2)
    if b == 0:
        for e in range(16):
            add(sfx('tick', 0), t0 + e * BEAT / 4, 0.05 if e % 4 else 0.09, pan=-0.2)

GAIN = {'thunk': 0.9, 'slam': 0.75, 'hit': 0.6, 'whoosh': 0.35, 'swish': 0.3, 'click': 0.35, 'tap': 0.35, 'key': 0.4,
        'tick': 0.25, 'ping': 0.3, 'ding': 0.35, 'lock': 0.4, 'pop': 0.45, 'squeak': 0.3, 'slide': 0.35,
        'stretch': 0.3, 'whir': 0.3, 'shimmer': 0.5, 'swell': 0.35, 'riser': 0.45}
for c in cfg['sfx']:
    pan = 0.25 if c['type'] in ('click', 'tap', 'tick') else 0.0
    add(sfx(c['type'], c['len']), c['t'], GAIN[c['type']], pan)

# gentle tail fade on the last 30 ms so the loop point doesn't click
mix[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))[:, None]
peak = np.max(np.abs(mix))
mix = np.tanh(mix / peak * 1.2) / np.tanh(1.2) * 0.89
pcm = (mix * 32767).astype('<i2')
with wave.open(os.path.join(HERE, '.audio.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'wrote .audio.wav ({DUR:.2f}s, {len(cfg["sfx"])} cues)')
