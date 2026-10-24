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
  email: "mmprestigemotors@gmail.com",
  // Social profiles, linked in the contact section and footer.
  // A profile shows once it has a link.
  social: [
    { name: "Instagram", url: "https://www.instagram.com/mmprestigemotors/" },
    { name: "TikTok", url: "https://www.tiktok.com/@mmprestigemotors" },
    { name: "Facebook", url: "https://www.facebook.com/p/MM-Prestige-100087864877571/" },
  ],
  address: "Unit 4/405A Grand Junction Road",
  suburb: "Wingfield SA 5013",
  locality: "Wingfield",
  region: "SA",
  postcode: "5013",
  maps: "https://www.google.com/maps/search/?api=1&query=MM+Prestige+Motors+Unit+4+405A+Grand+Junction+Road+Wingfield+SA+5013",
};
