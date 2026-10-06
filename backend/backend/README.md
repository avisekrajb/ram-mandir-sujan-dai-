
## Live Darshan from Facebook

`GET /api/live/facebook` tells the home page whether the temple's Facebook page
(`FB_PAGE_URL`, default https://www.facebook.com/shreeramchandramandir) is live
now, plus its recent past lives. The home page plays the live stream when there
is one, otherwise the newest past live; with no token it keeps using the live
link saved in Admin → Home.

Facebook has no public "is it live?" lookup, so this needs a Page access token
in `.env` (never in the frontend):

```
FB_PAGE_TOKEN=<Page access token>
# optional, default shown
FB_PAGE_URL=https://www.facebook.com/shreeramchandramandir
```

How to get the token (a person who is an admin of the page does this):
1. Create an app at developers.facebook.com (type: Business) and add the Facebook Login product.
2. In Graph API Explorer pick that app, choose "Get Page Access Token", and grant
   `pages_show_list`, `pages_read_engagement` and `pages_manage_posts`; select the page.
3. Extend it: Access Token Debugger → "Extend Access Token", then request the page
   token again with the long-lived user token (`/me/accounts`), which does not expire.
4. Put it in `.env` as `FB_PAGE_TOKEN` and restart the backend.

Answers are cached for a minute. Check it with `curl localhost:5000/api/live/facebook`:
`configured` turns `true`, and `live` / `past` fill in.

The same token also feeds the "Follow us on Facebook" card and the video row on
the home page: `GET /api/live/facebook/page` returns the page's name, follower
count and picture and its latest videos (cached ten minutes). With videos picked
in Admin → Home those are shown, captioned with the page's titles and dates; with
none picked, the page's latest uploads fill the row. Without a token the card
shows only the name and a Follow button linking to the page.
