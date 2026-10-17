// Rego and VIN lookups. CarRegistrationAPI (RegCheck) is the live provider;
// the mock returns the provider's own documented sample records, so
// development and tests exercise the same normalising code.
import { AUSTRALIAN_STATES, isVin, normaliseRegCheck } from "./normalize.js";

export class LookupError extends Error {
  constructor(code, message, detail = "") {
    super(message);
    this.code = code; // not_found | credits | config | unavailable | invalid
    this.detail = detail;
  }
}

export const cleanRego = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
export const cleanVin = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);

const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescapeXml = (value) =>
  value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, code) => {
    if (code[0] === "#")
      return String.fromCodePoint(
        code[1].toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10),
      );
    return entities[code.toLowerCase()];
  });

// The HTTP POST binding answers with XML whose <vehicleJson> holds the
// record as a JSON string.
export function parseRegCheckXml(xml) {
  const match = String(xml).match(/<vehicleJson>([\s\S]*?)<\/vehicleJson>/);
  if (!match || !match[1].trim()) return null;
  try {
    return JSON.parse(unescapeXml(match[1]));
  } catch {
    return null;
  }
}

// RegCheck answers failures with HTTP 500 and a plain-text reason.
export function regCheckError(message) {
  const detail = String(message || "").trim().slice(0, 200);
  if (/username|not authori[sz]ed|access denied|locked/i.test(detail))
    return new LookupError("config", "The rego lookup account isn't set up correctly.", detail);
  if (/credit|balance|top ?up/i.test(detail))
    return new LookupError("credits", "The rego lookup has run out of credits.", detail);
  return new LookupError("not_found", "No vehicle found.", detail);
}

