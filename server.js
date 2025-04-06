const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const QRCode = require("qrcode");
const { nanoid } = require("nanoid");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Schema
const urlSchema = new mongoose.Schema({
  originalUrl: String,
  shortUrl: String,
  qrCodeUrl: String,
});

const Url = mongoose.model("Url", urlSchema);

app.get("/", (req, res) => {
  res.send("Server is running!");
});

// API to shorten URL
app.post("/api/shorten", async (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ message: "URL is required" });
  }

  const shortId = nanoid(6);
  const shortUrl = `${process.env.BASE_URL}/${shortId}`;

  try {
    // Generate QR Code for shortUrl
    const qrCode = await QRCode.toDataURL(shortUrl);

    const newUrl = new Url({
      originalUrl,
      shortUrl,
      qrCodeUrl: qrCode,
    });

    await newUrl.save();

    res.status(201).json({
      originalUrl,
      shortUrl,
      qrCodeUrl: qrCode,
    });
  } catch (error) {
    console.error("Error generating QR Code or saving URL:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Redirect short URL to original URL
app.get("/:shortId", async (req, res) => {
  const { shortId } = req.params;
  const fullShortUrl = `${process.env.BASE_URL}/${shortId}`;

  try {
    const url = await Url.findOne({ shortUrl: fullShortUrl });
    if (url) {
      return res.redirect(url.originalUrl);
    } else {
      return res.status(404).json({ message: "URL not found" });
    }
  } catch (error) {
    console.error("Error during redirect:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.log("MongoDB connection error:", err));
