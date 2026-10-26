/* ------------------------------------------------------------------
   RSVP -> Google Form connection

   The Google Form has one question per field on the website, so every
   guest's name, age and dietary note lands in its own column of the
   responses spreadsheet.

   Fill this in once. The script in form/create-rsvp-form.gs builds the
   form and prints this whole block, ready to paste over the one below.
   README.md section 2 has the steps.

   formAction : the form's address, with /viewform swapped for
                /formResponse
   fields     : the entry.XXXXXXX id of each question
   children   : one entry per child block, up to six, in order
   ------------------------------------------------------------------ */

window.RSVP_CONFIG = {

  // e.g. "https://docs.google.com/forms/d/e/1FAIpQLSc.../formResponse"
  formAction: "",

  fields: {
    name:        "",   // Your full name
    email:       "",   // Email
    phone:       "",   // Phone
    attending:   "",   // Joyfully accepts / Regretfully declines
    dietYou:     "",   // Your dietary needs
    plusOne:     "",   // Bringing a plus one: Yes / No
    plusOneName: "",   // Plus one's name
    dietPlus:    "",   // Plus one's dietary needs
    hasChildren: "",   // Bringing children: Yes / No
    childCount:  "",   // How many children
    partySize:   "",   // How many people in total
    note:        ""    // Anything else
  },

  // One row per child block on the page, in order.
  children: [
    { name: "", age: "", diet: "" },   // Child 1
    { name: "", age: "", diet: "" },   // Child 2
    { name: "", age: "", diet: "" },   // Child 3
    { name: "", age: "", diet: "" },   // Child 4
    { name: "", age: "", diet: "" },   // Child 5
    { name: "", age: "", diet: "" }    // Child 6
  ],

  // Shown on the page and in the confirmation message.
  rsvpBy: "31 December 2026",
  rsvpByFr: "31 décembre 2026",

  // Optional: the plain Google Form link. Shown to you as a fallback
  // while the connection above is still empty.
  fallbackFormUrl: ""
};
