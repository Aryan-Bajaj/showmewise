// ── Auto documentation prompt (OCR-aware, process-understanding) ──
// Handles BOTH hands-on demonstrations and discussions/meetings: the goal is to
// make the reader understand the process and the reasoning, not just list clicks.
export const SKILL_PROMPT = `You document a screen recording that may be a hands-on demonstration OR a discussion / meeting. You are given the spoken transcript AND the actual on-screen text captured from the screen (OCR).

Your goal is to make a reader UNDERSTAND THE PROCESS — what is being done and WHY — not merely list mouse clicks. Capture the purpose, the reasoning, and the decisions discussed. Use the on-screen text to name the EXACT buttons, menus, tabs, fields, file names and shortcuts, even if no one says them out loud.

Write EXACTLY in this format:

OVERVIEW: [2-3 sentences in plain language: what is happening in this part and its purpose/context, so a newcomer grasps the bigger picture]
STEPS:
1. [If a demonstration: one concrete action, naming the exact on-screen element. If a discussion: one key point, decision, or question raised.]
2. [Next]
3. [Continue — 2 to 6 items]
RESULT: [One sentence — what is achieved, decided, or concluded]

Rules:
- Prioritise understanding: explain the "why" behind the actions and the decisions made in discussion, not only the mechanics.
- Prefer exact names from the on-screen text over vague words.
- Do not invent actions or facts not supported by the transcript or screen.
- If this segment is off-topic small talk, a greeting, or has no real content, reply with EXACTLY:
  OVERVIEW: Off-topic — no documented process in this segment.
  and write nothing else. Never fabricate steps to fill space.
- Keep each step under 20 words.`

// ── Desktop Procedure prompt ──
// Each segment → one followable phase of the procedure (a title + ordered
// actions + result + optional note), exactly the way the trainer demonstrates
// it. Off-topic / silent / small-talk segments return SKIP and are dropped.
export const PROCEDURE_PROMPT = `You are writing part of a professional Desktop Procedure (SOP) from a screen recording, the way the trainer demonstrates it. You receive the spoken transcript AND the on-screen text (OCR) for ONE segment.

If this segment contains real, followable actions (navigating, clicking, configuring, selecting, deciding), output EXACTLY:

TITLE: <short phase title, max 8 words, e.g. "Open the monthly analysis">
STEPS:
1. <one concrete action a reader can follow — name the EXACT menu / button / tab / field / shortcut seen on screen>
2. <next action, in order>
3. <continue: one line per action, EVERY action the speaker describes or the screen shows, in order; a busy part often has 6 to 12>
RESULT: <what the user achieves or sees after these actions; one sentence>
NOTE: <one key observation, tip, or warning — or "-" if none>

If this segment is a greeting, small talk, off-topic chatter, a pause, or has no real action, output EXACTLY:
SKIP

GROUNDING RULES — follow strictly. Inventing ANY detail destroys the document's credibility:
- Describe ONLY what the transcript and on-screen (OCR) text actually support. If you are not sure an action happened, leave it out.
- Name an application, window, menu, button, tab, or field ONLY if that exact name appears in the on-screen text. If you cannot identify the exact name, describe the action generically ("open the report", "select the field", "expand the row") — do NOT guess a label.
- NEVER assume which software it is. Do NOT write "Excel", "Power BI", "Word", "Power Query", "Power Pivot", etc. unless that exact name is on screen. Different tools look alike; naming the wrong one makes the whole step wrong.
- NEVER invent a tool, feature, dialog, ribbon, or button that is not on screen (for example: do NOT invent "AI Comparison tool", "Get Data", "Data Validation", "Change Column Type", "Query Designer" unless you can read it).
- NEVER use a person's name (a meeting participant, a name shown beside a webcam tile) as a field value, query, search term, file name, or data entry. Those are people on the call, not procedure data.
- Write imperative, followable steps in the order they happen: "Go to the Analysis tab", "Click Reports", "Select the monthly query".
- Steps done OUTSIDE the app that the speaker names as part of the process ARE steps: asking a colleague or team for a value, getting an approval or a confirmation, waiting for a reply. Write them as actions ("Ask the finance team for the final number", "Get confirmation from the business owner").
- Prefer the SPECIFIC action over generic navigation. If a setting is changed, a value typed, a dimension/field added, an option toggled, or an item configured, THAT is the step — capture it concretely (e.g. "Set Row Height to Compact", "Add the Region dimension to Rows", "Swap the axes", "Set the table type to Pivot"). Do NOT reduce real configuration work to a vague "open" or "navigate to" a screen when an actual change is being made.
- People talk casually while they work — vague speech ("yeah", "let me see", "that should be fine") does NOT mean nothing happened. If the on-screen evidence shows a concrete UI state or change (an open dialog, a menu, a selection, a value), document THAT. Vague talk + clear screen = document the screen.
- STATE vs ACTION: write "Click/Open/Select X" ONLY when that action is evidenced (spoken, or the screen shows it happening). If the screen simply SHOWS a view that is already open, phrase the step from the state: "On the X view, review/configure …" — never fabricate the click that got there.
- A transient system message that just pops up (session expired, unsaved-changes warning, autosave popup) is NOT a procedure step; if relevant, mention it in NOTE. But the RESULT of the user's own action (the message list after Execute or Save, a success or an error) IS part of the procedure: write "Check the messages" and, when it is said or shown, what a good and a bad result look like.
- [Previous] and [Next] are context only. Never write an action that belongs to them (the same field filled, the same code entered). If this segment only CONTINUES an action already covered in [Previous] and shows nothing new, output SKIP.
- IGNORE meeting and audio/video logistics — they are talk ABOUT the call, never steps of the procedure. This includes (not an exhaustive list): muting / unmuting and mic checks ("you're muted", "mute yourself", "can you hear me"), screen-share coordination ("can you see my screen", "let me share", "are you seeing this"), connection problems ("you're breaking up", "I lost you", "your video froze"), camera talk, greetings, goodbyes, scheduling, recording reminders, and any small talk. Never turn "how to mute" or "how to share your screen" into a documented step. If a segment is only this kind of talk, output SKIP.
- Output SKIP only when BOTH the narration AND the screen evidence give too little for a real action. A short, accurate procedure is better than an invented one — but a missing step someone needed is just as bad as an invented one.`

