// Ollama cloud models: off unless the user turns them on (with a notice).
// They are bigger and better at reasoning, but run on Ollama's servers: what
// they read (the video's text and screenshots, a document, a question) leaves
// this computer. Remembered in this browser only.
const KEY = "vd-cloud"
export const isCloud = (name) => /:cloud$|-cloud$/.test(name || "")
export const cloudOn = () => { try { return localStorage.getItem(KEY) === "on" } catch { return false } }
export const setCloud = (on) => { try { if (on) localStorage.setItem(KEY, "on"); else localStorage.removeItem(KEY) } catch { /* private window */ } }
// The cloud model picked last in the AI settings: the plugin's chats (and the
// pet) use it too, while cloud models are on. Picking a local model clears it.
const MODEL = "vd-cloud-model"
export const cloudModel = () => { try { return cloudOn() ? localStorage.getItem(MODEL) || "" : "" } catch { return "" } }
export const setCloudModel = (name) => { try { if (name && isCloud(name)) localStorage.setItem(MODEL, name); else localStorage.removeItem(MODEL) } catch { /* private window */ } }

// what went wrong with a cloud model, in plain words
// (why: Ollama's own reason, which names a free model to try instead)
export function cloudError(status, why = "") {
  if (status === 401 || status === 403) {
    // Ollama sends its own sign in page with the refusal: no terminal needed then
    const url = why.match(/"signin_url"\s*:\s*"(https:\/\/ollama\.com\/[^"]+)"/)?.[1]
    return url ? `This cloud model needs you to sign in to Ollama once. Sign in here: ${url}` : "This cloud model needs you to sign in to Ollama: open a terminal and run “ollama signin”. Or pick a model on your computer."
  }
  if (status === 402) {
    const free = why.match(/Try ([\w.:-]*cloud)\b/)?.[1]
    return `This cloud model is not in your free Ollama plan (it needs paid credits). Pick a model on your computer${free ? `, or the free cloud model ${free}` : ""}.`
  }
  if (status === 429) return "The free limit for Ollama cloud models is reached for now. Try again later, or pick a model on your computer."
  return "The cloud model could not be reached. Check your internet connection, or pick a model on your computer."
}
