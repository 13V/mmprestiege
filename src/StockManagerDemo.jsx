import { useEffect, useReducer, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BatteryFull,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  ImagePlus,
  MessageCircle,
  MoreVertical,
  Pencil,
  Plus,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Signal,
  Smartphone,
  Sparkles,
  Wifi,
} from "lucide-react";
import { vehicles, money, number } from "./data";
import "./stock-manager.css";

const examplePhotos = [
  "/images/car-4.jpg",
  "/images/detail-2.jpg",
  "/images/detail-3.jpg",
];
const exampleVehicle = {
  year: 2017,
  make: "Holden",
  model: "Commodore SS V Redline",
  variant: "VF Series II · V8 sedan",
  transmission: "Automatic",
  engine: "6.2L V8",
  body: "Sedan",
  colour: "Heron White",
  fuel: "Petrol",
};
const title = (car) => `${car.year} ${car.make} ${car.model}`;
const message = (role, text, extra = {}) => ({ role, text, ...extra });
const welcome = message(
  "bot",
  "Hi Madi. Ready to update the showroom?\nChoose what you’d like to do below.",
);
const initialState = () => ({
  inventory: vehicles.map((car) => ({ ...car })),
  stage: "menu",
  mode: null,
  draft: null,
  messages: [welcome],
  activity: [],
  serial: 1,
  previewTab: "available",
});
const next = (state, stage, messages, extra = {}) => ({
  ...state,
  ...extra,
  stage,
  messages: [...state.messages, ...messages],
});

