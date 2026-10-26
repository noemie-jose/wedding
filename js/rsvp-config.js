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

  formAction: "https://docs.google.com/forms/d/e/1FAIpQLSdiCbsPnXD-UNwQR45FniTwpvS66DdSQWNqEzLLdNhFNnbsuA/formResponse",
  fields: {
    name: "entry.646897813",
    email: "entry.249828806",
    phone: "entry.501556260",
    attending: "entry.135737037",
    dietYou: "entry.1397013090",
    plusOne: "entry.215615265",
    plusOneName: "entry.3677380",
    dietPlus: "entry.1113268227",
    hasChildren: "entry.1491081771",
    childCount: "entry.519831473",
    partySize: "entry.1743440937",
    note: "entry.1511552200"
  },
  children: [
    { name: "entry.1515641833", age: "entry.1306687318", diet: "entry.2015445211" },   // Child 1
    { name: "entry.1044644014", age: "entry.1116307460", diet: "entry.993443288" },   // Child 2
    { name: "entry.453654210", age: "entry.483965021", diet: "entry.2090630910" },   // Child 3
    { name: "entry.337721322", age: "entry.1818733219", diet: "entry.1584470985" },   // Child 4
    { name: "entry.597458670", age: "entry.1635277398", diet: "entry.1331679122" },   // Child 5
    { name: "entry.415786445", age: "entry.1691680304", diet: "entry.433778911" }   // Child 6
  ],
  rsvpBy: "31 December 2026",
  rsvpByFr: "31 décembre 2026",
  fallbackFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdiCbsPnXD-UNwQR45FniTwpvS66DdSQWNqEzLLdNhFNnbsuA/viewform"
};
