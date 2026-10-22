import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Check, CheckCircle2,
  ChevronDown, Clock3, Command, CreditCard, Headphones, HelpCircle, Home, LampDesk,
  MessageCircle, Package, Plus, RefreshCw, Search, Send, ShieldCheck, ShoppingBag,
  Sparkles, Wrench, X, Zap, Coffee, Mouse, CircleAlert, FileClock
} from 'lucide-react';
import { callMcpTool, getMcpClient } from './lib/mcpClient.js';
import { resolveIntent } from './lib/intentRouter.js';

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
}

function daysLeft(value) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function money(value, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
}

function iconFor(item, size = 21) {
  const props = { size, strokeWidth: 1.8 };
  const normalized = `${item?.icon || ''} ${item?.item || ''}`.toLowerCase();
  if (normalized.includes('headphone')) return <Headphones {...props} />;
  if (normalized.includes('coffee')) return <Coffee {...props} />;
  if (normalized.includes('lamp')) return <LampDesk {...props} />;
  if (normalized.includes('mouse')) return <Mouse {...props} />;
  return <Package {...props} />;
}

function formatToolReply(tool, data) {
  if (tool === 'get_attention_summary') return data.headline || 'Here is your attention summary.';
  if (tool === 'list_purchases') return `I found ${data.purchases?.length ?? 0} purchase records in your demo account.`;
  if (tool === 'get_purchase_options') return data.error || `I found possible next steps for ${data.count ?? data.options?.length ?? 0} sample purchase${(data.count ?? data.options?.length ?? 0) === 1 ? '' : 's'}. These are options to review, not retailer or warranty decisions.`;
  if (tool === 'check_return_eligibility') return data.error || `${data.item}: ${data.eligible ? 'the demo record is within the return window' : 'the demo return window has passed'}.`;
  if (tool === 'prepare_case') return data.error || `I prepared a ${data.case?.caseType || 'service'} case draft for ${data.case?.item || 'your purchase'}. Nothing has been submitted.`;
  if (tool === 'list_cases') return `You have ${data.cases?.length ?? 0} saved demo case${data.cases?.length === 1 ? '' : 's'}.`;
  if (tool === 'confirm_case_action') return data.message || data.error || 'The demo case was updated.';
  return data.message || 'Done.';
}

function summarizeToolResult(tool, data) {
  if (data?.error) return `Error: ${data.error}`;
  if (tool === 'list_purchases') return `${data.purchases?.length ?? 0} purchase record(s) returned`;
  if (tool === 'get_purchase_options') return `${data.count ?? data.options?.length ?? 0} purchase option group(s) returned`;
  if (tool === 'get_attention_summary') return `${data.dueSoon?.length ?? 0} deadline(s) coming up; ${data.returnWindowPassed?.length ?? 0} past return window(s); ${data.waitingForConfirmation?.length ?? 0} draft(s) pending`;
  if (tool === 'check_return_eligibility') return `${data.item}: ${data.eligible ? 'within' : 'past'} the listed demo return window (deadline ${data.returnDeadline})`;
  if (tool === 'prepare_case') return data.case ? `Draft ${data.case.id} created; not submitted` : 'No draft created';
  if (tool === 'list_cases') return `${data.cases?.length ?? 0} saved case record(s) returned`;
  if (tool === 'confirm_case_action') return data.case ? `${data.case.id} → ${data.case.status}` : data.message || 'No case update returned';
  return data.message || 'Tool returned a result';
}

function summarizeArgs(args) {
  if (!args || Object.keys(args).length === 0) return 'No arguments';
  try { return JSON.stringify(args); } catch { return 'Arguments supplied'; }
}

