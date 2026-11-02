import os, subprocess, sys
sys.path.insert(0, '.')
from assets import ASSETS
os.makedirs('build/img', exist_ok=True)
done = []
for key, (fn, mode, opt) in ASSETS.items():
    src = f'img/wiki/{fn}'
    out = f'build/img/{key}.jpg'
    if not os.path.exists(src): continue
    if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(src) and '--force' not in sys.argv: done.append(key); continue
    cmd = ['convert', src + '[0]', '-auto-orient', '-colorspace', 'sRGB', '-background', 'white', '-alpha', 'remove']
    if mode == 'bleed':
        cmd += ['-resize', '2400x1350^']
    else:
        cmd += ['-resize', 'x1300<', '-resize', '2400x1500>']
    cmd += ['-unsharp', '0x0.8+0.6+0.02']
    if opt.get('mono'):
        cmd += ['-colorspace', 'Gray', '-level', '2%,98%', '-colorspace', 'sRGB', '+level-colors', '#1d1814,#f8f4ec']
    else:
        cmd += ['-modulate', '100,94', '-level', '1%,99.5%']
    cmd += ['-quality', '90', out]
    subprocess.run(cmd, check=True)
    done.append(key)
print(len(done), 'assets ready:', ' '.join(done))
