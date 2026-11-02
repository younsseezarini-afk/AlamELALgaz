import json, subprocess, numpy as np
SR = 48000
S = json.load(open('build/schedule.json'))
DUR = S['duration']
N = int(DUR * SR) + SR

def load(path, ss=0.0, t=None, ch=2):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(ss)]
    if t: cmd += ['-t', str(t)]
    cmd += ['-i', path, '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-']
    a = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32)
    return a.reshape(-1, ch).copy()
def db(x): return 10 ** (x / 20)
def rms(a): return float(np.sqrt(np.mean(a.astype(np.float64) ** 2)) + 1e-12)

# ---------- voice stem ----------
vo = np.zeros((N, 2), np.float32)
for l in S['lines']:
    a = load(l['src'], l['trim0'], l['d'] + .05)
    n = len(a); fade = int(.01 * SR)
    a[:fade] *= np.linspace(0, 1, fade)[:, None]; a[-fade:] *= np.linspace(1, 0, fade)[:, None]
    i = int(l['s'] * SR); vo[i:i + n] += a[:N - i]
vo.tofile('/tmp/claude-0/-home-user-AlamELALgaz/8031bc0c-e151-517e-8baa-1b698e1589ee/scratchpad/doc/music/vo_raw.f32')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', 'music/vo_raw.f32',
                '-af', 'highpass=f=75,equalizer=f=220:t=q:w=1.2:g=1.5,equalizer=f=3200:t=q:w=1.4:g=2.2,equalizer=f=7500:t=q:w=2:g=-1.5,'
                       'acompressor=threshold=-20dB:ratio=3:attack=6:release=140:makeup=3dB,alimiter=limit=0.89',
                '-f', 'f32le', 'music/vo_proc.f32'], check=True)
vo = np.fromfile('music/vo_proc.f32', np.float32).reshape(-1, 2)[:N]
if len(vo) < N: vo = np.vstack([vo, np.zeros((N - len(vo), 2), np.float32)])
act = vo[:, 0] ** 2
vo *= db(-18) / np.sqrt(np.mean(act[act > 1e-6]))     # speech RMS ≈ -18 dBFS

# ---------- music bed ----------
cards = sorted(S['cards'], key=lambda c: c[1])
T = cards[0][1]; CH = [c[1] for c in cards[1:]]
dam = [w['t'] for l in S['lines'] if l['id'] == 's7_ending_02' for w in l['words'] if 'السد' in w['w']][0]
names = ['Desert_City', 'Unanswered_Questions', 'Heart_of_Nowhere', 'Crossing_the_Chasm', 'Impact_Andante', 'Echoes_of_Time_v2']
SECT = [('Ibn_Al-Noor', 0.0, T + .6, 0), ('Impact_Prelude', T - .4, CH[0] + 1.2, 0)]
for k, nm in enumerate(names): SECT.append((nm, CH[k] + .3, CH[k + 1] + 1.0, 0))
SECT.append(('Despair_and_Triumph', CH[6] + .3, DUR, max(0, 174 - (dam - CH[6] - .3))))
XF = 2.0
mus = np.zeros((N, 2), np.float32)
for name, s, e, off in SECT:
    a = load(f'music/km/{name}.mp3', off, e - s + XF)
    loud = a[np.abs(a[:, 0]) > 1e-3]
    a *= db(-20) / rms(loud)                            # normalize each cue to the same level
    n = len(a); fi = int(XF * SR) if s > 0 else int(.05 * SR); fo = int(XF * SR)
    env = np.ones(n, np.float32); env[:fi] = np.linspace(0, 1, fi) ** .7; env[-fo:] *= np.linspace(1, 0, fo) ** 1.2
    i = int(s * SR); mus[i:i + n] += (a * env[:, None])[:N - i]

# ducking from word timings: speech zones (gaps < 1.2 s are bridged)
t = np.arange(N) / SR
speech = np.zeros(N, bool)
for l in S['lines']:
    for w in l['words']:
        a, b = int((w['t'] - .6) * SR), int((w['t'] + w['d'] + .6) * SR)
        speech[max(a, 0):b] = True
target = np.where(speech, db(-10), db(0)).astype(np.float32)
target[:int(S['hook_end'] * SR)] = np.where(speech[:int(S['hook_end'] * SR)], db(-7.5), db(0))
for c in S['cards']: target[int(c[1] * SR):int(c[2] * SR)] = db(2.5)
target[int(S['end_card'] * SR):] = np.where(speech[int(S['end_card'] * SR):], db(-10), db(1))
g = np.empty_like(target); cur = target[0]
att, rel = 1 - np.exp(-1 / (.30 * SR)), 1 - np.exp(-1 / (1.1 * SR))
step = 48  # smooth on a decimated grid for speed
tg = target[::step]; gg = np.empty_like(tg); cur = tg[0]
a1, r1 = 1 - np.exp(-step / (.30 * SR)), 1 - np.exp(-step / (1.1 * SR))
for k in range(len(tg)):
    cur += (tg[k] - cur) * (a1 if tg[k] < cur else r1); gg[k] = cur
