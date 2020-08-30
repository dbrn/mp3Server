const express = require("express");
const fs = require("fs");
const ytdl = require("ytdl-core");
const path = require("path");
const ytpl = require("ytpl");
const cors = require("cors");

const app = express();
const PORT = 3001;

let latestPlaylists = [];

const sendFile = (fileName, res) => {
  res.status(200).sendFile(fileName, (err) => {
    if (err) console.error(err);
  });
};

const downloadFile = (req, res) => {
  const fileName = path.join(__dirname, "/files/", `${req.params.songId}.mp3`);
  try {
    fs.exists(fileName, (exists) => {
      if (!exists) {
        let stream = null;
        try {
          stream = ytdl(req.params.songId, { quality: "highestaudio" });
        } catch (err) {
          res.status(400).send({ ok: false });
        }
        if (stream) {
          console.log("donwload started: " + new Date().getTime());
          const writeStream = stream.pipe(fs.createWriteStream(fileName));
          writeStream.on("close", () => {
            console.log("download ended: " + new Date().getTime());
            sendFile(fileName, res);
          });
        }
      } else {
        console.log(
          `file for video ${req.params.songId} already exists, skipping download`
        );
        sendFile(fileName, res);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(400).send({ ok: false });
  }
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/playlist", async (req, res) => {
  const valid = await ytpl.validateID(req.body.id.toString());
  if (valid) {
    res.status(200).send({ valid: true });
  } else {
    res.status(422).send({ valid: false });
  }
});

app.get("/api/playlist", (req, res) => {
  res.status(200).send({ latest: latestPlaylists });
});

app.get("/api/playlist/:playlistId", async (req, res) => {
  try {
    const pl = await ytpl(req.params.playlistId);
    const songs = [];
    pl.items.forEach((song) => {
      songs.push({ id: song.id, title: song.title, duration: song.duration });
    });
    if (
      latestPlaylists.findIndex((item) => item.id === req.params.playlistId) < 0
    )
      latestPlaylists = [
        { id: req.params.playlistId, title: pl.title },
        ...latestPlaylists.slice(0, 18),
      ];
    res
      .status(200)
      .send({ ok: true, songs: [...songs], title: pl.title, url: pl.url });
  } catch (err) {
    console.error(err);
    res.status(400).send({ ok: false });
  }
});

app.get("/api/download/:songId", async (req, res) => {
  const filesDir = path.join(__dirname, "/files/");
  fs.readdir(filesDir, (err, files) => {
    if (files.length > 20) {
      fs.rmdir(filesDir, { recursive: true }, (err) => {
        fs.mkdir(filesDir, (err) => {
          downloadFile(req, res);
          if (err) console.log(err);
        });
      });
    } else {
      downloadFile(req, res);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
