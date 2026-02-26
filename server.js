const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

const userTokens = {};

function getTokenForUser(userId) {
  return userTokens[userId] || null;
}

async function refreshAccessToken(userId) {
  const userData = userTokens[userId];
  if (!userData?.refresh_token) return null;

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: userData.refresh_token,
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

    userTokens[userId].access_token = response.data.access_token;
    userTokens[userId].expires_at =
      Date.now() + response.data.expires_in * 1000;

    return response.data.access_token;
  } catch (err) {
    console.log("Refresh failed:", err.response?.data);
    return null;
  }
}

app.get("/login/:userid", (req, res) => {
  const userId = req.params.userid;

  const scope =
    "user-read-currently-playing user-read-playback-state";

  const authUrl =
    "https://accounts.spotify.com/authorize?" +
    new URLSearchParams({
      response_type: "code",
      client_id: process.env.CLIENT_ID,
      scope: scope,
      redirect_uri: process.env.REDIRECT_URI,
      state: userId,
    });

  res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  const userId = req.query.state;

  if (!code || !userId) {
    return res.status(400).send("Missing code or state");
  }

  try {
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

    userTokens[userId] = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: Date.now() + response.data.expires_in * 1000,
    };

    res.send("Login successful! You can close this tab.");
  } catch (err) {
    console.log(err.response?.data);
    res.status(500).send("Login failed");
  }
});

app.get("/spotify/status/:userid", async (req, res) => {
  const userId = req.params.userid;
  let userData = getTokenForUser(userId);

  if (!userData) {
    return res.status(401).json({ error: "User not logged in" });
  }

  if (Date.now() > userData.expires_at) {
    const newToken = await refreshAccessToken(userId);
    if (!newToken) {
      return res.status(401).json({ error: "Token expired" });
    }
    userData = getTokenForUser(userId);
  }

  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/player",
      {
        headers: {
          Authorization: `Bearer ${userData.access_token}`,
        },
      }
    );

    const body = response.data;

    res.json({
      track: body?.item?.name || null,
      artist:
        (body?.item?.artists || [])
          .map((a) => a.name)
          .join(", ") || null,
      is_playing: body?.is_playing || false,
      album: body?.item?.album?.name || null,
      duration_ms: body?.item?.duration_ms || 0,
      progress_ms: body?.progress_ms || 0,
    });
  } catch (err) {
    if (err.response?.status === 204) {
      return res.json({ message: "Nothing is playing" });
    }

    console.log(err.response?.data);
    res.status(500).json({ error: "Spotify API failed" });
  }
});

app.get("/", (req, res) => {
  res.send("Spotify Multi-User Server Running");
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
