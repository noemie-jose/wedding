# Noémie & Jose, Wedding Celebration Site

A small static site for **Saturday 18 September 2027, Annecy, France**. Plain HTML, CSS and a
little JavaScript. No build step, no framework. Drop it in a GitHub repo and turn on Pages.

```
index.html           Home: date, countdown, the "we're already married" note
story.html           Our Story: interactive map + timeline, 56 photos
weekend.html         The Weekend: Friday / Saturday / Sunday
travel.html          Travel & Stay: Geneva, transfers, flights, hotel block
annecy.html          Annecy: things to do around the lake
faq.html             FAQ, including "no registry"
rsvp.html            RSVP, posted into a Google Form
404.html             Not-found page
fr/                  The same eight pages in French
css/style.css        All styling. Colors and fonts are the variables at the top.
js/main.js           Mobile menu + countdown
js/gate.js           The password screen
js/rsvp.js           RSVP form behaviour
js/rsvp-config.js    <- the one file you must fill in
js/story.js          The Our Story map, timeline and horizontal view
js/story-data.js     Every photo's date, place, title and caption, in both languages
js/vendor/           d3 and topojson, used only by the story page
data/map-data.js     Country and US state outlines for the map
form/create-rsvp-form.gs Apps Script that builds the Google Form and prints its ids
img/                 hero.jpg and the 56 story photos
```

Every page has an **EN / FR** toggle in the header that jumps to the same page in the other
language, so a guest reading `travel.html` lands on `fr/travel.html`.

---

## 0. The Two Languages

English lives at the root, French under `fr/`. Both use the same CSS, JavaScript and images, so a
visual change in `css/style.css` applies to both at once. If you edit wording, remember the page
exists twice: `weekend.html` and `fr/weekend.html`.

On the RSVP page the labels guests read are translated, but the `value="..."` attributes on the
radios and checkboxes are deliberately identical in both languages (`value="Joyfully accepts"`,
`value="Saturday celebration, 18 September"`). That way both languages land in the same columns of
one spreadsheet. Translate the text between `<span>` tags, never the `value`.

The RSVP deadline shows as "31 December 2026" in English and "31 décembre 2026" in French. Both
come from `rsvpBy` and `rsvpByFr` in `js/rsvp-config.js`. The countdown and the form's messages
switch language automatically from the page's `<html lang>`.

---

## 1. Put the Site on GitHub Pages

You need a free GitHub account and the folder you downloaded. No command line required: every
step below can be done in the browser.

1. Go to <https://github.com/new>.
2. **Repository name:** anything, for example `wedding`. Keep it **Public** (GitHub Pages needs
   public on a free account). Do not tick "Add a README". Click **Create repository**.
3. On the next screen click **uploading an existing file**.
4. Open the unzipped `wedding-site` folder on your computer, select **everything inside it**
   (not the folder itself), and drag it onto the browser window. Wait for all files to finish,
   including the `img`, `js`, `css`, `data` and `fr` folders.
5. Scroll down, click **Commit changes**.
6. Go to **Settings** (top of the repo) then **Pages** in the left sidebar.
7. Under "Build and deployment", set **Source: Deploy from a branch**, **Branch: main**, folder
   **/ (root)**. Click **Save**.
8. Wait a minute, then reload that page. It shows your address, something like
   `https://yourname.github.io/wedding/`. Open it: the site is live.

One file is easy to miss when dragging: `.nojekyll`. It starts with a dot, so your Mac or PC
hides it by default. Without it GitHub ignores folders whose names start with an underscore and
can mangle a build; the site may look unstyled or a page may 404. See the next section for how to
add it after the fact.

**A custom domain** such as `noemieandjose.com`: buy it anywhere, then in Settings > Pages put it
in **Custom domain**. At your registrar add a CNAME record pointing `www` at
`yourname.github.io`, and for the bare domain add four A records pointing at `185.199.108.153`,
`185.199.109.153`, `185.199.110.153` and `185.199.111.153`. Tick **Enforce HTTPS** once the
certificate is ready, usually within the hour.

**To change anything later:** click the file in GitHub, click the pencil, edit, then **Commit
changes**. The live site updates in about a minute.

**If you prefer the command line:**

```bash
cd wedding-site
git init && git add . && git commit -m "Wedding site"
git branch -M main
git remote add origin git@github.com:YOUR-ACCOUNT/YOUR-REPO.git
git push -u origin main
```

Then turn on Pages as in steps 6 to 8 above.

---

## 1b. Adding `.nojekyll` After the Fact

