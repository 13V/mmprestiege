export const money = (n) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
export const number = (n) => new Intl.NumberFormat("en-AU").format(n);
export const business = {
  phone: "0411 710 409",
  tel: "+61411710409",
  address: "Unit 4/405A Grand Junction Road",
  suburb: "Wingfield SA 5013",
  locality: "Wingfield",
  region: "SA",
  postcode: "5013",
  maps: "https://www.google.com/maps/search/?api=1&query=MM+Prestige+Motors+Unit+4+405A+Grand+Junction+Road+Wingfield+SA+5013",
};
