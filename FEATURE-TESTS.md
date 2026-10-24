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
| AI settings: browser AI (WebLLM) | webgpu_check guide: Medium 6 of 15 fully right (11 found), Small 2 of 15 (judge-browser-*.md) | ✅ |
| Progress list, time left, sleep time not counted | ⏳ sleep part | ⏳ |
| Resume after a closed tab | resume_chat | ✅ |
| Review mode, suggestions (+ Add / Hide) | earlier runs | ⏳ again |
| Edit, move, delete step; Replace all | ⏳ | ⏳ |
| Flow diagram editor | earlier runs | ⏳ again |
| Export HTML (clips enlarge, checklist), PDF, DOCX | resume_chat (HTML) | ⏳ PDF/DOCX read |
| Vid Chat (+ Add a document), word by word | resume_chat 4/4; stream_docchat |
| Vid Chat: marked screenshot of the steps the answer names | vidchat_shots | ✅ 4/4: share, add widget and title each show the marked step; "print on paper" says not found, no picture | ✅ (add doc ⏳ guide_features) |
| Doc Chat HTML, PDF, DOCX | docchat_check; browser AI: name right, share 2 of 3 steps | ✅ (DOCX ⏳) |
| Firefox | firefox_run 6/6 | ✅ |
| Phone layout of new parts | ⏳ | ⏳ |

## Vidi (website)
| Feature | Test | Status |
|---|---|---|
| Answers from help (Ollama), word by word | vidi_full V1, V7 | ✅ |
| Answers with browser AI | webgpu_check vidi: right, 41 to 54 s, one small mix-up | ✅ |
| No AI: shows the matching help part | vidi_full V6 | ✅ |
| Ctrl + V screenshot is read, helpful answer (read) | vidi_full V3 | ✅ |
| Error bubble "Do you need help?" Yes / No, helpful answer (read) | vidi_full V4 | ✅ |
| Knows the page you are on | vidi_full V5 | ✅ |

## Plugin
| Feature | Test | Status |
|---|---|---|
| Chat: page, links, PDF, Help, Show me, word by word | plugin_check chat 14/14 | ✅ |
| Crazy user | crazy_check 16/16 | ✅ |
| Recording, key words, Continue, notification, keep awake | plugin_check record 11/11 | ✅ |
| Side panel ("Open on the side") | ⏳ | ⏳ |
| Show me on a crowded or scrolled page | ⏳ | ⏳ |
| More break tests (no Ollama, offline site, permission denied, two windows) | ⏳ | ⏳ |

## New
| Feature | Test | Status |
|---|---|---|
| "Test my computer" (best browser model) | webgpu_check check: Small 3 s fast right, Medium OK right, Large asks first, unused sizes deleted; with plugin: free memory + tabs | ✅ |
| Architecture flow chart on the website | looked at on laptop and phone | ✅ |
| Browser AI numbers on the website | from the judged guides; untested claims removed | ✅ |
