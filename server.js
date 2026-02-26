require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

let access_token = null;

app.get("/", (req, res) => {
  res.send("Spotify Roblox API Running");
});

app.get("/login", (req, res) => {
  const scope = "user-read-playback-state";
  const redirect_uri = process.env.REDIRECT_URI;

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      new URLSearchParams({
        response_type: "code",
        client_id: process.env.CLIENT_ID,
        scope: scope,
        redirect_uri: redirect_uri,
      })
  );
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: process.env.REDIRECT_URI,
    }),
    {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.CLIENT_ID + ":" + process.env.CLIENT_SECRET
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  access_token = response.data.access_token;
  res.send("Login successful! You can close this.");
});

app.get("/current", async (req, res) => {
  if (!access_token) {
    return res.json({ error: "Not logged in" });
  }

  const response = await axios.get(
    "https://api.spotify.com/v1/me/player",
    {
      headers: {
        Authorization: "Bearer " + access_token,
      },
    }
  );

  const item = response.data.item;

  if (!item) return res.json({ playing: false });

  res.json({
    track: item.name,
    artist: item.artists.map(a => a.name).join(", "),
    playing: response.data.is_playing,
  });
});

app.listen(PORT, () => console.log("Server running"));
