import json, time, urllib.request, urllib.parse, re, sys
UA = {'User-Agent': 'IbnHaythamDocBot/1.0 (documentary research)'}
API = 'https://en.wikipedia.org/w/api.php'
def get(params):
    params['format'] = 'json'
    for a in range(5):
        try:
            req = urllib.request.Request(API + '?' + urllib.parse.urlencode(params), headers=UA)
            return json.load(urllib.request.urlopen(req, timeout=40))
        except Exception as e:
            print('retry', e, file=sys.stderr); time.sleep(3 * (a + 1))
arts = ["Ibn al-Haytham","Book of Optics","Camera obscura","Al-Hakim bi-Amr Allah","Basra","Fatimid Caliphate","Al-Azhar Mosque","Aswan","First Cataract","Philae","Aswan Dam","Witelo","Johannes Kepler","Roger Bacon","Friedrich Risner","Alhazen (crater)","Al-Kindi","House of Wisdom","Islamic Golden Age","Mokattam","Felucca","Dhow","Description de l'Égypte","David Roberts (painter)","History of optics","Astrolabe","Ptolemy","Euclid","Islamic Cairo","Nile","Optics","Human eye","Moon","Lake Nasser","Bab Zuwayla","Al-Hakim Mosque","Scientific method","Ad Vitellionem paralipomena","Selenographia","Moon illusion"]
files = set()
for i in range(0, len(arts), 10):
    d = get({'action': 'query', 'prop': 'images', 'titles': '|'.join(arts[i:i+10]), 'imlimit': 'max'})
    for p in d['query']['pages'].values():
        for im in p.get('images', []): files.add(im['title'])
    time.sleep(1.5)
files = sorted(f for f in files if not re.search(r'\.(svg|ogg|ogv|webm|tif|gif)$', f, re.I))
print(len(files), 'candidate files', file=sys.stderr)
out = []
for i in range(0, len(files), 40):
    d = get({'action': 'query', 'prop': 'imageinfo', 'titles': '|'.join(files[i:i+40]), 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 2400})
    for p in d['query']['pages'].values():
        ii = (p.get('imageinfo') or [None])[0]
        if not ii: continue
        md = ii.get('extmetadata', {})
        lic = md.get('LicenseShortName', {}).get('value', '')
        out.append({'title': p['title'], 'w': ii['width'], 'h': ii['height'], 'thumb': ii.get('thumburl'), 'url': ii['url'], 'lic': lic,
                    'artist': re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', ''))[:120],
                    'desc': re.sub('<[^>]+>', '', md.get('ImageDescription', {}).get('value', ''))[:200]})
    time.sleep(1.5)
json.dump(out, open('img/wiki/candidates.json', 'w'), ensure_ascii=False, indent=1)
ok = [o for o in out if re.search(r'public domain|^PD|CC0|CC BY', o['lic'], re.I) and o['w'] >= 900]
print(len(out), 'with info;', len(ok), 'usable (PD/CC-BY, >=900px)', file=sys.stderr)
for o in ok: print(o['w'], o['h'], o['lic'][:16], '|', o['title'][5:90])
