# AFTERLIFE — The Halloween Afterparty

A browser based Three.js town inspired by the marigolds, candlelight, papel picado and decorated skulls of Día de Muertos. Built for DevDay Exchange London 2026.

## Play

[Open Afterlife](https://afterlife-halloween-afterparty.mirco1990.chatgpt.site/) or [join as a monster](https://afterlife-halloween-afterparty.mirco1990.chatgpt.site/?join=1).

Use **QR / invite** on the projector to let phones join the same town. Players enter a nickname, choose their party energy and snack, and can add a selfie or object photo. No account registration is needed.

OpenAI Decisions assigns a pumpkin, ghost or reaper identity. Image 2.5 generates a portrait asynchronously while a matching procedural 3D avatar enters the world. Other participants see nicknames, movement and emotes through Supabase Realtime.

The AI Overlord chooses a shared event every 20 seconds while players are connected: a pumpkin takeover, a ghost dance or a monster election. Elections allow one vote per guest, which can be changed until voting closes. If OpenAI is unavailable, the app labels the party draw or scheduled host fallback explicitly.

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
| QR invitation and mobile nickname entry | Implemented |
| Optional selfie or object photo | Implemented; compressed locally and not persisted |
| Decisions API monster assignment | Live tested with gpt-6-luna |
| Image 2.5 portrait generation | Live tested with gpt-image-2.5-flare, with and without an image input |
| Shared player movement, nicknames and emotes | Implemented; two independent Realtime clients verified |
| Matching predefined 3D monster avatars | Implemented for pumpkin, ghost and reaper |
| AI Overlord events every 20 seconds | Implemented; live Decisions event tested |
| Expanded town and animated KitBitz atmosphere | Implemented |

The demo is not load tested for 1,000 concurrent players. Movement is persisted at up to two updates per second per moving player, with interpolation and a display cap of 100 player avatars. High attendance will require spatial channels and a dedicated movement transport.

## Backend

Supabase project: `flwzkistgefltcuvzybi`. The `afterlife_` tables and `afterlife-api` Edge Function are isolated from the project's preexisting applications. Anonymous visitors can read world state; changes require a private random guest token checked by the server. Session token hashes are inaccessible to public database clients. No changes to the existing Supabase Auth configuration are required.

Set `OPENAI_API_KEY` as a Supabase Edge Function secret. Never add it to frontend code or Git. Optional `AFTERLIFE_MAX_PORTRAITS` controls the total portrait allowance, default 100. Each guest can request one portrait. Raw selfies are processed only in request memory; generated portraits are publicly visible as disclosed in the join form.

Database migration and function source are in `supabase/`. Deployment must retain `verify_jwt: false` because the function implements its own guest authentication; public state and joining are intentionally open. All modifying routes validate the private guest pass. Internal database RPCs are callable only by service_role.

## Validation

`npm run build` builds the browser app. `deno check --config supabase/functions/afterlife-api/deno.json supabase/functions/afterlife-api/index.ts` checks the backend. `node scripts/smoke.mjs /absolute/path/to/test-session.json` tests a dedicated guest fixture against the live backend, including unauthorized writes, private session isolation, idempotent join, stale update protection and two independent Realtime subscriptions. The fixture contains a test guest token and must not be committed.

## Source layout

`src/world.js` builds the environment using merged geometry and instanced decorations. `src/textures.js` draws original procedural textures. `src/characters.js` places and animates KitBitz artwork. `src/main.js` handles rendering, cameras and controls.

The approved concept is saved in `docs/visual-target.png`. The image is a visual reference, not the rendered scene or a background substituted for geometry.

## Credits

Character illustrations are from [KitBitz Halloween Kit](https://kitbitz.art/kits/halloween-kit), listed as CC0 by KitBitz. Exact asset names and sources are recorded in [ASSETS.md](ASSETS.md). Original procedural environment and concept art were created for this project.

Built with Three.js and Vite. Fonts: Rye and Barlow from Google Fonts.
