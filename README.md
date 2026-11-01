# AFTERLIFE — The Halloween Afterparty

A browser based Three.js town inspired by the marigolds, candlelight, papel picado and decorated skulls of Día de Muertos. Built for DevDay Exchange London 2026.

## Current milestone

The environment is interactive: orbit the plaza, visit the ofrenda, explore the night market and lantern garden, or take an automatic camera tour. Thirty illustrated KitBitz guests roam, float and bounce around town. Click a guest for a joke or start a ten second dance.

The architecture, flowers, candle arrangements and paving are procedural 3D geometry. KitBitz guests are camera facing 2D illustrations placed in the scene; they are not rigged 3D character models.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For a production bundle:

```sh
npm run build
npm run preview
```

## Controls

| Action | Control |
| --- | --- |
| Orbit the view | Drag with mouse or one finger |
| Zoom | Mouse wheel or pinch |
| Pan | Right drag or two finger drag |
| Travel across town | WASD or arrow keys |
| Visit a landmark | Camera destination buttons |
| Entertain the guests | Start a dance |
| Hear a guest's joke | Click or tap a character |
| Hide interface | H or Hide UI |
| Pause ambient movement | Pause motion |

## Implementation status

| Feature | Status |
| --- | --- |
| Three.js environment and camera controls | Implemented |
| Expanded town, market and lantern garden | Implemented |
| Animated KitBitz guests and local dance | Implemented |
| QR code and mobile nickname entry | Pending |
| Optional selfie upload | Pending |
| Decisions API monster assignment | Pending |
| Image 2.5 portrait generation | Pending |
| Supabase presence and shared player movement | Pending |
| Player nicknames and interactions | Pending |
| Server controlled AI world events | Pending |

The current build is a single visitor environment prototype. It does not claim live multiplayer, AI integration or support for 1,000 simultaneous players.

## Source layout

`src/world.js` builds the environment using merged geometry and instanced decorations. `src/textures.js` draws original procedural textures. `src/characters.js` places and animates KitBitz artwork. `src/main.js` handles rendering, cameras and controls.

The approved concept is saved in `docs/visual-target.png`. The image is a visual reference, not the rendered scene or a background substituted for geometry.

## Credits

Character illustrations are from [KitBitz Halloween Kit](https://kitbitz.art/kits/halloween-kit), listed as CC0 by KitBitz. Exact asset names and sources are recorded in [ASSETS.md](ASSETS.md). Original procedural environment and concept art were created for this project.

Built with Three.js and Vite. Fonts: Rye and Barlow from Google Fonts.