function App() {
  const [purchases, setPurchases] = useState([]);
  const [cases, setCases] = useState([]);
  const [summary, setSummary] = useState(null);
  const [serverReady, setServerReady] = useState(false);
  const [bootError, setBootError] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeNav, setActiveNav] = useState('Overview');
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', text: 'Hi! I’m your AfterCart copilot. I can check a return window, surface a deadline, or prepare a return / warranty / repair draft. I’ll always show you before a demo action is confirmed.', kind: 'welcome' }
  ]);
  const [activity, setActivity] = useState([]);
  const [showActivity, setShowActivity] = useState(false);
  const chatEndRef = useRef(null);
  const dateLabel = useMemo(() => new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date()), []);

  const refreshDashboard = useCallback(async () => {
    try {
      await getMcpClient();
      setServerReady(true);
      const [purchaseData, caseData, summaryData] = await Promise.all([
        callMcpTool('list_purchases'),
        callMcpTool('list_cases'),
        callMcpTool('get_attention_summary')
      ]);
      setPurchases(purchaseData.purchases || []);
      setCases(caseData.cases || []);
      setSummary(summaryData);
      setBootError('');
      const loadedAt = new Date();
      setActivity((current) => current.length ? current : [
        { id: crypto.randomUUID(), tool: 'get_attention_summary', detail: 'Initial dashboard load', argsSummary: 'No arguments', resultSummary: summarizeToolResult('get_attention_summary', summaryData), status: 'success', time: loadedAt },
        { id: crypto.randomUUID(), tool: 'list_cases', detail: 'Initial dashboard load', argsSummary: 'No arguments', resultSummary: summarizeToolResult('list_cases', caseData), status: 'success', time: loadedAt },
        { id: crypto.randomUUID(), tool: 'list_purchases', detail: 'Initial dashboard load', argsSummary: 'No arguments', resultSummary: summarizeToolResult('list_purchases', purchaseData), status: 'success', time: loadedAt }
      ]);
    } catch (error) {
      setServerReady(false);
      setBootError(error instanceof Error ? error.message : 'Could not connect to the MCP server.');
    }
  }, []);

  useEffect(() => { refreshDashboard(); }, [refreshDashboard]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading]);

  const invokeTool = useCallback(async (tool, args = {}, userText = '') => {
    if (userText) setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'user', text: userText }]);
    setLoading(true);
    const startedAt = performance.now();
    try {
      const data = await callMcpTool(tool, args);
      setActivity((current) => [
        { id: crypto.randomUUID(), tool, detail: 'tools/call completed successfully', argsSummary: summarizeArgs(args), resultSummary: summarizeToolResult(tool, data), durationMs: Math.round(performance.now() - startedAt), status: 'success', time: new Date() },
        ...current
      ].slice(0, 12));
      const reply = { id: crypto.randomUUID(), role: 'assistant', text: formatToolReply(tool, data), tool, data };
      setMessages((items) => [...items, reply]);
      if (['list_purchases', 'get_attention_summary', 'prepare_case', 'list_cases', 'confirm_case_action'].includes(tool)) {
        await refreshDashboard();
      }
      return data;
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Something went wrong while calling the MCP tool.';
      setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'assistant', text: `I couldn’t complete that action: ${text}`, error: true }]);
      setActivity((current) => [{ id: crypto.randomUUID(), tool, detail: 'tools/call failed', argsSummary: summarizeArgs(args), resultSummary: text, durationMs: Math.round(performance.now() - startedAt), status: 'error', time: new Date() }, ...current].slice(0, 12));
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshDashboard]);

  async function handleSend(rawText = input) {
    const text = rawText.trim();
    if (!text || loading) return;
    setInput('');
    const intent = resolveIntent(text, purchases);

    if (intent.type === 'help') {
      setMessages((items) => [...items,
        { id: crypto.randomUUID(), role: 'user', text },
        { id: crypto.randomUUID(), role: 'assistant', text: 'I can check return-window dates, summarize upcoming deadlines, show warranty/repair possibilities, prepare a local draft, and list saved cases. Try “What needs attention this week?” or name a purchase. I use seeded demo data only.' }
      ]);
      return;
    }

    if (intent.type === 'choose_purchase') {
      setMessages((items) => [...items,
        { id: crypto.randomUUID(), role: 'user', text },
        { id: crypto.randomUUID(), role: 'assistant', text: `Before I ${intent.requestedAction || 'prepare a case'}, please name the purchase. I won't choose one on your behalf.` }
      ]);
      await invokeTool('list_purchases');
      return;
    }

    if (intent.type === 'prepare_case') {
      const { purchase, caseType } = intent;
      await invokeTool('prepare_case', { purchaseId: purchase.id, caseType, note: purchase.issue || text }, text);
      return;
    }

    if (intent.type === 'list_cases') {
      await invokeTool('list_cases', {}, text);
      return;
    }

    if (intent.type === 'check_return_eligibility') {
      await invokeTool('check_return_eligibility', { purchaseId: intent.purchase.id }, text);
      return;
    }

    if (intent.type === 'get_purchase_options') {
      await invokeTool('get_purchase_options', intent.purchase ? { purchaseId: intent.purchase.id } : {}, text);
      return;
    }

    if (intent.type === 'attention_summary') {
      await invokeTool('get_attention_summary', {}, text);
      return;
    }

    if (intent.type === 'list_purchases') {
      await invokeTool('list_purchases', { search: intent.search || '' }, text);
      return;
    }
  }

  async function confirmCase(caseId) {
    const confirmation = `Confirm ${caseId} in demo`;
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'user', text: confirmation }]);
    await invokeTool('confirm_case_action', { caseId });
  }

  function startDraftFor(purchase, caseType = 'return') {
    invokeTool('prepare_case', { purchaseId: purchase.id, caseType, note: purchase.issue || '' }, `Prepare a ${caseType} draft for ${purchase.item}`);
  }

  const dueSoon = summary?.dueSoon || [];
  const currentCases = cases;
  const openCases = currentCases.filter((c) => c.status.startsWith('Draft')).length;
  const navItems = [
    { label: 'Overview', icon: Home },
    { label: 'Purchases', icon: ShoppingBag },
    { label: 'Cases & claims', icon: FileClock }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><img src="/aftercart-logo.png" alt="" aria-hidden="true" /></div>
          <div><div className="brand-name">aftercart<span>.</span></div><div className="brand-caption">POST-PURCHASE, HANDLED</div></div>
        </div>
        <button className="profile-switcher" onClick={() => setShowActivity((value) => !value)}>
          <div className="avatar">AC</div><div className="profile-copy"><strong>Demo household</strong><span>Personal workspace</span></div><ChevronDown size={15} />
        </button>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => { setActiveNav(label); if (label === 'Purchases') invokeTool('list_purchases', {}, 'Show my purchases'); if (label === 'Cases & claims') invokeTool('list_cases', {}, 'Show my cases'); }}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>{label === 'Cases & claims' && openCases > 0 && <em>{openCases}</em>}
            </button>
          ))}
        </nav>
        <div className="side-label side-label-bottom">YOUR ASSISTANT</div>
        <div className="assistant-status"><div className="status-icon"><Sparkles size={17} /></div><div><strong>AfterCart Copilot</strong><span><span className={`status-dot ${serverReady ? '' : 'offline'}`} /> {serverReady ? 'MCP connected' : 'Connecting…'}</span></div></div>
        <div className="sidebar-spacer" />
        <div className="sidebar-note"><ShieldCheck size={16} /><p><strong>You stay in control.</strong><br />Every action is shown before it is confirmed.</p></div>
        <button className="side-footer-button" onClick={() => setShowActivity((value) => !value)}><Activity size={16} /> MCP activity log <ArrowUpRight size={14} /></button>
        <div className="sidebar-bottom"><span>AFTERCART • HACKATHON DEMO</span><span>v0.5.0</span></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div>
          <div className="topbar-right"><span className="today-label">{dateLabel}</span><span className="sample-data-pill"><span className="sample-data-dot"/> SAMPLE DATA · LOCAL ONLY</span><span className={`connection-pill ${serverReady ? 'connected' : 'disconnected'}`}><span className="status-dot" />{serverReady ? 'MCP connected' : 'MCP offline'}</span><button className="icon-button" aria-label="Activity" onClick={() => setShowActivity((value) => !value)}><Bell size={17} /></button><div className="top-avatar">A</div></div>
        </header>

        <div className="dashboard-content">
          {bootError && <div className="connection-error"><CircleAlert size={18} /><div><strong>Couldn’t connect to the local MCP server.</strong><span>Start the app from the VS Code terminal with <code>npm run dev</code>. Details: {bootError}</span></div><button onClick={refreshDashboard}><RefreshCw size={15} /> Retry</button></div>}
          <section className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line" /> THE AFTERCARE LAYER FOR EVERY BUY</div><h1>What you buy is<br className="desktop-break" /> just the beginning<span>.</span></h1><p>Return windows, warranty paths, repair options — one calm place to decide what happens next.</p><div className="hero-proof"><span><CheckCircle2 size={13}/> One clear next step</span><span><ShieldCheck size={13}/> You approve every action</span></div></div>
            <div className="welcome-decoration"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-package"><Package size={44} strokeWidth={1.4}/><Sparkles size={18} className="hero-sparkle" /></div><div className="floating-chip chip-deadline"><Clock3 size={13}/><span>Deadline radar</span></div><div className="floating-chip chip-protected"><ShieldCheck size={14}/><span>You’re in control</span></div></div>
          </section>

          <section className="stat-grid">
            <div className="stat-card"><div className="stat-top"><span className="stat-icon lilac"><Clock3 size={18}/></span><span className="stat-label">DEADLINE RADAR</span><span className="stat-trend"><ArrowDownRight size={14}/></span></div><div className="stat-value">{dueSoon.length.toString().padStart(2, '0')}<span className="stat-suffix"> items</span></div><div className="stat-foot">Windows closing soon</div></div>
            <div className="stat-card"><div className="stat-top"><span className="stat-icon mint"><FileClock size={18}/></span><span className="stat-label">DRAFTS IN MOTION</span><span className="tiny-neutral">DRAFTS</span></div><div className="stat-value">{openCases.toString().padStart(2, '0')}<span className="stat-suffix"> active</span></div><div className="stat-foot">Waiting for your go-ahead</div></div>
            <div className="stat-card"><div className="stat-top"><span className="stat-icon apricot"><ShoppingBag size={18}/></span><span className="stat-label">IN YOUR CORNER</span><span className="stat-trend trend-up"><ArrowUpRight size={14}/></span></div><div className="stat-value">{purchases.length.toString().padStart(2, '0')}<span className="stat-suffix"> items</span></div><div className="stat-foot">Across your demo workspace</div></div>
          </section>

          <div className="section-header"><div><div className="eyebrow small-eyebrow">YOUR PURCHASE CONTROL CENTER</div><h2>{activeNav === 'Purchases' ? 'Your purchases' : activeNav === 'Cases & claims' ? 'Cases & claims' : 'Your next best moves'}</h2></div><button className="text-button" onClick={() => invokeTool(activeNav === 'Cases & claims' ? 'list_cases' : 'list_purchases', {}, activeNav === 'Cases & claims' ? 'Show my cases' : 'Show all purchases')}>{activeNav === 'Cases & claims' ? 'Refresh cases' : 'All purchases'} <ArrowRight size={15}/></button></div>

          <section className="purchase-list">
            {activeNav === 'Cases & claims' ? (
              currentCases.length ? currentCases.map((c) => <CaseRow key={c.id} item={c} />) : <EmptyState title="No cases yet" detail="Ask AfterCart to prepare a return, warranty, or repair draft." />
            ) : (activeNav === 'Purchases' ? purchases : dueSoon.length ? dueSoon : purchases.slice(0, 3)).map((purchase) => <PurchaseRow key={purchase.id} purchase={purchase} onPrepare={startDraftFor} />)}
            {activeNav === 'Overview' && dueSoon.length === 0 && <div className="quiet-note"><CheckCircle2 size={16}/> No return deadlines in the next seven days.</div>}
          </section>

          <section className="insight-card"><div className="insight-icon"><Zap size={18}/></div><div className="insight-copy"><span>THE AFTERCART ADVANTAGE</span><strong>{summary?.returnWindowPassed?.length ? 'A return window can close. Your options may not.' : 'Small window. Clear next move.'}</strong><p>{summary?.returnWindowPassed?.length ? `${summary.returnWindowPassed[0].item} may still have warranty coverage. Ask me to prepare a warranty or repair draft.` : 'Ask “What needs attention this week?” and I’ll sort your next steps using the saved demo purchase records.'}</p></div><button className="insight-cta" onClick={() => handleSend(summary?.returnWindowPassed?.length ? `Prepare a warranty case for ${summary.returnWindowPassed[0].item}` : 'What needs attention this week?')}>Review <ArrowRight size={15}/></button></section>

          <div className="footnote"><span className="demo-dot"/> DEMO MODE — seeded sample purchases only. No retailer account is connected and no real return is submitted.</div>
        </div>
      </main>

      <aside className="copilot-panel">
        <div className="copilot-header"><div className="copilot-heading"><div className="copilot-avatar"><Sparkles size={19}/></div><div><h2>AfterCart <span>Copilot</span></h2><p><span className="status-dot"/> Your post-purchase assistant</p></div></div><button className="icon-button" aria-label="New conversation" onClick={() => setMessages([{ id: crypto.randomUUID(), role: 'assistant', text: 'Fresh start. What would you like to take care of?', kind: 'welcome' }])}><Plus size={18}/></button></div>
        <div className="copilot-context"><div className="context-icon"><Command size={15}/></div><div><strong>MCP-powered workspace</strong><span>Tools run on your local server</span></div><span className={`context-live ${serverReady ? '' : 'offline'}`}>{serverReady ? 'LIVE' : 'OFFLINE'}</span></div>
        <div className="chat-messages">
          <div className="chat-date-divider"><span>TODAY</span></div>
          {messages.map((message) => <ChatMessage key={message.id} message={message} onConfirm={confirmCase} onPrepare={startDraftFor} />)}
          {loading && <div className="typing-row"><div className="bot-mini"><Sparkles size={14}/></div><div className="typing-bubble"><span/><span/><span/></div><small>Calling MCP tool…</small></div>}
          <div ref={chatEndRef}/>
        </div>
        <div className="suggested-prompts"><div className="suggestion-label">TRY ASKING</div><div className="suggestion-chips"><button onClick={() => handleSend('What needs attention this week?')}>Find my next move <ArrowUpRight size={12}/></button><button onClick={() => handleSend('Can I return EchoTone Wireless Headphones?')}>Check a return <ArrowUpRight size={12}/></button><button onClick={() => handleSend('Show my warranties and repair options')}>Warranty / repair <ArrowUpRight size={12}/></button></div></div>
        <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); handleSend(); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask what happens next…" aria-label="Message AfterCart" disabled={!serverReady || loading}/><button className="send-button" type="submit" disabled={!input.trim() || loading || !serverReady} aria-label="Send message"><Send size={17}/></button></form>
        <div className="composer-disclaimer"><ShieldCheck size={12}/> You review every action before confirming</div>
      </aside>

      {showActivity && <div className="activity-overlay" onClick={() => setShowActivity(false)}><section className="activity-drawer" onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow small-eyebrow">TRANSPARENCY</span><h2>MCP activity log</h2></div><button className="icon-button" onClick={() => setShowActivity(false)}><X size={18}/></button></header><p className="drawer-description">These entries reflect actual tool calls made from this browser to the local Streamable HTTP MCP server.</p>{activity.length ? <div className="activity-list">{activity.map((item) => <div className="activity-entry" key={item.id}><div className={`activity-entry-icon ${item.status === 'error' ? 'failed' : ''}`}>{item.status === 'error' ? <X size={15}/> : <Check size={15}/>}</div><div className="activity-entry-content"><div className="activity-entry-heading"><strong>{item.tool}</strong><span className={`trace-status ${item.status === 'error' ? 'failed' : ''}`}>{item.status === 'error' ? 'FAILED' : 'SUCCESS'}</span></div><p>{item.detail}</p><div className="trace-block"><span>INPUT</span><code>{item.argsSummary || 'Connection established'}</code></div>{item.resultSummary && <div className="trace-block"><span>RESULT</span><code>{item.resultSummary}</code></div>}<span className="trace-time">{item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{Number.isFinite(item.durationMs) ? ` · ${item.durationMs} ms` : ''}</span></div></div>)}</div> : <EmptyState title="No calls yet" detail="Ask the Copilot a question to populate this log."/>}<div className="drawer-note"><ShieldCheck size={16}/><span>All tools use local demo records. No real retailer account is contacted.</span></div></section></div>}
    </div>
  );
}

