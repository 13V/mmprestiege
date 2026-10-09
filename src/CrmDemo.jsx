import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Columns3,
  LayoutList,
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { vehicles, money } from "./data";
import "./crm-demo.css";

const stages = [
  { id: "new", label: "New enquiry", color: "#2563ad", bg: "#eaf3ff" },
  { id: "contacted", label: "Contacted", color: "#7651b1", bg: "#f1ebfb" },
  { id: "test-drive", label: "Test drive", color: "#97701b", bg: "#fff6d9" },
  { id: "negotiating", label: "Negotiating", color: "#b45d26", bg: "#fff0e6" },
  { id: "deposit", label: "Deposit paid", color: "#267968", bg: "#e6f5ee" },
  { id: "delivered", label: "Delivered", color: "#297647", bg: "#e9f5e7" },
  { id: "lost", label: "Lost", color: "#747782", bg: "#eeeff2" },
];
const sources = [
  "Website",
  "Phone",
  "Facebook",
  "Carsales",
  "Walk-in",
  "Referral",
];
const stageFor = (id) => stages.find((stage) => stage.id === id) || stages[0];
const carFor = (id) => vehicles.find((car) => car.id === id) || vehicles[0];
const carName = (id) => {
  const car = carFor(id);
  return `${car.year} ${car.make} ${car.model}`;
};
const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
const stageStyle = (stage) => ({
  "--stage-color": stage.color,
  "--stage-bg": stage.bg,
});
function clientDay(offset = 0) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Adelaide",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  const day = new Date(
    `${get("year")}-${get("month")}-${get("day")}T12:00:00Z`,
  );
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}
const today = clientDay();
function dateLabel(date) {
  if (!date) return "No follow-up";
  if (date === today) return "Today";
  if (date === clientDay(1)) return "Tomorrow";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "Australia/Adelaide",
  }).format(new Date(`${date}T12:00:00Z`));
}
function timeLabel(time) {
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "pm" : "am"}`;
}
const comment = (id, text, at = "Yesterday") => ({
  id,
  text,
  at,
  author: "Madi",
  kind: "comment",
});
function seedLeads() {
  return [
    {
      id: "lead-1",
      name: "James Wilson",
      phone: "04•• ••• 118",
      email: "james@example.com",
      vehicleId: "hsv-gts-2016",
      stage: "new",
      source: "Website",
      followDate: today,
      followTime: "11:00",
      tradeIn: "No trade-in",
      finance: "To discuss",
      notes: [
        comment(
          "j1",
          "Website enquiry about the GTS. Wants to know about service history and interstate transport.",
          "Today, 9:10 am",
        ),
      ],
    },
    {
      id: "lead-2",
      name: "Daniel Russo",
      phone: "04•• ••• 602",
      email: "daniel@example.com",
      vehicleId: "holden-ss-v-redline-2017",
      stage: "contacted",
      source: "Facebook",
      followDate: clientDay(1),
      followTime: "10:00",
      tradeIn: "2016 Volkswagen Golf GTI",
      finance: "Pre-approved",
      notes: [
        comment(
          "d1",
          "Spoke on the phone. Looking for a clean Redline; send service records before booking a visit.",
        ),
      ],
    },
    {
      id: "lead-3",
      name: "Sarah Mitchell",
      phone: "04•• ••• 394",
      email: "sarah@example.com",
      vehicleId: "hsv-clubsport-r8-2015",
      stage: "test-drive",
      source: "Phone",
      followDate: today,
      followTime: "14:30",
      tradeIn: "2013 Holden Commodore SV6",
      finance: "Pre-approved",
      notes: [
        comment(
          "s2",
          "Test drive confirmed for 2:30 pm today. Have the Clubsport ready and allow time for a trade-in appraisal.",
          "Today, 9:20 am",
        ),
        comment(
          "s1",
          "Looking for a manual V8. Budget around $60k. Wants to trade in her SV6 and keep finance repayments similar.",
          "Yesterday, 10:15 am",
        ),
      ],
    },
    {
      id: "lead-4",
      name: "Michael Chen",
      phone: "04•• ••• 761",
      email: "michael@example.com",
      vehicleId: "ford-mustang-gt-2019",
      stage: "negotiating",
      source: "Carsales",
      followDate: clientDay(-1),
      followTime: "16:00",
      tradeIn: "No trade-in",
      finance: "Cash buyer",
      notes: [
        comment(
          "m1",
          "Liked the Mustang after the test drive. Asked for a revised offer. Follow up before the weekend.",
        ),
      ],
    },
    {
      id: "lead-5",
      name: "Emma Carter",
      phone: "04•• ••• 225",
      email: "emma@example.com",
      vehicleId: "holden-redline-ute-2017",
      stage: "new",
      source: "Website",
      followDate: clientDay(1),
      followTime: "09:00",
      tradeIn: "2014 Ford Ranger",
      finance: "To discuss",
      notes: [
        comment(
          "e1",
          "Interested in the Redline ute. Asked whether we can appraise her Ranger.",
          "Today, 10:05 am",
        ),
      ],
    },
    {
      id: "lead-6",
      name: "Andrew Lewis",
      phone: "04•• ••• 880",
      email: "andrew@example.com",
      vehicleId: "hsv-maloo-r8-2014",
      stage: "deposit",
      source: "Walk-in",
      followDate: today,
      followTime: "15:00",
      tradeIn: "No trade-in",
      finance: "Cash buyer",
      notes: [
        comment(
          "a1",
          "Deposit recorded in this example. Confirm handover time, final payment and detailing before collection.",
        ),
      ],
    },
    {
      id: "lead-7",
      name: "Olivia Parker",
      phone: "04•• ••• 513",
      email: "olivia@example.com",
      vehicleId: "hsv-gts-2016",
      stage: "delivered",
      source: "Referral",
      followDate: "",
      followTime: "",
      tradeIn: "No trade-in",
      finance: "Not required",
      notes: [
        comment(
          "o1",
          "Vehicle handed over. Customer happy with the experience; check in next week.",
          "4 days ago",
        ),
      ],
    },
    {
      id: "lead-8",
      name: "Ben Thompson",
      phone: "04•• ••• 047",
      email: "ben@example.com",
      vehicleId: "holden-redline-ute-2017",
      stage: "lost",
      source: "Facebook",
      followDate: "",
      followTime: "",
      tradeIn: "No trade-in",
      finance: "To discuss",
      notes: [
        comment(
          "b1",
          "Purchased elsewhere. Keep the context here in case he comes back for another car.",
          "3 days ago",
        ),
      ],
    },
  ];
}
function useDialogFocus(ref, active, close) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const before = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = ref.current;
    const focusables = () =>
      Array.from(
        dialog.querySelectorAll("button,a[href],input,select,textarea"),
      ).filter(
        (element) => !element.disabled && element.getClientRects().length,
      );
    focusables()[0]?.focus();
    const handle = (event) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const items = focusables(),
        first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = oldOverflow;
      dialog.removeEventListener("keydown", handle);
      before?.focus();
    };
  }, [active, close, ref]);
}

function StageSelect({ lead, label, onChange }) {
  const stage = stageFor(lead.stage);
  return (
    <select
      className="crm-stage-select"
      aria-label={label || `Stage for ${lead.name}`}
      style={stageStyle(stage)}
      value={lead.stage}
      onChange={(event) => onChange(lead.id, event.target.value)}
    >
      {stages.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

export default function CrmDemo() {
  const [leads, setLeads] = useState(seedLeads);
  const [narrow, setNarrow] = useState(
    () => window.matchMedia("(max-width: 1050px)").matches,
  );
  const [selectedId, setSelectedId] = useState(() =>
    window.matchMedia("(max-width: 1050px)").matches ? null : "lead-3",
  );
  const [view, setView] = useState("customers");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [note, setNote] = useState("");
  const [followDate, setFollowDate] = useState("");
  const [followTime, setFollowTime] = useState("");
  const [showNewLead, setShowNewLead] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    email: "",
    vehicleId: vehicles[0].id,
    source: "Website",
    tradeIn: "",
    note: "",
  });
  const [toast, setToast] = useState("");
  const detailRef = useRef(null),
    modalRef = useRef(null);
  const lastSelected = useRef(selectedId);
  const selected = leads.find((lead) => lead.id === selectedId);
  const closeDetail = useCallback(() => setSelectedId(null), []);
  const closeNew = useCallback(() => setShowNewLead(false), []);
  useDialogFocus(
    detailRef,
    Boolean(selected && narrow && !showNewLead),
    closeDetail,
  );
  useDialogFocus(modalRef, showNewLead, closeNew);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1050px)");
    const change = () => setNarrow(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    setNote("");
    setFollowDate(selected?.followDate || "");
    setFollowTime(selected?.followTime || "");
  }, [selectedId]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const active = leads.filter(
    (lead) => !["delivered", "lost"].includes(lead.stage),
  );
  const due = active.filter(
    (lead) => lead.followDate && lead.followDate <= today,
  );
  const filtered = leads.filter((lead) => {
    const text =
      `${lead.name} ${lead.phone} ${lead.email} ${carName(lead.vehicleId)} ${lead.source} ${lead.tradeIn} ${lead.notes.map((item) => item.text).join(" ")}`.toLowerCase();
    return (
      (filter === "all" || lead.stage === filter) &&
      (!search.trim() || text.includes(search.trim().toLowerCase()))
    );
  });
  function updateStage(id, nextStage) {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === id && lead.stage !== nextStage
          ? {
              ...lead,
              stage: nextStage,
              notes: [
                {
                  id: `stage-${Date.now()}`,
                  author: "Madi",
                  kind: "stage",
                  at: "Just now",
                  text: `Moved from ${stageFor(lead.stage).label} to ${stageFor(nextStage).label}.`,
                },
                ...lead.notes,
              ],
            }
          : lead,
      ),
    );
    setToast(`Stage changed to ${stageFor(nextStage).label}`);
  }
  function addNote(event) {
    event.preventDefault();
    if (!note.trim() || !selected) return;
    setLeads((current) =>
      current.map((lead) =>
        lead.id === selected.id
          ? {
              ...lead,
              notes: [
                comment(`note-${Date.now()}`, note.trim(), "Just now"),
                ...lead.notes,
              ],
            }
          : lead,
      ),
    );
    setNote("");
    setToast("Comment added to customer");
  }
  function saveFollowup(event) {
    event.preventDefault();
    if (!selected) return;
    setLeads((current) =>
      current.map((lead) =>
        lead.id === selected.id
          ? {
              ...lead,
              followDate,
              followTime: followDate ? followTime : "",
              notes: [
                {
                  id: `follow-${Date.now()}`,
                  author: "Madi",
                  kind: "follow-up",
                  at: "Just now",
                  text: followDate
                    ? `Follow-up set for ${dateLabel(followDate)}${followTime ? ` at ${timeLabel(followTime)}` : ""}.`
                    : "Follow-up cleared.",
                },
                ...lead.notes,
              ],
            }
          : lead,
      ),
    );
    setToast(followDate ? "Follow-up saved" : "Follow-up cleared");
  }
  function reset() {
    lastSelected.current = narrow ? null : "lead-3";
    setLeads(seedLeads());
    setSelectedId(narrow ? null : "lead-3");
    setSearch("");
    setFilter("all");
    setView("customers");
    setNote("");
    setFollowDate(today);
    setFollowTime("14:30");
    setShowNewLead(false);
    setToast("Demo reset");
  }
  function addLead(event) {
    event.preventDefault();
    const name = newLead.name.trim();
    if (!name || !newLead.phone.trim()) return;
    const lead = {
      id: `lead-${leads.length + 1}`,
      name,
      phone: newLead.phone.trim(),
      email: newLead.email.trim(),
      vehicleId: newLead.vehicleId,
      stage: "new",
      source: newLead.source,
      followDate: today,
      followTime: "",
      tradeIn: newLead.tradeIn.trim() || "No trade-in",
      finance: "To discuss",
      notes: newLead.note.trim()
        ? [comment(`first-${Date.now()}`, newLead.note.trim(), "Just now")]
        : [],
    };
    setLeads((current) => [lead, ...current]);
    setSearch("");
    setFilter("all");
    setView("customers");
    setSelectedId(lead.id);
    lastSelected.current = lead.id;
    setShowNewLead(false);
    setToast(`${name} added to enquiries`);
  }
  function openNew() {
    setNewLead({
      name: "",
      phone: "",
      email: "",
      vehicleId: vehicles[0].id,
      source: "Website",
      tradeIn: "",
      note: "",
    });
    if (narrow) setSelectedId(null);
    setShowNewLead(true);
  }
  function openLead(id) {
    lastSelected.current = id;
    setSelectedId(id);
  }
  function changeView(nextView) {
    if (nextView === "pipeline") {
      if (selectedId) lastSelected.current = selectedId;
      setSelectedId(null);
    } else if (!selectedId && !narrow) {
      setSelectedId(lastSelected.current || "lead-3");
    }
    setView(nextView);
  }
  const noteCount = (lead) =>
    lead.notes.filter((item) => item.kind === "comment").length;
  const customerButton = (lead) => (
    <button
      className="crm-customer-button"
      aria-label={`Open ${lead.name}`}
      onClick={() => openLead(lead.id)}
    >
      <span
        className="crm-avatar"
        data-tone={Number(lead.id.split("-")[1]) % 5}
      >
        {initials(lead.name)}
      </span>
      <span>
        <b>{lead.name}</b>
        <small>{lead.phone}</small>
      </span>
    </button>
  );
  return (
    <div className="crm-demo">
      <div className="crm-shell">
        <aside className="crm-sidebar">
          <Link to="/" className="crm-sidebar-brand">
            <b>MM PRESTIEGE</b>
            <small>M O T O R S</small>
          </Link>
          <div className="crm-workspace-name">
            <span>SHOWROOM WORKSPACE</span>
            <span>Wingfield, SA</span>
          </div>
          <nav className="crm-nav" aria-label="Showroom tools">
            <Link
              to="/crm"
              className="active"
              aria-label="Sales pipeline"
              aria-current="page"
            >
              <Users size={18} />
              <span className="crm-nav-label">Sales pipeline</span>
              <span className="crm-nav-count" aria-hidden="true">
                {leads.length}
              </span>
            </Link>
            <Link to="/stock-manager" aria-label="Stock assistant">
              <Send size={18} />
              <span className="crm-nav-label">Stock assistant</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/stock" aria-label="Website stock">
              <CarFront size={18} />
              <span className="crm-nav-label">Website stock</span>
              <ArrowRight size={14} />
            </Link>
          </nav>
          <div className="crm-sidebar-note">
            <ShieldCheck size={20} />
            <b>
              A personal touch,
              <br />
              at every stage.
            </b>
            <p>Keep the car, conversation and next step together.</p>
          </div>
          <div className="crm-account">
            <span className="crm-avatar">M</span>
            <span>
              <b>Madi</b>
              <small>Dealership owner</small>
            </span>
          </div>
        </aside>
        <main className="crm-main">
          <header className="crm-topbar">
            <div className="crm-breadcrumb">
              <span>Showroom</span>
              <ChevronRight size={13} />
              <b>Sales pipeline</b>
            </div>
            <div className="crm-top-actions">
              <span className="crm-concept-badge">Interactive mockup</span>
              <button className="crm-reset" onClick={reset}>
                <RotateCcw size={14} />
                Reset demo
              </button>
            </div>
          </header>
          <div className="crm-page-heading">
            <div>
              <div className="crm-eyebrow">LEADS & CUSTOMER RELATIONSHIPS</div>
              <h1>Sales pipeline</h1>
              <p>From the first enquiry to the keys in their hand.</p>
            </div>
            <div className="crm-heading-actions">
              <span className="crm-today">
                <CalendarDays size={14} />
                {new Intl.DateTimeFormat("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  timeZone: "Australia/Adelaide",
                }).format(new Date())}
              </span>
              <button className="crm-primary" onClick={openNew}>
                <Plus size={16} />
                Add lead
              </button>
            </div>
          </div>
          <section className="crm-metrics" aria-label="Lead summary">
            <article>
              <div className="crm-metric-label">
                <span>Active leads</span>
                <Users size={17} />
              </div>
              <div className="crm-metric-number">
                {active.length}
                <small>
                  {" "}
                  / <span data-testid="crm-total-leads">
                    {leads.length}
                  </span>{" "}
                  total
                </small>
              </div>
              <p className="crm-metric-note">
                Customers still in the sales journey
              </p>
            </article>
            <article>
              <div className="crm-metric-label">
                <span>Follow-ups due</span>
                <Clock3 size={17} />
              </div>
              <div className="crm-metric-number">
                {due.length}
                <span className="crm-metric-tag">Today & overdue</span>
              </div>
              <p className="crm-metric-note">Keep the conversation moving</p>
            </article>
            <article>
              <div className="crm-metric-label">
                <span>Test drives</span>
                <CarFront size={17} />
              </div>
              <div className="crm-metric-number">
                {leads.filter((lead) => lead.stage === "test-drive").length}
                <small> booked</small>
              </div>
              <p className="crm-metric-note">Get the right car ready</p>
            </article>
            <article>
              <div className="crm-metric-label">
                <span>Potential deal value</span>
                <TrendingUp size={17} />
              </div>
              <div className="crm-metric-number crm-money">
                {money(
                  active.reduce(
                    (sum, lead) => sum + carFor(lead.vehicleId).price,
                    0,
                  ),
                )}
              </div>
              <p className="crm-metric-note">
                Asking prices across active enquiries
              </p>
            </article>
          </section>
          <div className={`crm-content${selected ? " has-detail" : ""}`}>
            <section className="crm-board" aria-label="Customer lead board">
              <div className="crm-toolbar">
                <div className="crm-view-tabs">
                  <button
                    className={view === "customers" ? "active" : ""}
                    aria-pressed={view === "customers"}
                    onClick={() => changeView("customers")}
                  >
                    <LayoutList size={15} />
                    Customers
                  </button>
                  <button
                    className={view === "pipeline" ? "active" : ""}
                    aria-pressed={view === "pipeline"}
                    onClick={() => changeView("pipeline")}
                  >
                    <Columns3 size={15} />
                    Pipeline
                  </button>
                </div>
                <div className="crm-search">
                  <Search size={15} />
                  <input
                    aria-label="Search customers"
                    placeholder="Search name, car or notes…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="crm-board-meta">
                <div>
                  <b>All enquiries</b>
                  <span>
                    {filtered.length} customer{filtered.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="crm-stage-filter">
                  <select
                    aria-label="Filter by stage"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                  >
                    <option value="all">All stages</option>
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                  {(search || filter !== "all") && (
                    <button
                      className="crm-filter-reset"
                      onClick={() => {
                        setSearch("");
                        setFilter("all");
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
              {view === "customers" ? (
                <div className="crm-lead-table">
                  <table>
                    <caption className="crm-sr-only">
                      Customers, vehicle interests, sales stages and next
                      follow-ups
                    </caption>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Vehicle interest</th>
                        <th>Stage</th>
                        <th>Follow-up</th>
                        <th>Source</th>
                        <th aria-label="Comments">
                          <MessageSquare size={14} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((lead) => (
                        <tr
                          key={lead.id}
                          className={`crm-lead-row${selectedId === lead.id ? " selected" : ""}`}
                          data-testid="crm-lead-row"
                          data-lead-id={lead.id}
                        >
                          <td>{customerButton(lead)}</td>
                          <td>
                            <div className="crm-vehicle-cell">
                              <b>
                                {carFor(lead.vehicleId).make}{" "}
                                {carFor(lead.vehicleId).model}
                              </b>
                              <small>
                                {carFor(lead.vehicleId).year} ·{" "}
                                {money(carFor(lead.vehicleId).price)}
                              </small>
                            </div>
                          </td>
                          <td>
                            <StageSelect lead={lead} onChange={updateStage} />
                          </td>
                          <td>
                            <div
                              className={`crm-followup${lead.followDate && lead.followDate < today ? " overdue" : lead.followDate === today ? " today" : ""}`}
                            >
                              <span>{dateLabel(lead.followDate)}</span>
                              <small>{timeLabel(lead.followTime)}</small>
                            </div>
                          </td>
                          <td>
                            <span className="crm-source">{lead.source}</span>
                          </td>
                          <td>
                            <button
                              className="crm-detail-button"
                              aria-label={`Comments for ${lead.name}`}
                              onClick={() => openLead(lead.id)}
                            >
                              <MessageSquare size={13} />
                              {noteCount(lead)}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="crm-kanban" aria-label="Sales stages">
                  {stages.map((stage) => (
                    <section
                      key={stage.id}
                      className="crm-kanban-column"
                      style={stageStyle(stage)}
                      data-testid="crm-pipeline-column"
                      data-stage={stage.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const id = event.dataTransfer.getData("text/plain");
                        if (leads.some((lead) => lead.id === id))
                          updateStage(id, stage.id);
                      }}
                    >
                      <div className="crm-kanban-heading">
                        <span /> <b>{stage.label}</b>
                        <small>
                          {
                            filtered.filter((lead) => lead.stage === stage.id)
                              .length
                          }
                        </small>
                      </div>
                      {filtered
                        .filter((lead) => lead.stage === stage.id)
                        .map((lead) => (
                          <article
                            key={lead.id}
                            className="crm-kanban-card"
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/plain", lead.id);
                              event.dataTransfer.effectAllowed = "move";
                            }}
                            data-testid="crm-pipeline-card"
                            data-lead-id={lead.id}
                          >
                            <button
                              onClick={() => openLead(lead.id)}
                              aria-label={`Open ${lead.name}`}
                            >
                              <span className="crm-kanban-customer">
                                <span className="crm-avatar">
                                  {initials(lead.name)}
                                </span>
                                <b>{lead.name}</b>
                              </span>
                              <span className="crm-kanban-car">
                                {carName(lead.vehicleId)}
                              </span>
                              <span className="crm-kanban-value">
                                {money(carFor(lead.vehicleId).price)}
                              </span>
                            </button>
                            <StageSelect lead={lead} onChange={updateStage} />
                            <div className="crm-kanban-meta">
                              <span>
                                <CalendarDays size={12} />
                                {dateLabel(lead.followDate)}
                              </span>
                              <span>
                                <MessageSquare size={12} />
                                {noteCount(lead)}
                              </span>
                            </div>
                          </article>
                        ))}
                    </section>
                  ))}
                </div>
              )}
              {!filtered.length && (
                <div className="crm-empty">
                  <Search size={25} />
                  <h3>No matching customers</h3>
                  <p>Try another name, vehicle or stage.</p>
                  <button
                    className="crm-secondary"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    Show all customers
                  </button>
                </div>
              )}
              <div className="crm-board-bottom">
                <span>
                  <span className="crm-owner">M</span>Managed by Madi
                </span>
                <span>
                  {view === "pipeline"
                    ? "Drag a card or choose its stage to move it."
                    : "Click a customer to see their conversation and next step."}
                </span>
              </div>
            </section>
            {selected && (
              <>
                {narrow && (
                  <button
                    className="crm-panel-backdrop"
                    aria-label="Dismiss customer details"
                    onClick={closeDetail}
                  />
                )}
                <aside
                  className="crm-detail-panel"
                  ref={detailRef}
                  data-testid="crm-lead-detail"
                  role={narrow ? "dialog" : undefined}
                  aria-modal={narrow ? "true" : undefined}
                  aria-label="Customer details"
                >
                  <div className="crm-detail-header">
                    <span>Customer details</span>
                    <button
                      className="crm-detail-close"
                      aria-label="Close customer details"
                      onClick={closeDetail}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="crm-detail-customer">
                    <span
                      className="crm-avatar"
                      data-tone={Number(selected.id.split("-")[1]) % 5}
                    >
                      {initials(selected.name)}
                    </span>
                    <div>
                      <h2>{selected.name}</h2>
                      <p>{selected.source} enquiry · Assigned to Madi</p>
                    </div>
                  </div>
                  <div className="crm-detail-contact">
                    <span>{selected.phone}</span>
                    <span>{selected.email || "Email not recorded"}</span>
                  </div>
                  <div className="crm-detail-section">
                    <div className="crm-section-label">VEHICLE INTEREST</div>
                    <div className="crm-detail-vehicle">
                      <img
                        src={carFor(selected.vehicleId).image}
                        alt="Example vehicle photography"
                      />
                      <div className="crm-vehicle-summary">
                        <b>{carName(selected.vehicleId)}</b>
                        <small>
                          {carFor(selected.vehicleId).stock} ·{" "}
                          {carFor(selected.vehicleId).transmission}
                        </small>
                        <strong>
                          {money(carFor(selected.vehicleId).price)}
                        </strong>
                      </div>
                    </div>
                    <div className="crm-tradein">
                      <span>
                        <CarFront size={14} />
                        Trade-in
                      </span>
                      <b>{selected.tradeIn}</b>
                    </div>
                    <div className="crm-tradein">
                      <span>
                        <Wallet size={14} />
                        Finance
                      </span>
                      <b>{selected.finance}</b>
                    </div>
                  </div>
                  <div className="crm-detail-section">
                    <div className="crm-section-label">SALES STAGE</div>
                    <StageSelect
                      lead={selected}
                      label="Customer stage"
                      onChange={updateStage}
                    />
                  </div>
                  <form
                    className="crm-detail-section crm-detail-fields"
                    onSubmit={saveFollowup}
                  >
                    <div className="crm-section-label">
                      NEXT FOLLOW-UP <span>Adelaide time</span>
                    </div>
                    <div className="crm-followup-fields">
                      <label>
                        Date
                        <input
                          aria-label="Follow-up date"
                          type="date"
                          value={followDate}
                          onChange={(event) =>
                            setFollowDate(event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Time
                        <input
                          aria-label="Follow-up time"
                          type="time"
                          value={followTime}
                          onChange={(event) =>
                            setFollowTime(event.target.value)
                          }
                          disabled={!followDate}
                        />
                      </label>
                    </div>
                    <button className="crm-secondary" type="submit">
                      <Check size={13} />
                      Save follow-up
                    </button>
                  </form>
                  <div className="crm-detail-section crm-notes">
                    <div className="crm-section-label">
                      COMMENTS & ACTIVITY{" "}
                      <span>
                        {noteCount(selected)} comment
                        {noteCount(selected) === 1 ? "" : "s"}
                      </span>
                    </div>
                    <form className="crm-comment-form" onSubmit={addNote}>
                      <textarea
                        aria-label="Add a comment"
                        placeholder="Test drive feedback, trade-in details, next steps…"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={3}
                        required
                      />
                      <button
                        className="crm-primary"
                        disabled={!note.trim()}
                        type="submit"
                      >
                        <Plus size={13} />
                        Add comment
                      </button>
                    </form>
                    <div className="crm-note-list">
                      {selected.notes.map((item) => (
                        <article
                          className={`crm-note ${item.kind}`}
                          key={item.id}
                        >
                          <div className="crm-note-head">
                            <span className="crm-note-avatar">
                              {item.kind === "comment" ? (
                                "M"
                              ) : (
                                <Check size={11} />
                              )}
                            </span>
                            <b>{item.author}</b>
                            <time>{item.at}</time>
                          </div>
                          <p>{item.text}</p>
                        </article>
                      ))}
                      {!selected.notes.length && (
                        <p className="crm-no-comments">
                          No comments yet. Start with what matters to this
                          customer.
                        </p>
                      )}
                    </div>
                  </div>
                </aside>
              </>
            )}
          </div>
          <footer className="crm-footer">
            <span>
              <CircleHelp size={13} />
              Sample customers · Changes stay in this mockup
            </span>
            <span>One customer. One conversation. A clear next step.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="crm-toast" role="status">
          <Check size={14} />
          {toast}
        </div>
      )}
      {showNewLead && (
        <div
          className="crm-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeNew();
          }}
        >
          <section
            className="crm-new-lead-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="New customer enquiry"
            ref={modalRef}
          >
            <div className="crm-new-lead-header">
              <div>
                <h2>New customer enquiry</h2>
                <p>Capture the customer, the car and the conversation.</p>
              </div>
              <button aria-label="Close new enquiry" onClick={closeNew}>
                <X size={18} />
              </button>
            </div>
            <form className="crm-new-lead-form" onSubmit={addLead}>
              <label>
                Customer name
                <input
                  aria-label="Customer name"
                  value={newLead.name}
                  onChange={(event) =>
                    setNewLead({ ...newLead, name: event.target.value })
                  }
                  required
                  pattern=".*\S.*"
                  placeholder="Full name"
                />
              </label>
              <div className="crm-form-grid">
                <label>
                  Phone number
                  <input
                    aria-label="Phone number"
                    type="tel"
                    value={newLead.phone}
                    onChange={(event) =>
                      setNewLead({ ...newLead, phone: event.target.value })
                    }
                    required
                    pattern=".*\S.*"
                    placeholder="Mobile number"
                  />
                </label>
                <label>
                  Email address
                  <input
                    aria-label="Email address"
                    type="email"
                    value={newLead.email}
                    onChange={(event) =>
                      setNewLead({ ...newLead, email: event.target.value })
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>
              <label>
                Vehicle interest
                <select
                  aria-label="Vehicle interest"
                  value={newLead.vehicleId}
                  onChange={(event) =>
                    setNewLead({ ...newLead, vehicleId: event.target.value })
                  }
                >
                  {vehicles
                    .filter((car) => car.status === "available")
                    .map((car) => (
                      <option key={car.id} value={car.id}>
                        {carName(car.id)}
                      </option>
                    ))}
                </select>
              </label>
              <div className="crm-form-grid">
                <label>
                  Lead source
                  <select
                    aria-label="Lead source"
                    value={newLead.source}
                    onChange={(event) =>
                      setNewLead({ ...newLead, source: event.target.value })
                    }
                  >
                    {sources.map((source) => (
                      <option key={source}>{source}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Trade-in vehicle
                  <input
                    aria-label="Trade-in vehicle"
                    value={newLead.tradeIn}
                    onChange={(event) =>
                      setNewLead({ ...newLead, tradeIn: event.target.value })
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>
              <label>
                Initial comment
                <textarea
                  aria-label="Initial comment"
                  value={newLead.note}
                  onChange={(event) =>
                    setNewLead({ ...newLead, note: event.target.value })
                  }
                  placeholder="What are they looking for?"
                  rows={3}
                />
              </label>
              <div className="crm-form-actions">
                <button
                  type="button"
                  className="crm-secondary"
                  onClick={closeNew}
                >
                  Cancel
                </button>
                <button type="submit" className="crm-primary">
                  Save lead
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