If you already uploaded everything else, this takes a minute. You do not need the file from the
zip: GitHub can make an empty one for you.

1. Open your repository on github.com.
2. Check whether it is already there: look at the file list. If you see `.nojekyll`, you are done.
3. Click **Add file** (top right of the file list) and choose **Create new file**.
4. In the filename box type exactly:  `.nojekyll`  with the leading dot and no extension.
5. Leave the file contents completely empty.
6. Scroll down and click **Commit changes**, then **Commit changes** again in the dialog.
7. Wait a minute, then hard refresh your site (Cmd+Shift+R, or Ctrl+Shift+R on Windows).

To upload the real file from the folder instead: on a Mac press **Cmd+Shift+Period** in Finder to
reveal hidden files (Windows: Explorer > View > Show > Hidden items), then use **Add file >
Upload files** and drag `.nojekyll` in on its own. The empty file you create in step 3 does exactly
the same job; the file only needs to exist.

To check it worked, open `https://yourname.github.io/your-repo/css/style.css` in a browser. If you
see the stylesheet text, GitHub is serving your files as they are.

---

## 2. Set Up the Google Form

RSVPs land in a Google Form, so they collect in the Form's own responses view and in a linked
Google Sheet, the way any Google Form works. The website posts into it behind the scenes, so your
guests fill in your page and never see a Google screen.

The fiddly part is that every question in a Google Form has a hidden id like `entry.1845729301`,
and the site needs those ids to post to the right boxes. The script below creates the form and
prints the ids for you. You visit script.google.com once to run it, nothing gets deployed, and the
result is an ordinary form you edit in the normal Forms editor afterwards.

### Quick Way: Let the Script Build the Form

1. Go to <https://script.google.com> and sign in with the Google account that should own the RSVP
   list. Click **New project**.
2. Delete the sample code. Open `form/create-rsvp-form.gs` from the site folder, copy all of it,
   paste it in, and save.
3. With **createRsvpForm** in the function dropdown, click **Run**.
4. Approve the permissions the first time: **Review permissions** > your account > **Advanced** >
   **Go to (project name) (unsafe)** > **Allow**. That warning appears for every personal script;
   you are approving your own code.
5. Open the **Execution log** at the bottom. It prints links to the form, the guest view and the
   responses spreadsheet, then a block starting `window.RSVP_CONFIG = {`.
6. Copy that block, from `window.RSVP_CONFIG` down to the closing `};`.
7. In your GitHub repo open `js` then `rsvp-config.js`, click the pencil, select everything below
   the comment at the top, and paste the block over it. **Commit changes**.
8. Wait a minute, open your site's RSVP page and send yourself a test reply. The yellow owner box
   should be gone, and the response should appear in the spreadsheet. Delete the test row when
   you are happy.

### By Hand Instead

If you would rather not run a script at all:

1. Go to <https://forms.google.com> and start a blank form.
2. Add these questions, in this order. The **answer options must match exactly**, character for
   character, or the answers land in the wrong place:
   - Full name(s), short answer, required
   - Email, short answer, required
   - Phone, short answer, required
   - Will you join us?, multiple choice, required, options `Joyfully accepts` and
     `Regretfully declines`
   - How many of you are coming in total?, short answer
   - Bringing a plus one?, multiple choice, options `Yes` and `No`
   - Plus one's name, short answer
   - Children, paragraph
   - Dietary needs, paragraph
   - Anything else we should know?, paragraph
3. Click the three dots (top right) and choose **Get pre-filled link**.
4. Fill in every single box with anything, then click **Get link** and **Copy link**.
5. Paste that link into a text editor. It is full of `entry.1234567890=something` pairs, in the
   same order as your questions. Each number belongs to the question above it.
6. In `js/rsvp-config.js`, put each number next to the matching name, like
   `name: "entry.1845729301",`.
7. For `formAction`, take the form's normal share link and replace `/viewform` with
   `/formResponse`.
8. Commit, then send yourself a test RSVP and check it arrives.

### Good to Know

- **Where the answers go:** in the form, click **Responses**, then the green Sheets icon to open
  or create the linked spreadsheet. Every RSVP is a row.
- **Email alerts:** in the Responses tab, three dots > **Get email notifications for new
  responses**.
- **Editing the form later:** change question wording freely. Do not change the answer options for
  "Will you join us?" or "Bringing a plus one?" without changing the matching `value="..."` in
  `rsvp.html` and `fr/rsvp.html`, and never reorder or delete a question without updating its id
  in `rsvp-config.js`.
