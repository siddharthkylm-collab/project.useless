# Proxy Workout 3D assets

The application intentionally does not generate a fake human from primitives. Add a licensed, locally hosted humanoid GLB at:

`public/assets/models/proxy-human.glb`

The GLB should contain a humanoid skeleton, a neutral/idle animation, and optional facial morph targets. Exercise clips can be bundled in that file or placed in `public/assets/animations/` and loaded through the animation controller. Recommended source workflow: download a properly licensed character and clips from Mixamo or another legitimate source, retarget in Blender/Mixamo, then export GLB.

The loader uses `GLTFLoader`, `AnimationMixer`, skinned meshes, skeletons, and animation clips. If the model is not supplied, the workout screen shows an explicit asset setup state and never substitutes procedural geometry.

The prototype currently includes `proxy-human.glb`, downloaded from the official Three.js example asset at `https://threejs.org/examples/models/gltf/Xbot.glb`. Review the upstream asset license before redistributing the application. This file contains `agree`, `headShake`, `idle`, `run`, `sad_pose`, `sneak_pose`, and `walk`; it does not contain authored Squat, Sit-Up, or Jumping-Jack clips. The application reports those exercises as unavailable and safely plays idle until matching clips are supplied.

Exercise clips must be authored or legitimately licensed, retargeted to the same humanoid skeleton, and exported as animation clips in the model (or wired into a future animation-GLB loader). Do not replace missing clips with procedural bone rotations: reps are counted only from completed loops of the selected authored clip.

## Running locally

Serve the project over HTTP rather than opening `ghi.html` directly from `file://`; browsers block local GLB fetches from file pages. For example, from the project root run:

```powershell
py -m http.server 8765
```

Then open `http://127.0.0.1:8765/ghi.html`.
