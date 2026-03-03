import { html, Html } from "@elysiajs/html";
import { Elysia } from "elysia";
import { DatabaseService } from "../llm/services/database/database.service";

export const frontEndModule = new Elysia()
  .decorate("databaseService", new DatabaseService())
  .use(html())
  .get("/", async ({ databaseService }) => {
    const requests = await databaseService.getAllRequests();
    // await databaseService.clearRequests();
    console.log(requests);
    return (
      <html lang="en">
        <head>
          <title>AI Assistant</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="https://cdn.tailwindcss.com"></script>
          {/* Markdown Parser */}
          <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
            body { font-family: 'Inter', sans-serif; }
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
            
            /* Markdown Styling */
            .prose h1 { font-size: 1.5rem; font-weight: 700; margin-top: 1rem; }
            .prose h2 { font-size: 1.25rem; font-weight: 600; margin-top: 0.75rem; }
            .prose p { margin-bottom: 0.75rem; }
            .prose code { background: #f4f4f5; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
            .prose pre { background: #18181b; color: #fff; padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; }
            .prose ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
            .prose ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
          `}</style>
        </head>

        <body class="bg-white text-zinc-900 min-h-screen flex flex-col">
          <nav class="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-100">
            <div class="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
              <span class="font-semibold tracking-tight text-sm">
                Agent_v1.0
              </span>
              <div class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          </nav>

          <main class="flex-1">
            <div
              id="chat-container"
              class="max-w-3xl mx-auto px-6 py-12 space-y-12"
            >
              {requests.length === 0 ? (
                <div
                  id="empty-state"
                  class="h-[60vh] flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div class="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-xl">
                    ✨
                  </div>
                  <p class="text-zinc-400 text-sm italic">
                    System ready. Awaiting prompt...
                  </p>
                </div>
              ) : (
                requests.map((req: any) => (
                  <div class="chat-turn space-y-8">
                    {/* User Prompt */}
                    <div class="flex flex-col items-end group">
                      <div class="max-w-[85%] bg-zinc-900 text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-sm text-[15px]">
                        {req.user_input}
                      </div>
                    </div>

                    {/* AI Response Block */}
                    <div class="flex flex-col items-start w-full">
                      <div class="flex items-center gap-2 mb-4">
                        <div class="w-6 h-6 bg-zinc-100 border border-zinc-200 rounded-md flex items-center justify-center text-[10px] font-bold">
                          AI
                        </div>
                        <span class="text-[10px] uppercase tracking-widest text-zinc-400">
                          Assistant
                        </span>
                      </div>

                      {/* Execution Steps (Inline) */}
                      {/* Execution Steps (Inline) */}
                      {req.plan &&
                        (() => {
                          try {
                            const parsed = JSON.parse(req.plan);
                            // Ensure we are working with an array, even if the LLM wrapped it in a 'steps' or 'plan' key
                            const steps = Array.isArray(parsed)
                              ? parsed
                              : parsed.steps ||
                                parsed.plan ||
                                (typeof parsed === "object" ? [parsed] : []);

                            if (steps.length === 0) return null;

                            return (
                              <div class="mb-6 w-full border-l-2 border-zinc-100 pl-4 space-y-3">
                                <div class="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                  Execution Log
                                </div>
                                <div class="space-y-2">
                                  {steps.map((step: any, i: number) => (
                                    <div class="flex items-start gap-3 text-sm text-zinc-600">
                                      <span class="text-zinc-300 font-mono mt-0.5 text-xs">
                                        {(i + 1).toString().padStart(2, "0")}
                                      </span>
                                      <div class="bg-zinc-50 rounded-lg px-3 py-1.5 border border-zinc-100 flex-1">
                                        <span class="font-medium text-zinc-800">
                                          {step.tool ||
                                            step.action ||
                                            "Thought"}
                                        </span>
                                        <p class="text-[12px] text-zinc-500">
                                          {step.input ||
                                            step.thought ||
                                            step.observation}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          } catch (e) {
                            // If JSON is malformed, we just won't render the plan rather than crashing the page
                            return (
                              <div class="text-[10px] text-red-400 italic px-4">
                                Plan data unavailable
                              </div>
                            );
                          }
                        })()}

                      <div class="prose max-w-none text-[16px] leading-7 text-zinc-800 w-full markdown-content">
                        {/* We use a client-side script to hydrate this so markdown renders correctly */}
                        <div class="hidden raw-text">{req.response}</div>
                        <div class="rendered-markdown"></div>
                      </div>

                      <div class="w-full h-[1px] bg-zinc-50 mt-12"></div>
                    </div>
                  </div>
                ))
              )}
              {/* This is where the live streaming message will be injected */}
              <div id="live-anchor"></div>
            </div>
          </main>

          <footer class="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6">
            <div class="max-w-3xl mx-auto px-6">
              <div class="relative flex items-center group">
                <input
                  id="user-input"
                  type="text"
                  placeholder="Ask anything..."
                  class="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 pr-16 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-50 transition-all text-sm"
                />
                <button
                  id="send-button"
                  class="absolute right-3 bg-zinc-900 text-white p-2 rounded-xl hover:bg-black transition-colors shadow-lg"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </footer>

          <script>{`
            (function(){
              const input = document.getElementById('user-input');
              const btn = document.getElementById('send-button');
              const container = document.getElementById('chat-container');
              const anchor = document.getElementById('live-anchor');

              // 1. Hydrate existing markdown on load
              document.querySelectorAll('.markdown-content').forEach(el => {
                const raw = el.querySelector('.raw-text').textContent;
                el.querySelector('.rendered-markdown').innerHTML = marked.parse(raw);
              });

              async function send(){
                const value = (input.value||"").trim();
                if(!value) return;
                
                // Optimistic UI: Add user message immediately
                const userHtml = \`
                  <div class="flex flex-col items-end group">
                    <div class="max-w-[85%] bg-zinc-900 text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-sm text-[15px]">\${value}</div>
                  </div>\`;
                
                if(document.getElementById('empty-state')) document.getElementById('empty-state').remove();
                anchor.insertAdjacentHTML('beforebegin', userHtml);
                
                input.value = '';
                btn.disabled = true;

                try {
                  const res = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: [{ role: 'user', content: value }] }),
                  });
                  if(res.ok) window.location.reload(); 
                } catch(err) { console.error(err); btn.disabled = false; }
              }

              btn.addEventListener('click', send);
              input.addEventListener('keydown', e => e.key === 'Enter' && send());

              // 2. SSE for Live Chat Updates inside the flow
              const es = new EventSource('/events');
              let currentLiveMsg = null;
              let currentTimeline = null;
              let fullText = "";

              es.addEventListener('message', e => {
                const payload = JSON.parse(e.data);
                
                if(payload.type === 'reset') {
                  fullText = "";
                  const liveId = 'live-' + Date.now();
                  anchor.insertAdjacentHTML('beforebegin', \`
                    <div id="\${liveId}" class="flex flex-col items-start w-full">
                      <div class="flex items-center gap-2 mb-4">
                        <div class="w-6 h-6 bg-zinc-100 border border-zinc-200 rounded-md flex items-center justify-center text-[10px] font-bold">AI</div>
                        <span class="text-[10px] uppercase tracking-widest text-zinc-400">Assistant</span>
                      </div>
                      <div class="live-timeline mb-4 w-full border-l-2 border-zinc-100 pl-4 space-y-2"></div>
                      <div class="prose max-w-none text-[16px] leading-7 text-zinc-800 live-text"></div>
                    </div>
                  \`);
                  currentLiveMsg = document.querySelector('#' + liveId + ' .live-text');
                  currentTimeline = document.querySelector('#' + liveId + ' .live-timeline');
                }

                if(payload.type === 'tool_start' && currentTimeline) {
                  currentTimeline.insertAdjacentHTML('beforeend', \`
                    <div id="step-\${payload.id}" class="flex items-center gap-3 text-xs text-zinc-500 animate-pulse">
                      <div class="w-2 h-2 rounded-full bg-amber-400"></div>
                      <span>Running <b>\${payload.tool}</b>...</span>
                    </div>
                  \`);
                }

                if(payload.type === 'tool_end') {
                  const stepEl = document.getElementById('step-' + payload.id);
                  if(stepEl) {
                    stepEl.classList.remove('animate-pulse');
                    stepEl.querySelector('div').classList.replace('bg-amber-400', 'bg-emerald-400');
                    stepEl.querySelector('span').innerHTML = \`Finished <b>\${payload.tool}</b> (\${payload.durationMs}ms)\`;
                  }
                }

                if(payload.type === 'token' && currentLiveMsg) {
                  fullText += payload.token;
                  currentLiveMsg.innerHTML = marked.parse(fullText);
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
              });
            })();
          `}</script>
        </body>
      </html>
    );
  });
