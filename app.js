/* StudentHub front-end demo.
   Authentication and data are browser-local only; this is NOT production authentication. */
const $ = (id) => document.getElementById(id);
const STORAGE_USERS = "studenthub_demo_users_v1";
const STORAGE_SESSION = "studenthub_demo_session_v1";
const STORE_PREFIX = "studenthub_demo_data_v1_";

let currentUser = null;
let tasks = [];
let filter = "all";
let searchText = "";
let timer = { focus: 25, break: 5, mode: "focus", remaining: 1500, running: false, interval: null };
let toastTimer = null;

function readUsers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_USERS) || "[]"); } catch { return []; }
}
function userKey(email) { return STORE_PREFIX + email.toLowerCase(); }
function readUserData(email) {
  try { return JSON.parse(localStorage.getItem(userKey(email)) || '{"tasks":[],"focusMinutes":0,"sessions":0,"theme":"light"}'); }
  catch { return { tasks: [], focusMinutes: 0, sessions: 0, theme: "light" }; }
}
function saveData() {
  if (!currentUser) return;
  const data = readUserData(currentUser.email);
  data.tasks = tasks;
  localStorage.setItem(userKey(currentUser.email), JSON.stringify(data));
}
function getData() { return currentUser ? readUserData(currentUser.email) : null; }
function updateData(patch) {
  const data = getData();
  if (!data) return;
  Object.assign(data, patch);
  localStorage.setItem(userKey(currentUser.email), JSON.stringify(data));
}
async function hashPassword(password, salt) {
  const bytes = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey("raw", bytes, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 120000, hash: "SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function showAuthTab(tab) {
  $("loginFormWrap").classList.toggle("hidden", tab !== "login");
  $("registerFormWrap").classList.toggle("hidden", tab !== "register");
  document.querySelectorAll(".auth-tab").forEach(b => b.classList.toggle("active", b.dataset.authTab === tab));
  $("authMessage").textContent = "";
}
document.querySelectorAll("[data-auth-tab]").forEach(b => b.addEventListener("click", () => showAuthTab(b.dataset.authTab)));
document.querySelectorAll("[data-switch]").forEach(b => b.addEventListener("click", () => showAuthTab(b.dataset.switch)));

$("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = $("registerName").value.trim();
  const email = $("registerEmail").value.trim().toLowerCase();
  const password = $("registerPassword").value;
  const users = readUsers();
  if (users.some(u => u.email === email)) { $("authMessage").textContent = "An account with this email already exists in this browser."; return; }
  if (password.length < 6) { $("authMessage").textContent = "Please use at least 6 characters."; return; }
  try {
    const salt = crypto.randomUUID();
    const passwordHash = await hashPassword(password, salt);
    users.push({ name, email, salt, passwordHash });
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    currentUser = { name, email };
    localStorage.setItem(STORAGE_SESSION, email);
    $("registerForm").reset();
    enterApp();
    notify("Your demo account is ready. Welcome!");
  } catch {
    $("authMessage").textContent = "Secure browser crypto is unavailable. Open this site on localhost or HTTPS.";
  }
});
$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;
  const user = readUsers().find(u => u.email === email);
  if (!user) { $("authMessage").textContent = "No local account found. Create an account first."; return; }
  try {
    const candidate = await hashPassword(password, user.salt);
    if (candidate !== user.passwordHash) { $("authMessage").textContent = "That email and password don't match."; return; }
    currentUser = { name: user.name, email: user.email };
    localStorage.setItem(STORAGE_SESSION, email);
    $("loginForm").reset();
    enterApp();
    notify("Welcome back, " + user.name.split(" ")[0] + "!");
  } catch { $("authMessage").textContent = "Could not verify this account in this browser."; }
});

