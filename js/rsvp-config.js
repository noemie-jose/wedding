/* ------------------------------------------------------------------
   RSVP connection

   The page talks to a small Google Apps Script web app that keeps one
   row per household in a Google Sheet. That is what lets it do both
   halves of the job: SAVE an RSVP, and LOOK ONE UP so a guest who comes
   back is told they have already replied and sees their old answers.

   Set up form/rsvp-backend.gs (instructions are at the top of that
   file), then paste its /exec URL here.
   ------------------------------------------------------------------ */

window.RSVP_CONFIG = {

  // Google Apps Script web app URL, ending in /exec.
  apiUrl: "/exec",

  // Optional. If you set SECRET in rsvp-backend.gs, put the same string here.
  secret: "",

  // Shown on the page and in the confirmation message.
  rsvpBy: "31 December 2026",
  rsvpByFr: "31 décembre 2026",

  // Who guests should write to if something goes wrong. Leave blank to hide.
  contactEmail: "",

  /* ----------------------------------------------------------------
     Optional fallback: a plain Google Form.

     Only needed if you would rather not deploy the web app above. A
     Google Form can be written to but never read, so with this route
     the page cannot tell a returning guest that they already replied.
     If apiUrl is set, everything below is ignored.
     ---------------------------------------------------------------- */
  formAction: "",
  fields: {
    name: "", email: "", phone: "", attending: "", partySize: "",
    plusOne: "", plusOneName: "", guests: "", dietary: "", note: ""
  },
  fallbackFormUrl: ""
};
