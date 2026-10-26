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
rsvp.html            RSVP, saved to and read back from a Google Sheet
404.html             Not-found page
fr/                  The same eight pages in French
css/style.css        All styling. Colors and fonts are the variables at the top.
js/main.js           Mobile menu + countdown
js/rsvp.js           RSVP form behaviour
js/rsvp-config.js    <- the one file you must fill in
js/story.js          The Our Story map, timeline and horizontal view
js/story-data.js     Every photo's date, place, title and caption, in both languages
js/vendor/           d3 and topojson, used only by the story page
data/map-data.js     Country and US state outlines for the map
form/rsvp-backend.gs Apps Script web app: saves and looks up RSVPs
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

One file is easy to miss when dragging: `.nojekyll`. It starts with a dot, so your Mac or PC may
hide it. If the site looks unstyled, that file probably did not upload. Press Cmd+Shift+Period on a
Mac (Ctrl+H on Windows) in Finder/Explorer to show hidden files, then upload it on its own with
**Add file > Upload files**.

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

## 2. Set Up the RSVP Backend

### Why it is a script and not a Google Form

A Google Form only accepts answers. Nothing can read the responses back out from a web page, so a
Form alone could never tell a returning guest "you already RSVP'd" or show them what they sent. The
site therefore talks to a small Google Apps Script web app that you own, which keeps one row per
household in a Google Sheet. Same Google account, same spreadsheet you would have had, and it can
both save and look up.

### Steps

1. Go to <https://script.google.com> and sign in with the Google account that should own the
   RSVP list.
2. Click **New project** (top left).
3. Delete the few lines of sample code in the editor.
4. Open `form/rsvp-backend.gs` from the site folder in any text editor, select all, copy, and paste
   it into the Apps Script editor.
5. Click the **save** icon. Name the project something like "Wedding RSVP".
6. In the toolbar, make sure the function dropdown shows **setup**, then click **Run**.
7. Google asks for permission the first time: **Review permissions** > choose your account >
   **Advanced** > **Go to (your project name) (unsafe)** > **Allow**. That warning appears for
   every unpublished personal script; you are approving your own code.
8. When it finishes, open **Execution log** at the bottom. It prints a link to a new spreadsheet
   called "RSVPs · Noémie & Jose (Annecy 2027)". Open it and keep the tab: this is your guest list.
9. Back in Apps Script, click **Deploy** (top right) > **New deployment**.
10. Click the gear next to "Select type" and choose **Web app**.
11. Set **Execute as: Me** and **Who has access: Anyone**. The second one matters: without it your
    guests get an error. "Anyone" means anyone with the link, not anyone with a Google account.
12. Click **Deploy**, approve if asked, then **copy the Web app URL**. It looks like
    `https://script.google.com/macros/s/AKfy...long.../exec`.

### Connect the Site to It

13. In your GitHub repo open `js` then `rsvp-config.js`, and click the pencil to edit.
14. Paste your URL between the quotes on the `apiUrl` line:
    `apiUrl: "https://script.google.com/macros/s/AKfy.../exec",`
15. Click **Commit changes**.

### Check It Works

16. Open your site, go to RSVP, and send yourself a test reply. The yellow "Site owners" box should
    be gone.
17. Look at the spreadsheet: a row appears with your answers.
18. Reload the RSVP page and type the same email address. You should see "You have already RSVP'd"
    with your answers filled back in, and the button now reading "Update our RSVP". Change
    something, send again, and the same row updates rather than a second one appearing.
19. Delete your test row from the spreadsheet when you are done. Delete the whole row, so the
    numbering stays clean.

### Two Things to Remember

- **If you edit `rsvp-backend.gs` later**, you must redeploy for the change to reach the live site:
  Deploy > Manage deployments > pencil icon > Version: **New version** > Deploy. The URL stays the
  same.
- **Want email alerts for new RSVPs?** In the spreadsheet: Tools > Notification settings (or
  Extensions > Apps Script) and set "Notify me when changes are made". Google emails you on each
  new row.

### If Something Goes Wrong

- *Guests see "That did not go through":* the deployment is probably not set to "Anyone". Deploy >
  Manage deployments > pencil > check the access setting > New version > Deploy.
- *"Run setup() first" in the sheet or an error on save:* the `setup` function was never run, or it
  ran under a different Google account than the deployment.
- *The yellow owner box still shows:* `apiUrl` is empty or has a typo. It must be the `/exec` URL
  in quotes, with the comma after it.
- *Nothing changes after an edit:* hard refresh the page (Cmd+Shift+R, or Ctrl+Shift+R on Windows).

### Privacy

"Anyone" means someone who has both the web app URL and a guest's exact email address could read
that one RSVP. For a wedding page that is the normal bar. To lock it down, set `SECRET` at the top
of `rsvp-backend.gs` to a random string, put the same string in `secret` in `js/rsvp-config.js`,
and redeploy.

### What the Form Collects

One response per household, keyed by email: name, email, phone (both required), whether they are
coming, a plus one with their name, children with a name and age each, a dietary note per person
including each child, and a free note. Party size is worked out for you. Sending again with the
same email updates that household's row.

---

## 3. Things to Fill In Later

Everything still unknown is marked on the page with a small **"to come"** tag. Search the HTML for
`class="tbd"` to find them all:

- `weekend.html` and `fr/weekend.html`: venue, times, dress code, shuttle
- `travel.html` and `fr/travel.html`: hotel name, rates and booking link (the `#stay` section)
- `js/rsvp-config.js`: `apiUrl` (required), and `rsvpBy` if you change the deadline

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
