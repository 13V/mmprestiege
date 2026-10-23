import React, {
  lazy,
  Suspense,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Link,
  Outlet,
  ScrollRestoration,
  useOutletContext,
  useLocation,
  useSearchParams,
  useParams,
  useNavigate,
  UNSAFE_ViewTransitionContext as ViewTransitionContext,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Phone,
  MapPin,
  Heart,
  Search,
  SlidersHorizontal,
  X,
  Menu,
  Gauge,
  Cog,
  Fuel,
  CalendarDays,
  Check,
  Expand,
  CarFront,
  MessageSquare,
  Plus,
  Minus,
  Copy,
  Send,
  Quote,
  Camera,
  Zap,
  Share2,
  Pause,
  Play,
} from "lucide-react";
import { money, number, business } from "./data";
import { sampleStock, vehicles } from "./stock";
import ThemedSelect from "./ThemedSelect";
import { prefetch, responsive, smallest } from "./images";
import "./styles.css";
import "./dealer.css";
import "./foundation.css";
import "./collection.css";
import "./direction.css";
import "./showroom-hero.css";
import "./mm-prestige.css";
import "./inner-pages.css";
import "./typeface.css";
import "./motion.css";

// How wide each photo is drawn, so the browser can pick the right size.
const SIZES = {
  card:
    "(max-width: 600px) 92vw, (max-width: 900px) 46vw, " +
    "(max-width: 1100px) 31vw, 24vw",
  hero: "100vw",
  offerPanel: "(max-width: 600px) 46vw, 30vw",
  offerCutout: "(max-width: 600px) 40vw, 22vw",
  banner: "100vw",
  stage: "(max-width: 960px) 92vw, 66vw",
  thumb: "(max-width: 700px) 24vw, 11vw",
  avatar: "56px",
};

const StockManagerDemo = lazy(() => import("./StockManagerDemo"));
const CrmDemo = lazy(() => import("./CrmDemo"));
const StockAdmin = lazy(() => import("./admin/StockAdmin.jsx"));

