import * as THREE from "three";
import { GLTFLoader } from "https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const storageKey = "proxyWorkoutState";
const defaultState = { name: "Jordan", goal: "Maintain", theme: "light", xp: 1280, level: 8, streak: 12, score: 742, calories: 2840, history: [], mastery: { Squats: 91, "Push-ups": 73, Plank: 42, Lunges: 64 } };
const state = { ...defaultState, ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
const playlists = [
  { name: "QUICK BURN", icon: "⚡", detail: "8 min · 3 exercises", exercise: "Jumping jacks", reps: 20, sets: 2, color: "orange" },
  { name: "LEG DAY", icon: "◒", detail: "18 min · 4 exercises", exercise: "Squats", reps: 12, sets: 3, color: "blue" },
  { name: "UPPER BODY", icon: "⬡", detail: "15 min · 3 exercises", exercise: "Push-ups", reps: 10, sets: 3, color: "pink" },
  { name: "CORE PROTOCOL", icon: "▬", detail: "12 min · 3 exercises", exercise: "Sit-ups", reps: 15, sets: 3, color: "green" }
];
const dialogues = {
  idle: ["I was promised a desk job.", "Systems nominal. Muscles suspiciously untouched."],
  start: ["Fine. Initiating human replacement protocol.", "I hope you appreciate this sacrifice."],
  rep: ["That was basically one rep.", "My form is mostly theoretical."],
  fatigue: ["I CAN FEEL MY SOUL LEAVING.", "Is there a union for this?"],
  rest: ["Hydrating.exe", "Recovering. Emotionally, not physically."],
  complete: ["We survived. You did nothing. Incredible teamwork."]
};
let workout = { active: false, paused: false, exercise: "Squats", reps: 12, sets: 3, currentRep: 0, currentSet: 0, fatigue: 0, energy: 100, stress: 5, motivation: 100, performance: 100, restTimer: null };
let scene, avatar, renderer, camera, rotation = 0;
let animationController;
const assetPaths = { model: "public/assets/models/proxy-human.glb" };

function persist() { localStorage.setItem(storageKey, JSON.stringify(state)); }
function say(category) { const list = dialogues[category] || dialogues.idle; return list[Math.floor(Math.random() * list.length)]; }
function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2800); }
function renderName() {
  $("#greetingName").textContent = state.name; $("#topName").textContent = state.name; $("#profileName").textContent = state.name;
  $("#profileHeading").textContent = `${state.name}'s command center`; $("#profileGoal").textContent = `Goal: ${state.goal} · Since Jan 2026`;
  $(".user-initial").textContent = state.name.charAt(0).toUpperCase();
}
function renderMastery() {
  const icons = { Squats: "◒", "Push-ups": "⬡", Plank: "▬", Lunges: "◐" };
  $("#masteryList").innerHTML = Object.entries(state.mastery).map(([name, value]) => `<div class="mastery-row"><span class="mastery-icon">${icons[name] || "✦"}</span><div><strong>${name}</strong><small>${value > 80 ? "Proxy is showing off" : "Needs more artificial suffering"}</small></div><span class="mastery-percent">${value}%</span><div class="progress-line"><i style="width:${value}%"></i></div></div>`).join("");
}
function renderPlaylists(container, picker = false) {
  $(container).innerHTML = playlists.map((item, index) => `<div class="playlist${picker && index === 1 ? " selected" : ""}" data-playlist="${index}"><div class="playlist-icon">${item.icon}</div><strong>${item.name}</strong><small>${item.detail}</small></div>`).join("");
  $$(container + " .playlist").forEach((item) => item.addEventListener("click", () => {
    $$(container + " .playlist").forEach((card) => card.classList.remove("selected")); item.classList.add("selected");
    if (!picker) startWorkout(playlists[Number(item.dataset.playlist)]);
  }));
}
function renderHistory() {
  const history = state.history.length ? state.history : [{ exercise: "Lower body protocol", date: "Yesterday", score: "+180 XP" }, { exercise: "Quick burn", date: "Sep 09 · 8 min", score: "+120 XP" }];
  $("#historyList").innerHTML = history.slice(0, 4).map((item) => `<div class="history-item"><span class="history-dot">◒</span><div><strong>${item.exercise}</strong><small>${item.date || "Just now"}</small></div><span class="history-score">${item.score || "+120 XP"}</span></div>`).join("");
}
function navigate(page) {
  $$(".page").forEach((section) => section.classList.toggle("active", section.id === page));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  $("#pageTitle").textContent = page.toUpperCase();
  if (page === "workout") setTimeout(initAvatar, 0);
}
function updateTelemetry() {
  ["energy", "fatigue", "stress", "performance"].forEach((key) => { $(`#${key}Val`).textContent = Math.round(workout[key]); $(`#${key}Bar`).style.width = `${Math.max(0, Math.min(100, workout[key]))}%`; });
  $("#repCurrent").textContent = workout.currentRep; $("#repTarget").textContent = `/ ${workout.reps} reps`;
  $("#setLabel").textContent = `SET ${Math.min(workout.currentSet + 1, workout.sets)} / ${workout.sets}`;
  $("#moodVal").textContent = workout.fatigue > 75 ? "Frustrated" : workout.fatigue > 45 ? "Annoyed" : "Focused";
  $("#motivationVal").textContent = `${Math.round(workout.motivation)}%`;
  $("#avatarState").textContent = workout.paused ? "AI is on an unauthorized break" : workout.active ? "AI is performing the selected clip" : "AI is pretending to stretch";
  if (workout.fatigue > 38) { $("#hiddenInsight").innerHTML = "◎ <span>Psychological metrics unlocked: the AI is getting interesting.</span>"; $("#psychMeters").style.display = "flex"; }
  $("#goalPercent").textContent = `${Math.min(70, Math.round(workout.fatigue))} / 70%`; $("#goalBar").style.width = `${Math.min(100, workout.fatigue / .7)}%`;
}
function startWorkout(config = playlists[1]) {
  clearInterval(workout.restTimer);
  workout = { ...workout, active: true, paused: false, exercise: config.exercise, reps: config.reps, sets: config.sets, currentRep: 0, currentSet: 0, fatigue: 0, energy: 100, stress: 5, motivation: 100, performance: 100 };
  $("#currentExercise").textContent = config.exercise; $("#exerciseLabel").textContent = `ACTIVE / ${config.exercise.toUpperCase()}`;
  $("#workoutTitle").textContent = `${config.exercise} protocol`; $("#workoutSubtitle").textContent = "Your AI is handling the hard part. Please supervise responsibly.";
  $("#speechBubble").textContent = `“${say("start")}”`; $("#startBtn").innerHTML = "AI is moving <span>↻</span>"; $("#pauseBtn").textContent = "Ⅱ Pause";
  navigate("workout"); updateTelemetry(); animationController?.playExercise(config.exercise); toast(`${config.name || "CUSTOM PROTOCOL"} loaded.`);
}
function completeRep() {
  if (!workout.active || workout.paused) return;
  workout.currentRep += 1; workout.energy = Math.max(0, workout.energy - 2.8);
  workout.fatigue = Math.min(100, workout.fatigue + 4.5 + workout.currentSet * .8);
  workout.stress = Math.min(100, workout.stress + (workout.fatigue > 55 ? 2.2 : .7));
  workout.motivation = Math.max(0, workout.motivation - .8); workout.performance = Math.max(15, 100 - workout.fatigue * .52);
  $("#speechBubble").textContent = `“${workout.fatigue > 65 ? say("fatigue") : say(workout.currentRep % 4 === 0 ? "rep" : "start")}”`; updateTelemetry();
  if (workout.currentRep >= workout.reps) finishSet();
}
function finishSet() {
  workout.currentSet += 1; workout.currentRep = 0;
  if (workout.currentSet >= workout.sets) { finishWorkout(); return; }
  workout.active = false; animationController?.playIdle(); $("#exerciseLabel").textContent = "REST / RECOVERY"; $("#startBtn").textContent = `Rest ${$("#restSelect").value}s`;
  $("#speechBubble").textContent = `“${say("rest")}”`; updateTelemetry();
  let remaining = Number($("#restSelect").value); $("#repCurrent").textContent = remaining;
  clearInterval(workout.restTimer); workout.restTimer = setInterval(() => {
    remaining -= 1; $("#repCurrent").textContent = Math.max(0, remaining);
    if (remaining <= 0) { clearInterval(workout.restTimer); workout.active = true; $("#exerciseLabel").textContent = `ACTIVE / ${workout.exercise.toUpperCase()}`; $("#startBtn").innerHTML = "AI is moving <span>↻</span>"; animationController?.playExercise(workout.exercise); updateTelemetry(); }
  }, 1000);
}
function finishWorkout() {
  workout.active = false; animationController?.playIdle(); state.xp += 180; state.calories += Math.round(workout.fatigue * 3.1); state.score += 8;
  state.mastery[workout.exercise] = Math.min(100, (state.mastery[workout.exercise] || 35) + 3); state.history.unshift({ exercise: workout.exercise, date: "Just now · completed", score: "+180 XP" }); persist();
  $("#exerciseLabel").textContent = "PROTOCOL COMPLETE"; $("#workoutTitle").textContent = "Technically, you worked out."; $("#speechBubble").textContent = `“${say("complete")}”`;
  $("#startBtn").textContent = "Start again"; updateTelemetry(); renderMastery(); renderHistory(); toast("+180 XP · Your muscles remain suspiciously unaffected.");
}

