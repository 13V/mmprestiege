// Turns a CarRegistrationAPI (RegCheck) record into listing fields.
//
// What comes back depends on the state. NSW, TAS and WA return a full
// specification (series, variant, engine, transmission) but no real VIN:
// their "VechileIdentificationNumber" is a vehicle code. SA, VIC and QLD
// return the real VIN, but SA gives no engine, gearbox or variant. So every
// field is optional, and the result lists what is still missing.

const STATES = ["SA", "NSW", "VIC", "QLD", "WA", "TAS", "NT", "ACT"];
export const AUSTRALIAN_STATES = STATES;

// Makes whose usual spelling isn't plain title case.
const MAKES = {
  HSV: "HSV",
  "HOLDEN SPECIAL VEHICLES": "HSV",
  FPV: "FPV",
  BMW: "BMW",
  MG: "MG",
  GMC: "GMC",
  KIA: "Kia",
  MERCEDES: "Mercedes-Benz",
  "MERCEDES BENZ": "Mercedes-Benz",
  "MERCEDES-BENZ": "Mercedes-Benz",
  "ALFA ROMEO": "Alfa Romeo",
  "ASTON MARTIN": "Aston Martin",
  "LAND ROVER": "Land Rover",
  "ROLLS ROYCE": "Rolls-Royce",
  "ROLLS-ROYCE": "Rolls-Royce",
  MCLAREN: "McLaren",
  VW: "Volkswagen",
  "VOLKSWAGEN": "Volkswagen",
  "HOLDEN": "Holden",
};

const text = (value) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).replace(/\s+/g, " ").trim()
    : "";
const current = (value) => text(value?.CurrentTextValue ?? value);