g = np.interp(np.arange(N), np.arange(len(gg)) * step, gg).astype(np.float32)
mus *= g[:, None]
# final fade
fo = int(4 * SR); mus[-fo:] *= np.linspace(1, 0, fo)[:, None]

# ---------- synthesized SFX ----------
rng = np.random.default_rng(3)
sfx = np.zeros((N, 2), np.float32)
def place(x, at, gain_db):
    i = int(at * SR)
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), N - i)
    if n > 0: sfx[i:i + n] += x[:n] * db(gain_db)
def lp(x, a):  # one-pole lowpass (scalar or per-sample coefficient)
    y = np.empty_like(x); acc = 0.0
    av = np.broadcast_to(np.asarray(a, np.float32), x.shape)
    for k in range(len(x)): acc += av[k] * (x[k] - acc); y[k] = acc
    return y
def boom(d=2.4):
    n = int(d * SR); tt = np.arange(n) / SR
    f = 52 * np.exp(-tt * 1.2) + 34
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2)
    nz = lp(rng.standard_normal(n).astype(np.float32), .02) * np.exp(-tt * 7) * 3
    x = (s + nz).astype(np.float32); x /= np.abs(x).max()
    tail = lp(rng.standard_normal(n).astype(np.float32), .05) * np.exp(-tt * 3.0) * .25
    return np.stack([x + tail, x + np.roll(tail, 900)], 1)
def whoosh(d=1.1):
    n = int(d * SR); tt = np.arange(n) / SR
    nz = rng.standard_normal(n).astype(np.float32)
    hi = nz - lp(nz, .08)
    band = lp(hi, .25 + .5 * (tt / d)) * np.sin(np.pi * tt / d) ** 2
    band /= np.abs(band).max()
    pan = np.linspace(-.6, .6, n)
    return np.stack([band * (1 - pan) / 1.6, band * (1 + pan) / 1.6], 1).astype(np.float32)
def riser(d=3.0):
    n = int(d * SR); tt = np.arange(n) / SR
    nz = rng.standard_normal(n).astype(np.float32)
    x = lp(nz, .02 + .3 * (tt / d) ** 2) * (tt / d) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(110 + 330 * (tt / d) ** 2) / SR) * (tt / d) ** 3 * .3
    x = x / np.abs(x).max() + tone
    return np.stack([x, x], 1).astype(np.float32)
B, Wh, Ri = boom(), whoosh(), riser()
def click():
    n = int(.12 * SR); tt = np.arange(n) / SR
    nz = rng.standard_normal(n).astype(np.float32)
    x = (nz - lp(nz, .2)) * (np.exp(-tt * 90) + .6 * np.exp(-np.maximum(tt - .045, 0) * 120) * (tt > .045))
    x /= np.abs(x).max(); return np.stack([x, x], 1).astype(np.float32)
Cl = click()
place(B, 0.0, -12)                                   # hit on the very first frame
for c in S['cards']:
    if c[0] == 'title':
        place(Ri, c[1] - 2.6, -21); place(B, c[1] + .55, -9)
    else:
        place(Wh, c[1] - .5, -21); place(B, c[1] + .35, -16)
last = -9
cardt = [c[1] for c in S['cards']]
for ct in S['cuts']:
    if ct - last < 1.1 or any(abs(ct - x) < 1.0 for x in cardt): continue
    place(Wh, ct - .55, -21 if ct < S['hook_end'] else -31); last = ct
for ft in S['flashes']: place(Cl, ft - .02, -12)
L = {l['id']: l for l in S['lines']}
def wt(lid, n): return L[lid]['words'][n]['t']
for at, g_ in [(wt('s0_hook_00', 2), -15), (wt('s0_hook_01', 0), -19), (wt('s0_hook_04', 15), -15), (wt('s0_hook_06', 0), -18),
               (L['s3_madness_04']['s'], -14), (L['s3_madness_14']['s'], -15), (L['s7_ending_04']['s'], -19)]:
    place(B, at - .05, g_)
place(B, S['end_card'] + .35, -16)

mix = vo + mus + sfx
mix.astype(np.float32).tofile('music/mix.f32')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', 'music/mix.f32',
                '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11', '-ar', str(SR), '-c:a', 'pcm_s16le', 'music/final_mix.wav'], check=True)
print('mix done', DUR)
