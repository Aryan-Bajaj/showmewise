# VideoDoc: every feature and its test

Nothing counts as done until its line here is checked, by an automated test or by
reading the result (marked "read"). Tests run in a maximized browser window.
Status: ✅ passed · ⏳ not tested yet · ❌ failing (being fixed)

## Website: make a guide
| Feature | Test | Status |
|---|---|---|
| Upload MP4/MOV/WEBM, size and length limits | break_tests wrongfile, upload runs | ✅ |
| Silent video, very short video, reload mid-run | break_tests silent, tiny, reload | ✅ |
| Record your screen (website button) | ⏳ needs its own test (plugin path is tested) | ⏳ |
| Recording cut short: "Use it / Delete it" | ⏳ | ⏳ |
| Key words, language, Fast/Accurate | office runs, plugin K1 | ✅ |
| AI settings: Ollama | all runs | ✅ |
| AI settings: browser AI (WebLLM) | ⏳ webgpu_check (watchdog) | ⏳ |
| Progress list, time left, sleep time not counted | ⏳ sleep part | ⏳ |
| Resume after a closed tab | resume_chat | ✅ |
| Review mode, suggestions (+ Add / Hide) | earlier runs | ⏳ again |
| Edit, move, delete step; Replace all | ⏳ | ⏳ |
| Flow diagram editor | earlier runs | ⏳ again |
| Export HTML (clips enlarge, checklist), PDF, DOCX | resume_chat (HTML) | ⏳ PDF/DOCX read |
| Vid Chat (+ Add a document) | resume_chat 4/4 | ✅ (add doc ⏳) |
| Doc Chat HTML, PDF, DOCX | docchat_check | ✅ (DOCX ⏳) |
| Firefox | firefox_run 6/6 | ✅ |
| Phone layout of new parts | ⏳ | ⏳ |

## Vidi (website)
| Feature | Test | Status |
|---|---|---|
| Answers from help (Ollama) | vidi_ollama | ⏳ again |
| Answers with browser AI | webgpu_check vidi | ⏳ |
| No AI: shows the matching help part | ⏳ | ⏳ |
| Ctrl + V screenshot is read | ⏳ | ⏳ |
| Error bubble "Do you need help?" Yes / No | ⏳ | ⏳ |
| Knows the page you are on | ⏳ | ⏳ |

## Plugin
| Feature | Test | Status |
|---|---|---|
| Chat: page, links, PDF, Help, Show me | plugin_check chat 13/13 | ✅ |
| Crazy user | crazy_check 16/16 | ✅ |
| Recording, key words, Continue, notification, keep awake | plugin_check record 11/11 | ✅ |
| Side panel ("Open on the side") | ⏳ | ⏳ |
| Show me on a crowded or scrolled page | ⏳ | ⏳ |
| More break tests (no Ollama, offline site, permission denied, two windows) | ⏳ | ⏳ |

## New
| Feature | Test | Status |
|---|---|---|
| "Test my computer" (best browser model) | ⏳ | ⏳ |
| Architecture flow chart on the website | ⏳ read | ⏳ |
| Browser AI numbers on the website | ⏳ measured | ⏳ |