function enterApp() {
  const data = getData();
  tasks = data.tasks || [];
  $("authScreen").classList.add("hidden");
  $("appScreen").classList.remove("hidden");
  $("userName").textContent = currentUser.name.split(" ")[0];
  $("userAvatar").textContent = currentUser.name.trim().charAt(0).toUpperCase();
  document.body.classList.toggle("dark", data.theme === "dark");
  $("themeBtn").textContent = data.theme === "dark" ? "☾" : "☼";
  const today = new Date();
  $("todayPill").textContent = today.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  $("taskDue").value = dateKey(today);
  const hour = today.getHours();
  $("greetingTitle").textContent = (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening") + ", " + currentUser.name.split(" ")[0] + ".";
  renderAll();
  configureTimerFromData();
}
function logout() {
  stopTimer();
  currentUser = null;
  tasks = [];
  localStorage.removeItem(STORAGE_SESSION);
  $("appScreen").classList.add("hidden");
  $("authScreen").classList.remove("hidden");
  showAuthTab("login");
  notify("You have logged out.");
}
$("logoutBtn").addEventListener("click", logout);

function dateKey(date) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function prettyDate(value) {
  if (!value) return "";
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function notify(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function escapeText(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}
function taskMarkup(task, compact = false) {
  const priorityClass = task.priority === "High" ? "high" : task.priority === "Low" ? "low" : "";
  const overdue = !task.done && task.due < dateKey(new Date());
  return `<div class="task-row ${task.done ? "is-done" : ""}">
    <input class="task-check" type="checkbox" data-check="${task.id}" ${task.done ? "checked" : ""} aria-label="Mark ${escapeText(task.title)} complete">
    <div class="task-copy"><div class="task-name">${escapeText(task.title)}</div>
      <div class="task-meta"><span class="category-pill">${escapeText(task.category || "Study")}</span><span class="priority-pill ${priorityClass}">${escapeText(task.priority || "Normal")} priority</span>${overdue ? '<span style="color:#d14d5b">Overdue</span>' : ""}</div>
    </div>
    ${compact ? `<span class="task-date">${task.due === dateKey(new Date()) ? "Today" : prettyDate(task.due)}</span>` : `<button class="task-delete" data-delete="${task.id}" aria-label="Delete task" title="Delete task">×</button>`}
  </div>`;
}
function bindTaskActions(container) {
  container.querySelectorAll("[data-check]").forEach(input => input.addEventListener("change", () => {
    const task = tasks.find(t => String(t.id) === input.dataset.check);
    if (task) { task.done = input.checked; saveData(); renderAll(); }
  }));
  container.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", () => {
    tasks = tasks.filter(t => String(t.id) !== btn.dataset.delete);
    saveData(); renderAll(); notify("Task deleted.");
  }));
}
function renderTaskList(target, list, compact = false) {
  target.innerHTML = list.length ? list.map(t => taskMarkup(t, compact)).join("") : `<div class="empty-state">Nothing here yet.<br>Start with one small task ✦</div>`;
  bindTaskActions(target);
}
function renderAll() {
  const data = getData();
  const done = tasks.filter(t => t.done).length;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $("statTotal").textContent = tasks.length;
  $("statDone").textContent = done;
  $("statDoneHint").textContent = tasks.length ? `${tasks.length - done} still to go` : "Every step counts";
  $("statPercent").textContent = percent + "%";
  $("statMinutes").textContent = data.focusMinutes || 0;
  $("navTaskCount").textContent = tasks.filter(t => !t.done).length;
  $("progressLabel").textContent = `${done} / ${tasks.length}`;
  $("overviewProgressBar").style.width = percent + "%";
  $("progressFoot").textContent = tasks.length ? (percent === 100 ? "You did it! All tasks completed. ✦" : "Keep going — you're making progress.") : "Add a task to start tracking your progress.";
  const today = dateKey(new Date());
  const todayTasks = tasks.filter(t => t.due <= today && !t.done).sort((a,b) => a.due.localeCompare(b.due)).slice(0, 5);
  renderTaskList($("overviewTasks"), todayTasks, true);
  renderFullTasks();
  $("focusTotalMinutes").textContent = data.focusMinutes || 0;
  $("focusTotalSessions").textContent = data.sessions || 0;
  renderTimer();
}
function renderFullTasks() {
  let list = [...tasks].sort((a,b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
  if (filter === "pending") list = list.filter(t => !t.done);
  if (filter === "completed") list = list.filter(t => t.done);
  if (searchText) list = list.filter(t => t.title.toLowerCase().includes(searchText) || (t.category || "").toLowerCase().includes(searchText));
  renderTaskList($("fullTaskList"), list, false);
}
$("taskForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("taskTitle").value.trim();
  if (!title) return;
  tasks.push({ id: Date.now() + Math.random(), title, due: $("taskDue").value, category: $("taskCategory").value, priority: $("taskPriority").value, done: false });
  saveData(); $("taskForm").reset(); $("taskDue").value = dateKey(new Date()); renderAll(); notify("Task added to your list.");
});
document.querySelectorAll("[data-filter]").forEach(btn => btn.addEventListener("click", () => {
  filter = btn.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("active", b === btn));
  renderFullTasks();
}));
$("taskSearch").addEventListener("input", event => { searchText = event.target.value.trim().toLowerCase(); renderFullTasks(); });