function PurchaseRow({ purchase, onPrepare }) {
  const remaining = daysLeft(purchase.returnDeadline);
  const urgent = remaining !== null && remaining >= 0 && remaining <= 7;
  const expired = remaining !== null && remaining < 0;
  return <article className="purchase-row"><div className={`product-tile ${purchase.category === 'Electronics' ? 'tile-purple' : purchase.category === 'Home' ? 'tile-mint' : 'tile-orange'}`}>{iconFor(purchase, 24)}</div><div className="product-main"><div className="product-name-line"><strong>{purchase.item}</strong><span className={`deadline-tag ${urgent ? 'urgent' : expired ? 'expired' : 'normal'}`}>{urgent ? `${remaining}d left to return` : expired ? 'Return window passed' : `Return by ${formatDate(purchase.returnDeadline)}`}</span></div><div className="product-meta"><span>Order {purchase.orderNumber}</span><i/> <span>Ordered {formatDate(purchase.orderDate)}</span></div><div className="product-issue">{purchase.issue ? <><CircleAlert size={13}/>{purchase.issue}</> : <><CheckCircle2 size={13}/>No issue reported</>}</div></div><div className="product-side"><strong>{money(purchase.price, purchase.currency)}</strong><button className="row-action" onClick={() => onPrepare(purchase, urgent ? 'return' : 'warranty')}><Plus size={14}/><span>{urgent ? 'Prepare return' : 'Open case'}</span></button></div></article>;
}