function reducer(state, action) {
  switch (action.type) {
    case "RESET":
      return initialState();
    case "MENU":
      return {
        ...state,
        stage: "menu",
        mode: null,
        draft: null,
        messages: [welcome],
      };
    case "TAB":
      return { ...state, previewTab: action.value };
    case "START_ADD":
      return next(
        state,
        "photos",
        [
          message("user", "Add new vehicle"),
          message(
            "bot",
            "Let’s get a new car on the website.\nSend the photos first. You can send an album, then tap Done with photos.",
          ),
        ],
        {
          mode: "add",
          previewTab: "available",
          draft: {
            id: `demo-vehicle-${state.serial}`,
            stock: `MM${200 + state.serial}`,
            photos: [],
            status: "available",
            description: "",
            price: null,
            kms: null,
          },
        },
      );
    case "PHOTOS": {
      const photos = [...state.draft.photos, ...action.photos];
      return next(
        state,
        state.stage,
        [
          message("user", `${action.photos.length} photos`, {
            photos: action.photos,
          }),
          message(
            "bot",
            `${photos.length} photos received. Add more, or tap Done with photos.`,
          ),
        ],
        { draft: { ...state.draft, photos } },
      );
    }
    case "DONE_PHOTOS": {
      if (!state.draft.photos.length) return state;
      if (state.mode === "edit")
        return next(state, "edit-review", [
          message("user", "Done with photos"),
          message(
            "bot",
            "Your replacement photos are ready. Save changes to update the website.",
          ),
        ]);
      return next(state, "rego", [
        message("user", "Done with photos"),
        message(
          "bot",
          "What’s the registration number?\nNo rego handy? You can enter the car details manually.",
        ),
      ]);
    }
    case "REGO":
      return next(
        state,
        "state",
        [
          message("user", action.value),
          message("bot", "Which state or territory is it registered in?"),
        ],
        {
          draft: {
            ...state.draft,
            rego: action.value.toUpperCase().replace(/\s/g, ""),
          },
        },
      );
    case "STATE": {
      const draft = { ...state.draft, registrationState: action.value };
      const matched = draft.rego === "S123ABC" && action.value === "SA";
      return next(
        state,
        matched ? "confirm" : "manual",
        [
          message("user", action.value),
          message(
            "bot",
            matched
              ? "Example rego match found.\n2017 Holden Commodore SS V Redline\nAutomatic · 6.2L V8 · Heron White\n\nDoes that look right?"
              : "There’s no example match for that rego. Enter the vehicle details below and we’ll keep going.",
          ),
        ],
        { draft: matched ? { ...draft, ...exampleVehicle } : draft },
      );
    }
    case "MANUAL":
      return next(state, "manual", [
        message("user", "Enter details manually"),
        message("bot", "No problem. What car are we listing?"),
      ]);
    case "DETAILS":
      return next(
        state,
        "kms",
        [
          message("user", title(action.details)),
          message("bot", "How many kilometres are on the clock?"),
        ],
        { draft: { ...state.draft, ...action.details } },
      );
    case "CONFIRM_DETAILS":
      return next(state, "kms", [
        message("user", "These details are right"),
        message("bot", "How many kilometres are on the clock?"),
      ]);
    case "KMS":
      return next(
        state,
        state.mode === "edit" ? "edit-review" : "price",
        [
          message("user", `${number(action.value)} km`),
          message(
            "bot",
            state.mode === "edit"
              ? "Kilometres updated in your draft. Ready to save?"
              : "And what’s the asking price, excluding government charges?",
          ),
        ],
        { draft: { ...state.draft, kms: action.value } },
      );
    case "PRICE":
      return next(
        state,
        state.mode === "edit" ? "edit-review" : "review",
        [
          message("user", money(action.value)),
          message(
            "bot",
            state.mode === "edit"
              ? "Price updated in your draft. Ready to save?"
              : "Everything’s ready. Review the listing on the right, then publish when you’re happy.",
          ),
        ],
        { draft: { ...state.draft, price: action.value } },
      );
    case "DESCRIPTION":
      return next(
        state,
        "edit-review",
        [
          message("user", action.value),
          message("bot", "Description updated in your draft. Ready to save?"),
        ],
        { draft: { ...state.draft, description: action.value } },
      );
    case "PUBLISH": {
      if (state.stage !== "review") return state;
      const car = {
        ...state.draft,
        image: state.draft.photos[0],
        description:
          state.draft.description ||
          "New arrival. Contact Madi for details or to arrange a viewing.",
      };
      return next(
        state,
        "finished",
        [
          message("user", "Publish listing"),
          message(
            "bot",
            `Published in the website preview.\n${title(car)} is now in Available stock.\n\nPhotos, details and price—all done from this chat.`,
            { success: true },
          ),
        ],
        {
          inventory: [car, ...state.inventory],
          draft: null,
          serial: state.serial + 1,
          previewTab: "available",
          lastUpdatedId: car.id,
          activity: [
            { text: `${title(car)} added to available stock`, kind: "publish" },
            ...state.activity,
          ],
        },
      );
    }
    case "START_EDIT":
    case "START_SOLD": {
      const mode = action.type === "START_EDIT" ? "edit" : "sold";
      return next(
        state,
        "select",
        [
          message(
            "user",
            mode === "edit" ? "Update listing" : "Mark vehicle sold",
          ),
          message(
            "bot",
            mode === "edit"
              ? "Which listing would you like to update?"
              : "Great news. Which vehicle has sold?",
          ),
        ],
        { mode, draft: null },
      );
    }
    case "SELECT": {
      const car = state.inventory.find((item) => item.id === action.value);
      if (!car) return state;
      return next(
        state,
        state.mode === "edit" ? "edit-fields" : "sold-confirm",
        [
          message("user", title(car)),
          message(
            "bot",
            state.mode === "edit"
              ? `Current asking price: ${money(car.price)}.\nWhat would you like to change?`
              : "Mark this vehicle as sold? It will move out of Available stock and into Sold cars, with the price hidden.",
          ),
        ],
        {
          draft: { ...car, photos: car.photos || [car.image] },
          previewTab: car.status,
        },
      );
    }
    case "EDIT_FIELD":
      return next(
        state,
        `edit-${action.field}`,
        [
          message(
            "user",
            {
              price: "Change price",
              kms: "Change kilometres",
              description: "Edit description",
              photos: "Replace photos",
            }[action.field],
          ),
          message(
            "bot",
            {
              price: "What’s the new asking price?",
              kms: "What’s the updated odometer reading?",
              description: "Send the new listing description.",
              photos:
                "Send the replacement photo album, then tap Done with photos.",
            }[action.field],
          ),
        ],
        action.field === "photos"
          ? { draft: { ...state.draft, photos: [] } }
          : {},
      );
    case "MORE_EDITS":
      return next(state, "edit-fields", [
        message("user", "Edit another field"),
        message("bot", "What else would you like to update?"),
      ]);
    case "SAVE": {
      if (state.stage !== "edit-review") return state;
      const car = { ...state.draft, image: state.draft.photos[0] };
      return next(
        state,
        "finished",
        [
          message("user", "Save changes"),
          message(
            "bot",
            `Listing updated in the website preview.\n${title(car)} now shows your latest details.`,
            { success: true },
          ),
        ],
        {
          inventory: state.inventory.map((item) =>
            item.id === car.id ? car : item,
          ),
          draft: null,
          lastUpdatedId: car.id,
          activity: [
            { text: `${title(car)} listing updated`, kind: "update" },
            ...state.activity,
          ],
        },
      );
    }
    case "SOLD": {
      if (state.stage !== "sold-confirm") return state;
      const car = state.draft;
      return next(
        state,
        "finished",
        [
          message("user", "Confirm sold"),
          message(
            "bot",
            `Marked sold in the website preview.\n${title(car)} has moved to Sold cars. The price is hidden.`,
            { success: true },
          ),
        ],
        {
          inventory: state.inventory.map((item) =>
            item.id === car.id ? { ...item, status: "sold" } : item,
          ),
          draft: null,
          previewTab: "sold",
          lastUpdatedId: car.id,
          activity: [
            { text: `${title(car)} marked sold`, kind: "sold" },
            ...state.activity,
          ],
        },
      );
    }
    default:
      return state;
  }
}

