# Squishmallow Dex (SquishApp_V1)

Static web app that dynamically reads and adapts to a live Google Sheet:

- Data endpoint: `https://opensheet.elk.sh/1YqE_ypdTIHPERz3Fwfi0Bb5ThjQs8DIRDX8KVhxCnA0/Data_Table`
- No backend required
- Netlify compatible out of the box

## Files to upload

Upload this folder's files:

- `index.html`
- `styles.css`
- `script.js`

## Deploy to Netlify (Drag-and-Drop)

1. Open [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. In File Explorer, open `SquishApp_V1`
3. Select the three files (`index.html`, `styles.css`, `script.js`) or zip the folder
4. Drag them onto the Netlify drop zone
5. Wait for deploy to finish
6. Open the generated Netlify URL

## Deploy to Netlify (Git-based, optional)

If you prefer repo-connected deploys:

1. Push `SquishApp_V1` to GitHub
2. In Netlify: **Add new site** -> **Import an existing project**
3. Select your repo
4. Build command: *(leave empty)*
5. Publish directory: `SquishApp_V1` (or repo root if this folder is root)
6. Deploy

## How to use the app

1. Open your Netlify URL
2. Wait for loading to complete
3. Use **Search all fields** for global text filtering
4. Use auto-generated dropdown filters (shown only for low-unique-count fields)
5. Sort by any column using **Sort field** and **Direction**
6. Click any card to open the full detail modal
7. Use **Toggle visible card fields** to control which fields appear on cards

## Data behavior notes

- The app auto-detects columns from the live sheet data
- New rows and new columns appear automatically with no code changes
- Missing values are shown as `—`
- If live fetch fails, cached data is used (when available)

## Updating content

To update the app's content, edit the Google Sheet only.

- You do **not** need to redeploy for sheet data changes
- Refresh the site to fetch latest data

## Troubleshooting

- If you see a fetch error:
  - Verify the endpoint URL is accessible in your browser
  - Confirm the `Data_Table` sheet tab exists
  - Confirm the sheet is shareable/public enough for OpenSheet
- If old data appears:
  - Hard refresh (`Ctrl+F5`)
  - The app may be showing cached data when live fetch fails