// "PRADO GRANDE VX (4x4)" -> "Prado Grande VX (4x4)". Short codes and
// codes with digits stay upper case (GTS, SS, XR6, R8, CX-5).
export function titleCase(value) {
  return text(value)
    .split(" ")
    .map((word) => {
      const letters = word.replace(/[^A-Za-z]/g, "");
      if (!letters) return word.toLowerCase();
      const hasDigit = /\d/.test(word);
      if ((letters.length <= 3 && word === word.toUpperCase()) || (hasDigit && letters.length <= 3))
        return word.toUpperCase().replace(/(\d)X(\d)/g, "$1x$2");
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

// Colours are words, never codes: "RED" -> "Red", "DARK GREY" -> "Dark Grey".
export const colourName = (value) =>
  text(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

export function makeName(value) {
  const raw = text(value).toUpperCase();
  if (!raw) return "";
  return MAKES[raw] || titleCase(raw);
}

const BODIES = [
  [/\bUTE\b|UTILITY|PICK ?-?UP|CAB ?CHASSIS|TRAY/i, "Ute"],
  [/WAGON|ESTATE/i, "Wagon"],
  [/HATCH/i, "Hatch"],
  [/CONVERTIBLE|CABRIO|ROADSTER|SPIDER|SPYDER|SOFT ?TOP/i, "Convertible"],
  [/COUPE|2D SEDAN/i, "Coupe"],
  [/SEDAN|SALOON/i, "Sedan"],
  [/\bVAN\b/i, "Van"],
  [/\bSUV\b/i, "SUV"],
];
export function bodyName(...values) {
  for (const value of values) {
    const raw = text(value);
    if (!raw) continue;
    for (const [pattern, name] of BODIES) if (pattern.test(raw)) return name;
  }
  return "";
}

export function transmissionName(...values) {
  for (const value of values) {
    const raw = text(value);
    if (/\bauto|automatic|\bcvt\b|\bdct\b|\bdsg\b|tiptronic|sports? ?shift|sequential/i.test(raw))
      return "Automatic";
    if (/manual|\bman\b|\d\s*-?\s*sp(eed)?\s*m/i.test(raw)) return "Manual";
  }
  return "";
}

export function fuelName(value) {
  const raw = text(value);
  if (/hybrid/i.test(raw)) return "Hybrid";
  if (/electric|^ev$|^e$/i.test(raw)) return "Electric";
  if (/diesel|^d$/i.test(raw)) return "Diesel";
  if (/lpg|^gas$/i.test(raw)) return "LPG";
  if (/petrol|unleaded|\bulp\b|^p$/i.test(raw)) return "Petrol";
  return "";
}

const cylinderLabel = (value) => {
  const raw = text(value).toUpperCase();
  if (!raw) return "";
  if (/^[VWHI]\d+$/.test(raw)) return raw; // V8, V6, W12, H6, I4
  const count = Number.parseInt(raw, 10);
  if (!count) return "";
  return count >= 8 ? `V${count}` : `${count}-cylinder`;
};

// "4.0 litre, 6 cyl, EF" -> "4.0L 6-cylinder"; capacity 1968 (cc) -> "2.0L".
export function engineName({ capacity, unit, cylinders, description } = {}) {
  let litres = "";
  const value = Number.parseFloat(text(capacity));
  if (value) {
    const inCc = /cc|cm/i.test(text(unit)) || value > 50;
    litres = `${(inCc ? value / 1000 : value).toFixed(1)}L`;
  }
  const raw = text(description);
  if (!litres) {
    const match = raw.match(/(\d+(?:\.\d+)?)\s*(?:l\b|litre|liter)/i);
    if (match) litres = `${Number.parseFloat(match[1]).toFixed(1)}L`;
  }
  let cyl = cylinderLabel(cylinders);
  if (!cyl) {
    const match = raw.match(/(\d+)\s*cyl/i) || raw.match(/\b([VWHI]\d{1,2})\b/i);
    if (match) cyl = cylinderLabel(match[1]);
  }
  return [litres, cyl].filter(Boolean).join(" ");
}

// A real VIN: 17 characters, no I, O or Q.
export const isVin = (value) => /^[A-HJ-NPR-Z0-9]{17}$/.test(text(value).toUpperCase());

// An engine number has no spaces or unit (VIC returns one as "Engine").
const looksLikeEngineNumber = (value) => {
  const raw = text(value);
  return /^[A-Z0-9-]{7,}$/i.test(raw) && /\d/.test(raw) && !/litre|cyl|\bL\b/i.test(raw);
};

// "05/09/2022" -> "2022-09-05"; NT gives milliseconds.
function isoDate(value) {
  if (typeof value === "number" && value > 0) return new Date(value).toISOString().slice(0, 10);
  const raw = text(value);
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function yearFrom(...values) {
  const now = new Date().getFullYear();
  for (const value of values) {
    const year = Number.parseInt(text(value), 10);
    if (year >= 1900 && year <= now + 1) return year;
  }
  for (const value of values) {
    const match = text(value).match(/\b(19[0-9]{2}|20[0-9]{2})\b/);
    if (match) return Number(match[1]);
  }
  return null;
}

// Body words that some states leave on the end of the model name.
const MODEL_TAIL = /\s+\d?D\s+(SEDAN|WAGON|HATCH(BACK)?|COUPE|UTILITY|CAB CHASSIS|CONVERTIBLE|VAN)\b.*$/i;
const BODY_TAIL = /\s+(SEDAN|WAGON|STATION WAGON|HATCH(BACK)?|COUPE|UTILITY|UTE|CONVERTIBLE|VAN)$/i;

function modelName({ family, model, modelDescription, makes }) {
  const candidates = [family, model, modelDescription].map(text).filter(Boolean);
  const skip = makes.map((make) => text(make).toUpperCase()).filter(Boolean);
  for (const candidate of candidates) {
    if (skip.includes(candidate.toUpperCase())) continue;
    const cleaned = candidate.replace(MODEL_TAIL, "").replace(BODY_TAIL, "").trim();
    if (cleaned) return titleCase(cleaned);
  }
  return "";
}

const IMPORTANT = ["year", "make", "model", "variant", "body", "colour", "transmission", "engine"];

// raw: the parsed vehicleJson; context: { state, rego, vin }.
export function normaliseRegCheck(raw, context = {}) {
  const extended = raw?.extended || raw?.Extended || {};
  const rawMake = current(raw?.CarMake) || text(extended.make) || current(raw?.MakeDescription) || text(raw?.Make);
  const make = makeName(rawMake);
  const model = modelName({
    family: extended.family,
    model: current(raw?.CarModel) || raw?.Model,
    modelDescription: current(raw?.ModelDescription) || extended.model,
    makes: [rawMake, make],
  });
  const series = text(extended.series);
  const variantText = titleCase(extended.variant);
  const variant = [series, variantText].filter(Boolean).join(" · ");
  const bodyStyle = current(raw?.BodyStyle);
  const body = bodyName(extended.driveType, bodyStyle, raw?.BodyStyle, raw?.Description);
  const colour = colourName(text(raw?.Colour) || text(extended.colour));
  const transmission = transmissionName(
    extended.transmissionType,
    current(raw?.Transmission) || raw?.Transmission,
    extended.bodyType,
    bodyStyle,
  );
  const engineText = text(raw?.Engine);
  const engineNumber =
    text(raw?.EngineNumber) || (looksLikeEngineNumber(engineText) ? engineText : "");
  const engine = engineName({
    capacity: extended.capacityValue || (/^\d{3,4}$/.test(engineText) ? engineText : ""),
    unit: extended.capacityUnit,
    cylinders: extended.cylinders,
    description: extended.engineDescription || (engineNumber ? "" : engineText),
  });
  const fuel = fuelName(extended.fuelType || current(raw?.FuelType));
  const idCode = text(raw?.VechileIdentificationNumber || raw?.VehicleIdentificationNumber).toUpperCase();
  const vin = isVin(idCode) ? idCode : isVin(context.vin) ? text(context.vin).toUpperCase() : "";
  const year = yearFrom(raw?.RegistrationYear, extended.year, raw?.Year, raw?.Description);
  const regoExpiry = isoDate(raw?.Expiry) || isoDate(raw?.RegistrationPlate?.date_expired);
  const stolen = /^(y|yes|true)$/i.test(text(raw?.Stolen));

  const fields = { year, make, model, variant, body, colour, transmission, engine, fuel, vin, regoExpiry };
  for (const key of Object.keys(fields)) if (fields[key] === "" || fields[key] == null) delete fields[key];
  const extra = {
    insurer: text(raw?.InsuranceCompany),
    nvic: text(extended.nvic).toUpperCase(),
    vehicleCode: !isVin(idCode) ? idCode : "",
    engineNumber,
    compliance: text(raw?.ComplianceDate),
    registration: text(raw?.RegistrationPlate?.status) ? titleCase(raw.RegistrationPlate.status) : "",
  };
  for (const key of Object.keys(extra)) if (!extra[key]) delete extra[key];
  const warnings = [];
  if (stolen) warnings.push("This vehicle is recorded as stolen. Don't proceed until it's cleared.");
  return {
    description: text(raw?.Description),
    fields,
    extra,
    missing: IMPORTANT.filter((key) => !(key in fields)),
    warnings,
    state: STATES.includes(text(raw?.State).toUpperCase()) ? text(raw.State).toUpperCase() : context.state || "",
  };
}