function ListingCard({ car, draft = false, featured = false }) {
  const ready = Boolean(car.make && car.model);
  const photo = draft ? car.photos?.[0] : car.image || car.photos?.[0];
  return (
    <article
      className={`sm-listing${featured ? " featured" : ""}${car.status === "sold" ? " sold" : ""}`}
      data-testid={draft ? "draft-card" : "preview-card"}
      data-vehicle-id={car.id}
      data-status={car.status}
    >
      <div className="sm-listing-photo">
        {photo ? (
          <img
            src={photo}
            alt={
              ready ? `Example photo for ${title(car)}` : "New vehicle photos"
            }
          />
        ) : (
          <div className="sm-placeholder">
            <ImagePlus size={34} />
            <span>Your vehicle photos</span>
          </div>
        )}
        <span className="sm-listing-status">
          {draft ? "DRAFT" : car.status === "sold" ? "SOLD" : "AVAILABLE"}
        </span>
        {car.photos?.length > 1 && (
          <span className="sm-photo-count">
            <ImagePlus size={12} />
            {car.photos.length}
          </span>
        )}
      </div>
      <div className="sm-listing-info">
        <p className="sm-stock-number">{car.stock || "NEW ARRIVAL"}</p>
        <div className="sm-listing-name">
          <h4>{ready ? title(car) : "Your next arrival"}</h4>
          <p>
            {car.variant ||
              (ready
                ? car.transmission || "Vehicle details confirmed"
                : "Details appear as you chat")}
          </p>
        </div>
        <div className="sm-listing-price">
          {car.status === "sold"
            ? "Sold"
            : car.price != null
              ? money(car.price)
              : "Price to be added"}
        </div>
        <div className="sm-listing-specs">
          <span>
            {car.kms != null
              ? `${number(car.kms)} km`
              : "Kilometres to be added"}
          </span>
          <span>{car.transmission || "—"}</span>
        </div>
        {draft && car.description && (
          <p className="sm-draft-description">{car.description}</p>
        )}
        <div className="sm-listing-cta">
          {draft
            ? "Waiting for your confirmation"
            : car.status === "sold"
              ? "Find a similar vehicle"
              : "View vehicle"}
          <ChevronRight size={14} />
        </div>
      </div>
    </article>
  );
}