- **Workspace accounts:** in the form, Settings > Responses, make sure it is not restricted to
  people in your organisation, or outside guests cannot reply.
- **One limitation to expect:** a Google Form can be written to but never read from a web page. So
  if someone RSVPs twice, you get two rows, and the newest one wins; the site cannot show a
  returning guest what they sent before. It does notice, on that person's own browser, that an
  RSVP was already sent and says so above the form.

### If Something Goes Wrong

- *The yellow owner box is still there:* `formAction` or the `name` id is still empty, or the
  paste lost a quote or comma. Compare it with the block the script printed.
- *Replies never reach the form:* `formAction` probably still ends in `/viewform` rather than
  `/formResponse`.
- *An answer lands in the wrong column:* two ids are swapped in `rsvp-config.js`.
- *"Will you join us?" is blank in the responses:* the option text in the form does not match
  `Joyfully accepts` or `Regretfully declines` exactly.
- *Nothing changes after an edit:* hard refresh the page, Cmd+Shift+R or Ctrl+Shift+R.

---

## 3. Things to Fill In Later

Everything still unknown is marked on the page with a small **"to come"** tag. Search the HTML for
`class="tbd"` to find them all:

- `weekend.html` and `fr/weekend.html`: venue, times, dress code, shuttle
- `travel.html` and `fr/travel.html`: hotel name, rates and booking link (the `#stay` section)
- `js/rsvp-config.js`: `formAction` and the `fields` ids (required), and `rsvpBy` if you change the deadline

---

## 4. The Our Story Page

It reads everything from `js/story-data.js`: one entry per photo with `date`/`dateFr`,
`title`/`titleFr`, `text`/`textFr`, and a `place` key that points at the `places` list (name,
latitude, longitude, and `approx: true` where the caption names only a region).

- To fix a caption or a title, edit that entry. Both languages sit side by side.
- To add a photo: put the file in `img/story/`, copy an entry, set `img`, `sort` (YYYY-MM-DD,
  which is what the horizontal timeline uses to place it), `w` and `h`.
- To move a pin, change the place's `lat` and `lon`.

That page loads about 1.2 MB of map data and libraries, and the photos load as you scroll.
Everything else on the site stays small.

---

## 5. Editing

- **Colors and type:** the `:root` block at the top of `css/style.css`.
- **Photos:** `img/`. Keep replacements around 900 to 1500px wide at quality 70, so pages stay
  quick on a phone at the airport.
- **A new page:** copy an existing one, change the content between `<header>` and `<footer>`, and
  add it to the nav in *every* page, English and French. French pages sit one folder deeper, so
  their asset paths start with `../`.


---

## 6. The Password

The site asks for a password before showing anything. It is set in `js/gate.js`, stored as a
SHA-256 hash rather than plain text, and a guest who types it correctly is remembered on that
browser for 30 days. Every page is also marked `noindex`, so search engines leave it alone.

**The current password is `nonowayjose`.**

### Changing It

1. Open any page of the site, right click, **Inspect**, and go to the **Console** tab.
2. Paste this in, with your new password inside the quotes at the end, and press Enter:

```js
(async p => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
  let d = 5381; for (const c of p) d = ((d * 33) ^ c.charCodeAt(0)) >>> 0;
  console.log('SHA:', [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join(''), '\nALT:', d);
})('your new password')
```

3. It prints two values. Put them into `SHA` and `ALT` at the top of `js/gate.js`, and commit.

Changing the password also signs everyone out, because the saved unlock no longer matches. They
just type the new one once.

### What It Does and Does Not Do

It keeps the site from being read by anyone who stumbles across the link, and keeps it out of
Google. That is the right bar for a wedding page and it is what most wedding sites do.

It is **not** real security, and it is worth knowing why. GitHub Pages serves plain files, and
your repository is public, so the password check happens in the visitor's own browser. Anyone who
knows to open the page source, look in `js/gate.js`, or browse the repo on github.com can read
every page without the password. Nobody is going to do that to find out your brunch plans, but do
not put anything on the site you would mind a stranger reading: no door codes, no private
addresses, no personal details about other people.

### If You Ever Want the Real Thing

- **Cloudflare Access** is free for small numbers of people: point your custom domain at
  Cloudflare and it puts a real login in front of the site before anything is served.
- **Netlify** offers built-in password protection on its paid plans. Hosting this site there is a
  drag-and-drop job.
- Or leave the gate as it is and simply keep anything sensitive off the site and in an email.