function CaseRow({ item }) {
  return <article className="case-row"><div className="case-icon"><FileClock size={20}/></div><div className="case-main"><strong>{item.caseType[0].toUpperCase() + item.caseType.slice(1)} · {item.item}</strong><span>{item.id} · Order {item.orderNumber}</span><p>{item.note}</p></div><span className={`case-status ${item.status.startsWith('Draft') ? 'draft' : 'confirmed'}`}>{item.status}</span></article>;
}

function EmptyState({ title, detail }) {
  return <div className="empty-state"><div><Package size={23}/></div><strong>{title}</strong><span>{detail}</span></div>;
}

function ChatMessage({ message, onConfirm, onPrepare }) {
  const data = message.data;
  return <div className={`message-row ${message.role === 'user' ? 'user-message-row' : ''}`}>
    {message.role === 'assistant' && <div className="bot-mini"><Sparkles size={14}/></div>}
    <div className={`message-content ${message.role === 'user' ? 'user-message' : 'assistant-message'} ${message.error ? 'error-message' : ''}`}>
      <p>{message.text}</p>
      {message.tool && <div className="mcp-source-chip"><Activity size={10}/><span>REAL MCP TOOL CALL</span><code>{message.tool}</code></div>}
      {message.tool === 'get_attention_summary' && data?.dueSoon?.length > 0 && <div className="result-mini-list">{data.dueSoon.slice(0, 3).map((p) => <div className="result-purchase" key={p.id}><div className="result-mini-icon">{iconFor(p, 15)}</div><div><strong>{p.item}</strong><span>{p.daysUntilReturnDeadline === 0 ? 'Deadline today' : `${p.daysUntilReturnDeadline} days left`} · by {formatDate(p.returnDeadline)}</span></div></div>)}</div>}
      {message.tool === 'list_purchases' && data?.purchases?.slice(0, 4).map((p) => <div className="inline-purchase" key={p.id}><div className="result-mini-icon">{iconFor(p, 15)}</div><div><strong>{p.item}</strong><span>{money(p.price, p.currency)} · return by {formatDate(p.returnDeadline)}</span></div></div>)}
      {message.tool === 'get_purchase_options' && data?.options?.length > 0 && <div className="options-list">
        {data.options.map((option) => <article className="option-card" key={option.purchaseId}>
          <div className="option-card-heading"><div className="result-mini-icon">{iconFor({ item: option.item }, 15)}</div><div><strong>{option.item}</strong><span>Order {option.orderNumber}</span></div></div>
          <div className="option-dates"><span>Return window: {option.returnWindowListedOpen ? `${option.returnDaysRemaining} day${option.returnDaysRemaining === 1 ? '' : 's'} left` : 'listed deadline passed'}</span><span>Warranty listed through {formatDate(option.warrantyUntil)}</span></div>
          {option.issue && <p className="option-issue">Reported issue: {option.issue}</p>}
          <div className="option-action-list">{option.nextSteps.map((step) => <button className="option-action" key={step.caseType} onClick={() => onPrepare({ id: option.purchaseId, item: option.item, issue: option.issue }, step.caseType)}>{step.label}<ArrowRight size={11}/></button>)}</div>
        </article>)}
        <small className="options-disclaimer">{data.limitation}</small>
      </div>}
      {message.tool === 'check_return_eligibility' && data && !data.error && <div className="eligibility-card"><div className={`eligibility-icon ${data.eligible ? 'good' : 'warn'}`}>{data.eligible ? <CheckCircle2 size={17}/> : <Clock3 size={17}/>}</div><div><strong>{data.eligible ? 'Within demo return window' : 'Demo return deadline passed'}</strong><span>Deadline: {formatDate(data.returnDeadline)}</span></div><span className={`eligibility-badge ${data.eligible ? 'good' : 'warn'}`}>{data.eligible ? 'ELIGIBLE' : 'EXPIRED'}</span><small>{data.limitation}</small></div>}
      {message.tool === 'prepare_case' && data?.case && <div className="draft-card"><div className="draft-top"><span><FileClock size={15}/> DRAFT READY</span><span>{data.case.id}</span></div><strong>{data.case.caseType[0].toUpperCase() + data.case.caseType.slice(1)} · {data.case.item}</strong><p>{data.case.note}</p><div className="draft-warning"><ShieldCheck size={14}/> Nothing has been submitted to a retailer.</div><button onClick={() => onConfirm(data.case.id)}><Check size={15}/> Confirm in demo <ArrowRight size={14}/></button></div>}
      {message.tool === 'list_cases' && data?.cases?.length > 0 && <div className="result-mini-list">{data.cases.slice(0, 3).map((c) => <div className="result-purchase" key={c.id}><div className="result-mini-icon"><FileClock size={15}/></div><div><strong>{c.caseType} · {c.item}</strong><span>{c.id} · {c.status}</span></div></div>)}</div>}
      {message.tool === 'confirm_case_action' && data?.case && <div className="confirmed-card"><CheckCircle2 size={17}/><div><strong>Saved in the demo workspace</strong><span>{data.case.id} · {data.case.status}</span></div></div>}
    </div>
  </div>;
}

export default App;