class AvatarAnimationController {
  constructor(model) {
    this.mixer = new THREE.AnimationMixer(model); this.actions = new Map(); this.clips = new Map(); this.currentAction = null; this.previousAction = null; this.exerciseAction = null; this.exerciseClip = null; this.onRep = null;
    this.mixer.addEventListener("loop", (event) => { if (event.action === this.exerciseAction && event.loopDelta > 0) this.onRep?.(); });
  }
  loadAnimations(clips) {
    clips.forEach((clip) => { const action = this.mixer.clipAction(clip); this.actions.set(clip.name.toLowerCase(), action); this.clips.set(action, clip); });
    console.info("[Proxy Workout] animation clips:", clips.map((clip) => ({ name: clip.name, duration: clip.duration, tracks: clip.tracks.length })));
    this.playIdle(); this.renderDebugger(clips);
  }
  find(name) {
    const wanted = name.toLowerCase().replace(/[^a-z]/g, "");
    return [...this.actions.entries()].find(([key]) => key.replace(/[^a-z]/g, "") === wanted)?.[1];
  }
  playIdle() {
    const idle = this.find("idle") || this.actions.values().next().value;
    if (idle) this.crossFadeTo(idle, 0.25, THREE.LoopRepeat, Infinity);
    this.exerciseAction = null; this.exerciseClip = null;
  }
  playExercise(exercise) {
    const aliases = { "jumping jacks": ["jumpingjack", "jumping jacks"], squats: ["squat"], "sit-ups": ["situp", "sit-up", "sit ups"] };
    const names = aliases[exercise.toLowerCase()] || [exercise];
    const entry = names.map((name) => this.find(name)).find(Boolean);
    if (!entry) {
      this.playIdle(); this.showUnavailable(exercise); return false;
    }
    this.exerciseAction = entry; this.exerciseClip = this.clips.get(entry); this.crossFadeTo(entry, 0.25, THREE.LoopRepeat, Infinity); this.hideUnavailable(); return true;
  }
  playClip(action) { this.crossFadeTo(action, 0.2, THREE.LoopRepeat, Infinity); }
  crossFadeTo(action, duration, loop, repetitions) {
    if (!action || this.currentAction === action) return;
    this.previousAction = this.currentAction; this.currentAction = action; action.reset().setLoop(loop, repetitions).setEffectiveTimeScale(Math.max(.55, 1 - workout.fatigue / 220)).fadeIn(duration).play();
    this.previousAction?.fadeOut(duration);
  }
  update(delta) {
    this.mixer.update(delta * Math.max(.55, 1 - workout.fatigue / 220));
    if (this.exerciseAction) this.exerciseAction.setEffectiveTimeScale(Math.max(.55, 1 - workout.fatigue / 220));
  }
  renderDebugger(clips) {
    const panel = $("#animationDebugger"); if (!panel) return;
    panel.innerHTML = `<strong>Animation debugger</strong><small>${clips.length} clip${clips.length === 1 ? "" : "s"} loaded from the GLB</small><div class="debug-clip-list"></div>`;
    const list = panel.querySelector(".debug-clip-list");
    clips.forEach((clip) => { const button = document.createElement("button"); button.textContent = clip.name; button.addEventListener("click", () => this.playClip(this.actions.get(clip.name.toLowerCase()))); list.appendChild(button); });
  }
  showUnavailable(exercise) {
    const notice = $("#animationStatus"); if (!notice) return;
    notice.hidden = false; notice.innerHTML = `<strong>Animation unavailable</strong><span>No authored ${exercise} clip exists in this GLB. Falling back to idle; reps will not be counted.</span><small>Available clips: ${[...this.actions.keys()].join(", ") || "none"}</small>`;
    $("#avatarState").textContent = "AI is using idle fallback";
  }
  hideUnavailable() { const notice = $("#animationStatus"); if (notice) notice.hidden = true; }
}
function setAvatarFallback(missing) {
  const host = $("#avatarCanvas"); let notice = host.querySelector(".avatar-fallback");
  if (!missing) { notice?.remove(); return; }
  if (!notice) { notice = document.createElement("div"); notice.className = "avatar-fallback"; notice.innerHTML = `<strong>REAL HUMAN ASSET REQUIRED</strong><span>Place <code>${assetPaths.model}</code> here to load the skinned humanoid.</span>`; host.appendChild(notice); }
}
function initAvatar() {
  const host = $("#avatarCanvas"); if (!host || host.clientWidth === 0 || renderer) return;
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, .1, 100); camera.position.set(0, 1.4, 5.2);
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(host.clientWidth, host.clientHeight); host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb6c4d8, 2.2)); const key = new THREE.DirectionalLight(0x8eaaff, 2); key.position.set(3, 4, 4); scene.add(key);
  new GLTFLoader().load(assetPaths.model, (gltf) => {
    avatar = gltf.scene; const diagnostics = { model: assetPaths.model, scenes: gltf.scenes.length, meshes: 0, skinnedMeshes: 0, bones: 0, morphTargets: 0 };
    avatar.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; diagnostics.meshes += 1; diagnostics.skinnedMeshes += child.isSkinnedMesh ? 1 : 0; diagnostics.morphTargets += child.morphTargetDictionary ? Object.keys(child.morphTargetDictionary).length : 0; } if (child.isBone) diagnostics.bones += 1; });
    console.info("[Proxy Workout] model diagnostics:", diagnostics); console.info("[Proxy Workout] clips:", gltf.animations.map((clip) => clip.name));
    avatar.position.y = -.35; avatar.scale.setScalar(1.8); scene.add(avatar); animationController = new AvatarAnimationController(avatar); animationController.onRep = completeRep; animationController.loadAnimations(gltf.animations); setAvatarFallback(false);
    if (workout.active) animationController.playExercise(workout.exercise);
  }, undefined, () => setAvatarFallback(true));
  const resize = () => { if (!host.clientWidth) return; camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); };
  window.addEventListener("resize", resize); const clock = new THREE.Clock();
  const animate = () => { requestAnimationFrame(animate); const delta = clock.getDelta(); animationController?.update(delta); if (avatar) { avatar.rotation.y += (rotation - avatar.rotation.y) * .04; avatar.position.y = -.35; } renderer.render(scene, camera); };
  animate();
}
function bind() {
  $$(".nav-item,[data-page]").forEach((button) => button.addEventListener("click", (event) => { event.preventDefault(); if (button.dataset.page) navigate(button.dataset.page); }));
  $("#createWorkout").addEventListener("click", () => $("#workoutModal").classList.add("open")); $("#goalStart").addEventListener("click", () => startWorkout());
  $("#manualExercise").addEventListener("change", () => { const defaults = { Squats: 12, "Push-ups": 10, Lunges: 10, "Sit-ups": 15, Plank: 30, "Jumping jacks": 20, "High knees": 20, "Mountain climbers": 24 }; $("#manualReps").value = defaults[$("#manualExercise").value] || 12; });
  $$(".quick-exercise").forEach((button) => button.addEventListener("click", () => { $$(".quick-exercise").forEach((item) => item.classList.remove("selected")); button.classList.add("selected"); $("#manualExercise").value = button.dataset.exercise; $("#manualExercise").dispatchEvent(new Event("change")); const item = { "Jumping jacks": { name: "JUMPING JACKS", exercise: "Jumping jacks", reps: 20, sets: 3 }, Squats: { name: "SQUATS", exercise: "Squats", reps: 12, sets: 3 }, "Sit-ups": { name: "SIT-UPS", exercise: "Sit-ups", reps: 15, sets: 3 } }[button.dataset.exercise]; startWorkout(item); $("#workoutModal").classList.remove("open"); }));
  $("#launchWorkout").addEventListener("click", () => { startWorkout({ name: "CUSTOM PROTOCOL", exercise: $("#manualExercise").value, reps: Math.max(1, Math.min(100, Number($("#manualReps").value) || 12)), sets: Math.max(1, Math.min(10, Number($("#manualSets").value) || 3)) }); $("#workoutModal").classList.remove("open"); });
  $$("[data-close]").forEach((button) => button.addEventListener("click", () => $("#workoutModal").classList.remove("open")));
  $("#startBtn").addEventListener("click", () => { if (!workout.active && workout.currentSet >= workout.sets) startWorkout({ exercise: workout.exercise, reps: workout.reps, sets: workout.sets, name: "RESTART" }); else if (!workout.active && workout.currentSet > 0) { workout.active = true; animationController?.playExercise(workout.exercise); updateTelemetry(); } });
  $("#pauseBtn").addEventListener("click", () => { if (!workout.active && !workout.paused) return; workout.paused = !workout.paused; workout.active = !workout.paused; workout.paused ? animationController?.playIdle() : animationController?.playExercise(workout.exercise); $("#pauseBtn").textContent = workout.paused ? "▶ Resume" : "Ⅱ Pause"; updateTelemetry(); });
  $("#skipBtn").addEventListener("click", () => { if (workout.active || workout.paused) finishSet(); }); $("#endBtn").addEventListener("click", () => { workout.active = false; workout.paused = false; animationController?.playIdle(); navigate("dashboard"); toast("Session ended."); });
  $("#rotateLeft").addEventListener("click", () => { rotation -= .35; }); $("#rotateRight").addEventListener("click", () => { rotation += .35; });
  $("#themeToggle").addEventListener("click", () => { document.body.classList.toggle("dark"); state.theme = document.body.classList.contains("dark") ? "dark" : "light"; $(".theme-toggle span:nth-child(2)").textContent = state.theme === "dark" ? "Dark mode" : "Light mode"; persist(); });
}
renderName(); renderMastery(); renderPlaylists("#playlistList"); renderPlaylists("#modalPlaylists", true); renderHistory(); bind(); if (state.theme === "dark") { document.body.classList.add("dark"); $(".theme-toggle span:nth-child(2)").textContent = "Dark mode"; } updateTelemetry();
