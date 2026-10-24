// The website's enquiry API on Vercel: /api/enquiry. It emails enquiries to
// the dealership once ENQUIRY_EMAIL_APP_PASSWORD is set (see
// docs/enquiries.md). The logic lives in server/enquiry.
import { enquiryContext } from "../server/enquiry/context.js";
import { handleEnquiryRequest } from "../server/enquiry/handler.js";

export const config = { maxDuration: 20 };

let context;
export default {
  async fetch(request) {
    context ||= enquiryContext(process.env);
    return handleEnquiryRequest(request, context);
  },
};
