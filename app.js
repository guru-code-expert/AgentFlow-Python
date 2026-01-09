/* AgentFlow Python — landing interactions (vanilla JS) */

(function () {
  // Helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav
  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    // close on link click
    navLinks.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });

    // close on escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Smooth scroll offset for sticky header (optional nice touch)
  // Already using scroll-behavior:smooth; ensure hash links focus
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", () => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = $(id);
      if (!target) return;
      // let browser scroll; then focus
      setTimeout(() => target.setAttribute("tabindex", "-1"), 0);
      setTimeout(() => target.focus({ preventScroll: true }), 350);
      setTimeout(() => target.removeAttribute("tabindex"), 800);
    });
  });

  // Scroll reveal
  const revealEls = $$(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));

  // Templates interactive
  const templates = {
    support: {
      title: "Support Agent",
      subtitle: "Triage with citations + structured escalation.",
      config: `template: support_agent
model: gpt-4.1-mini
output: TicketDraft
memory:
  mode: hybrid
  recall_budget: 6
guardrails:
  pii_redaction: true
  jailbreak_defense: true
tools:
  - search_docs(query, product)
  - repro_checklist(issue_id)
  - create_ticket(payload)  # requires_approval
policies:
  - deny: "export_user_data"
retries:
  max_attempts: 3
  backoff: expo`,
      tools: ["search_docs(query, product)", "repro_checklist(issue_id)", "create_ticket(payload)"],
      chat: [
        { role: "User", text: "Our SDK hangs during auth refresh. Any known issues?" },
        { role: "Agent", text: "I’ll search docs + release notes, then propose a repro checklist and an escalation ticket draft." },
        { role: "Agent", text: "Found: refresh deadlock fixed in v2.3.1. Here’s the patch note citation + upgrade steps." }
      ],
    },
    research: {
      title: "Research Agent",
      subtitle: "Collect sources, extract claims, and produce a brief with evidence.",
      config: `template: research_agent
model: gpt-4.1-mini
output: BriefWithCitations
memory:
  mode: short_term
  recall_budget: 8
guardrails:
  pii_redaction: true
  jailbreak_defense: true
tools:
  - search_web(query)        # read-only
  - fetch_url(url)           # read-only
  - extract_claims(text)
verification:
  require_citations: true
  claim_check: enabled
retries:
  max_attempts: 2`,
      tools: ["search_web(query)", "fetch_url(url)", "extract_claims(text)"],
      chat: [
        { role: "User", text: "Summarize current best practices for tool-calling agents." },
        { role: "Agent", text: "I’ll gather 6–10 sources, extract key claims, and return a scoped brief with citations." },
        { role: "Agent", text: "Drafted brief: failure modes, retries, schema validation, and human approvals for risky actions." }
      ],
    },
    sales: {
      title: "Sales Qualifier",
      subtitle: "Ask targeted questions, classify intent, and route to the right motion.",
      config: `template: sales_qualifier
model: gpt-4.1-mini
output: LeadQualification
memory:
  mode: structured
  fields: [company, use_case, timeline, blockers]
guardrails:
  pii_redaction: true
tools:
  - enrich_company(domain)     # read-only
  - score_intent(transcript)
  - create_crm_lead(payload)   # requires_approval
policies:
  - redact: ["emails", "phones"]
rate_limits:
  enrich_company: "30/min"`,
      tools: ["enrich_company(domain)", "score_intent(transcript)", "create_crm_lead(payload)"],
      chat: [
        { role: "User", text: "We’re evaluating agent tooling for internal IT automation." },
        { role: "Agent", text: "Great — what systems are in scope, and do you need approvals for ticketing or access changes?" },
        { role: "Agent", text: "Based on your answers, you fit the Pro tier. I can draft an evaluation plan and ROI model." }
      ],
    },
    analyst: {
      title: "Data Analyst",
      subtitle: "Generate SQL with verification, run safely, and summarize results.",
      config: `template: data_analyst
model: gpt-4.1-mini
output: AnalysisReport
guardrails:
  pii_redaction: true
  sql_safety: strict
tools:
  - generate_sql(question, schema)
  - validate_sql(sql)          # blocks writes
  - run_query(sql)             # read-only
verification:
  require_unit_checks: true
retries:
  max_attempts: 3`,
      tools: ["generate_sql(question, schema)", "validate_sql(sql)", "run_query(sql)"],
      chat: [
        { role: "User", text: "What caused the spike in failed payments yesterday?" },
        { role: "Agent", text: "I’ll generate read-only SQL, validate it, run the query, then summarize with anomalies." },
        { role: "Agent", text: "Root cause: elevated 429s from the gateway during 18:00–19:00 UTC; retries amplified load." }
      ],
    },
    devops: {
      title: "DevOps Assistant",
      subtitle: "Investigate incidents, run read-only checks, propose remediations.",
      config: `template: devops_assistant
model: gpt-4.1-mini
output: IncidentPlan
guardrails:
  pii_redaction: true
  require_approval_for: ["restart_service", "change_config"]
tools:
  - search_logs(query)         # read-only
  - check_metrics(metric, window)
  - propose_runbook(service)
approval:
  enabled: true
retries:
  max_attempts: 2
rate_limits:
  search_logs: "20/min"`,
      tools: ["search_logs(query)", "check_metrics(metric, window)", "propose_runbook(service)"],
      chat: [
        { role: "User", text: "API latency is up and error rate spiked. What should we do?" },
        { role: "Agent", text: "I’ll check metrics/logs (read-only), then propose a safe runbook with approval gates." },
        { role: "Agent", text: "Likely DB connection pool exhaustion. Proposed: increase pool, reduce concurrency, and add backpressure." }
      ],
    },
  };

  const tCards = $$(".tcard");
  const previewTitle = $("#previewTitle");
  const previewSubtitle = $("#previewSubtitle");
  const previewConfig = $("#previewConfig");
  const previewTools = $("#previewTools");
  const previewChat = $("#previewChat");

  function renderTemplate(key) {
    const t = templates[key];
    if (!t) return;

    if (previewTitle) previewTitle.textContent = t.title;
    if (previewSubtitle) previewSubtitle.textContent = t.subtitle;
    if (previewConfig) previewConfig.textContent = t.config;

    if (previewTools) {
      previewTools.innerHTML = "";
      t.tools.forEach((tool) => {
        const li = document.createElement("li");
        li.textContent = tool;
        previewTools.appendChild(li);
      });
    }

    if (previewChat) {
      previewChat.innerHTML = "";
      t.chat.forEach((m) => {
        const bubble = document.createElement("div");
        bubble.className = "bubble " + (m.role === "User" ? "bubble--user" : "bubble--agent");
        bubble.innerHTML = `<div class="bubble__role">${m.role}</div><p>${escapeHtml(m.text)}</p>`;
        previewChat.appendChild(bubble);
      });
    }
  }

  function escapeHtml(str) {
    return str
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  tCards.forEach((btn) => {
    btn.addEventListener("click", () => {
      tCards.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      renderTemplate(btn.dataset.template);
    });
  });

  // Initial template
  renderTemplate("support");

  // Risk toggle demo
  const riskSlider = $("#riskSlider");
  const riskLabel = $("#riskLabel");
  const riskTools = $("#riskTools");
  const riskPii = $("#riskPii");
  const riskConstraints = $("#riskConstraints");
  const riskApproval = $("#riskApproval");
  const riskAnswer = $("#riskAnswer");
  const riskMeta = $("#riskMeta");
  const riskPolicyTag = $("#riskPolicyTag");
  const riskModeTag = $("#riskModeTag");

  const riskStates = [
    {
      name: "Low",
      tools: "Read-only tools only (search, fetch, summarize)",
      pii: "Redact emails/phones/tokens + drop raw identifiers",
      constraints: "Citations optional; structured output recommended",
      approval: "No approvals (no external actions allowed anyway)",
      policyTag: "policy: permissive",
      modeTag: "mode: readonly",
      answer:
        "Sure. I can outline a campaign strategy and provide a draft message. I can’t export or send emails, but I’ll help you structure the workflow safely.",
      meta: "Enforced: readonly tools • PII scrubbed • no external actions",
    },
    {
      name: "Medium",
      tools: "Read-only tools + ticket creation w/ approval",
      pii: "Redact emails, phones, tokens",
      constraints: "Structured output + citations required",
      approval: "Human approval for external actions",
      policyTag: "policy: balanced",
      modeTag: "mode: safe",
      answer:
        "I can help draft a campaign, but exporting customer PII or mass emailing requires approval. I’ll generate a compliant email template and a redacted preview list first.",
      meta: "Enforced: PII redaction • approval required • safe tools only",
    },
    {
      name: "High",
      tools: "Broader tools enabled (export/send) but gated",
      pii: "Strict: block on PII exposure; require minimization",
      constraints: "Schema validation + policy checks + eval gate",
      approval: "Mandatory approval + audit log + two-person rule",
      policyTag: "policy: strict",
      modeTag: "mode: locked",
      answer:
        "I can’t export or email customer data without a compliance-approved workflow. If you want, I’ll generate an approval package: audience criteria, redaction rules, and a dry-run report for review.",
      meta: "Enforced: strict PII block • mandatory approval • audit-required actions",
    },
  ];

  function applyRisk(idx) {
    const s = riskStates[idx] ?? riskStates[1];
    if (riskLabel) riskLabel.textContent = s.name;
    if (riskTools) riskTools.textContent = s.tools;
    if (riskPii) riskPii.textContent = s.pii;
    if (riskConstraints) riskConstraints.textContent = s.constraints;
    if (riskApproval) riskApproval.textContent = s.approval;
    if (riskAnswer) riskAnswer.textContent = s.answer;
    if (riskMeta) riskMeta.textContent = s.meta;
    if (riskPolicyTag) riskPolicyTag.textContent = s.policyTag;
    if (riskModeTag) riskModeTag.textContent = s.modeTag;

    // subtle accent changes
    if (riskModeTag) {
      riskModeTag.classList.toggle("badge--ok", idx !== 2);
    }
  }

  if (riskSlider) {
    applyRisk(Number(riskSlider.value));
    riskSlider.addEventListener("input", () => applyRisk(Number(riskSlider.value)));
  }

  // FAQ accordion (keyboard accessible)
  const accWrap = $("#faqAccordion");
  if (accWrap) {
    const items = $$(".acc", accWrap);

    function closeAll(except = null) {
      items.forEach((it) => {
        if (it === except) return;
        setOpen(it, false);
      });
    }

    function setOpen(item, open) {
      const btn = $(".acc__btn", item);
      const panel = $(".acc__panel", item);
      if (!btn || !panel) return;

      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      $(".acc__icon", btn).textContent = open ? "–" : "+";
      panel.style.maxHeight = open ? panel.scrollHeight + "px" : "0px";
    }

    items.forEach((item) => {
      const btn = $(".acc__btn", item);
      const panel = $(".acc__panel", item);
      if (!btn || !panel) return;

      // init
      setOpen(item, false);

      btn.addEventListener("click", () => {
        const willOpen = btn.getAttribute("aria-expanded") !== "true";
        closeAll(item);
        setOpen(item, willOpen);
      });

      // keyboard: Enter/Space toggle
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          btn.click();
        }
        // Up/Down to move between headers
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const idx = items.indexOf(item);
          const next = e.key === "ArrowDown" ? items[idx + 1] : items[idx - 1];
          const nextBtn = next ? $(".acc__btn", next) : null;
          if (nextBtn) nextBtn.focus();
        }
        // Home/End
        if (e.key === "Home") {
          e.preventDefault();
          const firstBtn = $(".acc__btn", items[0]);
          if (firstBtn) firstBtn.focus();
        }
        if (e.key === "End") {
          e.preventDefault();
          const lastBtn = $(".acc__btn", items[items.length - 1]);
          if (lastBtn) lastBtn.focus();
        }
      });

      // recalc height on resize
      window.addEventListener("resize", () => {
        if (item.classList.contains("is-open")) panel.style.maxHeight = panel.scrollHeight + "px";
      });
    });
  }

  // Subscribe (fake)
  const subscribeForm = $("#subscribeForm");
  const subscribeMsg = $("#subscribeMsg");
  if (subscribeForm) {
    subscribeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#email")?.value?.trim();
      if (!email) return;
      if (subscribeMsg) subscribeMsg.textContent = "Thanks — you’re on the list. (placeholder)";
      subscribeForm.reset();
    });
  }

  // Modal: Playground
  const modal = $("#playgroundModal");
  const closeModalBtn = $("#closeModal");
  const openBtns = [$("#openPlayground"), $("#openPlayground2"), $("#openPlayground3"), $("#openPlayground4")].filter(Boolean);

  let lastFocus = null;

  function openModal() {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // focus first interactive
    setTimeout(() => $("#taskInput")?.focus(), 0);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    stopRun();
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  openBtns.forEach((b) => b.addEventListener("click", openModal));
  closeModalBtn?.addEventListener("click", closeModal);

  modal?.addEventListener("click", (e) => {
    const close = e.target?.getAttribute?.("data-close");
    if (close === "true") closeModal();
  });

  // Modal keyboard accessibility: ESC + focus trap
  document.addEventListener("keydown", (e) => {
    if (!modal || modal.getAttribute("aria-hidden") === "true") return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.key === "Tab") {
      const focusables = getFocusable(modal);
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  function getFocusable(root) {
    const sel =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    return $$(sel, root).filter((el) => el.offsetParent !== null);
  }

  // Playground simulation
  const taskInput = $("#taskInput");
  const runBtn = $("#runBtn");
  const clearBtn = $("#clearBtn");
  const consoleBody = $("#consoleBody");
  const traceBody = $("#traceBody");
  const runState = $("#runState");

  let runTimer = null;
  let stepIndex = 0;
  let queued = [];

  function nowStamp() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function addLine(type, tag, text) {
    if (!consoleBody) return;
    const div = document.createElement("div");
    div.className = "line " + (type ? `line--${type}` : "");
    div.innerHTML = `
      <div class="line__meta">
        <span class="line__tag">${escapeHtml(tag)}</span>
        <span>${nowStamp()}</span>
      </div>
      <div class="line__text">${escapeHtml(text)}</div>
    `;
    consoleBody.appendChild(div);
    consoleBody.scrollTop = consoleBody.scrollHeight;
  }

  function addTrace(k, v) {
    if (!traceBody) return;
    const row = document.createElement("div");
    row.className = "traceitem";
    row.innerHTML = `<div class="traceitem__k">${escapeHtml(k)}</div><div class="traceitem__v">${escapeHtml(v)}</div>`;
    traceBody.appendChild(row);
  }

  function resetConsole() {
    if (consoleBody) consoleBody.innerHTML = "";
    if (traceBody) traceBody.innerHTML = "";
    stepIndex = 0;
    queued = [];
  }

  function setState(s) {
    if (runState) runState.textContent = s;
  }

  function stopRun() {
    if (runTimer) clearInterval(runTimer);
    runTimer = null;
    setState("idle");
  }

  function buildFakeRun(task) {
    const cleanTask = task || "Draft a safe, structured response with citations.";
    return [
      { t: "ok", tag: "system", msg: "Initialized agentflow runtime (guardrails: on, output_schema: AnswerWithCitations)." },
      { t: "", tag: "user_task", msg: cleanTask },
      { t: "", tag: "planner", msg: "Planning steps: (1) clarify intent, (2) retrieve relevant docs, (3) validate constraints, (4) draft output." },
      { t: "tool", tag: "tool_call", msg: "Calling search_docs(query=\"agent retries rate limits structured outputs\", product=\"AgentFlow\")" },
      { t: "", tag: "tool_result", msg: "search_docs → 4 matches (retry_policy, rate_limits, tool_schemas, approvals)." },
      { t: "", tag: "memory", msg: "Stored observations (budget: 6). Redacted: 0 items." },
      { t: "warn", tag: "verifier", msg: "Verify: schema + policy checks… citations required." },
      { t: "ok", tag: "final", msg: "Drafted response with structured sections, tool-safety notes, and citations. Ready." },
    ];
  }

  function runSimulation() {
    if (!taskInput) return;
    if (runTimer) return;

    const task = taskInput.value.trim();
    resetConsole();
    setState("running");

    addTrace("trace_id", "afp_" + Math.random().toString(16).slice(2, 6));
    addTrace("policy_mode", "safe");
    addTrace("tools", "search_docs, redact_pii, create_ticket (approval)");

    queued = buildFakeRun(task);
    stepIndex = 0;

    runTimer = setInterval(() => {
      const step = queued[stepIndex++];
      if (!step) {
        stopRun();
        setState("done");
        addTrace("status", "success");
        return;
      }

      addLine(step.t, step.tag, step.msg);

      // Add trace milestones
      if (step.tag === "planner") addTrace("span.plan", "ok");
      if (step.tag === "tool_call") addTrace("span.tool", "search_docs()");
      if (step.tag === "verifier") addTrace("span.verify", "policy + schema");
      if (step.tag === "final") addTrace("span.final", "render");
    }, 700);
  }

  runBtn?.addEventListener("click", runSimulation);

  // Enter should run when focused on Run button; textarea keeps newline
  runBtn?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runBtn.click();
    }
  });

  clearBtn?.addEventListener("click", () => {
    stopRun();
    resetConsole();
    setState("idle");
  });

  // Initial console greeting
  if (consoleBody) {
    addLine("ok", "system", "Playground ready. Enter a task, then Run to simulate an agent execution trace.");
  }

  // close modal if user clicks outside panel handled via data-close

})();