export function regCheckProvider({ username, fetchImpl = fetch, timeout = 20000 }) {
  const base = "https://www.regcheck.org.uk";
  async function call(operation, params) {
    let response;
    try {
      response = await fetchImpl(`${base}/api/reg.asmx/${operation}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ ...params, username }).toString(),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (error) {
      throw new LookupError("unavailable", "The rego lookup service didn't answer. Try again shortly.", error.message);
    }
    const body = await response.text();
    if (!response.ok) throw regCheckError(body);
    const record = parseRegCheckXml(body);
    if (!record) throw new LookupError("not_found", "No vehicle found.");
    return record;
  }
  return {
    name: "CarRegistrationAPI",
    byRego: (rego, state) => call("CheckAustralia", { RegistrationNumber: rego, State: state }),
    byVin: (vin) => call("VinCheck", { Vin: vin }),
    async credits() {
      try {
        const response = await fetchImpl(
          `${base}/ajax/getcredits.aspx?username=${encodeURIComponent(username)}`,
          { signal: AbortSignal.timeout(8000) },
        );
        const value = Number.parseInt((await response.text()).trim(), 10);
        return Number.isFinite(value) ? value : null;
      } catch {
        return null;
      }
    },
  };
}

// Sample records from the CarRegistrationAPI documentation, plus a
// stand-in for one of Madi's HSVs and a few failure cases.
const SAMPLES = {
  "SA:S123ABC": {
    Description: "RED HSV SEDAN",
    CarMake: { CurrentTextValue: "HSV" },
    CarModel: { CurrentTextValue: "GTS" },
    RegistrationYear: "2016",
    BodyStyle: { CurrentTextValue: "SEDAN" },
    Colour: "RED",
    Expiry: "14/03/2027",
    VechileIdentificationNumber: "6G1FK5EP0GL303518",
    InsuranceCompany: "AAMI",
    State: "SA",
  },
  "SA:YY819H": {
    Description: "WHITE MITSUBISHI STATION WAGON",
    CarMake: { CurrentTextValue: "MITSUBISHI" },
    CarModel: { CurrentTextValue: "Pajero" },
    RegistrationYear: "2015",
    BodyStyle: { CurrentTextValue: "STATION WAGON" },
    Colour: "WHITE",
    Expiry: "05/09/2022",
    VechileIdentificationNumber: "JMFLYV98WGJ003504",
    InsuranceCompany: "AAMI",
    State: "SA",
  },
  "NSW:BEW76P": {
    Description: "FORD Fairmont 4D Sedan ",
    RegistrationYear: "1994",
    CarMake: { CurrentTextValue: "FORD" },
    MakeDescription: { CurrentTextValue: "FORD" },
    ModelDescription: { CurrentTextValue: "Fairmont 4D Sedan" },
    BodyStyle: { CurrentTextValue: "4-Speed Auto" },
    Colour: "",
    VechileIdentificationNumber: "FORFMT---7402E01994A",
    Engine: "4.0 litre, 6 cyl, EF",
    extended: {
      nvic: "OP5",
      driveType: "4D SEDAN",
      family: "FAIRMONT",
      variant: "",
      model: "Fairmont 4D Sedan",
      colour: "",
      code: "FORFMT---7402E01994A",
      make: "FORD",
      fuelType: "",
      capacityValue: "4.0",
      series: "EF",
      engineDescription: "4.0 litre, 6 cyl, EF",
      bodyDescription: "",
      bodyType: "4-Speed Auto",
      cylinders: "6",
      year: "1994",
      capacityUnit: "L",
      transmissionType: "4-Speed Auto",
    },
    State: "NSW",
  },
  "VIC:ZZA271": {
    Description: "2012 WHITE HYUNDAI WAGON",
    RegistrationYear: "2012",
    CarMake: { CurrentTextValue: "HYUNDAI" },
    MakeDescription: { CurrentTextValue: "HYUNDAI" },
    Colour: "WHITE",
    VechileIdentificationNumber: "KMHJU81CSCU459552",
    Engine: "G4KECU661333",
    Stolen: "No",
    ComplianceDate: "02/2012",
    Expiry: "20/02/2018",
    State: "VIC",
  },
  "VIC:STOLEN1": {
    Description: "2014 BLACK HOLDEN SEDAN",
    RegistrationYear: "2014",
    CarMake: { CurrentTextValue: "HOLDEN" },
    Colour: "BLACK",
    VechileIdentificationNumber: "6G1FA8E53EL100001",
    Stolen: "Yes",
    State: "VIC",
  },
  "QLD:949RWP": {
    Description: "2011 HYUNDAI ACCENT HATCHBACK",
    CarMake: { CurrentTextValue: "HYUNDAI" },
    CarModel: { CurrentTextValue: "ACCENT HATCHBACK" },
    RegistrationYear: "2011",
    VechileIdentificationNumber: "KMHCT51DLCU021130",
    InsuranceExpiry: "01/11/2019",
    State: "QLD",
  },
  "TAS:E09FK": {
    Description: "MAZDA           Cx-5 4D Wagon MAXX (4x2)",
    RegistrationYear: "2012",
    CarMake: { CurrentTextValue: "MAZDA" },
    MakeDescription: { CurrentTextValue: "MAZDA" },
    ModelDescription: { CurrentTextValue: "Cx-5 4D Wagon" },
    BodyStyle: { CurrentTextValue: "Maxx (4X2) 6-Speed Manual" },
    Colour: "",
    VechileIdentificationNumber: "MAZCX5M2--20NHI2012B",
    Engine: "2.0 litre, 4 cyl",
    extended: {
      nvic: "NHI12B",
      driveType: "4D WAGON",
      family: "CX-5",
      variant: "MAXX (4x2)",
      model: "Cx-5 4D Wagon",
      capacityValue: "2.0",
      series: "",
      engineDescription: "2.0 litre, 4 cyl",
      bodyType: "Maxx (4X2) 6-Speed Manual",
      cylinders: "4",
      year: "2012",
      capacityUnit: "L",
      transmissionType: "Manual",
    },
    Expiry: "",
    State: "TAS",
  },
  "WA:ZM06WA": {
    Description: "MAZDA Mazda6 4D Sedan CLASSIC",
    RegistrationYear: "2008",
    CarMake: { CurrentTextValue: "MAZDA" },
    MakeDescription: { CurrentTextValue: "MAZDA" },
    ModelDescription: { CurrentTextValue: "Mazda6 4D Sedan" },
    BodyStyle: { CurrentTextValue: "Classic 6-Speed Manual" },
    Colour: "",
    VechileIdentificationNumber: "MAZ--6CLGH25HV92008B",
    Engine: "2.5 litre, 4 cyl, GH",
    extended: {
      nvic: "HV908B",
      driveType: "4D SEDAN",
      family: "MAZDA6",
      variant: "CLASSIC",
      model: "Mazda6 4D Sedan",
      capacityValue: "2.5",
      series: "GH",
      engineDescription: "2.5 litre, 4 cyl, GH",
      bodyType: "Classic 6-Speed Manual",
      cylinders: "4",
      year: "2008",
      capacityUnit: "L",
      transmissionType: "Manual",
    },
    Expiry: "16/12/2017",
    State: "WA",
  },
  "ACT:YYF447": {
    Description: "Black MERCEDES 204 C CLASS (2010)",
    CarMake: { CurrentTextValue: "MERCEDES" },
    CarModel: { CurrentTextValue: "MERCEDES" },
    RegistrationYear: 2010,
    Colour: "Black",
    Expiry: "27/05/2017",
    EngineNumber: "2420",
    Stolen: "N",
    InsuranceCompany: "NRMA INSURANCE LIMITED",
    State: "ACT",
  },
  "NT:CB78MH": {
    Description: "BLACK TOYOTA PRADO 2012",
    CarMake: { CurrentTextValue: "TOYOTA" },
    CarModel: { CurrentTextValue: "PRADO" },
    RegistrationYear: 2012,
    Colour: "BLACK",
    RegistrationPlate: { status: "REGISTERED", date_expired: 1490227200000 },
    State: "NT",
  },
};
const VIN_SAMPLES = {
  "6G1FK5EP0GL303518": {
    Make: "HOLDEN",
    Model: "Commodore",
    Year: "2016",
    Engine: "6162",
    Transmission: "",
    BodyStyle: "Sedan",
    Country: "Australia",
  },
};

export function mockProvider({ credits = 10, delay = 250 } = {}) {
  const wait = () => new Promise((resolve) => setTimeout(resolve, delay));
  return {
    name: "Sample lookup",
    async byRego(rego, state) {
      await wait();
      if (rego === "NOCREDIT") throw regCheckError("Out of credit");
      if (rego === "BADUSER") throw regCheckError("Your username is incorrect");
      const record = SAMPLES[`${state}:${rego}`];
      if (!record) throw regCheckError("No vehicles found");
      return structuredClone(record);
    },
    async byVin(vin) {
      await wait();
      const record = VIN_SAMPLES[vin];
      if (!record) throw regCheckError("No vehicles found");
      return structuredClone(record);
    },
    credits: async () => credits,
  };
}

// Validates the request, uses a cached answer when there is one (each live
// lookup costs a credit), and normalises the provider's record.
export async function lookupVehicle({ provider, cache, query, fresh = false }) {
  const vin = cleanVin(query.vin);
  const rego = cleanRego(query.rego);
  const state = String(query.state || "").toUpperCase();
  let key;
  if (vin) {
    if (vin.length < 11) throw new LookupError("invalid", "That VIN looks too short. A VIN is usually 17 characters.");
    key = `vin-${vin}`;
  } else {
    if (rego.length < 2) throw new LookupError("invalid", "Enter the rego.");
    if (!AUSTRALIAN_STATES.includes(state))
      throw new LookupError("invalid", "Choose the state or territory the car is registered in.");
    key = `rego-${state}-${rego}`;
  }
  let record = !fresh && cache ? await cache.get(key).catch(() => null) : null;
  const cached = Boolean(record);
  if (!record) {
    if (!provider) throw new LookupError("config", "Rego lookup isn't connected yet.");
    record = vin ? await provider.byVin(vin) : await provider.byRego(rego, state);
    if (cache) await cache.set(key, record).catch(() => {});
  }
  const result = normaliseRegCheck(record, { rego, state, vin });
  if (vin && !isVin(vin) && !result.fields.vin) result.extra.chassis = vin;
  return {
    query: vin ? { vin } : { rego, state },
    provider: provider?.name || "Saved lookup",
    cached,
    at: new Date().toISOString(),
    ...result,
  };
}
