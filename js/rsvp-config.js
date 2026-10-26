/* ------------------------------------------------------------------
   RSVP -> Google Form connection

   Fill this in once, after you create the Google Form. The script in
   form/create-rsvp-form.gs builds the form for you and prints this
   whole block, ready to paste over the one below. README.md section 2
   has the steps, including how to do it by hand instead.

   formAction : the form's address, with /viewform swapped for
                /formResponse
   fields     : the entry.XXXXXXX id of each question in that form
   ------------------------------------------------------------------ */

window.RSVP_CONFIG = {

  // e.g. "https://docs.google.com/forms/d/e/1FAIpQLSc.../formResponse"
  formAction: "",

  fields: {
    name:        "",   // Full name(s)
    email:       "",   // Email
    phone:       "",   // Phone
    attending:   "",   // Joyfully accepts / Regretfully declines
    partySize:   "",   // How many people in total
    plusOne:     "",   // Bringing a plus one: Yes / No
    plusOneName: "",   // Plus one's name
    guests:      "",   // Children, as "Name (age), Name (age)"
    dietary:     "",   // Dietary needs, as "Who: note; Who: note"
    note:        ""    // Anything else
  },

  // Shown on the page and in the confirmation message.
  rsvpBy: "31 December 2026",
  rsvpByFr: "31 décembre 2026",

  // Optional: the plain Google Form link. Shown to you as a fallback
  // while the connection above is still empty.
  fallbackFormUrl: ""
};