export default function StockManagerDemo() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState(vehicles[0].id);
  const [manual, setManual] = useState({
    year: "2017",
    make: "",
    model: "",
    transmission: "Automatic",
  });
  const thread = useRef(null);
  const objectUrls = useRef([]);
  const draft = state.draft;
  const available = state.inventory.filter((car) => car.status === "available");
  const sold = state.inventory.filter((car) => car.status === "sold");
  const visible = state.inventory.filter(
    (car) => car.status === state.previewTab,
  );
  const draftPreview = draft && state.mode !== "sold";
  const stageIndex =
    state.stage === "finished"
      ? 2
      : ["menu", "photos", "select"].includes(state.stage)
        ? 0
        : 1;
  useEffect(() => {
    thread.current?.scrollTo({
      top: thread.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.messages, state.stage]);
  useEffect(() => {
    setInput("");
    if (state.stage === "manual")
      setManual({
        year: String(draft?.year || "2017"),
        make: draft?.make || "",
        model: draft?.model || "",
        transmission: draft?.transmission || "Automatic",
      });
    if (state.stage === "select")
      setSelected(
        state.inventory.find((car) => car.status === "available")?.id ||
          (state.mode === "edit" ? state.inventory[0]?.id : "") ||
          "",
      );
  }, [state.stage]);
  useEffect(
    () => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
  function reset() {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current = [];
    dispatch({ type: "RESET" });
  }
  function upload(event) {
    const photos = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => {
        const url = URL.createObjectURL(file);
        objectUrls.current.push(url);
        return url;
      });
    if (photos.length) dispatch({ type: "PHOTOS", photos });
    event.target.value = "";
  }
  function send(event) {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    if (state.stage === "rego") dispatch({ type: "REGO", value });
    else if (state.stage === "edit-description")
      dispatch({ type: "DESCRIPTION", value });
    else {
      const numeric = Number(value.replace(/[$,\s]/g, ""));
      if (
        !Number.isFinite(numeric) ||
        numeric < 0 ||
        !Number.isInteger(numeric)
      )
        return;
      if (["price", "edit-price"].includes(state.stage) && numeric === 0)
        return;
      dispatch({
        type: ["kms", "edit-kms"].includes(state.stage) ? "KMS" : "PRICE",
        value: numeric,
      });
    }
    setInput("");
  }
  const canCompose = [
    "rego",
    "kms",
    "price",
    "edit-price",
    "edit-kms",
    "edit-description",
  ].includes(state.stage);
  const numericInput = ["kms", "price", "edit-kms", "edit-price"].includes(
    state.stage,
  );
  const inputLabel =
    state.stage === "rego"
      ? "Registration number"
      : ["kms", "edit-kms"].includes(state.stage)
        ? "Kilometres"
        : state.stage === "edit-description"
          ? "Listing description"
          : "Asking price";
  function actionButton(label, type, className = "primary", extra = {}) {
    return (
      <button
        className={className}
        onClick={() => dispatch({ type, ...extra })}
      >
        {label}
        <ArrowRight size={14} />
      </button>
    );
  }
  function controls() {
    switch (state.stage) {
      case "menu":
        return (
          <div className="sm-bot-menu">
            <button onClick={() => dispatch({ type: "START_ADD" })}>
              <Plus size={18} />
              Add new vehicle
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => dispatch({ type: "START_SOLD" })}
              disabled={!available.length}
            >
              <CheckCheck size={18} />
              Mark vehicle sold
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => dispatch({ type: "START_EDIT" })}
              disabled={!state.inventory.length}
            >
              <Pencil size={18} />
              Update listing
              <ChevronRight size={15} />
            </button>
          </div>
        );
      case "photos":
      case "edit-photos":
        return (
          <>
            <div className="sm-chat-actions">
              <label className="sm-upload-button">
                <ImagePlus size={16} />
                Upload photos
                <input
                  aria-label="Upload vehicle photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={upload}
                />
              </label>
              <button
                className="secondary"
                onClick={() =>
                  dispatch({ type: "PHOTOS", photos: examplePhotos })
                }
              >
                Use example photos
              </button>
              <button
                className="primary"
                disabled={!draft.photos.length}
                onClick={() => dispatch({ type: "DONE_PHOTOS" })}
              >
                Done with photos
                <Check size={15} />
              </button>
            </div>
            <p className="sm-composer-hint">
              {draft.photos.length
                ? `${draft.photos.length} photos in this album`
                : "Upload an album or try the example photos."}
            </p>
          </>
        );
      case "rego":
        return (
          <div className="sm-chat-actions">
            {actionButton("Use example rego", "REGO", "secondary", {
              value: "S123ABC",
            })}
            {actionButton("Enter details manually", "MANUAL", "secondary")}
          </div>
        );
      case "state":
        return (
          <div className="sm-chat-actions sm-state-buttons">
            {["SA", "VIC", "NSW", "QLD", "WA", "TAS", "ACT", "NT"].map(
              (value) => (
                <button
                  key={value}
                  onClick={() => dispatch({ type: "STATE", value })}
                >
                  {value}
                </button>
              ),
            )}
          </div>
        );
      case "confirm":
        return (
          <div className="sm-chat-actions">
            {actionButton("These details are right", "CONFIRM_DETAILS")}
            {actionButton("Enter details manually", "MANUAL", "secondary")}
          </div>
        );
      case "manual":
        return (
          <form
            className="sm-form-inline"
            onSubmit={(event) => {
              event.preventDefault();
              dispatch({
                type: "DETAILS",
                details: {
                  ...manual,
                  year: Number(manual.year),
                  make: manual.make.trim(),
                  model: manual.model.trim(),
                },
              });
            }}
          >
            <label>
              Year
              <input
                aria-label="Year"
                type="number"
                min="1950"
                max="2027"
                required
                value={manual.year}
                onChange={(event) =>
                  setManual({ ...manual, year: event.target.value })
                }
              />
            </label>
            <label>
              Make
              <input
                aria-label="Make"
                required
                pattern=".*\S.*"
                placeholder="e.g. Holden"
                value={manual.make}
                onChange={(event) =>
                  setManual({ ...manual, make: event.target.value })
                }
              />
            </label>
            <label>
              Model
              <input
                aria-label="Model"
                required
                pattern=".*\S.*"
                placeholder="e.g. Commodore SS V Redline"
                value={manual.model}
                onChange={(event) =>
                  setManual({ ...manual, model: event.target.value })
                }
              />
            </label>
            <label>
              Transmission
              <select
                aria-label="Transmission"
                value={manual.transmission}
                onChange={(event) =>
                  setManual({ ...manual, transmission: event.target.value })
                }
              >
                <option>Automatic</option>
                <option>Manual</option>
              </select>
            </label>
            <button type="submit">
              Use these details
              <ArrowRight size={15} />
            </button>
          </form>
        );
      case "kms":
        return (
          <div className="sm-chat-actions">
            {actionButton("Use 72,850 km", "KMS", "secondary", {
              value: 72850,
            })}
          </div>
        );
      case "price":
        return (
          <div className="sm-chat-actions">
            {actionButton("Use $64,990", "PRICE", "secondary", {
              value: 64990,
            })}
          </div>
        );
      case "review":
        return (
          <div className="sm-chat-actions">
            {actionButton("Publish listing", "PUBLISH")}
            {actionButton("Cancel listing", "MENU", "secondary")}
          </div>
        );
      case "select":
        return (
          <div className="sm-form-inline">
            <label>
              Vehicle
              <select
                aria-label="Vehicle to manage"
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                {state.inventory
                  .filter(
                    (car) =>
                      state.mode === "edit" || car.status === "available",
                  )
                  .map((car) => (
                    <option key={car.id} value={car.id}>
                      {title(car)}
                      {car.status === "sold" ? " · Sold" : ""}
                    </option>
                  ))}
              </select>
            </label>
            <button
              disabled={!selected}
              onClick={() => dispatch({ type: "SELECT", value: selected })}
            >
              Continue with vehicle
              <ArrowRight size={15} />
            </button>
          </div>
        );
      case "edit-fields":
        return (
          <div className="sm-chat-actions">
            {[
              ["price", "Change price"],
              ["kms", "Change kilometres"],
              ["description", "Edit description"],
              ["photos", "Replace photos"],
            ].map(([field, label]) => (
              <button
                key={field}
                onClick={() => dispatch({ type: "EDIT_FIELD", field })}
              >
                {label}
                <Pencil size={13} />
              </button>
            ))}
          </div>
        );
      case "edit-review":
        return (
          <div className="sm-chat-actions">
            {actionButton("Save changes", "SAVE")}
            {actionButton("Edit another field", "MORE_EDITS", "secondary")}
            {actionButton("Cancel changes", "MENU", "secondary")}
          </div>
        );
      case "sold-confirm":
        return (
          <div className="sm-chat-actions">
            {actionButton("Confirm sold", "SOLD")}
            {actionButton("Keep available", "MENU", "secondary")}
          </div>
        );
      case "finished":
        return (
          <div className="sm-chat-actions">
            {actionButton("Back to menu", "MENU")}
          </div>
        );
      default:
        return null;
    }
  }
  return (
    <div className="stock-manager">
      <header className="sm-topbar">
        <Link to="/" className="sm-brand">
          <b>MM PRESTIEGE</b>
          <small>M O T O R S</small>
        </Link>
        <div className="sm-top-actions">
          <span className="sm-demo-badge">
            <Radio size={13} />
            Interactive concept
          </span>
          <Link to="/stock" className="sm-back-link">
            View website
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>
      <main className="sm-page">
        <section className="sm-hero">
          <div className="sm-eyebrow">
            <span />
            LESS ADMIN. MORE TIME ON THE FLOOR.
          </div>
          <h1>
            The showroom,
            <br />
            <span>in your pocket.</span>
          </h1>
          <p>
            Send the photos. Confirm the details. Your stock is on the website.
            <br className="sm-desktop-break" /> Manage arrivals, updates and
            sold cars from one Telegram chat.
          </p>
          <div className="sm-hero-note">
            <Smartphone size={16} />
            <span>No laptop. No double handling.</span>
          </div>
        </section>
        <div className="sm-steps" aria-label="Workflow progress">
          {["Start in Telegram", "Confirm the details", "Website updates"].map(
            (label, index) => (
              <div
                key={label}
                className={`sm-step${index === stageIndex ? " active" : index < stageIndex ? " done" : ""}`}
              >
                <span className="sm-step-number">
                  {index < stageIndex ? <Check size={14} /> : `0${index + 1}`}
                </span>
                <span>{label}</span>
                {index < 2 && <ChevronRight size={17} />}
              </div>
            ),
          )}
        </div>
        <div className="sm-workspace">
          <section
            className="sm-telegram-column"
            aria-label="Telegram bot demo"
          >
            <div className="sm-panel-heading">
              <div className="sm-panel-kicker">
                <Send size={14} />
                THE CONVERSATION
              </div>
              <h2>Your stock assistant</h2>
              <p>Tap a menu button to try it yourself.</p>
            </div>
            <div className="sm-phone">
              <div className="sm-phone-status">
                <span>9:41</span>
                <div>
                  <Signal size={13} />
                  <Wifi size={13} />
                  <BatteryFull size={17} />
                </div>
              </div>
              <div className="sm-chat-header">
                <ArrowLeft size={18} />
                <div className="sm-bot-avatar">
                  <Send size={22} />
                </div>
                <div className="sm-chat-title">
                  <b>MM Stock Assistant</b>
                  <small>bot · MM Prestiege Motors</small>
                </div>
                <MoreVertical size={18} />
              </div>
              <div
                className="sm-chat-thread"
                ref={thread}
                role="log"
                aria-label="Stock assistant conversation"
                aria-live="polite"
              >
                <div className="sm-chat-date">Today</div>
                {state.messages.map((item, index) => (
                  <div
                    key={index}
                    className={`sm-message ${item.role}${item.success ? " success" : ""}`}
                  >
                    {item.success && (
                      <div className="sm-message-heading">
                        <CheckCheck size={16} />
                        Website preview updated
                      </div>
                    )}
                    {item.photos && (
                      <div className="sm-message-photos">
                        {item.photos.slice(0, 6).map((photo, photoIndex) => (
                          <img
                            key={`${photo}-${photoIndex}`}
                            src={photo}
                            alt={`Uploaded vehicle photo ${photoIndex + 1}`}
                          />
                        ))}
                      </div>
                    )}
                    <div className="sm-message-body">{item.text}</div>
                    <div className="sm-message-time">
                      9:41{item.role === "user" && <CheckCheck size={12} />}
                    </div>
                  </div>
                ))}
                <div className="sm-chat-controls">{controls()}</div>
              </div>
              {canCompose ? (
                <form className="sm-composer" onSubmit={send}>
                  <MessageCircle size={18} />
                  <input
                    aria-label={inputLabel}
                    type={numericInput ? "number" : "text"}
                    min={["kms", "edit-kms"].includes(state.stage) ? 0 : 1}
                    step="1"
                    placeholder={
                      inputLabel === "Asking price"
                        ? "e.g. 64990"
                        : inputLabel === "Kilometres"
                          ? "e.g. 72850"
                          : inputLabel === "Registration number"
                            ? "Type the rego…"
                            : "Type your description…"
                    }
                    inputMode={numericInput ? "numeric" : "text"}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    aria-label="Send message"
                    disabled={!input.trim()}
                  >
                    <Send size={18} />
                  </button>
                </form>
              ) : (
                <div className="sm-composer idle">
                  <MessageCircle size={18} />
                  <span>Choose an option above</span>
                  <Send size={18} />
                </div>
              )}
            </div>
            <button className="sm-reset-button" onClick={reset}>
              <RotateCcw size={14} />
              Reset demo
            </button>
            <a className="sm-preview-jump" href="#stock-preview">
              View website preview <ArrowRight size={14} />
            </a>
          </section>
          <section
            className="sm-site-column"
            aria-label="Website and listing preview"
          >
            <div className="sm-panel-heading">
              <div className="sm-panel-kicker">
                <Sparkles size={14} />
                THE RESULT
              </div>
              <h2>Your website, up to date.</h2>
              <p>
                {draftPreview
                  ? "A listing draft, ready for your final say."
                  : "Watch your stock change as you use the bot."}
              </p>
            </div>
            <div className="sm-browser" data-testid="stock-preview" id="stock-preview">
              <div className="sm-browser-bar">
                <div className="sm-browser-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="sm-browser-address">
                  <ShieldCheck size={12} />
                  Your dealership website
                </div>
                <span className="sm-preview-badge">Preview</span>
              </div>
              <div className="sm-site-header">
                <div>
                  <b>MM PRESTIEGE</b>
                  <small>M O T O R S</small>
                </div>
                <div className="sm-site-nav">
                  <span>Our stock</span>
                  <span>
                    Contact us
                    <ArrowRight size={11} />
                  </span>
                </div>
              </div>
              <div className="sm-site-body">
                <div className="sm-site-summary">
                  <div>
                    <h3>
                      {draftPreview
                        ? "Your next arrival"
                        : state.previewTab === "sold"
                          ? "Recently sold"
                          : "Available stock"}
                    </h3>
                    <p>
                      {draftPreview
                        ? "Check it here. Publish it from the chat."
                        : "Performance cars. Personal service."}
                    </p>
                  </div>
                  <span className="sm-summary-count">
                    {state.previewTab === "sold"
                      ? sold.length
                      : available.length}{" "}
                    cars
                  </span>
                </div>
                <div className="sm-stock-tabs">
                  <button
                    aria-label="Available"
                    aria-pressed={state.previewTab === "available"}
                    className={
                      state.previewTab === "available" ? "selected" : ""
                    }
                    onClick={() =>
                      dispatch({ type: "TAB", value: "available" })
                    }
                  >
                    Available{" "}
                    <span data-testid="preview-available-count">
                      {available.length}
                    </span>
                  </button>
                  <button
                    aria-label="Sold"
                    aria-pressed={state.previewTab === "sold"}
                    className={state.previewTab === "sold" ? "selected" : ""}
                    onClick={() => dispatch({ type: "TAB", value: "sold" })}
                  >
                    Sold{" "}
                    <span data-testid="preview-sold-count">{sold.length}</span>
                  </button>
                </div>
                {draftPreview && (
                  <div className="sm-draft-section">
                    <div className="sm-draft-label">
                      <Clock3 size={13} />
                      Draft · waiting for confirmation
                    </div>
                    <ListingCard car={draft} draft />
                  </div>
                )}
                {state.stage === "finished" && (
                  <div className="sm-site-notice">
                    <CheckCheck size={15} />
                    {state.mode === "add"
                      ? "New arrival added to available stock"
                      : state.mode === "sold"
                        ? "Sold status updated · price hidden"
                        : "Listing changes saved"}
                  </div>
                )}
                <div className="sm-site-grid">
                  {visible.map((car) => (
                    <ListingCard
                      key={car.id}
                      car={car}
                      featured={
                        state.stage === "finished" &&
                        car.id === state.lastUpdatedId
                      }
                    />
                  ))}
                </div>
                {!visible.length && (
                  <div className="sm-empty-stock">
                    No {state.previewTab === "sold" ? "sold" : "available"}{" "}
                    vehicles in this preview.
                  </div>
                )}
                <div className="sm-site-footnote">
                  Website preview · Sample stock and photography
                </div>
              </div>
            </div>
            <div className="sm-activity">
              <div className="sm-activity-heading">
                <span>
                  <Radio size={14} />
                  Stock activity
                </span>
                <span>
                  {state.activity.length
                    ? `${state.activity.length} update${state.activity.length === 1 ? "" : "s"}`
                    : "Ready when you are"}
                </span>
              </div>
              {state.activity.length ? (
                <ol aria-label="Stock activity">
                  {state.activity.slice(0, 3).map((item, index) => (
                    <li key={`${item.text}-${index}`}>
                      <span className="sm-activity-dot">
                        <Check size={12} />
                      </span>
                      <span>{item.text}</span>
                      <time>Just now</time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>
                  Start a conversation on the left. Your confirmed changes
                  appear here.
                </p>
              )}
            </div>
          </section>
        </div>
        <section
          className="sm-value-grid"
          aria-label="Stock management benefits"
        >
          <article>
            <ImagePlus size={23} />
            <h3>Photos in. Listing out.</h3>
            <p>
              Send an album once. The photos go straight into your vehicle
              listing.
            </p>
          </article>
          <article>
            <ShieldCheck size={23} />
            <h3>You have the final say.</h3>
            <p>
              Check the car, kilometres and price before anything gets
              published.
            </p>
          </article>
          <article>
            <CheckCheck size={23} />
            <h3>Keep the showroom current.</h3>
            <p>
              New arrivals, price changes and sold cars. All from the same chat.
            </p>
          </article>
        </section>
        <footer className="sm-demo-footer">
          <span>MM PRESTIEGE MOTORS · STOCK MANAGEMENT CONCEPT</span>
          <p>
            Interactive demo. Registration lookups and website publishing are
            simulated; changes stay in this preview.
          </p>
        </footer>
      </main>
    </div>
  );
}
