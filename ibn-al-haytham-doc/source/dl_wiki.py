import hashlib, urllib.parse, urllib.request, time, sys, os, re, json
UA = {'User-Agent': 'IbnHaythamDocBot/1.0 (documentary research)'}
names = [l.strip() for l in open(sys.argv[1]) if l.strip()]
ok = {}
for i, n in enumerate(names):
    m = hashlib.md5(n.encode()).hexdigest(); q = urllib.parse.quote(n)
    ext = os.path.splitext(n)[1].lower()
    tn = q + ('.png' if ext in ('.tif', '.tiff') else '')
    out = f'{i:03d}' + ('.png' if ext == '.png' else '.jpg')
    if os.path.exists(out): ok[out] = n; continue
    for w in (1920, 1280):
        u = f'https://upload.wikimedia.org/wikipedia/commons/thumb/{m[0]}/{m[:2]}/{q}/{w}px-{tn}'
        try:
            data = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()
            open(out, 'wb').write(data); ok[out] = n; print(out, w, n[:60]); break
        except Exception as e:
            err = str(e)
            if "429" in err: time.sleep(30)
    else:
        # small originals: try original
        u = f'https://upload.wikimedia.org/wikipedia/commons/{m[0]}/{m[:2]}/{q}'
        try:
            data = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()
            open(out, 'wb').write(data); ok[out] = n; print(out, 'orig', n[:60])
        except Exception as e: print('FAIL', n[:60], e)
    time.sleep(22)
json.dump(ok, open('map.json', 'w'), ensure_ascii=False, indent=1)
