import React, { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useSearchParams,
  useParams,
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
  Star,
  CarFront,
  ShieldCheck,
  MessageSquare,
  Plus,
  Minus,
  Palette,
  Copy,
  Send,
} from "lucide-react";
import { vehicles, money, number, business } from "./data";
import "./styles.css";
import "./dealer.css";

const StockManagerDemo = lazy(() => import("./StockManagerDemo"));
const CrmDemo = lazy(() => import("./CrmDemo"));

function Logo() {
  return (
    <Link to="/" className="brand" aria-label="MM Prestiege Motors home">
      <span>
        <b>MM PRESTIEGE</b>
        <small>M O T O R S</small>
      </span>
    </Link>
  );
}
function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("mm-theme") || "red",
  );
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mm-saved") || "[]");
    } catch {
      return [];
    }
  });
  const [enquiry, setEnquiry] = useState(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mm-theme", theme);
  }, [theme]);
  useEffect(
    () => localStorage.setItem("mm-saved", JSON.stringify(saved)),
    [saved],
  );
  function toggleSaved(id) {
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  return (
    <BrowserRouter>
      <ScrollReset />
      <SiteLayout
        theme={theme}
        setTheme={setTheme}
        onEnquire={() => setEnquiry({})}
      >
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
              element={
                <div className="not-found">
                  <h1>That road ends here.</h1>
                  <Link className="button primary" to="/stock">
                    Explore our stock <ArrowRight size={18} />
                  </Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </SiteLayout>
      {enquiry && (
        <Enquiry
          vehicle={enquiry.id ? enquiry : null}
          onClose={() => setEnquiry(null)}
        />
      )}
    </BrowserRouter>
  );
}
function SiteLayout({ children, theme, setTheme, onEnquire }) {
  const { pathname } = useLocation();
  if (["/stock-manager", "/crm"].includes(pathname.replace(/\/$/, "")))
    return children;
  return (
    <>
      <Header onEnquire={onEnquire} />
      {children}
      <Footer />
      <PaletteSwitcher theme={theme} setTheme={setTheme} />
    </>
  );
}
function ScrollReset() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const vehicle = vehicles.find((car) => pathname === `/stock/${car.id}`);
    document.title =
      pathname.replace(/\/$/, "") === "/crm"
        ? "Sales CRM mockup | MM Prestiege Motors"
        : pathname.replace(/\/$/, "") === "/stock-manager"
          ? "Stock management demo | MM Prestiege Motors"
          : vehicle
            ? `${vehicle.year} ${vehicle.make} ${vehicle.model} | MM Prestige Motors`
            : pathname === "/stock"
              ? "Our collection | MM Prestige Motors"
              : "MM Prestige Motors | HSV & Holden Specialists, Adelaide";
    if (hash) {
      requestAnimationFrame(() =>
        document
          .getElementById(hash.slice(1))
          ?.scrollIntoView({ behavior: "auto" }),
      );
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}
function Header({ onEnquire }) {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();
  const soldView =
    pathname === "/stock" &&
    new URLSearchParams(search).get("status") === "sold";
  useEffect(() => setOpen(false), [pathname, search]);
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
      <header className="header">
        <div className="header-inner">
          <Logo />
          <nav
            className={open ? "nav open" : "nav"}
            aria-label="Main navigation"
          >
            <Link className={pathname === "/" ? "active" : ""} to="/">
              Home
            </Link>
            <Link
              className={
                pathname.startsWith("/stock") && !soldView ? "active" : ""
              }
              to="/stock"
            >
              Our stock
            </Link>
            <Link className={soldView ? "active" : ""} to="/stock?status=sold">
              Sold cars
            </Link>
            <a href="/#about" onClick={() => setOpen(false)}>
              Our story
            </a>
            <a href="/#reviews" onClick={() => setOpen(false)}>
              Reviews
            </a>
            <button
              className="button small primary"
              onClick={() => {
                setOpen(false);
                onEnquire();
              }}
            >
              Contact us <Phone size={16} />
            </button>
          </nav>
          <button
            className="menu-button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
    </>
  );
}
function CarCard({ car, saved, toggleSaved }) {
  return (
    <article className={`car-card ${car.status === "sold" ? "sold-card" : ""}`}>
      <div className="card-heading">
        <Link className="card-title" to={`/stock/${car.id}`}>
          {car.year} {car.make} {car.model}
        </Link>
        <p className="card-variant">{car.variant}</p>
      </div>
      <Link
        className="card-photo"
        to={`/stock/${car.id}`}
        aria-label={`View ${car.year} ${car.make} ${car.model}`}
      >
        <img
          src={car.image}
          alt={`Illustrative performance car photograph for ${car.make} ${car.model}`}
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
            <Heart
              size={22}
              fill={saved.includes(car.id) ? "currentColor" : "none"}
            />
          </button>
        </div>
        <div className="card-specs">
          <span>
            <Gauge size={16} />
            {number(car.kms)} km
          </span>
          <span>
            <Cog size={16} />
            {car.transmission}
          </span>
          <span>
            <Fuel size={16} />
            V8
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
function Home({ saved, toggleSaved, onEnquire }) {
  return (
    <main className="dealer-home">
      <section className="dealer-banner">
        <div className="dealer-intro">
          <p className="dealer-location">MM Prestige Motors · Wingfield, SA</p>
          <h1>
            HSV &amp; Holden
            <br />
            specialists in Adelaide.
          </h1>
          <p>
            Buy, sell or trade your next performance car. Visit our Wingfield
            showroom and speak with Madi.
          </p>
          <Link className="button primary" to="/stock">
            Explore our stock <ArrowRight size={20} />
          </Link>
          <a className="dealer-phone" href={`tel:${business.tel}`}>
            <Phone size={17} />
            {business.phone}
          </a>
        </div>
        <div className="dealer-banner-image">
          <img src="/images/car-1.jpg" alt="Generic performance car preview" />
          <span>Performance &amp; prestige vehicles</span>
        </div>
      </section>
      <nav className="dealer-shortcuts" aria-label="Showroom links">
        <Link to="/stock">
          <CarFront size={22} />
          Available cars <ArrowRight size={18} />
        </Link>
        <Link to="/stock?status=sold">
          <Check size={22} />
          Recently sold <ArrowRight size={18} />
        </Link>
        <button onClick={() => onEnquire({})}>
          <MessageSquare size={22} />
          Sell or trade your car <ArrowRight size={18} />
        </button>
        <a href={business.maps} target="_blank" rel="noreferrer">
          <MapPin size={22} />
          Find our showroom <ArrowUpRight size={18} />
        </a>
      </nav>
      <section className="section collection">
        <div className="section-title">
          <div>
            <h2>Available cars</h2>
            <p>Browse our current selection of performance vehicles.</p>
          </div>
          <Link className="text-link" to="/stock">
            View all stock <ArrowRight size={19} />
          </Link>
        </div>
        <div className="card-grid featured">
          {vehicles.slice(0, 3).map((car) => (
            <CarCard key={car.id} {...{ car, saved, toggleSaved }} />
          ))}
        </div>
        <p className="sample-note">
          Sample stock and generic photos shown while the website is being
          prepared.
        </p>
      </section>
      <section className="dealer-about" id="about">
        <div>
          <h2>MM Prestige Motors</h2>
          <p>
            We buy, sell and trade prestige and performance vehicles, with a
            focus on HSV, Holden Commodore and Australian muscle cars.
          </p>
          <p>
            Speak directly with Madi about a car, arrange a viewing or discuss a
            trade-in.
          </p>
          <button className="button primary" onClick={() => onEnquire({})}>
            Contact Madi <ArrowRight size={18} />
          </button>
        </div>
        <div className="dealer-visit">
          <h3>Visit our showroom</h3>
          <p>
            {business.address}
            <br />
            {business.suburb}
          </p>
          <a href={`tel:${business.tel}`}>
            <Phone size={18} />
            {business.phone}
          </a>
          <p>Call to arrange a viewing.</p>
          <a
            className="text-link"
            href={business.maps}
            target="_blank"
            rel="noreferrer"
          >
            Directions on Google Maps <ArrowUpRight size={18} />
          </a>
        </div>
      </section>
      <section className="section reviews" id="reviews">
        <div className="section-title">
          <h2>Customer reviews</h2>
          <div className="rating">
            <b>5.0</b>
            <span>
              <span className="stars">★★★★★</span>
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
      </section>
    </main>
  );
}
function Review({ quote, name, detail }) {
  return (
    <article className="review">
      <span className="stars">★★★★★</span>
      <blockquote>“{quote}”</blockquote>
      <div className="review-person">
        <span className="avatar">{name[0]}</span>
        <span>
          <b>{name}</b>
          <small>{detail}</small>
        </span>
        <span className="google-g">G</span>
      </div>
    </article>
  );
}
function Stock({ saved, toggleSaved }) {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "available";
  const [search, setSearch] = useState(""),
    [makes, setMakes] = useState([]),
    [body, setBody] = useState(""),
    [transmission, setTransmission] = useState(""),
    [max, setMax] = useState(""),
    [sort, setSort] = useState("newest"),
    [savedOnly, setSavedOnly] = useState(false),
    [filtersOpen, setFiltersOpen] = useState(false);
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
    <main className="stock-page">
      <section className="stock-page-bar">
        <h1>Used performance cars</h1>
        <span>
          <MapPin size={16} />
          Wingfield, South Australia
        </span>
      </section>
      <div className="stock-layout">
        <aside className={`filters ${filtersOpen ? "filters-open" : ""}`}>
          <div className="filter-heading">
            <h2>Refine your search</h2>
            <button
              className="close-filter"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <label className="search-field">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Make, model or year"
              aria-label="Search stock"
            />
          </label>
          <div className="filter-applied">
            <b>
              {filterCount
                ? `${filterCount} active filter${filterCount === 1 ? "" : "s"}`
                : "No filters applied"}
            </b>
            <button onClick={clear}>Reset</button>
          </div>
          <fieldset className="filter-group">
            <legend>Make</legend>
            {["HSV", "Holden", "Ford"].map((make) => (
              <label className="check-row" key={make}>
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
          </fieldset>
          <fieldset className="filter-group">
            <legend>Body style</legend>
            {["Sedan", "Ute", "Coupe"].map((v) => (
              <label className="check-row" key={v}>
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
              <button className="clear-link" onClick={() => setBody("")}>
                All body styles
              </button>
            )}
          </fieldset>
          <label className="select-field">
            Transmission
            <select
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
            >
              <option value="">Any transmission</option>
              <option>Automatic</option>
              <option>Manual</option>
            </select>
          </label>
          <label className="select-field">
            Maximum price
            <select value={max} onChange={(e) => setMax(e.target.value)}>
              <option value="">No maximum</option>
              <option value="50000">$50,000</option>
              <option value="60000">$60,000</option>
              <option value="70000">$70,000</option>
              <option value="100000">$100,000</option>
            </select>
          </label>
          <div className="filter-contact">
            <MessageSquare size={24} />
            <h3>
              Something specific
              <br />
              in mind?
            </h3>
            <p>
              Talk cars with Madi. We're here to help you find your next drive.
            </p>
            <a className="text-link" href={`tel:${business.tel}`}>
              Let's talk <ArrowUpRight size={17} />
            </a>
          </div>
          <button
            className="button primary mobile-show-results"
            onClick={() => setFiltersOpen(false)}
          >
            Show {filtered.length} cars <ArrowRight size={17} />
          </button>
        </aside>
        <section className="stock-results">
          <div className="stock-toolbar">
            <div
              className="stock-tabs"
              role="group"
              aria-label="Vehicle availability"
            >
              {[
                ["available", "Available"],
                ["sold", "Sold"],
                ["all", "All cars"],
              ].map(([value, label]) => (
                <button
                  className={status === value ? "selected" : ""}
                  onClick={() => changeStatus(value)}
                  key={value}
                >
                  {label}
                  <span>
                    {
                      vehicles.filter(
                        (c) => value === "all" || c.status === value,
                      ).length
                    }
                  </span>
                </button>
              ))}
            </div>
            <button
              className={`saved-button ${savedOnly ? "selected" : ""}`}
              onClick={() => setSavedOnly(!savedOnly)}
              aria-pressed={savedOnly}
            >
              <Heart size={16} />
              Saved <span>{saved.length}</span>
            </button>
          </div>
          <div className="results-heading">
            <span>
              <b>{filtered.length}</b> {filtered.length === 1 ? "car" : "cars"}{" "}
              {status === "sold" ? "sold vehicles" : "available to view"}
            </span>
            <div>
              <button
                className="filter-toggle"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={17} />
                Filters {filterCount > 0 && `(${filterCount})`}
              </button>
              <label className="sort-label">
                Sort by
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sort stock"
                >
                  <option value="newest">Newest model</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="kms">Lowest kilometres</option>
                </select>
              </label>
            </div>
          </div>
          {filtered.length ? (
            <div className="card-grid stock-grid">
              {filtered.map((car) => (
                <CarCard key={car.id} {...{ car, saved, toggleSaved }} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={40} />
              <h2>No cars in this lane.</h2>
              <p>Try adjusting your filters or explore the full collection.</p>
              <button
                className="button primary"
                onClick={() => {
                  clear();
                  changeStatus("all");
                }}
              >
                Reset all filters <ArrowRight size={18} />
              </button>
            </div>
          )}
          <p className="sample-note">
            Preview collection · All vehicle imagery, stock, prices and
            specifications are illustrative.
          </p>
        </section>
      </div>
    </main>
  );
}
function Vehicle({ saved, toggleSaved, onEnquire }) {
  const { id } = useParams();
  const car = vehicles.find((c) => c.id === id);
  const [index, setIndex] = useState(0),
    [zoom, setZoom] = useState(false),
    [tab, setTab] = useState("overview");
  useEffect(() => {
    setIndex(0);
    setTab("overview");
  }, [id]);
  const photos = car
    ? [
        car.image,
        "/images/detail-1.jpg",
        "/images/detail-2.jpg",
        "/images/detail-3.jpg",
        "/images/hero.jpg",
      ]
    : [];
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
  if (!car)
    return (
      <div className="not-found">
        <h1>We couldn't find that car.</h1>
        <Link className="button primary" to="/stock">
          Back to stock
        </Link>
      </div>
    );
  const specs = [
    ["Year", car.year],
    ["Make", car.make],
    ["Model", car.model],
    ["Kilometres", `${number(car.kms)} km`],
    ["Transmission", car.transmission],
    ["Engine", car.engine],
    ["Body style", car.body],
    ["Exterior colour", car.colour],
    ["Fuel type", car.fuel],
    ["Power", car.power],
    ["Stock number", car.stock],
    ["Location", "Wingfield, SA"],
  ];
  return (
    <main className="vehicle-page">
      <div className="breadcrumbs">
        <Link to="/stock">
          <ArrowLeft size={16} />
          Back to stock
        </Link>
        <span>
          Our collection <ChevronRight size={12} />
          {car.make} {car.model}
        </span>
      </div>
      <div className="vehicle-layout">
        <div className="vehicle-left">
          <section className="gallery" aria-label="Vehicle photo gallery">
            <div className="gallery-main">
              <img
                src={photos[index]}
                alt={`Illustrative vehicle photo ${index + 1} of ${photos.length}`}
              />
              <span
                className={`car-tag ${car.status === "sold" ? "sold-tag" : ""}`}
              >
                {car.status === "sold" ? "SOLD" : "AVAILABLE NOW"}
              </span>
              <button
                className="gallery-expand"
                aria-label="Expand vehicle photos"
                onClick={() => setZoom(true)}
              >
                <Expand size={19} />
              </button>
              <button
                className="gallery-prev gallery-nav"
                aria-label="Previous vehicle photo"
                onClick={() => move(-1)}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                className="gallery-next gallery-nav"
                aria-label="Next vehicle photo"
                onClick={() => move(1)}
              >
                <ChevronRight size={24} />
              </button>
              <span className="gallery-count">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(photos.length).padStart(2, "0")}
              </span>
            </div>
            <div className="gallery-thumbs">
              {photos.map((photo, i) => (
                <button
                  key={i}
                  className={i === index ? "current" : ""}
                  aria-label={`Show vehicle photo ${i + 1}`}
                  aria-pressed={i === index}
                  onClick={() => setIndex(i)}
                >
                  <img src={photo} alt="" />
                  <span>{String(i + 1).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
            <p className="gallery-note">
              Generic preview photography · Images do not depict this vehicle.
            </p>
          </section>
          <section className="vehicle-info">
            <div
              className="detail-tabs"
              role="tablist"
              aria-label="Vehicle information"
            >
              <button
                role="tab"
                id="overview-tab"
                aria-controls="overview-panel"
                aria-selected={tab === "overview"}
                className={tab === "overview" ? "active" : ""}
                onClick={() => setTab("overview")}
              >
                Overview
              </button>
              <button
                role="tab"
                id="specifications-tab"
                aria-controls="specifications-panel"
                aria-selected={tab === "specifications"}
                className={tab === "specifications" ? "active" : ""}
                onClick={() => setTab("specifications")}
              >
                Specifications
              </button>
            </div>
            {tab === "overview" ? (
              <div
                id="overview-panel"
                role="tabpanel"
                aria-labelledby="overview-tab"
              >
                <div className="eyebrow">A CAR WITH CHARACTER</div>
                <h2>
                  {car.make === "HSV"
                    ? "Australian muscle."
                    : car.make === "Holden"
                      ? "An Australian icon."
                      : "Built for the enthusiast."}
                  <br />
                  <em>Unmistakable attitude.</em>
                </h2>
                <p>{car.description}</p>
                <div className="overview-highlights">
                  <span>
                    <CarFront size={22} />
                    {car.engine}
                  </span>
                  <span>
                    <Cog size={22} />
                    {car.transmission}
                  </span>
                  <span>
                    <Gauge size={22} />
                    {number(car.kms)} km
                  </span>
                </div>
                <p className="detail-note">
                  This listing is a design preview. Vehicle details and pricing
                  are sample data. Contact the dealer to confirm actual stock,
                  condition and specifications.
                </p>
              </div>
            ) : (
              <div
                id="specifications-panel"
                role="tabpanel"
                aria-labelledby="specifications-tab"
                className="spec-table"
              >
                {specs.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        <aside className="vehicle-summary">
          <div className="vehicle-summary-top">
            <span className="eyebrow">
              {car.year} · {car.make}
            </span>
            <button
              className={`detail-save ${saved.includes(car.id) ? "is-saved" : ""}`}
              aria-label={
                saved.includes(car.id) ? "Unsave vehicle" : "Save vehicle"
              }
              aria-pressed={saved.includes(car.id)}
              onClick={() => toggleSaved(car.id)}
            >
              <Heart
                size={21}
                fill={saved.includes(car.id) ? "currentColor" : "none"}
              />
            </button>
          </div>
          <h1>{car.model}</h1>
          <p className="vehicle-variant">{car.variant}</p>
          <div className="summary-specs">
            <span>
              <Gauge size={21} />
              <small>Kilometres</small>
              <b>{number(car.kms)} km</b>
            </span>
            <span>
              <Cog size={21} />
              <small>Transmission</small>
              <b>{car.transmission}</b>
            </span>
            <span>
              <CalendarDays size={21} />
              <small>Year</small>
              <b>{car.year}</b>
            </span>
            <span>
              <Fuel size={21} />
              <small>Engine</small>
              <b>{car.engine}</b>
            </span>
          </div>
          <div className="vehicle-price">
            {car.status === "sold" ? (
              <>
                <div className="sold-word">SOLD</div>
                <p>This one has found its next driver.</p>
              </>
            ) : (
              <>
                <span className="price-label">YOUR NEXT DRIVE</span>
                <strong>{money(car.price)}</strong>
                <small>Excludes government charges · Sample price</small>
              </>
            )}
          </div>
          {car.status === "available" && <Finance price={car.price} />}
          <button
            className="button primary full"
            onClick={() => onEnquire(car)}
          >
            {car.status === "sold"
              ? "Find me something similar"
              : "Enquire about this car"}
            <ArrowUpRight size={20} />
          </button>
          <a className="vehicle-phone" href={`tel:${business.tel}`}>
            <Phone size={22} />
            <span>
              <small>Talk cars with Madi</small>
              <b>{business.phone}</b>
            </span>
            <ArrowUpRight size={20} />
          </a>
          <a
            className="map-card"
            href={business.maps}
            target="_blank"
            rel="noreferrer"
          >
            <div className="map-art" aria-hidden="true">
              <span className="map-road road-one">GRAND JUNCTION RD</span>
              <span className="map-road road-two" />
              <span className="map-block b1" />
              <span className="map-block b2" />
              <span className="map-block b3" />
              <span className="map-pin">
                <MapPin size={26} fill="currentColor" />
              </span>
              <b>WINGFIELD</b>
            </div>
            <div className="map-address">
              <MapPin size={17} />
              <span>
                {business.address}
                <small>{business.suburb}</small>
              </span>
              <ArrowUpRight size={19} />
            </div>
          </a>
          <p className="summary-stock">
            Stock no. {car.stock} <span>MM PRESTIGE MOTORS</span>
          </p>
        </aside>
      </div>
      <section className="related section">
        <div className="section-title">
          <div>
            <div className="eyebrow">KEEP EXPLORING</div>
            <h2>
              More cars. <em>More character.</em>
            </h2>
          </div>
          <Link className="text-link" to="/stock">
            View all stock <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="card-grid featured">
          {vehicles
            .filter((c) => c.id !== id && c.status === "available")
            .slice(0, 3)
            .map((c) => (
              <CarCard key={c.id} car={c} {...{ saved, toggleSaved }} />
            ))}
        </div>
      </section>
      {zoom && (
        <Dialog
          title="Vehicle photo gallery"
          onClose={() => setZoom(false)}
          className="lightbox"
        >
          <img
            src={photos[index]}
            alt={`Illustrative vehicle photo ${index + 1} of ${photos.length}`}
          />
          <div className="lightbox-controls">
            <button
              aria-label="Previous expanded photo"
              onClick={() => move(-1)}
            >
              <ChevronLeft />
            </button>
            <span>
              {index + 1} / {photos.length}
            </span>
            <button aria-label="Next expanded photo" onClick={() => move(1)}>
              <ChevronRight />
            </button>
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
function Enquiry({ vehicle, onClose }) {
  const [ready, setReady] = useState(false),
    [copied, setCopied] = useState(false),
    [form, setForm] = useState({
      name: "",
      phone: "",
      message: vehicle
        ? `Hi Madi, I'm interested in the ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.status === "sold" ? " or something similar" : ""}. Could we arrange a time to chat?`
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
            Prepare a message for Madi, then send it with your messaging app.
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
          <span className="footer-label">THE COLLECTION</span>
          <Link to="/stock">Available stock</Link>
          <Link to="/stock?status=sold">Sold cars</Link>
          <Link to="/#about">Our story</Link>
        </div>
        <div>
          <span className="footer-label">COME SAY HELLO</span>
          <a href={business.maps} target="_blank" rel="noreferrer">
            {business.address}
            <br />
            {business.suburb}
            <ArrowUpRight size={14} />
          </a>
          <a href={`tel:${business.tel}`}>{business.phone}</a>
          <span className="footer-appointment">Call to arrange a viewing.</span>
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
function PaletteSwitcher({ theme, setTheme }) {
  const [open, setOpen] = useState(false);
  const options = [
    ["red", "Performance red", "Black · White · Red"],
    ["commodore", "Commodore SS", "Black · Silver · Holden red"],
    ["blue", "Midnight blue", "Navy · Silver · Cobalt"],
    ["green", "Racing green", "Forest · Ivory · Bronze"],
  ];
  return (
    <div className="palette-control">
      {open && (
        <div className="palette-panel">
          <div>
            <b>Choose the look</b>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close colour palettes"
            >
              <X size={16} />
            </button>
          </div>
          {options.map(([id, label, desc]) => (
            <button
              key={id}
              className={theme === id ? "chosen" : ""}
              onClick={() => setTheme(id)}
              aria-pressed={theme === id}
            >
              <span className={`palette-swatches ${id}`}>
                <i />
                <i />
                <i />
              </span>
              <span>
                <b>{label}</b>
                <small>{desc}</small>
              </span>
              {theme === id && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
      <button
        className="palette-pill"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Compare colour palettes"
      >
        <Palette size={16} />
        <span>Colour palettes</span>
        <span className={`palette-dot ${theme}`} />
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