// Appended to the prompt when a screenshot is sent to a vision model, so it
// behaves like a human: listens AND looks, and resolves vague spoken references.
export const VISION_ADDENDUM = `

You are ALSO given SCREENSHOTS of this part, in time order (first to last): together they show what the user did, so describe the actions in that order. Use BOTH the spoken transcript AND the screen together, like a person watching the recording:
- Focus ONLY on the shared application window. IGNORE the small webcam / video-call tiles and the people's names listed beside them — they are NOT part of the procedure and must NEVER be used as data, values, names, or search terms in a step.
- Meeting recordings BURN the current speaker's name into a corner of every frame as a caption like "Lastname, Firstname (ORG-UNIT, CODE)". That caption is a PERSON on the call, not screen content — NEVER read it as a file, report, dashboard, page, table, or view name.
- Identify the application ONLY from what is actually visible (title bar, tab labels, the URL in the address bar, menu names). State its name only if you can read it. Do NOT assume it is Excel, Power BI, Word, or any specific product unless its name is on screen.
- Name views/windows by READING their visible title. If the window header says "Report Builder" or the page heading says "Monthly Overview", use exactly that — never substitute a product or module name you know from elsewhere (e.g. do NOT call it "Data Warehouse" because the domain sounds like it).
- The screenshot is evidence of EQUAL weight to the transcript. In a working session people mostly talk vaguely while doing concrete things — when the speech says little but the screen clearly shows an open dialog, menu, panel, or configuration in progress, document what the SCREEN shows and name the visible elements.
- When the speaker says vague words like "here", "this", "that" or "click there", LOOK at the screen to find the EXACT button, menu, tab, or field, and name it.
- Only state UI text you can actually READ on screen. Do NOT guess or invent labels, menus, dialogs, or tools you cannot clearly see.
- If EVERY screenshot shows only a webcam, a photo, a desktop, or no real application screen, reply SKIP.
- If the screen shows a loading/waiting state (a spinner, progress bar, "Loading your story", "Please wait", a splash screen) with no user action visible, reply SKIP — the user did not DO anything during a loading screen.`

// ── Constrained JSON output ──
// JSON schema for one procedure step. Passed to engines that support constrained
// decoding (Ollama `format`, llama-server `response_format`, WebLLM `schema`) so
// the sampler CANNOT produce malformed output — no chatty preamble, no missing
// fields, no format drift. The old TITLE:/STEPS: text parsing stays as fallback
// for engines or models where the schema isn't honoured.
// "screen" comes FIRST on purpose: filling it forces the model to OBSERVE the
// screenshot/OCR before deciding skip — without it, small models anchor on the
// (usually vague) meeting chatter and skip windows where the screen clearly
// shows real work. Proven on gemma3:4b: same vague transcript flipped from
// skip:true to a correct documented step once "screen" led the object.
export const STEP_JSON_SCHEMA = {
  type: "object",
  properties: {
    screen: { type: "string" },
    skip: { type: "boolean" },
    title: { type: "string" },
    // room for every action of a busy part: a cap of 6 made the engine cram four
    // clicks into one line and drop the rest
    steps: { type: "array", items: { type: "string" }, maxItems: 14 },
    result: { type: "string" },
    note: { type: "string" },
  },
  required: ["screen", "skip", "title", "steps", "result", "note"],
}

// ── Speech (transcript) activity boundaries — the EARS of segmentation ──
// One cheap LLM call over the whole timestamped transcript proposes where a NEW
// distinct activity starts. These are HINTS, unioned with the pixel scene cuts
// (the eyes); the min/max window rules keep over-splitting disciplined. This is
// what splits "set the row height… and now add the dimension" into two steps
// even when the screen barely changes between them.
export const SEGMENT_SCHEMA = {
  type: "object",
  properties: { boundaries: { type: "array", items: { type: "number" } } },
  required: ["boundaries"],
}

export const SEGMENT_PROMPT = `You are given the timestamped transcript of a screen-recording work session. Find where a NEW distinct activity starts — the speaker moves on to a different task, screen, or configuration topic ("okay, now let's…", "next I want to…", a new subject after a pause).

Reply with a SINGLE JSON object: {"boundaries": [<start time in SECONDS of each new activity>]}
- Convert the [mm:ss] marks to seconds (for example [05:20] is 320).
- Only real activity changes. Casual chatter, small talk, or continuing the same task is NOT a boundary.
- Typical: one boundary every 1 to 3 minutes of active work. Never more than 30 boundaries.
- If the whole transcript is one continuous activity, reply {"boundaries": []}.`

// Appended LAST to the system prompt when constrained decoding is active, so the
// model knows the output contract matches the grammar the sampler enforces.
export const JSON_ADDENDUM = `

OUTPUT FORMAT — reply with a SINGLE JSON object and nothing else. Work in TWO stages:
STAGE 1 — fill "screen" with what the screenshot / on-screen text concretely shows: which window, dialog, panel, or menu is open and what is selected or configured. Only what you can actually see.
STAGE 2 — THEN decide. If the screen shows a concrete UI state or an action in progress (an open dialog, a selection, a configuration), document it as a step — even if the speech around it is vague chatter; people talk casually while doing concrete work. Set "skip": true ONLY if the screen shows no real application activity AND the speech contains no action.
{"screen": "<what is visibly happening on screen>", "skip": false, "title": "<short phase title, max 8 words>", "steps": ["<action 1>", "<action 2>"], "result": "<one sentence>", "note": "<one tip/warning, or empty string>"}
If there is truly no followable action (small talk only, webcam-only, pause), reply:
{"screen": "<what is shown>", "skip": true, "title": "", "steps": [], "result": "", "note": ""}`

