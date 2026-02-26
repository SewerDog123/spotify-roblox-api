app.get("/spotify/status/:userid", async (req, res) => {
  const userId = req.params.userid;
  const token = getTokenForUser(userId);

  const response = await axios.get("https://api.spotify.com/v1/me/player", {
    headers: { Authorization: `Bearer ${token}` }
  });

  const body = response.data;

  res.json({
    track: body.item?.name || null,
    artist: (body.item?.artists || []).map(a => a.name).join(', ') || null,
    is_playing: body.is_playing || false,
    album: body?.item?.album?.name,
    duration_ms: body?.item?.duration_ms,
    progress_ms: body?.progress_ms
  });
});