function switchView(view) {
  ["overview", "tasks", "focus"].forEach(name => $(name + "View").classList.toggle("hidden", name !== view));
  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  $("breadcrumbCurrent").textContent = view === "overview" ? "Overview" : view === "tasks" ? "My tasks" : "Focus room";
  $("sidebar").classList.remove("open");
}
document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));
document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.go)));
$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const theme = document.body.classList.contains("dark") ? "dark" : "light";
  $("themeBtn").textContent = theme === "dark" ? "☾" : "☼";
  updateData({ theme });
});

/* Focus timer */
function configureTimerFromData() {
  const data = getData();
  timer.focus = Number(data.focusDuration) || 25;
  timer.break = Number(data.breakDuration) || 5;
  $("focusMinutes").value = timer.focus;
  $("breakMinutes").value = timer.break;
  timer.mode = "focus";
  timer.remaining = timer.focus * 60;
  renderTimer();
}
function stopTimer() {
  if (timer.interval) clearInterval(timer.interval);
  timer.interval = null; timer.running = false;
}
function renderTimer() {
  const total = (timer.mode === "focus" ? timer.focus : timer.break) * 60;
  const remain = Math.max(0, timer.remaining);
  const text = `${String(Math.floor(remain / 60)).padStart(2, "0")}:${String(remain % 60).padStart(2, "0")}`;
  const progress = total ? (total - remain) / total * 360 : 0;
  $("miniTimerDisplay").textContent = text;
  $("bigTimerDisplay").textContent = text;
  $("miniTimerRing").style.background = `conic-gradient(var(--primary) ${progress}deg,#efeff8 0deg)`;
  $("bigTimerRing").style.background = `conic-gradient(var(--primary) ${progress}deg,#efeff8 0deg)`;
  const label = timer.mode === "focus" ? "FOCUS SESSION" : "BREAK TIME";
  $("miniTimerLabel").textContent = label;
  $("bigTimerLabel").textContent = label;
  $("miniStartBtn").textContent = timer.running ? "Pause" : "Start focus";
  $("bigStartBtn").textContent = timer.running ? "Pause" : (timer.mode === "break" ? "Start break" : "Start focus");
}
function finishTimer() {
  stopTimer();
  if (timer.mode === "focus") {
    const data = getData();
    updateData({ focusMinutes: (data.focusMinutes || 0) + timer.focus, sessions: (data.sessions || 0) + 1 });
    notify("Focus session complete! Take a well-earned break.");
    timer.mode = "break";
    timer.remaining = timer.break * 60;
  } else {
    notify("Break complete. Ready for another focus session?");
    timer.mode = "focus";
    timer.remaining = timer.focus * 60;
  }
  renderAll();
}
function toggleTimer() {
  if (timer.running) { stopTimer(); renderTimer(); return; }
  if (timer.remaining <= 0) timer.remaining = (timer.mode === "focus" ? timer.focus : timer.break) * 60;
  timer.running = true;
  renderTimer();
  timer.interval = setInterval(() => {
    timer.remaining--;
    if (timer.remaining <= 0) finishTimer();
    else renderTimer();
  }, 1000);
}
function resetTimer() {
  stopTimer();
  timer.mode = "focus";
  timer.remaining = timer.focus * 60;
  renderTimer();
}
$("miniStartBtn").addEventListener("click", toggleTimer);
$("bigStartBtn").addEventListener("click", toggleTimer);
$("miniResetBtn").addEventListener("click", resetTimer);
$("bigResetBtn").addEventListener("click", resetTimer);
$("applyTimerBtn").addEventListener("click", () => {
  const focus = Number($("focusMinutes").value), breakTime = Number($("breakMinutes").value);
  if (!Number.isInteger(focus) || focus < 1 || focus > 180 || !Number.isInteger(breakTime) || breakTime < 1 || breakTime > 60) {
    notify("Focus must be 1–180 minutes and break 1–60 minutes."); return;
  }
  stopTimer();
  timer.focus = focus; timer.break = breakTime; timer.mode = "focus"; timer.remaining = focus * 60;
  updateData({ focusDuration: focus, breakDuration: breakTime });
  renderTimer(); notify("Your timer settings have been updated.");
});

/* Restore the last local demo session on refresh. */
(function restoreSession() {
  const email = localStorage.getItem(STORAGE_SESSION);
  const user = email && readUsers().find(u => u.email === email);
  if (user) { currentUser = { name: user.name, email: user.email }; enterApp(); }
})();