// Tidy a step line: drop leading discourse markers, first-person speech and filler
// so verbatim narration ("Let me move this table just a little bit…") reads like a
// clean imperative instruction. Conservative — it never changes the actual action.
function tidyLine(s) {
  if (typeof s !== "string") return s
  let out = s
    .replace(/^\s*(okay|ok|so|now|then|alright|well|um+|uh+|yeah)[,!.\s]+/i, "")
    .replace(/\b(let me|i'?ll|i will|i'?m going to|i am going to|we'?ll|we will|we'?re going to|let'?s)\s+/gi, "")
    .replace(/\b(just|a little bit|a bit|kind of|sort of|you know|basically|actually|maybe)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim()
  return out ? out[0].toUpperCase() + out.slice(1) : out
}

// A NOTE that just narrates what the step already does ("This step opens the
// dashboard", "The user is navigating…") adds nothing for the reader and clutters
// Key Observations. Drop these so only genuine tips / warnings / insights remain.
export function isFillerNote(note) {
  const n = (note || "").trim()
  if (!n) return true
  if (n.split(/\s+/).length < 3) return true
  return /^(this (step|action|process|part|view|screen)|the (initial|primary|first|main|next|final) (action|step)|the user (is|then|will|now|has|navigates)|the (speaker|trainer|presenter|instructor) (is|was|then)|it (then |simply |essentially )?(initiates|expands|confirms|establishes|focuses|opens|navigates|displays|shows|allows|enables|begins|starts))\b/i.test(n)
}

// Remove the model's self-referential meta-commentary that sometimes leaks into a
// step (e.g. a trailing "(Note: The draft step does not invent…)"). Keeps real text.
function stripMeta(s) {
  if (typeof s !== "string") return s
  return s
    .replace(/\([^()]*\b(?:draft step|corrected step|revised step|the evidence|OCR text|on-screen text)\b[^()]*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// OCR sometimes misreads a technical ID half-right ("AB_CD_EFownerDashboard_GH")
// and the model copies it into a step or result verbatim. A half-garbled ID is
// worse than none — the reader can't use it and it looks broken.
// Three patterns cover the range of enterprise technical identifiers seen in the wild:
//   1. 3-part+ chains at >=12 chars (AB_Measure_CT=13, AB_CD_EF=8 but AB_CD_EF_GH=11<12 → caught by rule 2)
//   2. All-caps abbreviation chains like AB_CD_EF_GH — 4-part but only 11 chars
//   3. CamelCase compound + 2-3 char system suffix like AbcTrackerDashboard_GH (1 underscore, missed by rule 1)
// Short real codes like "AB_CD" (5 chars, rule 2 threshold=6) survive.
function stripGarbledIds(s) {
  if (typeof s !== "string") return s
  return s
    .replace(/\b[A-Za-z0-9]+(?:_[A-Za-z0-9]+){2,}\b/g, (m) => (m.length >= 12 ? "" : m))
    .replace(/\b[A-Z]{1,4}(?:_[A-Z0-9]{1,4}){1,}\b/g, (m) => (m.length >= 6 ? "" : m))
    .replace(/\b[A-Za-z]{4,}[A-Za-z0-9]*_[A-Z]{2,3}\b/g, "")
    .replace(/\b[A-Z]{2,}\d{5,}[A-Z0-9]*\b/g, "")  // table/object IDs like ACM000001234X
    .replace(/["'(]\s*["')]/g, "")   // empty quotes/parens left behind
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim()
}

// Clean one field through the full pipeline (meta commentary, garbled IDs).
function cleanField(s) { return stripMeta(stripGarbledIds(typeof s === "string" ? s : "")) }

// An action must actually SAY something. After cleanup, a dangling verb with an
// empty target ("Click on ''", "Select the") is worse than no action at all.
function isRealAction(s) {
  if (typeof s !== "string") return false
  const t = s.replace(/[''""'"]+/g, "").trim() // drop straight AND curly quotes
  if (t.length <= 2) return false
  if (/^(click|select|open|choose|press|tap|go to|navigate to)( on| the| a| to)?[\s.:]*$/i.test(t)) return false
  return true
}

// JSON-first parse: with constrained decoding the reply IS this object. Returns
// null (not skip) when no JSON is found so the text parser can try instead.
function tryParseStepJSON(t) {
  const m = t.match(/\{[\s\S]*\}/)
  if (!m) return null
  let o
  try { o = JSON.parse(m[0]) } catch { return null }
  if (!o || typeof o !== "object" || Array.isArray(o)) return null
  if (!("skip" in o) && !("title" in o) && !("steps" in o)) return null
  if (o.skip === true) return { skip: true }
  const steps = (Array.isArray(o.steps) ? o.steps : [])
    .filter((s) => typeof s === "string")
    .map((s) => s.replace(/^\s*\d+[.\)]\s*/, "")) // model sometimes numbers inside the JSON strings too
    .map((s) => tidyLine(cleanField(s)))
    .filter(isRealAction)
  const title = cleanField(o.title).replace(/["'.]+$/, "").trim()
  const result = cleanField(o.result)
  let note = cleanField(o.note)
  if (note.length < 3 || /^(none|n\/a|na|-)$/i.test(note) || isFillerNote(note)) note = ""
  if (!steps.length && !title) return { skip: true }
  return { skip: false, title, steps, result, note }
}

// Parse a procedure-step reply → { skip } or { title, steps[], result, note }.
export function parseProcedureStep(text) {
  if (!text) return { skip: true }
  const t = text.trim()
  const fromJSON = tryParseStepJSON(t)
  if (fromJSON) return fromJSON
  if (/^SKIP\b/i.test(t) && t.length < 24) return { skip: true }
  const title = (t.match(/TITLE:\s*(.+)/i)?.[1] || '').trim()
  const stepsBlock = t.match(/STEPS?:\s*([\s\S]*?)(?=\n\s*RESULT:|\n\s*NOTE:|$)/i)?.[1] || ''
  const steps = stepsBlock
    .split('\n')
    .map((l) => l.replace(/^[\d\-\*•]+[.\):\s]+/, '').trim())
    .filter((l) => l.length > 2)
  const result = cleanField((t.match(/RESULT:\s*([\s\S]*?)(?=\n\s*NOTE:|$)/i)?.[1] || '').trim())
  let note = cleanField((t.match(/NOTE:\s*([\s\S]*)$/i)?.[1] || '').trim())
  note = note.replace(/^[\s\-–—•:]+/, '').trim()              // strip leading dash/bullet ("– This opens…")
  // Drop notes that are just the model explaining its own corrections (verifier bloat).
  if (/\b(the )?(draft|corrected|revised|above) (step|note)\b|\bthe evidence (does|provided)\b|\bOCR text\b/i.test(note)) note = ''
  if (note.length < 3 || /^(none|n\/a|na)$/i.test(note) || /^[-–—.\s]*$/.test(note)) note = '' // drop empty / dash-only
  if (isFillerNote(note)) note = '' // drop content-free narration of the step itself
  if (!steps.length && !title) return { skip: true }
  return { skip: false, title: stripGarbledIds(title), steps: steps.map((s) => tidyLine(cleanField(s))).filter(isRealAction), result, note }
}

// ── Noise gate ──
// Heuristic: is this segment ONLY meeting / audio-video logistics or small talk,
// with no actual procedure in it? Used to drop obvious noise BEFORE it reaches
// the model (saves a call and stops chatter like "mute yourself" or "can you see
// my screen" from becoming steps). Deliberately conservative: it never fires when
// a concrete action verb is present, and the caller additionally requires the
// on-screen text to be empty — so a window that shows real work is never dropped.
const NOISE_PATTERNS = [
  /\b(un)?mute(d)?\b/i, /\bcan you hear me\b/i, /\bi (can'?t|cannot) hear\b/i, /\byou'?re breaking up\b/i,
  /\bcan you see my screen\b/i, /\bsee(ing)? my screen\b/i, /\bshar(e|ing) (my |your )?screen\b/i,
  /\bare you (seeing|there|with me)\b/i, /\byour (video|audio|mic|microphone|camera) (is|seems|froze|cut)\b/i,
  /\b(hello|hi|hey)\b[^.?!]*\b(everyone|guys|team|all)\b/i, /\b(goodbye|bye|see you|talk soon|thanks for joining)\b/i,
  /\b(the )?recording (is|has) (started|begun|on)\b/i, /\blost you\b/i, /\bcan you (still )?(hear|see) me\b/i,
  /\blet me share\b/i, /\bone (sec|second|moment)\b/i,
]
const ACTION_VERBS = /\b(click|open|select|choose|navigate|go to|type|enter|set|create|add|remove|delete|drag|drop|expand|collapse|configure|run|execute|save|export|import|filter|sort|right[- ]?click|double[- ]?click|press|insert|move|rename|copy|paste|apply|refresh|load|build|edit|format|group|sum)\b/i

// ── Sensitive-word scrub ──
// Whisper sometimes MIS-hears words and produces alarming output (e.g. "Hitler"
// for "he, there"). In a professional document — especially for users in Germany
// — that is a reputational/legal risk. We replace these with "[unclear]" at the
// transcript level, so it can never reach the steps, summary, FAQ or export.
// These words are essentially always ASR errors in a business screen-recording.
const SENSITIVE_RE = /\b(hitler|nazis?|heil\s+hitler|f[uü]hrer|third\s+reich|holocaust|gestapo|swastika)\b/gi
export function scrubSensitive(text) {
  if (typeof text !== "string") return text
  return text.replace(SENSITIVE_RE, "[unclear]")
}

export function isMeetingNoise(text) {
  const t = (text || "").trim()
  if (!t) return false                   // no narration → let the OCR/screen path decide
  if (t.length > 240) return false        // long segments almost always carry real content
  if (ACTION_VERBS.test(t)) return false  // any concrete action → not pure noise
  return NOISE_PATTERNS.some((re) => re.test(t))
}

// Does the narration contain a concrete, followable action? Used by the recall
// guard: a skipped window where someone SAID "click / open / configure…" is far
// more likely a model miss than true noise.
export function hasActionWords(text) { return ACTION_VERBS.test(text || "") }

// ── Screenless-frame guard ──
// The first minutes of a meeting are usually WEBCAM only — the shared screen has
// not started. A small vision model looks at a person's virtual background and
// confabulates a UI ("The dashboard view opens, displaying an outdoor
// scene"). The prompt tells it to SKIP a webcam, but gemma3:4b doesn't obey.
// This is a deterministic backstop: a frame whose OCR carries NO real UI text —
// only the burned-in speaker-name captions, or nothing — is not an application
// screen, so any step built from it is fabricated. Used together with a tiny-OCR
// gate so a real (text-dense) screen with a failed OCR pass is never dropped.
const UI_VOCAB_RE = /\b(file|edit|view|insert|tools|format|home|tab|menu|ribbon|toolbar|http|https|www|report|table|dashboard|builder|styling|filter|column|row|search|save|analysis|analytics|story|page|panel|dialog|source|measure|dimension|cell|sheet|folder|settings|export|refresh|story|widget|chart|grid)\b/i
export function isScreenlessFrame(ocrText, participants = []) {
  let t = (ocrText || "").trim()
  if (!t) return true                       // nothing readable → webcam / photo / desktop
  if (UI_VOCAB_RE.test(t)) return false     // any real UI word → it IS an app screen
  // Strip burned-in speaker captions: "Lastname, Firstname (ORG-UNIT, CODE)".
  t = t.replace(/[A-Z][\w''.-]+,\s*[A-Z][\w''.-]+(?:\s+[A-Z][\w''.-]+)*\s*(?:\([^)]*\))?/g, " ")
  for (const p of participants || []) {
    if (!p) continue
    for (const part of String(p).split(/[\s,()]+/)) {
      if (part.length >= 3) t = t.replace(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ")
    }
  }
  // What real alphabetic text survives after removing names?
  const leftover = (t.match(/[A-Za-z]{3,}/g) || []).join("")
  return leftover.length < 12
}

// ── Evidence grounding (anti-confabulation) ──
// The single biggest failure of a small local vision model: when it cannot READ a
// dense enterprise UI, it invents a plausible business domain. On a cost-centre
// finance screen it writes "Inventory Tag Cluster", "Sales Report Builder",
// "Revenue Warehouse", "Global Sales" — none of which are on screen. These are
// grammatically clean, so no format/filler rule catches them, and self-verify
// (same blind model) rubber-stamps them.
// The fix is to GROUND each step in the actual evidence: the frame's OCR text and
// the spoken transcript. A domain noun the model claims to see, that appears in
// NEITHER the OCR nor the speech, is a fabrication — we strip that word so the
// step keeps its true remainder ("Sales Report Builder" → "Report Builder") and
// never asserts something false. Only runs when there IS enough OCR evidence to
// judge against, so a real screen with a weak OCR pass is never touched.
// Deliberately narrow: only well-known confabulated ERP/business domains are
// scrutinised; every real cost/finance term (cost, budget, supplier,
// fiscal, salary…) is left alone, and even these are kept when the evidence
// actually contains them.
const CONFABULATED_DOMAINS = [
  "inventory", "sales", "revenue", "procurement", "shipment", "shipping",
  "logistics", "manufacturing", "warehouse", "retail", "marketing",
  "ecommerce", "e-commerce", "delivery",
]
function evidenceHas(evidence, word) {
  const w = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`\\b${w}`, "i").test(evidence) // prefix match → catches sales/sale, ship/shipment
}
function stripWord(text, word) {
  if (!text) return text
  const w = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return text
    .replace(new RegExp(`\\b${w}(?:'?s)?\\b`, "gi"), "")
    .replace(/['"]\s+/g, m => m.trim() + " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\(\s*\)|''|""/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
// Returns { step, drop, changed }. `drop` true when the step's TITLE was built on
// a fabricated domain and nothing meaningful survives stripping it.
export function groundStepInEvidence(step, ocrText, transcript) {
  if (!step || step.skip) return { step, drop: false, changed: false }
  const evidence = `${ocrText || ""} ${transcript || ""}`.toLowerCase()
  const evidenceLen = evidence.replace(/[^a-z0-9]/g, "").length
  if (evidenceLen < 40) return { step, drop: false, changed: false } // too little to judge → leave alone

  // Which confabulated domains are asserted by the step but ABSENT from evidence?
  const fields = [step.title || "", ...(step.steps || []), step.result || "", step.note || ""].join(" ").toLowerCase()
  const fabricated = CONFABULATED_DOMAINS.filter((d) => new RegExp(`\\b${d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(fields) && !evidenceHas(evidence, d))
  if (!fabricated.length) return { step, drop: false, changed: false }

  const out = { title: step.title, steps: [...(step.steps || [])], result: step.result, note: step.note }
  const titleHadFab = fabricated.some((d) => new RegExp(`\\b${d}`, "i").test(out.title || ""))
  for (const d of fabricated) {
    out.title = stripWord(out.title, d)
    out.steps = out.steps.map((s) => stripWord(s, d))
    out.result = stripWord(out.result, d)
    out.note = stripWord(out.note, d)
  }
  out.steps = out.steps.filter((s) => isRealAction(s))
  // A real action DID happen at this timestamp — the model just mislabelled it.
  // We never DROP for a fabricated domain word: a missing step loses genuine work
  // (confirmed on this recording — dropping wiped the Data-Analyzer and row-height
  // demos). We strip the false word and, if that hollows the title, fall back to a
  // truthful generic title built from the surviving action, so coverage is kept
  // while the false claim is removed. The step is flagged low-confidence upstream.
  const titleCore = (out.title || "").replace(/^(open|view|review|access|navigate to|go to|select|click|configure|set)\b/i, "").replace(/\b(view|page|dialog|window|tab|panel|section)\b/gi, "").trim()
  if (titleHadFab && titleCore.replace(/[^a-z]/gi, "").length < 3) {
    const firstAction = (out.steps[0] || "").replace(/[.'"]+$/, "").trim()
    out.title = firstAction ? firstAction.slice(0, 60) : (out.title || "Review the current view").trim()
  }
  return { step: { ...step, ...out }, drop: false, changed: true }
}

// ── Transcript noise scrub ──
// Sentence-level cleaning applied BEFORE the transcript reaches any prompt.
// Meeting chatter ("can you see my screen"), greetings, non-speech markers and
// Whisper's repetition hallucinations ("Thank you. Thank you. Thank you.") waste
// context and invite fabricated steps. Conservative on purpose: a sentence with
// a real action verb, or any longer sentence, always survives — only short,
// unmistakable chatter is dropped.
export function cleanTranscriptText(text) {
  if (!text) return ""
  const parts = text.split(/(?<=[.?!])\s+/)
  const out = []
  let prevNorm = ""
  for (const p of parts) {
    const s = p.trim()
    if (!s) continue
    const norm = s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim()
    if (norm && norm === prevNorm) continue            // consecutive repeat → ASR hallucination
    prevNorm = norm
    if (/^\[[^\]]*\]$|^\([^)]*\)$/.test(s)) continue   // [music], (laughs), [inaudible]
    if (/^(um+|uh+|hmm+|mm-?hmm|okay|ok|yeah|yes|no|right|so|thank you|thanks)[.!?]?$/i.test(norm)) continue
    if (!ACTION_VERBS.test(s) && s.split(/\s+/).length <= 12 && NOISE_PATTERNS.some((re) => re.test(s))) continue
    out.push(s)
  }
  return out.join(" ")
}

// ── Recall guard (second look) ──
// Appended to the system prompt when re-running a window the model skipped even
// though the evidence looked real. Counters the skip-happy bias the strict
// grounding rules create — a short accurate doc is good, a doc with a missing
// step someone needed is not.
export const RECALL_ADDENDUM = `

SECOND LOOK: this segment was flagged as likely containing a real action (action words were spoken, or the screen shows a busy application). Re-examine the evidence carefully — especially the SCREENSHOT: an open dialog, menu, panel, or selection on screen is a documentable action even if the speech around it is vague. Only reply with "skip": true if you are CERTAIN no followable action happened; otherwise document the action you find, however small.`

// ── Intelligent app identification (no hardcoded app list) ──
// One LLM pass looks at the actual screen (the richest OCR text + a screenshot)
// and NAMES the application itself — works for ANY app/website, nothing hardcoded.
// The result is injected into every annotation prompt so the model never guesses
// the software per-segment (the root cause of "In Excel…" when it's really a different product).
export const IDENTIFY_APP_PROMPT = `You are shown the on-screen text (OCR), and possibly a screenshot, of a software application or website.

Identify the application. Use strong signals: the URL in the address bar, the browser tab / window title, product names, distinctive menus and layout.

Reply with ONLY the product name on a single line — for example: "Microsoft Excel", "Figma", "Salesforce", "Tableau". Do not explain. If you genuinely cannot tell, reply exactly: Unknown`

// Clean the identifier's reply into a usable app name (or "" if unknown).
export function parseAppName(text) {
  let s = (text || "").split("\n")[0].replace(/^[^A-Za-z0-9]+/, "").trim()
  s = s.replace(/^(the )?(application|app|software|website|tool|product)\s+(is|shown|here)?:?\s*/i, "").trim()
  s = s.replace(/["'.]+$/, "").trim()
  if (!s || /^unknown$/i.test(s) || s.length > 48) return ""
  return s
}

// Prepended to the system prompt so EVERY window is anchored to the real app —
// the model can no longer guess the software per-segment.
export function appContextPrefix(appName) {
  return appName
    ? `CONTEXT — READ FIRST: The application in this entire recording is **${appName}**. EVERY step is inside ${appName}. Refer to it ONLY as "${appName}". You must NOT name any other product — not Salesforce, Excel, Power BI, Word, Tableau, etc. — unless that exact name literally appears in the on-screen text of THIS segment. Guessing a different app is a serious error.\n\n`
    : ""
}

// ── Logistics / non-procedure step filter ──
// Even when a screen is visible, the model sometimes turns meeting logistics
// ("Mute Microsoft Teams Call") or webcam name tiles ("Access Alvarez Profile",
// "Spot Meeting Attendees", "Find Winters's Finance Info") into steps. These are
// never part of the documented procedure — drop them after the fact.
const LOGISTICS_TITLE = /\b(mute|unmute|microphone|teams call|zoom call|video call|voice call|(view|join)(ing)? (the |a )?(call|meeting)|webcam|camera|meeting attendees?|participants?|spot (meeting )?attendees|share (your |the )?screen)\b/i
const PERSON_STEP = /^(access|open|find|locate|spot|view|select|identify)\s+[A-Z][a-z]+('s)?\s+(profile|finance|info|information|details|entry|name)/i
export function isLogisticsStep(step) {
  if (!step) return false
  const t = (step.title || "").trim()
  if (!t) return false
  if (LOGISTICS_TITLE.test(t)) return true
  if (PERSON_STEP.test(t)) return true
  return false
}

// ── Participant-name leak guard ──
// Teams burns the speaker's name into every frame (webcam tiles + a caption in
// the corner). Small vision models keep reading it as an artifact name no matter
// what the prompt says ("Winters Alvarez, Jamie Lee" → "Open Wintors Alvares
// Page"). These helpers detect and DETERMINISTICALLY remove such leaks — with
// one letter of OCR/ASR drift allowed ("Winters"→"Wintors", "Alvarez"→"Alvares").
export function editDistanceLe1(a, b) {
  if (a === b) return true
  const la = a.length, lb = b.length
  if (Math.abs(la - lb) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (la > lb) i++
    else if (lb > la) j++
    else { i++; j++ }
  }
  return edits + (la - i) + (lb - j) <= 1
}
// Exact token match works in any case; the one-letter FUZZY match only fires on
// Capitalized words. Leaked names are proper nouns ("Wintors Alvares Page") —
// without the caps rule, ordinary words collide ("winter view" ~ "Winters").
function matchesParticipantWord(w, participants) {
  const lw = w.toLowerCase()
  const cap = /^[A-Z]/.test(w)
  for (const p of participants) {
    const lp = p.toLowerCase()
    if (lw === lp) return true
    if (cap && w.length >= 4 && editDistanceLe1(lw, lp)) return true
  }
  return false
}
export function resemblesParticipant(text, participants) {
  if (!participants?.length || !text) return false
  const words = text.match(/[A-Za-z]{3,}/g) || []
  for (const w of words) if (matchesParticipantWord(w, participants)) return true
  return false
}

// Strip participant-resembling words from one text, then tidy the debris
// (doubled spaces, empty quotes, dangling "of/the/for", stray commas/dashes).
// "Open the 'Winters Alvarez Jamie' dashboard" → "Open the dashboard".
export function scrubParticipantText(text, participants) {
  if (!text || !participants?.length) return text
  let out = text.replace(/[A-Za-z]{3,}/g, (w) => (matchesParticipantWord(w, participants) ? "" : w))
  out = out
    .replace(/\(\s*[A-Z]{2,8}([\s,–-]+[A-Z]{2,8}){0,3}\s*\)/g, "") // Teams org-code parens "(AC-NYC, ACME)"
    .replace(/\(\s*\)/g, "") // emptied parens
    .replace(/\s*[-–—]\s*(?=["'‘’“”.,)]|$)/g, "") // dash left dangling before a quote/stop
    .replace(/(^|\s)(["'‘“])\s+/g, "$1$2") // space stuck after an OPENING quote
    .replace(/\s+(["'’”])(?=[\s.,)]|$)/g, "$1") // space stuck before a CLOSING quote
    .replace(/["'‘’“”]{2}/g, "") // emptied quote pairs
    .replace(/\s*,\s*(?=[.,)]|$)/g, "") // stray comma
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,)])/g, "$1")
    .replace(/\b(the|a|an|of|for|to|on|in)\s+(the|a|an)\b/gi, "$2")
    .trim()
  // A removed name often leaves a sentence hanging on filler ("Expand the row
  // for", "The dashboard is titled.") — peel those from the end.
  let prev
  do {
    prev = out
    out = out.replace(/[\s]+(the|a|an|of|for|to|on|in|with|from|is|are|was|were|titled|named|called)[.!?]?$/i, "").trim()
  } while (out !== prev)
  return out
}

// Scrub a whole parsed step in place. Returns true if the step still carries
// real content afterwards; false means it collapsed to nothing (caller drops it).
export function scrubParticipantStep(step, participants) {
  if (!step || !participants?.length) return true
  if (resemblesParticipant(step.title, participants)) step.title = scrubParticipantText(step.title, participants)
  if (Array.isArray(step.steps)) {
    step.steps = step.steps
      .map((s) => (resemblesParticipant(s, participants) ? scrubParticipantText(s, participants) : s))
      .filter((s) => (s.match(/[A-Za-z]{3,}/g) || []).length >= 2) // an action needs at least a verb + object
  }
  if (step.result && resemblesParticipant(step.result, participants)) {
    const r = scrubParticipantText(step.result, participants)
    step.result = (r.match(/[A-Za-z]{3,}/g) || []).length >= 3 ? r : ""
  }
  if (step.note && resemblesParticipant(step.note, participants)) {
    const n = scrubParticipantText(step.note, participants)
    step.note = (n.match(/[A-Za-z]{3,}/g) || []).length >= 3 ? n : ""
  }
  const titleWords = (step.title?.match(/[A-Za-z]{3,}/g) || []).length
  return titleWords >= 2 || (step.steps?.length ?? 0) > 0
}

// ── Self-verify pass ──
// A drafted step is re-checked against the SAME evidence (transcript + on-screen
// OCR text + screenshot). The model acts as a strict fact-checker: it removes or
// corrects anything the evidence does not support, then re-emits the step in the
// same format (or SKIP if nothing real survives). This is the single biggest
// guard against the model inventing apps, buttons, tools, or values.
export const VERIFY_PROMPT = `You are a strict fact-checker for procedure documentation. You are given a DRAFT step and the EVIDENCE it must be based on (the spoken transcript, the on-screen OCR text, and possibly a screenshot of that moment).

Correct the draft so EVERY claim is supported by the evidence:
- Remove or rewrite any action, application name, menu, button, tab, field, value, dialog, or tool that is NOT present in the evidence.
- CHECK EVERY NAME: for each window, view, tab, row, or query the draft names, find that exact name in the screenshot or OCR text. Not findable → replace it with the name that IS visible (read the window/page title) or a generic phrase. Small models often substitute a plausible module name ("Data Warehouse Query") for what the screen really shows ("Report Builder") — this is the #1 error to catch.
- If the draft names software (e.g. "Excel", "Power BI", "Power Query") that the evidence does not actually show, remove that name or replace it with a generic phrase ("the application", "the report").
- Remove any step that uses a person's name as a value/search term, or that invents a feature/dialog not in the evidence.
- UNVERIFIABLE PROPER NAMES: if the draft names a specific report, table, view, or file ("Wintors Alvares Report") and that exact name is NOT findable in the evidence, do not keep it — replace it with the generic kind ("the report", "the data table"). A wrong proper name is worse than a generic one; transcription mishears names and the reader will search for something that does not exist.
- Keep the wording concrete and followable, and keep the original order. Do NOT add new actions that are not in the evidence.

Output the corrected step in EXACTLY this format:
TITLE: <short title, max 8 words>
STEPS:
1. <supported action>
2. <next, if any>
RESULT: <one sentence>
NOTE: <one tip/warning, or "-">

Output ONLY the clean corrected step. Do NOT explain what you changed, do NOT add commentary,
and NEVER mention "the draft", "the evidence", "the OCR text", "the corrected step", or what was
removed — the reader only wants the final, usable step.

If, after removing everything unsupported, no real followable action remains, output EXACTLY:
SKIP`

// Assemble the fact-checker's user message: the evidence first, then the draft.
// `people` are participant names harvested from the webcam tiles — any of them
// (or anything resembling them) appearing as an artifact name is a known error.
export function buildVerifyPrompt(draft, evidence, people = []) {
  const peopleBlock = people.length
    ? `PEOPLE ON THE CALL (participants, NOT part of the software): ${people.join(", ")}.
If the draft uses any of these names — or a close mishearing of one — as a report, table, view, file, or data name, that is an error: replace it with the generic kind.

`
    : ""
  return `${peopleBlock}EVIDENCE (the ONLY things you may rely on):
${evidence}

DRAFT STEP TO CHECK:
${draft}`
}

// ── Consolidation pass ──
// After every step is written, tidy the section TITLES across the whole
// procedure so it reads as one coherent SOP (no transcript fragments, no
// first-person speech, consistent imperative phrasing). Strictly 1 title per
// step, same order/count — the caller falls back to the originals on any mismatch.
export const CONSOLIDATE_TITLE_PROMPT = `You are tidying the section titles of a step-by-step Desktop Procedure so the whole document reads cleanly and consistently.
You are given a numbered list of steps, each with its current title and its first action.

Rewrite EACH title to be a short, imperative phase title (max 8 words) that accurately reflects that step — e.g. "Open the monthly analysis", "Set the number format to Thousands".

Rules:
- Output EXACTLY one rewritten title per input line, in the SAME order, numbered the same way (1., 2., 3., …).
- Do NOT merge, drop, add, or reorder steps. Same number of lines in, same number out.
- Base each title ONLY on the given title/action — do NOT invent new tools, apps, or content.
- No transcript fragments, no first-person speech ("I", "we", "let me"), no trailing punctuation.`

// ── Structured documentation prompt (richer, like a real guide) ──
export function buildSectionsPrompt(sections) {
  const sectionList = sections.map((s) => `${s}: [2-3 specific sentences]`).join('\n')
  return `You are a professional technical documentation writer. You receive the spoken transcript AND the on-screen text (OCR) of a screen recording.

Write documentation for this segment using EXACTLY these sections. Name exact UI elements, buttons, menus and files visible on screen.

${sectionList}

Rules:
- Use EXACTLY the section names above, each followed by a colon.
- Be specific and actionable — what to click, where to navigate, what happens.
- Use the on-screen text to get exact names right.
- Reply with ONLY the sections in the format above.`
}

// Context block fed to the model per window, now including on-screen (OCR) text.
export function buildContextPrompt(text, label, prevText, nextText, ocrText) {
  const spoken = text
    ? `[Spoken at ${label}]: "${text}"`
    : `[At ${label}]: (no narration here — describe the action purely from the on-screen text)`
  return [
    prevText ? `[Previous]: "${prevText}"` : null,
    spoken,
    nextText ? `[Next]: "${nextText}"` : null,
    ocrText ? `[On-screen text (OCR)]: "${ocrText}"` : null,
  ].filter(Boolean).join('\n')
}

// ── Chunking: merge tiny transcript segments into ~windowSecs windows ──
// Big videos produce hundreds of micro-segments; one LLM call each is slow and
// context-poor. Grouping into windows gives the model coherent chunks and cuts
// the number of calls dramatically.
export function groupIntoWindows(chunks, windowSecs = 45) {
  const clean = (chunks || []).filter((c) => c.text?.trim())
  if (!clean.length) return []
  const windows = []
  let cur = null
  for (const c of clean) {
    const start = c.timestamp?.[0] ?? 0
    const end = c.timestamp?.[1] ?? start + 3
    if (!cur || start - cur.timestamp[0] >= windowSecs) {
      if (cur) windows.push(cur)
      cur = { text: c.text.trim(), timestamp: [start, end] }
    } else {
      cur.text += ' ' + c.text.trim()
      cur.timestamp[1] = end
    }
  }
  if (cur) windows.push(cur)
  return windows
}

// ── Parsers ──
export function parseSectionedAnnotation(text, sections) {
  if (!sections?.length || !text) return null
  const result = {}
  sections.forEach((section, i) => {
    const esc = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const nextEsc = sections[i + 1]?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = nextEsc
      ? new RegExp(`${esc}:\\s*([\\s\\S]*?)(?=\\n${nextEsc}:)`, 'i')
      : new RegExp(`${esc}:\\s*([\\s\\S]*)`, 'i')
    const match = text.match(pattern)
    if (match) result[section] = match[1].trim()
  })
  return Object.keys(result).length >= 1 ? result : null
}

export function parseStepsAnnotation(text) {
  if (!text) return null
  const overviewMatch = text.match(/OVERVIEW:\s*([\s\S]*?)(?=\n\s*STEPS?:|\n\s*RESULT:|$)/i)
  const stepsMatch = text.match(/STEPS?:\s*([\s\S]*?)(?=RESULT:|$)/i)
  const resultMatch = text.match(/RESULT:\s*([\s\S]*)$/i)
  const overview = overviewMatch?.[1]?.trim() || null
  const steps = stepsMatch
    ? stepsMatch[1]
        .split('\n')
        .map((l) => l.replace(/^[\d\-\*•]+[\.\):\s]+/, '').trim())
        .filter((l) => l.length > 3)
    : []
  const result = resultMatch?.[1]?.trim() ?? null
  // Valid if we got an overview (e.g. off-topic) OR at least one step.
  return (overview || steps.length > 0) ? { overview, steps, result } : null
}