function Logo() {
  return (
    <Link
      to="/"
      className="brand"
      aria-label="MM Prestige Motors home"
      viewTransition
    >
      <span>
        <b>MM Prestige</b>
        <small>Motors</small>
      </span>
    </Link>
  );
}
function App() {
  const [saved, setSaved] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("mm-saved") || "[]");
      return Array.isArray(stored)
        ? stored.filter((id) => vehicles.some((car) => car.id === id))
        : [];
    } catch {
      return [];
    }
  });
  const [enquiry, setEnquiry] = useState(null);
  useEffect(() => {
    document.documentElement.dataset.theme = "red";
    try {
      localStorage.setItem("mm-theme", "red");
    } catch {
      // The black and red theme is applied even when storage is blocked.
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("mm-saved", JSON.stringify(saved));
    } catch {
      // Keep saved cars available for this visit if browser storage is blocked.
    }
  }, [saved]);
  function toggleSaved(id) {
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  return (
    <>
      <ScrollRestoration />
      <DocumentTitle />
      <SiteLayout
        onEnquire={(details = {}) => setEnquiry(details)}
        savedCount={saved.length}
      >
        <Suspense
          fallback={
            <div role="status" style={{ padding: "40px" }}>
              Loading workspace…
            </div>
          }
        >
          <Outlet
            context={{ saved, toggleSaved, onEnquire: setEnquiry }}
          />
        </Suspense>
      </SiteLayout>
      {enquiry && (
        <Enquiry
          vehicle={enquiry.id ? enquiry : null}
          purpose={enquiry.purpose}
          onClose={() => setEnquiry(null)}
        />
      )}
    </>
  );
}
const REVEAL_TARGETS = [
  ".marque-marquee",
  ".section-title",
  ".offer-copy",
  ".offer-performance",
  ".offer-stack > *",
  ".card-grid > .car-card",
  ".carousel-controls",
  ".reference-sell > div",
  ".review-grid > .review",
  ".contact-copy",
  ".contact-location",
  ".vehicle-about",
  ".stock-toolbar",
  ".stock-empty",
  ".stock-help",
  ".footer-main > div",
];
// Elements only start hidden once they are being observed, so anything
// missed (or re-rendered with a new class list) simply stays visible.
function useReveal(pathname) {
  useEffect(() => {
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let observer;
    const frame = requestAnimationFrame(() => {
      const shell = document.querySelector(".site-shell");
      if (!shell) return;
      // Cards are revealed with their grid: on phones the grid scrolls
      // sideways, so cards off to the side never cross the viewport.
      const groups = new Map();
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            groups
              .get(entry.target)
              ?.forEach((el) => el.classList.add("is-revealed"));
            observer.unobserve(entry.target);
          }),
        { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
      );
      shell.querySelectorAll(REVEAL_TARGETS.join(",")).forEach((el) => {
        if (el.closest(".reference-hero") || el.classList.contains("is-revealed"))
          return;
        // Elements kept across a route change are watched again until shown.
        if (!el.classList.contains("reveal")) {
          const index = [...el.parentElement.children].indexOf(el);
          el.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 70}ms`);
          el.classList.add("reveal");
        }
        const target = el.closest(".card-grid") || el;
        if (!groups.has(target)) {
          groups.set(target, []);
          observer.observe(target);
        }
        groups.get(target).push(el);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [pathname]);
}
function SiteLayout({ children, onEnquire, savedCount }) {
  const { pathname } = useLocation();
  useReveal(pathname);
  if (["/stock-manager", "/crm", "/stock/manage"].includes(pathname.replace(/\/$/, "")))
    return children;
  return (
    <div
      className="site-shell home-shell"
    >
      <Header onEnquire={onEnquire} savedCount={savedCount} />
      {children}
      <Footer />
    </div>
  );
}
// Scrolling is handled by <ScrollRestoration />: new pages open at the top
// (or at their #section), and Back returns to where the visitor was.
function DocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const vehicle = vehicles.find((car) => pathname === `/stock/${car.id}`);
    const route = pathname.replace(/\/$/, "");
    document.title =
      route === "/crm"
        ? "Sales CRM mockup | MM Prestige Motors"
        : route === "/stock-manager"
          ? "Stock management demo | MM Prestige Motors"
          : route === "/stock/manage"
            ? "Stock manager | MM Prestige Motors"
            : vehicle
              ? `${vehicle.year} ${vehicle.make} ${vehicle.model} | MM Prestige Motors`
              : route === "/stock"
                ? "Our collection | MM Prestige Motors"
                : route === ""
                  ? "MM Prestige Motors | HSV & Holden Specialists, Adelaide"
                  : "Page not found | MM Prestige Motors";
  }, [pathname]);
  return null;
}
function Header({ onEnquire, savedCount = 0 }) {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // Float once the header has scrolled out of view.
      setCompact(window.scrollY > 110);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  const menuButton = useRef(null);
  const navigation = useRef(null);
  const { pathname, search, hash } = useLocation();
  const soldView =
    pathname === "/stock" &&
    new URLSearchParams(search).get("status") === "sold";
  useEffect(() => setOpen(false), [pathname, search]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  useEffect(() => {
    if (open) navigation.current?.querySelector("a")?.focus();
  }, [open]);
  // A hash-only change doesn't close the menu, and re-selecting the current
  // section doesn't change the location, so scroll to it directly.
  const goToSection = (id) => () => {
    setOpen(false);
    if (pathname === "/" && hash === `#${id}`)
      document.getElementById(id)?.scrollIntoView({ behavior: "instant" });
  };
  return (
    <>
      <div className="utility">
        <span>
          <MapPin size={12} /> Wingfield, South Australia
        </span>
        <a href={`tel:${business.tel}`}>
          <Phone size={12} />
          {business.phone}
        </a>
      </div>
      <header
        className={compact ? "header is-compact" : "header"}
        onBlur={(event) => {
          // relatedTarget is null when a click doesn't move focus (Safari).
          if (
            open &&
            event.relatedTarget &&
            !event.currentTarget.contains(event.relatedTarget)
          )
            setOpen(false);
        }}
      >
        <div className="header-inner">
          <Logo />
          <nav
            ref={navigation}
            id="main-navigation"
            className={open ? "nav open" : "nav"}
            aria-label="Main navigation"
          >
            <Link
              className={pathname === "/" ? "active" : ""}
              to="/"
              viewTransition
            >
              Home
            </Link>
            <Link to="/#visit" onClick={goToSection("visit")}>
              About us
            </Link>
            <Link
              className={
                pathname.startsWith("/stock") && !soldView ? "active" : ""
              }
              to="/stock"
              viewTransition
            >
              Inventory
            </Link>
            <Link
              className={`nav-sold ${soldView ? "active" : ""}`}
              to="/stock?status=sold"
              viewTransition
            >
              Sold cars
            </Link>
            <Link to="/#services" onClick={goToSection("services")}>
              Services
            </Link>
            {savedCount > 0 && (
              <Link className="nav-saved" to="/stock?status=all&saved=1">
                Saved cars <span>{savedCount}</span>
              </Link>
            )}
          </nav>
          <div className="header-actions">
            <a
              className="header-call"
              href={`tel:${business.tel}`}
              aria-label={`Call us on ${business.phone}`}
            >
              <Phone size={16} />
              <span>{business.phone}</span>
            </a>
            {savedCount > 0 && (
              <Link
                className="header-saved"
                to="/stock?status=all&saved=1"
                aria-label={`Saved cars (${savedCount})`}
              >
                <Heart size={18} />
                <span>{savedCount}</span>
              </Link>
            )}
            <button
              className="button small header-enquire"
              onClick={() => {
                setOpen(false);
                onEnquire({ purpose: "sell" });
              }}
            >
              Sell your car
            </button>
            <button
              ref={menuButton}
              className="menu-button"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="main-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
// Splits a title into words that rise into place in turn (see motion.css).
// A "\n" in the text starts a new line.
function RevealWords({ text }) {
  let index = 0;
  return text.split("\n").map((line, l, lines) => (
    <React.Fragment key={l}>
      {line.split(" ").map((word, w, words) => (
        <React.Fragment key={w}>
          <span className="word" style={{ "--i": index++ }}>
            <span>{word}</span>
          </span>
          {w < words.length - 1 && " "}
        </React.Fragment>
      ))}
      {l < lines.length - 1 && (
        <>
          {" "}
          <br />
        </>
      )}
    </React.Fragment>
  ));
}
// While a view transition to a car's listing runs, its card photo and the
// listing's main photo share one name, so the photo morphs between them.
// Only the destination car is named, so no two elements ever share it.
function useCarMorph(id) {
  const transition = useContext(ViewTransitionContext);
  return transition?.isTransitioning &&
    transition.nextLocation?.pathname === `/stock/${id}`
    ? "car-photo"
    : undefined;
}
function CarCard({ car, saved, toggleSaved }) {
  const morph = useCarMorph(car.id);
  // Hovering with a mouse fades in the car's second photo once it loads;
  // whichever photo is showing is the one that morphs into the listing.
  const second = car.status === "available" && car.gallery?.[1];
  const [peek, setPeek] = useState(false),
    [peekReady, setPeekReady] = useState(false),
    [hover, setHover] = useState(false);
  const peeking = hover && peekReady;
  // Warm the listing's main photo so it is ready to morph into.
  const warm = () => prefetch(car.gallery?.[0] || car.image, SIZES.stage);
  return (
    <article
      className={`car-card collection-card ${car.status === "sold" ? "sold-card" : ""}`}
      onPointerEnter={(event) => {
        warm();
        if (event.pointerType !== "mouse") return;
        setHover(true);
        if (second) setPeek(true);
      }}
      onPointerLeave={() => setHover(false)}
      onFocus={warm}
    >
      <div className="card-heading">
        <Link className="card-title" to={`/stock/${car.id}`} viewTransition>
          {car.make} {car.model}
        </Link>
        <p className="card-variant">
          {car.year} {car.variant}
        </p>
      </div>
      <Link
        className="card-photo"
        to={`/stock/${car.id}`}
        aria-label={`View ${car.year} ${car.make} ${car.model}`}
        viewTransition
      >
        <img
          {...responsive(car.image, SIZES.card)}
          alt={`${car.colour} ${car.make} ${car.model}`}
          loading="lazy"
          style={{ viewTransitionName: peeking ? undefined : morph }}
        />
        {peek && (
          <img
            className={`card-photo-peek${peeking ? " is-shown" : ""}`}
            {...responsive(second, SIZES.card)}
            alt=""
            onLoad={() => setPeekReady(true)}
            style={{ viewTransitionName: peeking ? morph : undefined }}
          />
        )}
        {car.status === "sold" ? (
          <span className="car-tag sold-tag">SOLD</span>
        ) : (
          car.tag && <span className="car-tag stock-tag">{car.tag}</span>
        )}
      </Link>
      <div className="card-body">
        <div className="card-bottom">
          <div>
            {car.status === "sold" ? (
              <b className="sold-price">Sold</b>
            ) : (
              <>
                <strong>{money(car.price)}</strong>
                <small>Excl. government charges</small>
              </>
            )}
          </div>
          <button
            className={`save-car ${saved.includes(car.id) ? "is-saved" : ""}`}
            aria-label={`${saved.includes(car.id) ? "Unsave" : "Save"} ${car.make} ${car.model}`}
            aria-pressed={saved.includes(car.id)}
            onClick={() => toggleSaved(car.id)}
          >
            <Heart
              size={20}
              fill={saved.includes(car.id) ? "currentColor" : "none"}
            />
          </button>
        </div>
        <div className="card-specs">
          <span>
            <small>On the clock</small>
            <Gauge size={16} />
            {number(car.kms)} km
          </span>
          <span>
            <small>Transmission</small>
            <Cog size={16} />
            {car.transmission}
          </span>
          <span>
            <small>Fuel type</small>
            <Fuel size={16} />
            {car.fuel}
          </span>
        </div>
        <p className="card-location">
          <MapPin size={14} />
          Wingfield, South Australia
        </p>
        <Link
          className="card-detail-button"
          to={`/stock/${car.id}`}
          viewTransition
        >
          View vehicle <ChevronRight size={17} />
        </Link>
        <a className="card-call-button" href={`tel:${business.tel}`}>
          Call {business.phone}
        </a>
      </div>
    </article>
  );
}
function HomeSearch() {
  const navigate = useNavigate();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [budget, setBudget] = useState("");
  const [stock, setStock] = useState("available");
  const makes = [...new Set(vehicles.map((car) => car.make))];
  const models = [
    ...new Set(
      vehicles
        .filter((car) => !make || car.make === make)
        .map((car) => car.model),
    ),
  ];
  function submit(event) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (stock === "all") query.set("status", "all");
    if (make) query.set("make", make);
    if (model) query.set("model", model);
    if (budget) query.set("max", budget);
    navigate(`/stock${query.size ? `?${query}` : ""}`, { viewTransition: true });
  }
  return (
    <form className="hero-search" onSubmit={submit} aria-label="Find a car">
      <ThemedSelect
        label="Stock availability"
        value={stock}
        onChange={setStock}
        options={[
          { value: "available", label: "In stock" },
          { value: "all", label: "All cars" },
        ]}
      />
      <ThemedSelect
        label="Car make"
        value={make}
        onChange={(value) => {
          setMake(value);
          setModel("");
        }}
        options={[
          { value: "", label: "Any makes" },
          ...makes.map((value) => ({ value, label: value })),
        ]}
      />
      <ThemedSelect
        label="Car model"
        value={model}
        onChange={setModel}
        options={[
          { value: "", label: "Any models" },
          ...models.map((value) => ({ value, label: value })),
        ]}
      />
      <ThemedSelect
        label="Car budget"
        value={budget}
        onChange={setBudget}
        options={[
          { value: "", label: "All pricing" },
          ...[50000, 60000, 70000, 100000].map((value) => ({
            value: String(value),
            label: `Up to ${money(value)}`,
          })),
        ]}
      />
      <button type="submit">Search</button>
    </form>
  );
}
const SPECIALTIES = ["HSV", "Holden", "Commodore", "Clubsport", "Maloo", "Prestige"];
// Showroom films (public/video, made by scripts/films): AV1 for Chrome, Edge
// and Firefox, HEVC for Safari and H.264 for anything else; 1920 px on
// larger screens and 1280 px on phones.
// Bump after re-encoding the films (scripts/films/encode.sh), so browsers
// fetch the new files instead of a copy cached for up to a day.
const FILM_VERSION = 2;
function filmSources(name) {
  const size = window.matchMedia("(max-width: 700px)").matches ? 1280 : 1920;
  return [
    [`/video/showroom-${name}-${size}.av1.mp4`, 'video/mp4; codecs="av01.0.08M.08"'],
    [`/video/showroom-${name}-${size}.hevc.mp4`, 'video/mp4; codecs="hvc1.1.6.L120.90"'],
    [`/video/showroom-${name}-1280.mp4`, 'video/mp4; codecs="avc1.640028"'],
  ].map(([src, type]) => [`${src}?v=${FILM_VERSION}`, type]);
}
function filmPausedByVisitor() {
  try {
    return localStorage.getItem("mm-film") === "paused";
  } catch {
    return false;
  }
}
// A muted showroom film loops behind a hero once the page has loaded. The
// hero photo stays underneath, and the film only shows while it plays, so a
// slow connection, blocked autoplay or a paused film leaves the photo.
// Visitors who prefer reduced motion or save data keep the photo. The
// button pauses the film and the specialties marquee, and is remembered.
function HeroFilm({ name, minWidth = 0 }) {
  const video = useRef(null);
  const [ready, setReady] = useState(false),
    [playing, setPlaying] = useState(false),
    [blocked, setBlocked] = useState(false),
    [paused, setPaused] = useState(filmPausedByVisitor);
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      navigator.connection?.saveData ||
      !window.matchMedia(`(min-width: ${minWidth}px)`).matches
    )
      return;
    // Wait for the page (and its photos) to load, then a quiet moment.
    let idle;
    const start = () =>
      (idle = (window.requestIdleCallback || setTimeout)(() => setReady(true)));
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      (window.cancelIdleCallback || clearTimeout)(idle);
    };
  }, [minWidth]);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-motion-paused", paused);
    try {
      localStorage.setItem("mm-film", paused ? "paused" : "playing");
    } catch {
      // The choice still applies for this visit if storage is blocked.
    }
  }, [paused]);
  // Play only while the hero is on screen and the tab is visible.
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.muted = true;
    let visible = false;
    const sync = () => {
      if (visible && !paused && !document.hidden)
        element.play().catch(() => setBlocked(true));
      else element.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ready, paused]);
  if (!ready) return null;
  const toggle = () => {
    if (playing) return setPaused(true);
    setPaused(false);
    setBlocked(false);
    video.current?.play().catch(() => setBlocked(true));
  };
  return (
    <>
      <video
        ref={video}
        className={`reference-hero-image hero-film${playing ? " is-playing" : ""}`}
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        {filmSources(name).map(([src, type]) => (
          <source key={src} src={src} type={type} />
        ))}
      </video>
      {(playing || paused || blocked) && (
        <button
          type="button"
          className="hero-film-toggle"
          aria-label={
            playing ? "Pause the showroom video" : "Play the showroom video"
          }
          onClick={toggle}
        >
          {playing ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
        </button>
      )}
    </>
  );
}
function Home({ saved, toggleSaved, onEnquire }) {
  const [collectionTab, setCollectionTab] = useState("available");
  const [featuredStart, setFeaturedStart] = useState(0);
  const collection = vehicles.filter(
    (car) => collectionTab === "all" || car.status === collectionTab,
  );
  const maxFeaturedStart = Math.max(0, collection.length - 4);
  const featured = collection.slice(featuredStart, featuredStart + 4);
  return (
    <main className="dealer-home reference-home">
      <section className="reference-hero showroom-hero">
        <img
          className="reference-hero-image"
          {...responsive("/images/showroom-lineup.jpg", SIZES.hero)}
          alt="HSVs lined up under the MM Prestige Motors sign in the Wingfield showroom"
          fetchPriority="high"
        />
        <HeroFilm name="walk" />
        <div className="reference-hero-content">
          <h1 className="reveal-words">
            <RevealWords text="HSV & Holden specialists" />
          </h1>
          <HomeSearch />
        </div>
        <div className="hero-footnote">
          <p>
            HSV, Holden and Australian muscle.
            <br />
            Buy, sell or trade with Madi.
            <br />
            Wingfield, South Australia.
          </p>
          <small>Pictured: our Wingfield showroom</small>
        </div>
        <a
          className="hero-map"
          href={business.maps}
          target="_blank"
          rel="noreferrer"
        >
          <span>
            <MapPin size={24} fill="currentColor" />
            <b>View on the map</b>
          </span>
          <p>
            {business.address}
            <br />
            {business.suburb}
          </p>
        </a>
      </section>
      <div className="marque-marquee">
        <ul
          className="marque-strip marque-words"
          aria-label="Our specialties — not a list of current inventory"
        >
          {SPECIALTIES.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <ul className="marque-strip marque-words marque-copy" aria-hidden="true">
          {SPECIALTIES.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
      <section className="reference-offer offer-bento" id="services">
        <div className="offer-copy">
          <h2 className="reveal-words">
            <RevealWords text="What we offer" />
          </h2>
          <p>
            Prestige and performance cars, with a focus on
            <br className="desktop-break" /> HSV, Holden Commodore and
            Australian muscle.
          </p>
          <ol>
            <li>
              <span>01</span>HSV, Holden and Australian performance cars
            </li>
            <li>
              <span>02</span>Talk directly with Madi
            </li>
            <li>
              <span>03</span>Buy, sell or trade your next car
            </li>
            <li>
              <span>04</span>Viewings by arrangement in Wingfield
            </li>
          </ol>
          <Link className="button primary" to="/stock" viewTransition>
            Explore more <ArrowRight size={16} />
          </Link>
        </div>
        <Link className="offer-performance" to="/stock" viewTransition>
          <div>
            <h3>Performance</h3>
            <p>For the drive you look forward to.</p>
          </div>
          <img
            {...responsive("/images/performance-ferrari-gts.jpg", SIZES.offerPanel)}
            alt="A red Ferrari 360 Modena beside a red HSV Maloo and a red HSV GTS in the showroom"
            loading="lazy"
          />
          <ArrowUpRight className="offer-arrow" size={23} />
        </Link>
        <div className="offer-stack">
          <button className="offer-trade" onClick={() => onEnquire({})}>
            <h3>Next up.</h3>
            <p>Buy. Sell. Trade.</p>
            <img
              {...responsive("/images/clubsport-cutout.webp", SIZES.offerCutout)}
              alt=""
              loading="lazy"
            />
            <span>
              Let’s talk cars <ArrowUpRight size={18} />
            </span>
          </button>
          <CallTile />
        </div>
      </section>
      <section className="section collection reference-collection">
        <div className="section-title">
          <h2 className="reveal-words">
            <RevealWords text="From our collection" />
          </h2>
        </div>
        <div className="home-collection-toolbar">
          <div
            className="home-collection-tabs"
            role="group"
            aria-label="Featured stock availability"
          >
            {[
              ["available", "In stock"],
              ["sold", "Sold cars"],
              ["all", "All cars"],
            ].map(([value, text]) => (
              <button
                key={value}
                className={collectionTab === value ? "selected" : ""}
                aria-pressed={collectionTab === value}
                onClick={() => {
                  setCollectionTab(value);
                  setFeaturedStart(0);
                }}
              >
                {text}
              </button>
            ))}
          </div>
          <Link className="button primary" to="/stock" viewTransition>
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {featured.length ? (
          <div className="card-grid featured">
            {featured.map((car) => (
              <CarCard key={car.id} {...{ car, saved, toggleSaved }} />
            ))}
          </div>
        ) : (
          <div className="stock-empty">
            <Search size={28} />
            <h3>
              {collectionTab === "sold"
                ? "No sold cars to show yet."
                : "New arrivals are on the way."}
            </h3>
            <p>Tell Madi what you're after.</p>
            <div className="stock-empty-actions">
              <button
                className="button primary"
                onClick={() => onEnquire({ purpose: "find" })}
              >
                Ask Madi to find one <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
        <div className="carousel-controls" hidden={!collection.length}>
          <button
            aria-label="Previous featured cars"
            aria-disabled={featuredStart === 0}
            onClick={() => setFeaturedStart((start) => Math.max(0, start - 1))}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            aria-label="Next featured cars"
            aria-disabled={featuredStart === maxFeaturedStart}
            onClick={() =>
              setFeaturedStart((start) => Math.min(maxFeaturedStart, start + 1))
            }
          >
            <ArrowRight size={16} />
          </button>
        </div>
        {sampleStock && (
          <p className="sample-note">
            Sample listings shown while the website is being prepared. Photos
            are from our Wingfield showroom; prices and details are examples.
            Call us for current availability.
          </p>
        )}
        <Link
          className="text-link collection-explore"
          to="/stock"
          viewTransition
        >
          Explore our stock <ArrowRight size={18} />
        </Link>
      </section>
      <section className="reference-sell">
        <img
          {...responsive("/images/sell-showroom-overhead.jpg", SIZES.banner)}
          alt="The Wingfield showroom from above: the MM Prestige Motors wall sign over rows of HSVs, with a Ferrari 360 in front"
          loading="lazy"
        />
        <div>
          <h2 className="reveal-words">
            <RevealWords text={"Sell your car to\nour dealership"} />
          </h2>
          <p>
            Ready for something different? Talk with Madi
            <br className="desktop-break" /> about selling or trading your car.
          </p>
          <button
            className="button primary"
            onClick={() => onEnquire({ purpose: "sell" })}
          >
            Talk to Madi <ArrowRight size={15} />
          </button>
        </div>
        <small>Pictured: inside our Wingfield showroom</small>
      </section>
      <section className="section reviews mm-reviews" id="reviews">
        <div className="section-title">
          <h2 className="reveal-words">
            <RevealWords text="Customer reviews" />
          </h2>
          <div className="rating">
            <b>5.0</b>
            <span>
              <span className="stars" role="img" aria-label="5 out of 5 stars">
                ★★★★★
              </span>
              <small>Google reviews</small>
            </span>
          </div>
        </div>
        <div className="review-grid">
          <Review
            quote="I honestly couldn’t be happier with the experience. From the first enquiry through to driving away, the whole process was smooth, easy, and completely stress-free."
            name="Jackson"
            detail="2016 HSV owner"
          />
          <Review
            quote="Beautiful and unique cars as well as amazing customer service"
            name="Ahmad Shekib"
            detail="Google review"
          />
          <Review
            quote="Very happy with the service. Well done Madi! I bought 2017 SS VF Redline Ute very happy. Highly recommend mm prestige motors"
            name="David"
            detail="2017 SS VF Redline Ute owner"
          />
        </div>
        <a
          className="text-link reviews-link"
          href={business.maps}
          target="_blank"
          rel="noreferrer"
        >
          Read our reviews on Google <ArrowUpRight size={18} />
        </a>
      </section>
      <section className="reference-contact dealer-about" id="visit">
        <div className="contact-copy">
          <h2 className="reveal-words">
            <RevealWords text={"Start your journey\nwith us today"} />
          </h2>
          <p>
            Visit our Wingfield showroom. Speak directly with Madi about a car,
            arrange a viewing or discuss a trade-in.
          </p>
          <button className="button primary" onClick={() => onEnquire({})}>
            Contact Madi <ArrowRight size={15} />
          </button>
          <div className="contact-hours">
            <h3>Come say hello</h3>
            <div>
              <span>VIEWINGS</span>
              <span>Call to arrange a time</span>
            </div>
            <div>
              <span>GOOGLE REVIEWS</span>
              <span>5.0 / 5</span>
            </div>
          </div>
        </div>
        <ShowroomLocation />
      </section>
    </main>
  );
}
function Review({ quote, name, detail }) {
  return (
    <figure className="review">
      <Quote className="review-quote-mark" size={24} aria-hidden="true" />
      <blockquote>{quote}</blockquote>
      <figcaption className="review-person">
        <span className="avatar" aria-hidden="true">
          {name[0]}
        </span>
        <span>
          <b>{name}</b>
          <small>{detail}</small>
        </span>
      </figcaption>
    </figure>
  );
}
function scrollToSection(element) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" });
}
function CallTile() {
  return (
    <a className="offer-call" href={`tel:${business.tel}`}>
      <span className="offer-call-person">
        <img
          {...responsive("/images/madi-portrait.jpg", SIZES.avatar)}
          alt=""
          loading="lazy"
        />
        <span className="offer-call-label">Talk directly with Madi</span>
      </span>
      <b>{business.phone}</b>
      <small>Call to arrange a viewing.</small>
      <Phone className="offer-arrow" size={20} />
    </a>
  );
}
// Google Maps' keyless embed of the showroom's address, as a satellite view
// (t=k). It needs no API key.
const SHOWROOM_MAP = `https://maps.google.com/maps?q=${encodeURIComponent(
  `${business.address}, ${business.suburb}`,
)}&t=k&z=18&output=embed`;
// The map stays free to drag and zoom: nothing sits on top of it, and the
// address, phone and directions links are beneath it.
function ShowroomLocation() {
  return (
    <div className="contact-location">
      <div className="contact-map">
        <iframe
          src={SHOWROOM_MAP}
          title={`Satellite map of MM Prestige Motors at ${business.address}, ${business.suburb}`}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="location-details">
        <address className="location-address">
          <MapPin size={17} aria-hidden="true" />
          <span>
            {business.address}
            <br />
            {business.suburb}
          </span>
        </address>
        <div className="contact-pills">
          <a href={`tel:${business.tel}`}>
            <Phone size={17} />
            {business.phone}
          </a>
          <a href={business.maps} target="_blank" rel="noreferrer">
            Get directions <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
    </div>
  );
}
function NotFound({ title = "That road ends here." }) {
  return (
    <main className="dealer-home inner-page">
      <section className="reference-hero showroom-hero page-hero not-found-hero">
        <img
          className="reference-hero-image"
          {...responsive("/images/showroom-doorway.jpg", SIZES.hero)}
          alt=""
          fetchPriority="high"
        />
        <div className="reference-hero-content">
          <h1 className="reveal-words">
            <RevealWords text={title} />
          </h1>
          <div className="page-hero-actions">
            <Link className="button primary" to="/stock" viewTransition>
              Explore our stock <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <div className="hero-footnote">
          <p>
            MM Prestige Motors.
            <br />
            HSV, Holden and Australian muscle.
            <br />
            Wingfield, South Australia.
          </p>
          <small>Pictured: our Wingfield showroom</small>
        </div>
        <a className="hero-map" href={business.maps} target="_blank" rel="noreferrer">
          <span>
            <MapPin size={24} fill="currentColor" />
            <b>View on the map</b>
          </span>
          <p>
            {business.address}
            <br />
            {business.suburb}
          </p>
        </a>
      </section>
    </main>
  );
}
function Stock({ saved, toggleSaved, onEnquire }) {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "available";
  const [search, setSearch] = useState(params.get("model") || ""),
    [makes, setMakes] = useState(
      params.get("make") ? [params.get("make")] : [],
    ),
    [body, setBody] = useState(params.get("body") || ""),
    [transmission, setTransmission] = useState(""),
    [max, setMax] = useState(params.get("max") || ""),
    [sort, setSort] = useState("newest"),
    [savedOnly, setSavedOnly] = useState(params.get("saved") === "1"),
    [filtersOpen, setFiltersOpen] = useState(false);
  const results = useRef(null);
  const filtersButton = useRef(null);
  // The header's saved-cars link opens this view, even when already here.
  useEffect(() => {
    if (params.get("saved") !== "1") return;
    setSavedOnly(true);
    setParams(
      (current) => {
        current.delete("saved");
        return current;
      },
      { replace: true, preventScrollReset: true },
    );
  }, [params]);
  const filtersClose = useRef(null);
  useEffect(() => {
    if (!filtersOpen) return;
    filtersClose.current?.focus();
    const close = (event) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        filtersButton.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [filtersOpen]);
  const filtered = useMemo(
    () =>
      vehicles
        .filter(
          (c) =>
            (status === "all" || c.status === status) &&
            (!savedOnly || saved.includes(c.id)) &&
            (!search ||
              `${c.year} ${c.make} ${c.model}`
                .toLowerCase()
                .includes(search.toLowerCase())) &&
            (!makes.length || makes.includes(c.make)) &&
            (!body || c.body === body) &&
            (!transmission || c.transmission === transmission) &&
            (!max || c.price <= +max),
        )
        .sort((a, b) =>
          sort === "price-low"
            ? a.price - b.price
            : sort === "price-high"
              ? b.price - a.price
              : sort === "kms"
                ? a.kms - b.kms
                : b.year - a.year,
        ),
    [status, savedOnly, saved, search, makes, body, transmission, max, sort],
  );
  const filterCount = makes.length + !!search + !!body + !!transmission + !!max;
  const counts = {
    available: vehicles.filter((c) => c.status === "available").length,
    sold: vehicles.filter((c) => c.status === "sold").length,
    all: vehicles.length,
  };
  const carsLabel = (n) => `${n} ${n === 1 ? "car" : "cars"}`;
  function clear() {
    setSearch("");
    setMakes([]);
    setBody("");
    setTransmission("");
    setMax("");
    setSavedOnly(false);
  }
  // Switching tabs updates the address but keeps the visitor's place.
  function changeStatus(value) {
    setParams(value === "available" ? {} : { status: value }, {
      preventScrollReset: true,
    });
  }
  return (
    <main className="dealer-home inner-page stock-browse">
      <section className="reference-hero showroom-hero page-hero stock-hero">
        <img
          className="reference-hero-image"
          {...responsive("/images/showroom-collection.jpg", SIZES.hero)}
          alt=""
          fetchPriority="high"
        />
        {/* Phones show the stock hero as a stacked card, so the film is
            kept for wider screens. */}
        <HeroFilm name="pans" minWidth={701} />
        <div className="reference-hero-content">
          <h1 className="reveal-words">
            <RevealWords text="Cars with character." />
          </h1>
          <form
            className="hero-search stock-search"
            role="search"
            aria-label="Search the collection"
            onSubmit={(event) => {
              event.preventDefault();
              scrollToSection(results.current);
            }}
          >
            <label className="hero-field">
              <Search size={16} aria-hidden="true" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Make, model or year"
                aria-label="Search stock"
              />
            </label>
            <ThemedSelect
              label="Sort stock"
              value={sort}
              onChange={setSort}
              options={[
                { value: "newest", label: "Newest model" },
                { value: "price-low", label: "Price: low to high" },
                { value: "price-high", label: "Price: high to low" },
                { value: "kms", label: "Lowest kilometres" },
              ]}
            />
            <button type="submit">Search</button>
          </form>
        </div>
        <div className="hero-footnote">
          <p>
            The MM Prestige collection.
            <br />
            HSV, Holden and Australian muscle.
            <br />
            Wingfield, South Australia.
          </p>
          {sampleStock && <small>Sample prices and details</small>}
        </div>
        <button
          className="hero-map stock-count-card"
          onClick={() => changeStatus(status === "sold" ? "available" : "sold")}
        >
          <span>
            <CarFront size={22} />
            <b>{status === "sold" ? "View available cars" : "View sold cars"}</b>
          </span>
          <p>
            {carsLabel(counts.available)} available
            <br />
            {counts.sold} recently sold
          </p>
        </button>
      </section>
      <section
        className="reference-collection stock-collection"
        ref={results}
        aria-labelledby="results-heading"
      >
        <div className="section-title">
          <h2 id="results-heading">
            {status === "sold"
              ? "Sold cars"
              : status === "all"
                ? "All cars"
                : "Available cars"}
          </h2>
          <p className="results-count" aria-live="polite">
            <b>{filtered.length}</b> {filtered.length === 1 ? "car" : "cars"}
          </p>
        </div>
        <div className="home-collection-toolbar stock-toolbar">
          <div
            className="home-collection-tabs collection-tabs"
            role="group"
            aria-label="Vehicle availability"
          >
            {[
              ["available", "In stock"],
              ["sold", "Sold cars"],
              ["all", "All cars"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={status === value ? "selected" : ""}
                aria-pressed={status === value}
                onClick={() => changeStatus(value)}
              >
                {label}
                <span>{counts[value]}</span>
              </button>
            ))}
          </div>
          <div className="stock-toolbar-actions">
            <button
              className={`saved-toggle ${savedOnly ? "selected" : ""}`}
              aria-pressed={savedOnly}
              onClick={() => setSavedOnly(!savedOnly)}
            >
              <Heart size={15} />
              Saved <span>{saved.length}</span>
            </button>
            <button
              ref={filtersButton}
              className="filters-button"
              aria-expanded={filtersOpen}
              aria-controls="stock-filters"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={15} />
              Filters {filterCount > 0 && `(${filterCount})`}
            </button>
          </div>
        </div>
        <section
          id="stock-filters"
          className={`collection-filters ${filtersOpen ? "is-open" : ""}`}
          aria-label="Filters"
        >
          <div className="collection-filters-head">
            <h3>Refine your search</h3>
            <button
              ref={filtersClose}
              className="filters-close"
              aria-label="Close filters"
              onClick={() => {
                setFiltersOpen(false);
                filtersButton.current?.focus();
              }}
            >
              <X size={20} />
            </button>
          </div>
          <fieldset className="filter-pills">
            <legend>Make</legend>
            <div className="filter-pill-row">
            {[...new Set(vehicles.map((car) => car.make))].map((make) => (
              <label className="filter-pill" key={make}>
                <input
                  type="checkbox"
                  checked={makes.includes(make)}
                  onChange={() =>
                    setMakes((s) =>
                      s.includes(make)
                        ? s.filter((x) => x !== make)
                        : [...s, make],
                    )
                  }
                />
                <span>{make}</span>
                <small>
                  {
                    vehicles.filter(
                      (c) =>
                        c.make === make &&
                        (status === "all" || c.status === status),
                    ).length
                  }
                </small>
              </label>
            ))}
            </div>
          </fieldset>
          <fieldset className="filter-pills">
            <legend>Body style</legend>
            <div className="filter-pill-row">
            {[...new Set(vehicles.map((car) => car.body))].map((v) => (
              <label className="filter-pill" key={v}>
                <input
                  type="radio"
                  name="body"
                  checked={body === v}
                  onChange={() => setBody(v)}
                />
                <span>{v}</span>
              </label>
            ))}
            {body && (
              <button className="filter-clear" onClick={() => setBody("")}>
                All body styles
              </button>
            )}
            </div>
          </fieldset>
          <div className="filter-select">
            <span>Transmission</span>
            <ThemedSelect
              label="Transmission"
              value={transmission}
              onChange={setTransmission}
              options={[
                { value: "", label: "Any transmission" },
                { value: "Automatic", label: "Automatic" },
                { value: "Manual", label: "Manual" },
              ]}
            />
          </div>
          <div className="filter-select">
            <span>Maximum price</span>
            <ThemedSelect
              label="Maximum price"
              value={max}
              onChange={setMax}
              options={[
                { value: "", label: "No maximum" },
                ...[50000, 60000, 70000, 100000].map((value) => ({
                  value: String(value),
                  label: money(value),
                })),
              ]}
            />
          </div>
          <div className="filter-status">
            <span>
              {filterCount
                ? `${filterCount} active filter${filterCount === 1 ? "" : "s"}`
                : "No filters applied"}
            </span>
            <button className="filter-reset" onClick={clear}>
              Reset
            </button>
          </div>
          <button
            className="button primary filter-show"
            onClick={() => setFiltersOpen(false)}
          >
            Show {filtered.length} cars <ArrowRight size={17} />
          </button>
        </section>
        {filtered.length ? (
          <div className="card-grid collection-grid">
            {filtered.map((car) => (
              <CarCard key={car.id} {...{ car, saved, toggleSaved }} />
            ))}
          </div>
        ) : (
          <div className="stock-empty">
            <Search size={28} />
            <h3>No cars in this lane.</h3>
            <p>Try adjusting your filters or explore the full collection.</p>
            <div className="stock-empty-actions">
              <button
                className="button primary"
                onClick={() => {
                  clear();
                  changeStatus("all");
                }}
              >
                Reset all filters <ArrowRight size={16} />
              </button>
              <button
                className="button outline"
                onClick={() => onEnquire({ purpose: "find" })}
              >
                Ask Madi to find one
              </button>
            </div>
          </div>
        )}
        <section className="stock-help" aria-labelledby="stock-help-heading">
          <div>
            <h3 id="stock-help-heading">Something specific in mind?</h3>
            <p>
              Tell Madi what you're after, and Madi will keep an eye out for
              your next drive.
            </p>
          </div>
          <div className="stock-help-actions">
            <button
              className="button stock-help-find"
              onClick={() => onEnquire({ purpose: "find" })}
            >
              Find me a car <ArrowRight size={16} />
            </button>
            <a className="button stock-help-call" href={`tel:${business.tel}`}>
              <Phone size={16} />
              Call {business.phone}
            </a>
          </div>
        </section>
        {sampleStock && (
          <p className="sample-note">
            Preview collection · Photos are from our Wingfield showroom; stock,
            prices and specifications are examples.
          </p>
        )}
      </section>
    </main>
  );
}
// Pages read the saved cars and the enquiry opener from the layout (App).
function HomePage() {
  return <Home {...useOutletContext()} />;
}
function StockPage() {
  return <Stock {...useOutletContext()} />;
}
// A fresh listing per car, so its photo index and dialogs start over.
function VehiclePage() {
  const { id } = useParams();
  return <Vehicle key={id} {...useOutletContext()} />;
}
function Vehicle({ saved, toggleSaved, onEnquire }) {
  const { id } = useParams();
  const morph = useCarMorph(id);
  // Arriving by the photo morph, the stage skips its own entrance.
  const [morphArrival] = useState(() => Boolean(morph));
  const car = vehicles.find((c) => c.id === id);
  const thumbStrip = useRef(null);
  const swipeStart = useRef(null);
  const [index, setIndex] = useState(0),
    [zoom, setZoom] = useState(false),
    [copied, setCopied] = useState(false);
  const photos = car ? (car.gallery?.length ? car.gallery : [car.image]) : [];
  const move = (n) => setIndex((i) => (i + n + photos.length) % photos.length);
  useEffect(() => {
    if (!zoom) return;
    const fn = (e) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [zoom, photos.length]);
  // Keep the current thumbnail in view when the strip overflows.
  useEffect(() => {
    const strip = thumbStrip.current;
    const thumb = strip?.children[index];
    if (!thumb) return;
    const { offsetLeft: left, offsetWidth: width } = thumb;
    if (left < strip.scrollLeft || left + width > strip.scrollLeft + strip.clientWidth)
      strip.scrollTo({ left: left - (strip.clientWidth - width) / 2 });
  }, [index]);
  if (!car) return <NotFound title="We couldn't find that car." />;
  const sold = car.status === "sold";
  const isSaved = saved.includes(car.id);
  const name = `${car.make} ${car.model}`;
  const photoLabel = (i) =>
    `${name} photo ${i + 1} of ${photos.length}`;
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${car.year} ${name} · MM Prestige Motors`,
          url,
        });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {}
  };
  const swipe = (e) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null || photos.length < 2) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
  };
  const facts = [
    [Gauge, "Odometer", `${number(car.kms)} km`],
    [Zap, "Engine", car.engine],
    [Cog, "Transmission", car.transmission],
    [CarFront, "Body type", car.body],
  ].filter(([, , value]) => value);
  const specs = [
    ["Year", car.year],
    ["Make", car.make],
    ["Model", car.model],
    ["Variant", car.variant],
    ["Body style", car.body],
    ["Kilometres", `${number(car.kms)} km`],
    ["Transmission", car.transmission],
    ["Engine", car.engine],
    ["Power", car.power],
    ["Fuel type", car.fuel],
    ["Exterior colour", car.colour],
    ["Stock number", car.stock],
    ["Location", "Wingfield, SA"],
  ].filter(([, value]) => value !== "" && value != null);
  const related = vehicles
    .filter((c) => c.id !== id && c.status === "available")
    .slice(0, 4);
  return (
    <main
      className={`dealer-home inner-page vehicle-detail${morphArrival ? " is-morph-arrival" : ""}`}
    >
      <section className="vehicle-listing" aria-labelledby="vehicle-title">
        <div className="vehicle-topbar">
          <nav className="vehicle-crumbs" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link to="/" viewTransition>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/stock" viewTransition>
                  Stock
                </Link>
              </li>
              <li aria-current="page">{name}</li>
            </ol>
          </nav>
          <div className="vehicle-actions">
            <button
              className={`vehicle-save ${isSaved ? "is-saved" : ""}`}
              aria-label={isSaved ? "Unsave vehicle" : "Save vehicle"}
              aria-pressed={isSaved}
              onClick={() => toggleSaved(car.id)}
            >
              <Heart size={16} fill={isSaved ? "currentColor" : "none"} />
              <span>{isSaved ? "Saved" : "Save"}</span>
            </button>
            <button
              className="vehicle-share"
              aria-label={copied ? "Link copied" : "Share this car"}
              onClick={share}
            >
              {copied ? <Check size={16} /> : <Share2 size={16} />}
              <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
            </button>
          </div>
        </div>
        <header className="vehicle-head">
          <div className="vehicle-title-row">
            <h1 id="vehicle-title">
              {car.year} {name}
            </h1>
            {sold && <span className="vehicle-status">Sold</span>}
          </div>
          <p className="vehicle-sub">
            {car.variant && <span>{car.variant}</span>}
            <span>
              <MapPin size={15} /> Wingfield, SA
            </span>
            <span>Stock no. {car.stock}</span>
          </p>
        </header>
        <div className="vehicle-main">
          <section className="vehicle-gallery" aria-label="Vehicle photos">
            <div
              className="vehicle-stage"
              onTouchStart={(e) => (swipeStart.current = e.touches[0].clientX)}
              onTouchEnd={swipe}
            >
              <img
                key={photos[index]}
                className={`vehicle-stage-image${index === 0 && morphArrival ? " is-morph-target" : ""}`}
                {...responsive(photos[index], SIZES.stage)}
                alt={photoLabel(index)}
                fetchPriority="high"
                style={{
                  viewTransitionName: index === 0 ? morph : undefined,
                  backgroundImage: `url(${smallest(photos[index])})`,
                }}
                onClick={() => setZoom(true)}
              />
              {sold && <span className="vehicle-stage-badge">Sold</span>}
              <span className="vehicle-hero-count" aria-live="polite">
                <Camera size={15} /> {counter}
              </span>
              {photos.length > 1 && (
                <>
                  <button
                    className="vehicle-stage-nav prev"
                    aria-label="Previous vehicle photo"
                    onClick={() => move(-1)}
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    className="vehicle-stage-nav next"
                    aria-label="Next vehicle photo"
                    onClick={() => move(1)}
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
              <button
                className="vehicle-hero-expand"
                aria-label="Expand vehicle photos"
                onClick={() => setZoom(true)}
              >
                <Expand size={17} />
              </button>
            </div>
            {photos.length > 1 && (
              <div
                className="vehicle-thumbs"
                ref={thumbStrip}
                role="group"
                aria-label="Choose a photo"
              >
                {photos.map((photo, i) => (
                  <button
                    key={photo + i}
                    className={i === index ? "current" : ""}
                    aria-label={`Show vehicle photo ${i + 1}`}
                    aria-pressed={i === index}
                    onClick={() => setIndex(i)}
                  >
                    <img {...responsive(photo, SIZES.thumb)} alt="" />
                  </button>
                ))}
              </div>
            )}
            {sampleStock && (
              <small className="vehicle-photo-note">
                Photographed at our Wingfield showroom · Price and details are
                samples.
              </small>
            )}
          </section>
          <ul className="vehicle-facts" aria-label="Key details">
            {facts.map(([Icon, label, value]) => (
              <li key={label}>
                <span className="vehicle-fact-icon" aria-hidden="true">
                  <Icon size={19} />
                </span>
                <span>
                  <small>{label}</small>
                  <b>{value}</b>
                </span>
              </li>
            ))}
          </ul>
          {car.description && (
            <section
              className="vehicle-about"
              aria-labelledby="overview-heading"
            >
              <span className="eyebrow">Dealer comments</span>
              <h2 id="overview-heading">
                {car.make === "HSV"
                  ? "Australian muscle."
                  : car.make === "Holden"
                    ? "An Australian icon."
                    : "Built for the enthusiast."}
              </h2>
              {car.description
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
            </section>
          )}
          <section className="vehicle-visit" aria-labelledby="visit-heading">
            <span className="vehicle-visit-icon" aria-hidden="true">
              <MapPin size={20} />
            </span>
            <div>
              <h2 id="visit-heading">See it in Wingfield</h2>
              <p>
                {business.address}, {business.suburb}. Viewings by arrangement.
              </p>
            </div>
            <a href={business.maps} target="_blank" rel="noreferrer">
              Get directions <ArrowUpRight size={16} />
            </a>
          </section>
        </div>
        <div className="vehicle-aside">
          <div className="vehicle-price-card">
            <span className="vehicle-price-label">
              {sold ? "Status" : "Asking price"}
            </span>
            {sold ? (
              <>
                <strong className="vehicle-sold">SOLD</strong>
                <p>This one has found its next driver.</p>
              </>
            ) : (
              <>
                <strong>{money(car.price)}</strong>
                <p>
                  Excludes government charges
                  {sampleStock && " · Sample price"}
                </p>
                <Finance price={car.price} />
                <button
                  className="vehicle-finance-ask"
                  onClick={() => onEnquire({ ...car, purpose: "finance" })}
                >
                  Ask Madi about finance <ArrowRight size={15} />
                </button>
              </>
            )}
          </div>
          <section
            className="vehicle-specs"
            id="specifications"
            aria-labelledby="specs-heading"
          >
            <h2 id="specs-heading">Specifications</h2>
            <dl className="spec-rows">
              {specs.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="detail-note">
              {sampleStock
                ? "This listing is a design preview. Vehicle details and pricing are sample data. Contact the dealer to confirm actual stock, condition and specifications."
                : "Details are provided in good faith. Please confirm the specification, condition and price with Madi before you buy."}
            </p>
          </section>
          <section className="vehicle-call" aria-labelledby="call-heading">
            <div className="vehicle-contact-person">
              <span className="vehicle-avatar" aria-hidden="true">
                <img
                  {...responsive("/images/madi-portrait.jpg", SIZES.avatar)}
                  alt=""
                  loading="lazy"
                />
              </span>
              <div>
                <h2 id="call-heading">{sold ? "Talk to Madi" : "Call Us"}</h2>
                <p>MM Prestige Motors · Wingfield</p>
              </div>
            </div>
            <p>
              {sold
                ? "This car has sold, but Madi can help you find something similar."
                : "Arrange a viewing, or ask about finance and trade-ins."}
            </p>
            <a className="vehicle-call-number" href={`tel:${business.tel}`}>
              <Phone size={18} /> {business.phone}
            </a>
            <button
              className="vehicle-call-message"
              aria-label={sold ? "Find me something similar" : "Enquire about this car"}
              onClick={() => onEnquire(sold ? { ...car, purpose: "find" } : car)}
            >
              <MessageSquare size={17} />
              {sold ? "Find something similar" : "Send a message"}
            </button>
          </section>
        </div>
      </section>
      <div className="vehicle-actionbar">
        <div>
          <strong>{sold ? "Sold" : money(car.price)}</strong>
          <small>
            {sold ? "Ask Madi about similar cars" : "Excl. government charges"}
          </small>
        </div>
        <button
          className="vehicle-actionbar-message"
          aria-label="Message Madi"
          onClick={() => onEnquire(sold ? { ...car, purpose: "find" } : car)}
        >
          <MessageSquare size={19} />
        </button>
        <a className="vehicle-actionbar-call" href={`tel:${business.tel}`}>
          <Phone size={17} /> Call Us
        </a>
      </div>
      {related.length > 0 && (
        <section
          className="reference-collection vehicle-related"
          aria-labelledby="related-heading"
        >
          <div className="section-title">
            <h2 id="related-heading">More from our collection</h2>
            <Link className="text-link" to="/stock" viewTransition>
              View all stock <ArrowRight size={18} />
            </Link>
          </div>
          <div className="card-grid featured">
            {related.map((c) => (
              <CarCard key={c.id} car={c} {...{ saved, toggleSaved }} />
            ))}
          </div>
        </section>
      )}
      {zoom && (
        <Dialog
          title="Vehicle photo gallery"
          onClose={() => setZoom(false)}
          className="lightbox"
        >
          <img
            {...responsive(photos[index] || photos[0], SIZES.hero)}
            alt={photoLabel(index)}
          />
          <div className="lightbox-controls">
            {photos.length > 1 && (
              <button
                aria-label="Previous expanded photo"
                onClick={() => move(-1)}
              >
                <ChevronLeft />
              </button>
            )}
            <span>
              {index + 1} / {photos.length}
            </span>
            {photos.length > 1 && (
              <button aria-label="Next expanded photo" onClick={() => move(1)}>
                <ChevronRight />
              </button>
            )}
          </div>
          <p>Photographed at our Wingfield showroom</p>
        </Dialog>
      )}
    </main>
  );
}
function Finance({ price }) {
  const [open, setOpen] = useState(false),
    [deposit, setDeposit] = useState(10000),
    [term, setTerm] = useState(5),
    [rate, setRate] = useState(9.9);
  const principal = Math.max(0, price - deposit),
    r = rate / 100 / 12,
    n = term * 12,
    monthly = r ? (principal * r) / (1 - Math.pow(1 + r, -n)) : principal / n,
    weekly = (monthly * 12) / 52;
  return (
    <div className="finance">
      <button
        className="finance-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>
          <small>Illustrative repayment estimate</small>
          <b>
            {money(weekly)}
            <span> / week</span>
          </b>
        </span>
        {open ? <Minus size={19} /> : <Plus size={19} />}
      </button>
      {open && (
        <div className="finance-fields">
          <label>
            Deposit <b>{money(deposit)}</b>
            <input
              aria-label="Deposit"
              type="range"
              min="0"
              max={price}
              step="1000"
              value={deposit}
              onChange={(e) => setDeposit(+e.target.value)}
            />
          </label>
          <div>
            <label>
              Term
              <select value={term} onChange={(e) => setTerm(+e.target.value)}>
                {[3, 4, 5, 6, 7].map((y) => (
                  <option key={y} value={y}>
                    {y} years
                  </option>
                ))}
              </select>
            </label>
            <label>
              Interest rate
              <input
                aria-label="Annual interest rate"
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={rate}
                onChange={(e) =>
                  setRate(Math.min(30, Math.max(0, +e.target.value)))
                }
              />
            </label>
          </div>
        </div>
      )}
      <p>
        Estimate only. {term}-year term, {rate}% p.a., {money(deposit)} deposit.
        No fees or balloon included. This is a calculator, not a finance offer.
      </p>
    </div>
  );
}
function Dialog({ title, onClose, className = "", children }) {
  useEffect(() => {
    const before = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector(".dialog");
    dialog?.querySelector("button")?.focus();
    const fn = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = dialog.querySelectorAll(
          "button,a[href],input,textarea,select",
        );
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", fn);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", fn);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          className="dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={23} />
        </button>
        {children}
      </section>
    </div>
  );
}
// What each kind of enquiry asks for, and how it opens.
const ENQUIRY = {
  talk: {
    title: "Enquire with MM Prestige Motors",
    heading: (
      <>
        Let's talk <em>cars.</em>
      </>
    ),
    intro: "Tell Madi what you have in mind.",
  },
  sell: {
    title: "Sell or trade your car with MM Prestige Motors",
    heading: (
      <>
        Sell or trade <em>your car.</em>
      </>
    ),
    intro: "Tell Madi about your car and what you'd like to do.",
  },
  find: {
    title: "Find a car with MM Prestige Motors",
    heading: (
      <>
        Find your <em>next car.</em>
      </>
    ),
    intro: "Tell Madi what you're looking for, and Madi will keep an eye out.",
  },
};
function enquiryText(purpose, form) {
  const details = (pairs) =>
    pairs
      .filter(([, value]) => value.trim())
      .map(([label, value]) => `${label}: ${value.trim()}`)
      .join("\n");
  const notes = form.notes.trim() ? `\n\n${form.notes.trim()}` : "";
  const contact = `\n\nName: ${form.name}\nPhone: ${form.phone}`;
  if (purpose === "sell") {
    const opening =
      {
        "Sell it": "Hi Madi, I'd like to sell my car.",
        "Trade it in": "Hi Madi, I'd like to trade in my car.",
      }[form.plan] ||
      "Hi Madi, I'd like to talk about selling or trading my car.";
    const car = [form.year, form.make, form.model]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" ");
    return `${opening}\n\n${details([
      ["Car", car],
      ["Kilometres", form.kms],
      ["Rego", form.rego],
      ["Condition", form.condition],
    ])}${notes}${contact}`;
  }
  if (purpose === "find")
    return `Hi Madi, I'm looking for a car. Could you keep an eye out for me?\n\n${details(
      [
        ["Looking for", form.wanted],
        ["Years", form.years],
        ["Budget", form.budget],
      ],
    )}${notes}${contact}`;
  return `${form.message}${contact}`;
}
function Enquiry({ vehicle, purpose, onClose }) {
  const kind = purpose === "sell" || purpose === "find" ? purpose : "talk";
  const copy = ENQUIRY[kind];
  const carName = vehicle && `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const [ready, setReady] = useState(false),
    [copied, setCopied] = useState(false),
    [form, setForm] = useState({
      name: "",
      phone: "",
      message:
        purpose === "finance"
          ? `Hi Madi, I'd like to ask about finance for the ${carName}. ` +
            "Could you call me to talk through the options?"
          : vehicle
            ? `Hi Madi, I'm interested in the ${carName}` +
              `${vehicle.status === "sold" ? " or something similar" : ""}. ` +
              "Could we arrange a time to chat?"
            : "Hi Madi, I’d like to chat about your performance car collection.",
      year: "",
      make: "",
      model: "",
      kms: "",
      rego: "",
      condition: "",
      plan: "",
      wanted: vehicle ? `${vehicle.make} ${vehicle.model} or similar` : "",
      years: "",
      budget: "",
      notes: "",
    });
  const text = enquiryText(kind, form);
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });
  const optional = <small> (optional)</small>;
  return (
    <Dialog title={copy.title} onClose={onClose} className="enquiry-dialog">
      <div className="eyebrow">MM PRESTIGE MOTORS</div>
      <h2>{copy.heading}</h2>
      {vehicle && (
        <div className="enquiry-car">
          <img
            {...responsive(vehicle.image, "96px")}
            alt=""
          />
          <span>
            <small>
              {vehicle.year} · {vehicle.make}
            </small>
            <b>{vehicle.model}</b>
          </span>
        </div>
      )}
      {!ready ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setReady(true);
          }}
        >
          <p>
            {copy.intro} Prepare your message, then send it with your messaging
            app.
          </p>
          {kind === "sell" && (
            <fieldset className="enquiry-fields">
              <legend>Your car</legend>
              <div className="enquiry-row">
                <label>
                  Year
                  <input
                    required
                    inputMode="numeric"
                    maxLength={4}
                    {...field("year")}
                  />
                </label>
                <label>
                  Kilometres
                  <input required inputMode="numeric" {...field("kms")} />
                </label>
              </div>
              <div className="enquiry-row">
                <label>
                  Make
                  <input required {...field("make")} />
                </label>
                <label>
                  Model
                  <input required {...field("model")} />
                </label>
              </div>
              <div className="enquiry-row">
                <label>
                  <span>Rego{optional}</span>
                  <input autoCapitalize="characters" {...field("rego")} />
                </label>
                <label>
                  Condition
                  <select required {...field("condition")}>
                    <option value="" disabled>
                      Choose
                    </option>
                    <option>Excellent</option>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Needs work</option>
                  </select>
                </label>
              </div>
              <label>
                What would you like to do?
                <select required {...field("plan")}>
                  <option value="" disabled>
                    Choose
                  </option>
                  <option>Sell it</option>
                  <option>Trade it in</option>
                  <option>Not sure yet</option>
                </select>
              </label>
              <label>
                <span>Anything else Madi should know?{optional}</span>
                <textarea
                  rows="3"
                  placeholder="Service history, modifications, finance owing…"
                  {...field("notes")}
                />
              </label>
            </fieldset>
          )}
          {kind === "find" && (
            <fieldset className="enquiry-fields">
              <legend>The car you want</legend>
              <label>
                Make and model
                <input
                  required
                  placeholder="e.g. HSV GTS or Clubsport R8"
                  {...field("wanted")}
                />
              </label>
              <div className="enquiry-row">
                <label>
                  <span>Years{optional}</span>
                  <input placeholder="e.g. 2014 on" {...field("years")} />
                </label>
                <label>
                  <span>Budget{optional}</span>
                  <select {...field("budget")}>
                    <option value="">Flexible</option>
                    <option>Up to $50,000</option>
                    <option>$50,000 – $75,000</option>
                    <option>$75,000 – $100,000</option>
                    <option>Over $100,000</option>
                  </select>
                </label>
              </div>
              <label>
                <span>Must-haves{optional}</span>
                <textarea
                  rows="3"
                  placeholder="Colour, transmission, kilometres…"
                  {...field("notes")}
                />
              </label>
            </fieldset>
          )}
          <fieldset className="enquiry-fields">
            {kind !== "talk" && <legend>Your details</legend>}
            <div className={kind === "talk" ? "" : "enquiry-row"}>
              <label>
                Your name
                <input required autoComplete="name" {...field("name")} />
              </label>
              <label>
                Phone number
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  {...field("phone")}
                />
              </label>
            </div>
            {kind === "talk" && (
              <label>
                Your message
                <textarea required rows="4" {...field("message")} />
              </label>
            )}
          </fieldset>
          <button className="button primary full" type="submit">
            Prepare enquiry <ArrowRight size={18} />
          </button>
          <small className="enquiry-footnote">
            Nothing is sent until you send the message in your messaging app.
          </small>
        </form>
      ) : (
        <div className="enquiry-ready">
          <span className="ready-icon">
            <Check size={26} />
          </span>
          <h3>Your message is ready.</h3>
          <p>
            Open your messaging app to send it to {business.phone}, or copy the
            message and send it yourself.
          </p>
          <div className="message-preview">{text}</div>
          <a
            className="button primary full"
            href={`sms:${business.tel}?body=${encodeURIComponent(text)}`}
          >
            <Send size={18} />
            Send via SMS <ArrowUpRight size={18} />
          </a>
          <button
            className="button outline full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <Copy size={18} />
            {copied ? "Copied" : "Copy message"}
          </button>
          <button className="clear-link" onClick={() => setReady(false)}>
            Edit your message
          </button>
        </div>
      )}
      <a className="enquiry-call" href={`tel:${business.tel}`}>
        <Phone size={16} />
        Prefer to call? {business.phone}
      </a>
    </Dialog>
  );
}
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div>
          <Logo />
          <p>
            HSV, Holden and performance vehicles.
            <br />
            Wingfield, South Australia.
          </p>
        </div>
        <div>
          <span className="footer-label">Menu</span>
          <Link to="/" viewTransition>
            Home
          </Link>
          <Link to="/stock" viewTransition>
            Available stock
          </Link>
          <Link to="/stock?status=sold" viewTransition>
            Sold cars
          </Link>
          <Link to="/#visit">Our story</Link>
        </div>
        <div>
          <span className="footer-label">Find us</span>
          <a href={business.maps} target="_blank" rel="noreferrer">
            {business.address}
            <br />
            {business.suburb}
            <ArrowUpRight size={14} />
          </a>
          <a href={`tel:${business.tel}`}>{business.phone}</a>
          <span className="footer-appointment">Call to arrange a viewing.</span>
        </div>
        <div className="footer-next-drive">
          <h2>Your next drive starts here.</h2>
          <p>
            Something caught your eye?
            <br />
            Talk to Madi about it.
          </p>
          <Link className="button" to="/stock" viewTransition>
            Explore the collection <ArrowRight size={15} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} MM Prestige Motors.</span>
        <span>
          {sampleStock
            ? "Website preview · Sample listing details."
            : "Call to confirm availability."}
        </span>
        <span>WINGFIELD / ADELAIDE</span>
      </div>
    </footer>
  );
}
// App is the layout; the pages are data routes so links can use view
// transitions.
const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/stock-manager", element: <StockManagerDemo /> },
      { path: "/crm", element: <CrmDemo /> },
      { path: "/", element: <HomePage /> },
      { path: "/stock", element: <StockPage /> },
      { path: "/stock/manage", element: <StockAdmin /> },
      { path: "/stock/:id", element: <VehiclePage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />,
);
