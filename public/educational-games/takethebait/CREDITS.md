# Take the Bait: credits and licenses

Every file below is stored in this repository and served from allgoodacademy.com.
Nothing is hotlinked.

## 3D models: Kenney (CC0 1.0)

| File | Used for |
|---|---|
| `models/character.glb` | Every runner: the crowd, the red spam crowds, the hooked runners, and the Scam HQ boss (tinted per instance) |
| `models/cloud.glb` | Sky clouds |
| `models/flag.glb` | Flag on Scam HQ |
| `models/grass-small.glb` | Grass tufts beside the track |
| `models/Textures/colormap.png` | Shared palette texture for the models above |

- **Author:** Kenney (https://kenney.nl)
- **Source:** "Starter Kit 3D Platformer", https://github.com/KenneyNL/Starter-Kit-3D-Platformer,
  commit `3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0` (2026-03-12), folder `models/`.
  The kit's README states that its 2D sprites, 3D models and sound effects are CC0-licensed.
  (The kit's Godot code is MIT, but none of that code is used here.)
- **License:** Creative Commons Zero v1.0 Universal (public domain dedication),
  https://creativecommons.org/publicdomain/zero/1.0/. No attribution is required. This
  credit is a courtesy.
- **Changes:** none to the files. At runtime the game re-tints the character's palette texture
  per instance and splits it into limbs for the run cycle.

SHA-256 of the files as committed:

```
7112f6a08400914f9da546f3e6029e947cc9eab2b4a6da5eb99776111289efb1  models/character.glb
09c6f071d3a9ab64993248ee5c8d50debcd9c6cc4369236a01155ff7ff87f30a  models/cloud.glb
0ba84ff43f0fea0a9f0b080cfa1be54ebda36c8c35174d1ac2553ae6da9f65ae  models/flag.glb
4b94e8dd9cbdc3eedff99cbf614fe828f0c2342d21a7d0edb125b129d0422d51  models/grass-small.glb
106cf02e0d6dccded6d9f90c2ae6a51eb94c6301645fea159e834c44ed4708a3  models/Textures/colormap.png
```

## Three.js r170 (MIT)

| File | From the npm package `three@0.170.0` |
|---|---|
| `vendor/three/three.module.min.js` | `build/three.module.min.js` |
| `vendor/three/addons/loaders/GLTFLoader.js` | `examples/jsm/loaders/GLTFLoader.js` |
| `vendor/three/addons/utils/BufferGeometryUtils.js` | `examples/jsm/utils/BufferGeometryUtils.js` |

- **Source:** https://github.com/mrdoob/three.js, https://www.npmjs.com/package/three
- **License:** MIT. The full text is in `vendor/three/LICENSE`.
- **Changes:** none. These files are bundled rather than loaded from a CDN because school
  firewalls block CDNs (see check 3 in `scripts/check-invariants.js`).

## Allgood Academy

Jodi (`/assets/jodi/*.svg`), the game design, and all copy belong to Allgood Academy.
