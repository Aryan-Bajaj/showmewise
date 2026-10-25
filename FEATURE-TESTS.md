# ShowMeWise: every feature and its test

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
| Pet guide with a manual | pet_guide 18/18 local (one field gives no "which one?"), 17/17 cloud | ✅ |
| Meet your pet, Ollama steps, greeting, suggestions | pet_setup 25/25 | ✅ |
| Fresh questions, same name buttons | pet_fresh 26/26 local (help mid task goes on at step 3), 26/26 cloud | ✅ |
| Fill a form from a CV | pet_fill 7 of 7 fields right, local and cloud; the pet walks back to its spot | ✅ |
| Pet AI answers (crazy user) | pet_ai local 0 failed, cloud 0 failed; browser AI 1 failed: a Hinglish joke comes back in English (the 1.5B model's limit) | ✅ local, cloud · ❌ browser AI Hinglish |
| Pet on real sites, chat size, New chat | pet_check 0 failed (quick clicks keep a real chat size) | ✅ |
| Every pet look (5 pets × 3 colours, picture, 3D) | pet_looks 0 failed | ✅ |
| Pet training: setup wizard (with 🧪 Test it), course cards, every lesson, ▶ Try buttons, usage questions, test my system, Reset, phone | pet_training local 0 failed | ✅ |
| Twelve more real websites | pet_sites 0 failed | ✅ |
| Security: keys, headers, CSP, attack text, page to plugin, hidden orders | security_check 0 failed | ✅ |
| Vid Chat crazy questions | vidchat_crazy: German and Spanish answered in their language; Hinglish still in English with the small local AI | ✅ · ❌ Hinglish |
| Vidi's AI picker on the website | vidi_models 0 failed | ✅ |
| Not covered: the AI's own knowledge, Search the web (and Search the web for more) | chat_fallback 0 failed (the question goes to the search, nothing from the document) | ✅ |
