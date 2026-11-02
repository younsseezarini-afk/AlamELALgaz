# Archival asset registry: key -> (source file in img/wiki, mode, options)
# mode 'bleed' = full-frame photo, 'doc' = document placed on the page with a soft shadow
ASSETS = {
    'haytham':      ('000.jpg', 'doc', {}),              # Ibn al-Haytham, engraving (Hevelius, 1647)
    'thesaurus':    ('001.jpg', 'doc', {}),              # Opticae Thesaurus frontispiece, Basel 1572
    'alhazen_eye':  ('002.png', 'doc', {}),              # eye structure after Ibn al-Haytham (Risner 1572)
    'optics_cover': ('003.jpg', 'doc', {}),
    'seleno':       ('004.jpg', 'doc', {}),              # Selenographia title page: Alhazen & Galileo              # Latin Book of Optics title page
    'basra1695':    ('005.jpg', 'doc', {}),              # View of Basra c.1695
    'basra_port':   ('006.png', 'bleed', {}),            # Basra, Portuguese drawing 16th c.
    'dhow':         ('007.png', 'bleed', {'mono': 1}),   # dhow on the Shatt al-Arab
    'library':      ('008.jpg', 'doc', {}),              # Maqamat al-Hariri, library scene (al-Wasiti 1237)
    'abbasid_ms':   ('009.jpg', 'bleed', {}),            # Abbasid-era manuscript
    'almagest':     ('011.jpg', 'doc', {}),              # Almagest, Arabic translation
    'ptolemy':      ('012.jpg', 'doc', {}),              # Ptolemy, Justus van Gent (1476)
    'ptolemy_eng':  ('013.jpg', 'doc', {}),              # Ptolemy & Urania, engraving
    'azhar1900':    ('014.jpg', 'bleed', {'mono': 1}),   # courtyard of al-Azhar c.1900
    'zuwayla':      ('015.jpg', 'bleed', {}),            # Bab Zuwayla, David Roberts (c.1848)
    'cairo_street': ('016.jpg', 'bleed', {'mono': 1}),   # Cairo street, Bonfils (1867-)
    'hakim_mosque': ('017.jpg', 'bleed', {'mono': 1}),   # al-Hakim mosque, 1890s
    'ewer':         ('018.jpg', 'doc', {}),              # Fatimid rock-crystal ewer
    'muqattam_air': ('019.jpg', 'bleed', {'mono': 1}),   # Muqattam, aerial c.1904 (Spelterini)
    'mokattam':     ('020.jpg', 'bleed', {'mono': 1}),   # a corner of the Mokattam, c.1880
    'philae_frere': ('021.jpg', 'bleed', {}),            # Temple of Philae, Théodore Frère
    'philae_loc':   ('022.jpg', 'bleed', {}),            # Island of Philae, photochrom
    'philae_flood': ('023.jpg', 'bleed', {}),            # Kiosk of Philae on the flood
    'elephantine':  ('024.jpg', 'bleed', {}),            # Elephantine island, 1908
    'eleph_map':    ('025.jpg', 'doc', {}),              # Elephantine, Description de l'Égypte
    'nasser_sat':   ('026.jpg', 'bleed', {}),            # Lake Nasser & High Dam, NASA
    'dam_build':    ('027.jpg', 'bleed', {'mono': 1}),   # High Dam construction, 1963
    'witelo':       ('028.jpg', 'doc', {}),              # Witelo, Perspectiva manuscript
    'bacon':        ('029.jpg', 'doc', {}),              # Roger Bacon, engraving 1867
    'bacon_optics': ('030.jpg', 'doc', {}),              # Bacon's optics diagram
    'bacon_opt2':   ('031.jpg', 'doc', {}),
    'mielot':       ('032.jpg', 'doc', {}),              # scholar writing (Miélot)
    'crater':       ('033.jpg', 'bleed', {'mono': 1}),   # Alhazen crater, Apollo 17
    'ibnsahl':      ('034.jpg', 'doc', {}),              # Ibn Sahl manuscript
    'dinar':        ('035.jpg', 'doc', {}),              # gold dinar of al-Hakim
    'eye_ms':       ('036.jpg', 'doc', {}),              # the eye, Arabic manuscript
    'ayscough':     ('037.jpg', 'bleed', {}),            # camera obscura principle, 1755
    'camera_box':   ('038.jpg', 'doc', {}),              # camera obscura box, 18th c.
    'kircher':      ('039.jpg', 'doc', {}),              # Kircher's camera obscura 1646
    'encyc_camera': ('040.png', 'doc', {}),              # Encyclopédie camera obscura
    'kepler':       ('042.jpg', 'doc', {}),              # Johannes Kepler 1610
    'idrisi':       ('045.jpg', 'doc', {}),              # al-Idrisi world map
    'qalawun':      ('046.jpg', 'bleed', {'mono': 1}),
    'basra1915':    ('047.jpg', 'bleed', {'mono': 1}),
    'azhar_gate':   ('048.jpg', 'bleed', {}),
    'philae1906':   ('049.jpg', 'bleed', {}),
    'scriptorium':  ('050.jpg', 'doc', {}),
    'bacon_merton': ('051.jpg', 'doc', {}),
}
FALLBACK = {
    'philae_frere': ['philae_loc', 'philae_flood', 'philae1906', 'elephantine', 'eleph_map'],
    'philae_loc': ['philae_frere', 'philae_flood', 'philae1906', 'elephantine', 'eleph_map'],
    'philae_flood': ['philae1906', 'philae_loc', 'philae_frere', 'elephantine', 'eleph_map'],
    'philae1906': ['philae_flood', 'philae_loc', 'philae_frere', 'elephantine', 'eleph_map'],
    'elephantine': ['philae_loc', 'philae_frere', 'eleph_map'],
    'dam_build': ['nasser_sat'],
    'crater': [],
    'kepler': [],
    'kircher': ['encyc_camera', 'ayscough'],
    'encyc_camera': ['kircher', 'ayscough'],
    'mielot': ['scriptorium'],
    'bacon_merton': ['bacon'],
    'bacon_opt2': ['bacon_optics'],
    'qalawun': ['azhar1900'],
    'azhar_gate': ['azhar1900'],
    'basra1915': ['dhow'],
    'zuwayla': ['cairo_street'],
    'thesaurus': ['optics_cover'],
}
CREDITS = {
    'haytham': 'Johannes Hevelius, Selenographia (1647)',
    'thesaurus': 'Opticae Thesaurus, Basel (1572)',
    'optics_cover': 'Latin edition of the Book of Optics',
    'basra1695': 'Isaak de Graaf, View of Basra (c. 1695)',
    'basra_port': 'Portuguese drawing of Basra (16th c.)',
    'library': "al-Wasiti, Maqamat al-Hariri (1237), BnF",
    'zuwayla': 'David Roberts, Bab Zuwayla (c. 1848)',
    'cairo_street': 'Félix Bonfils, Cairo (19th c.), Library of Congress',
    'nasser_sat': 'NASA Earth Observatory',
    'crater': 'NASA, Apollo 17',
}
