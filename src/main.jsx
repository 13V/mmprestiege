import React, {
  lazy,
  Suspense,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useSearchParams,
  useParams,
  useNavigate,
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
  Bookmark,
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
} from "lucide-react";
import { vehicles, money, number, business } from "./data";
import ThemedSelect from "./ThemedSelect";
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

const StockManagerDemo = lazy(() => import("./StockManagerDemo"));
const CrmDemo = lazy(() => import("./CrmDemo"));

function Logo() {
  return (
    <Link to="/" className="brand" aria-label="MM Prestige Motors home">
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
    <BrowserRouter>
      <ScrollReset />
      <SiteLayout onEnquire={(details = {}) => setEnquiry(details)}>
        <Suspense
          fallback={
            <div role="status" style={{ padding: "40px" }}>
              Loading workspace…
            </div>
          }
        >
        <Routes>
          <Route path="/stock-manager" element={<StockManagerDemo />} />
          <Route path="/crm" element={<CrmDemo />} />
          <Route
            path="/"
            element={
              <Home
                saved={saved}
                toggleSaved={toggleSaved}
                onEnquire={setEnquiry}
              />
            }
          />
          <Route
            path="/stock"
            element={<Stock saved={saved} toggleSaved={toggleSaved} />}
          />
          <Route
            path="/stock/:id"
            element={
              <Vehicle
                saved={saved}
                toggleSaved={toggleSaved}
                onEnquire={setEnquiry}
              />
            }
          />
          <Route
            path="*"
            element={<NotFound />}
          />
        </Routes>
        </Suspense>
      </SiteLayout>
      {enquiry && (
        <Enquiry
          vehicle={enquiry.id ? enquiry : null}
          purpose={enquiry.purpose}
          onClose={() => setEnquiry(null)}
        />
      )}
    </BrowserRouter>
  );
}
const REVEAL_TARGETS = [
  ".marque-words li",
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
function SiteLayout({ children, onEnquire }) {
  const { pathname } = useLocation();
  useReveal(pathname);
  if (["/stock-manager", "/crm"].includes(pathname.replace(/\/$/, "")))
    return children;
  return (
    <div
      className="site-shell home-shell"
    >
      <Header onEnquire={onEnquire} />
      {children}
      <Footer />
    </div>
  );
}
function ScrollReset() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const vehicle = vehicles.find((car) => pathname === `/stock/${car.id}`);
    const route = pathname.replace(/\/$/, "");
    document.title =
      route === "/crm"
        ? "Sales CRM mockup | MM Prestige Motors"
        : route === "/stock-manager"
          ? "Stock management demo | MM Prestige Motors"
          : vehicle
            ? `${vehicle.year} ${vehicle.make} ${vehicle.model} | MM Prestige Motors`
            : pathname === "/stock"
              ? "Our collection | MM Prestige Motors"
              : "MM Prestige Motors | HSV & Holden Specialists, Adelaide";
    if (hash) {
      requestAnimationFrame(() =>
        document
          .getElementById(hash.slice(1))
          ?.scrollIntoView({ behavior: "instant" }),
      );
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname, hash]);
  return null;
}
function Header({ onEnquire }) {
  const [open, setOpen] = useState(false);
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
        className="header"
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
            <Link className={pathname === "/" ? "active" : ""} to="/">
              Home
            </Link>
            <Link to="/#about" onClick={goToSection("about")}>
              About us
            </Link>
            <Link
              className={
                pathname.startsWith("/stock") && !soldView ? "active" : ""
              }
              to="/stock"
            >
              Inventory
            </Link>
            <Link
              className={`nav-sold ${soldView ? "active" : ""}`}
              to="/stock?status=sold"
            >
              Sold cars
            </Link>
            <Link to="/#services" onClick={goToSection("services")}>
              Services
            </Link>
          </nav>
          <div className="header-actions">
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
function CarCard({ car, saved, toggleSaved }) {
  return (
    <article
      className={`car-card collection-card ${car.status === "sold" ? "sold-card" : ""}`}
    >
      <div className="card-heading">
        <Link className="card-title" to={`/stock/${car.id}`}>
          {car.make} {car.model}
        </Link>
        <p className="card-variant">Wingfield, SA · {car.year}</p>
      </div>
      <Link
        className="card-photo"
        to={`/stock/${car.id}`}
        aria-label={`View ${car.year} ${car.make} ${car.model}`}
      >
        <img
          src={car.image}
          alt={`Illustrative vehicle photograph for ${car.make} ${car.model}`}
          loading="lazy"
        />
        {car.status === "sold" && (
          <span className="car-tag sold-tag">SOLD</span>
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
            <Bookmark
              size={22}
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
        <Link className="card-detail-button" to={`/stock/${car.id}`}>
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
    navigate(`/stock${query.size ? `?${query}` : ""}`);
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
          src="/images/studio-hero.webp"
          alt="Illustrative studio image of a silver Porsche convertible"
          fetchPriority="high"
        />
        <div className="reference-hero-content">
          <h1>HSV &amp; Holden specialists</h1>
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
          <small>Illustrative campaign imagery</small>
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
      <ul
        className="marque-strip marque-words"
        aria-label="Our specialties — not a list of current inventory"
      >
        {["HSV", "Holden", "Commodore", "Clubsport", "Maloo", "Prestige"].map(
          (name) => (
            <li key={name}>{name}</li>
          ),
        )}
      </ul>
      <section className="reference-offer offer-bento" id="services">
        <div className="offer-copy">
          <h2>What we offer</h2>
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
          <Link className="button primary" to="/stock">
            Explore more <ArrowRight size={16} />
          </Link>
        </div>
        <Link className="offer-performance" to="/stock">
          <div>
            <h3>Performance</h3>
            <p>For the drive you look forward to.</p>
          </div>
          <img
            src="/images/detail-2.jpg"
            alt="Illustrative sports car wheel and body detail"
            loading="lazy"
          />
          <ArrowUpRight className="offer-arrow" size={23} />
        </Link>
        <div className="offer-stack">
          <button className="offer-trade" onClick={() => onEnquire({})}>
            <h3>Next up.</h3>
            <p>Buy. Sell. Trade.</p>
            <img
              src="/images/suv-cutout.webp"
              alt="Illustrative white SUV"
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
          <h2>From our collection</h2>
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
          <Link className="button primary" to="/stock">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="card-grid featured">
          {featured.map((car) => (
            <CarCard key={car.id} {...{ car, saved, toggleSaved }} />
          ))}
        </div>
        <div className="carousel-controls">
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
        <p className="sample-note">
          Sample stock and generic photos shown while the website is being
          prepared. Call Madi for current availability.
        </p>
        <Link className="text-link collection-explore" to="/stock">
          Explore our stock <ArrowRight size={18} />
        </Link>
      </section>
      <section className="reference-sell">
        <img
          src="/images/sell-supercar.webp"
          alt="Illustrative silver supercar with its doors raised in a studio"
          loading="lazy"
        />
        <div>
          <h2>
            Sell your car to
            <br />
            our dealership
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
        <small>Illustrative campaign imagery</small>
      </section>
      <section className="section reviews mm-reviews" id="reviews">
        <div className="section-title">
          <h2>Customer reviews</h2>
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
      <section className="reference-contact dealer-about" id="about">
        <div className="contact-copy">
          <h2>
            Start your journey
            <br />
            with us today
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
      <span className="offer-call-label">Talk directly with Madi</span>
      <b>{business.phone}</b>
      <small>Call to arrange a viewing.</small>
      <Phone className="offer-arrow" size={20} />
    </a>
  );
}
function ShowroomLocation() {
  return (
    <div className="contact-location">
      <a
        className="contact-map"
        href={business.maps}
        target="_blank"
        rel="noreferrer"
        aria-label="View MM Prestige Motors on Google Maps"
      >
        <div className="location-roads" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <span>GRAND JUNCTION ROAD</span>
          <b>WINGFIELD</b>
        </div>
        <span className="location-pin">
          <MapPin size={25} fill="currentColor" />
        </span>
        <div className="location-address">
          {business.address}
          <br />
          {business.suburb}
          <small>
            Open Google Maps for directions <ArrowUpRight size={12} />
          </small>
        </div>
      </a>
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
  );
}
function NotFound({ title = "That road ends here." }) {
  return (
    <main className="dealer-home inner-page">
      <section className="reference-hero showroom-hero page-hero not-found-hero">
        <img
          className="reference-hero-image"
          src="/images/studio-hero.webp"
          alt=""
          fetchPriority="high"
        />
        <div className="reference-hero-content">
          <h1>{title}</h1>
          <div className="page-hero-actions">
            <Link className="button primary" to="/stock">
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
          <small>Illustrative campaign imagery</small>
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
function Stock({ saved, toggleSaved }) {
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
    [savedOnly, setSavedOnly] = useState(false),
    [filtersOpen, setFiltersOpen] = useState(false);
  const results = useRef(null);
  const filtersButton = useRef(null);
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
  function changeStatus(value) {
    setParams(value === "available" ? {} : { status: value });
  }
  return (
    <main className="dealer-home inner-page stock-browse">
      <section className="reference-hero showroom-hero page-hero stock-hero">
        <img
          className="reference-hero-image"
          src="/images/car-1.jpg"
          alt=""
          fetchPriority="high"
        />
        <div className="reference-hero-content">
          <h1>Cars with character.</h1>
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
          <small>Sample stock and generic photos</small>
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
        <aside
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
        </aside>
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
            <button
              className="button primary"
              onClick={() => {
                clear();
                changeStatus("all");
              }}
            >
              Reset all filters <ArrowRight size={16} />
            </button>
          </div>
        )}
        <aside className="stock-help" aria-labelledby="stock-help-heading">
          <div>
            <h3 id="stock-help-heading">Something specific in mind?</h3>
            <p>Talk cars with Madi. We're here to help you find your next drive.</p>
          </div>
          <a className="button stock-help-call" href={`tel:${business.tel}`}>
            <Phone size={16} />
            Call {business.phone}
          </a>
        </aside>
        <p className="sample-note">
          Preview collection · All vehicle imagery, stock, prices and
          specifications are illustrative.
        </p>
      </section>
    </main>
  );
}
function Vehicle({ saved, toggleSaved, onEnquire }) {
  const { id } = useParams();
  const car = vehicles.find((c) => c.id === id);
  const thumbStrip = useRef(null);
  const swipeStart = useRef(null);
  const [index, setIndex] = useState(0),
    [zoom, setZoom] = useState(false),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    setIndex(0);
    setZoom(false);
    setCopied(false);
  }, [id]);
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
    `Illustrative ${name} photo ${i + 1} of ${photos.length}`;
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${car.year} ${name} · MM Prestige Motors`, url });
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
  ];
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
  ];
  const related = vehicles
    .filter((c) => c.id !== id && c.status === "available")
    .slice(0, 4);
  return (
    <main className="dealer-home inner-page vehicle-detail">
      <section className="vehicle-listing" aria-labelledby="vehicle-title">
        <div className="vehicle-topbar">
          <nav className="vehicle-crumbs" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/stock">Stock</Link>
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
            <button className="vehicle-share" onClick={share}>
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
            <span>{car.variant}</span>
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
                className="vehicle-stage-image"
                src={photos[index]}
                alt={photoLabel(index)}
                fetchPriority="high"
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
                    <img src={photo} alt="" />
                  </button>
                ))}
              </div>
            )}
            <small className="vehicle-photo-note">
              Generic preview photography · Images do not depict this vehicle.
            </small>
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
            <p>{car.description}</p>
          </section>
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
        <aside className="vehicle-aside" aria-label="Price, specifications and contact">
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
                <p>Excludes government charges · Sample price</p>
                <Finance price={car.price} />
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
              This listing is a design preview. Vehicle details and pricing are
              sample data. Contact the dealer to confirm actual stock,
              condition and specifications.
            </p>
          </section>
          <section className="vehicle-call" aria-labelledby="call-heading">
            <div className="vehicle-contact-person">
              <span className="vehicle-avatar" aria-hidden="true">
                M
              </span>
              <div>
                <h2 id="call-heading">{sold ? "Talk to Madi" : "Call Madi"}</h2>
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
              onClick={() => onEnquire(car)}
            >
              <MessageSquare size={17} />
              {sold ? "Find something similar" : "Send a message"}
            </button>
          </section>
        </aside>
      </section>
      <div className="vehicle-actionbar">
        <div>
          <strong>{sold ? "Sold" : money(car.price)}</strong>
          <small>{sold ? "Ask Madi about similar cars" : "Excl. government charges"}</small>
        </div>
        <button
          className="vehicle-actionbar-message"
          aria-label="Message Madi"
          onClick={() => onEnquire(car)}
        >
          <MessageSquare size={19} />
        </button>
        <a className="vehicle-actionbar-call" href={`tel:${business.tel}`}>
          <Phone size={17} /> Call Madi
        </a>
      </div>
      {related.length > 0 && (
        <section
          className="reference-collection vehicle-related"
          aria-labelledby="related-heading"
        >
          <div className="section-title">
            <h2 id="related-heading">More from our collection</h2>
            <Link className="text-link" to="/stock">
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
          <img src={photos[index] || photos[0]} alt={photoLabel(index)} />
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
          <p>Generic preview photography</p>
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
function Enquiry({ vehicle, purpose, onClose }) {
  const [ready, setReady] = useState(false),
    [copied, setCopied] = useState(false),
    [form, setForm] = useState({
      name: "",
      phone: "",
      message: vehicle
        ? `Hi Madi, I'm interested in the ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.status === "sold" ? " or something similar" : ""}. Could we arrange a time to chat?`
        : purpose === "sell"
          ? "Hi Madi, I’d like to discuss selling or trading my car."
          : "Hi Madi, I’d like to chat about your performance car collection.",
    });
  const text = `${form.message}\n\nName: ${form.name}\nPhone: ${form.phone}`;
  return (
    <Dialog
      title="Enquire with MM Prestige Motors"
      onClose={onClose}
      className="enquiry-dialog"
    >
      <div className="eyebrow">MM PRESTIGE MOTORS</div>
      <h2>
        Let's talk <em>cars.</em>
      </h2>
      {vehicle && (
        <div className="enquiry-car">
          <img src={vehicle.image} alt="Generic vehicle preview" />
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
            Tell Madi what you have in mind. Prepare your message, then send it
            with your messaging app.
          </p>
          <label>
            Your name
            <input
              required
              value={form.name}
              autoComplete="name"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Phone number
            <input
              required
              type="tel"
              value={form.phone}
              autoComplete="tel"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label>
            Your message
            <textarea
              required
              rows="4"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </label>
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
          <Link to="/">Home</Link>
          <Link to="/stock">Available stock</Link>
          <Link to="/stock?status=sold">Sold cars</Link>
          <Link to="/#about">Our story</Link>
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
          <h3>Your next drive starts here.</h3>
          <p>
            Something caught your eye?
            <br />
            Talk to Madi about it.
          </p>
          <Link className="button" to="/stock">
            Explore the collection <ArrowRight size={15} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} MM Prestige Motors.</span>
        <span>Website concept · Sample inventory and generic imagery.</span>
        <span>WINGFIELD / ADELAIDE</span>
      </div>
    </footer>
  );
}
createRoot(document.getElementById("root")).render(<App />);
