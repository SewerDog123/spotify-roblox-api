app.get("/spotify/status/:userid", async (req, res) => {
  const userId = req.params.userid;
  const token = getTokenForUser(userId);

  if (!token) {
    return res.status(401).json({ error: "User not logged in" });
  }

  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/player",
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const body = response.data;

    res.json({
      track: body.item?.name || null,
      artist: (body.item?.artists || []).map(a => a.name).join(", ") || null,
      is_playing: body.is_playing || false,
      album: body?.item?.album?.name || null,
      duration_ms: body?.item?.duration_ms || 0,
      progress_ms: body?.progress_ms || 0
    });

  } catch (err) {
    res.status(500).json({ error: "Spotify API failed" });
  }
});
