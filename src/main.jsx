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
} from "lucide-react";
import { vehicles, money, number, business } from "./data";
import ThemedSelect from "./ThemedSelect";
import "./styles.css";
import "./dealer.css";
import "./foundation.css";
import "./collection.css";
import "./direction.css";
import "./showroom.css";
import "./showroom-hero.css";
import "./vehicle-card.css";
import "./mm-prestige.css";

const StockManagerDemo = lazy(() => import("./StockManagerDemo"));
const CrmDemo = lazy(() => import("./CrmDemo"));

function Logo() {
  return (
    <Link to="/" className="brand" aria-label="MM Prestiege Motors home">
      <span>
        <b>MM Prestiege</b>
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
          purpose={enquiry.purpose}
          onClose={() => setEnquiry(null)}
        />
      )}
    </BrowserRouter>
  );
}
function SiteLayout({ children, onEnquire }) {
  const { pathname } = useLocation();
  if (["/stock-manager", "/crm"].includes(pathname.replace(/\/$/, "")))
    return children;
  return (
    <div
      className={`site-shell ${pathname === "/" ? "home-shell" : "inner-shell"}`}
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
        ? "Sales CRM mockup | MM Prestiege Motors"
        : route === "/stock-manager"
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
  const { pathname, search } = useLocation();
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
            id="main-navigation"
            className={open ? "nav open" : "nav"}
            aria-label="Main navigation"
          >
            <Link className={pathname === "/" ? "active" : ""} to="/">
              Home
            </Link>
            <a href="/#about" onClick={() => setOpen(false)}>
              About us
            </a>
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
            <a href="/#services" onClick={() => setOpen(false)}>
              Services
            </a>
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
        {["HSV", "Holden", "Commodore", "Clubsport", "Maloo", "Ford"].map(
          (name) => (
            <li key={name}>{name}</li>
          ),
        )}
      </ul>
      <section className="reference-offer" id="services">
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
      </section>
      <section className="section collection reference-collection">
        <div className="section-title">
          <h2>The most searched cars</h2>
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
            disabled={featuredStart === 0}
            onClick={() => setFeaturedStart((start) => Math.max(0, start - 1))}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            aria-label="Next featured cars"
            disabled={featuredStart === maxFeaturedStart}
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
              <span className="stars" aria-label="5 out of 5 stars">
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
        <div>
          <span className="eyebrow">THE MM PRESTIGE COLLECTION</span>
          <h1>Cars with character.</h1>
          <p>
            Find the one that feels like you. Explore our performance
            collection.
          </p>
        </div>
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
            {[...new Set(vehicles.map((car) => car.make))].map((make) => (
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
            {[...new Set(vehicles.map((car) => car.body))].map((v) => (
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
          <div className="select-field">
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
          <div className="select-field">
            <span>Maximum price</span>
            <ThemedSelect
              label="Maximum price"
              value={max}
              onChange={setMax}
              options={[
                { value: "", label: "No maximum" },
                ...[50000, 60000, 70000, 100000].map(
                  (value) => ({ value: String(value), label: money(value) }),
                ),
              ]}
            />
          </div>
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
              {status === "sold"
                ? "in our sold collection"
                : "in the collection"}
            </span>
            <div>
              <button
                className="filter-toggle"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={17} />
                Filters {filterCount > 0 && `(${filterCount})`}
              </button>
              <div className="sort-label">
                <span>Sort by</span>
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
              </div>
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
    setZoom(false);
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
                src={photos[index] || photos[0]}
                alt={`Illustrative ${car.make} ${car.model} photo ${index + 1} of ${photos.length}`}
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
              {photos.length > 1 && (
                <button
                  className="gallery-prev gallery-nav"
                  aria-label="Previous vehicle photo"
                  onClick={() => move(-1)}
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              {photos.length > 1 && (
                <button
                  className="gallery-next gallery-nav"
                  aria-label="Next vehicle photo"
                  onClick={() => move(1)}
                >
                  <ChevronRight size={24} />
                </button>
              )}
              <span className="gallery-count">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(photos.length).padStart(2, "0")}
              </span>
            </div>
            {photos.length > 1 && (
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
            )}
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
            <span className="vehicle-identity">
              <span
                className="vehicle-year"
                aria-label={`Model year ${car.year}`}
              >
                {car.year}
              </span>
              <span className="vehicle-marque">{car.make}</span>
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
                <span className="price-label">Asking price</span>
                <strong>
                  <span className="price-currency">$</span>
                  <span className="price-amount">{number(car.price)}</span>
                </strong>
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
            src={photos[index] || photos[0]}
            alt={`Illustrative ${car.make} ${car.model} photo ${index + 1} of ${photos.length}`}
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
