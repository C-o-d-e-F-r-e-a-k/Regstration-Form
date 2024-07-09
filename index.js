const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const path = require("path");
const { type } = require("os");
const multer = require("multer");

const app = express();
dotenv.config();

const port = process.env.PORT || 3000;

const username = process.env.mongodb_username;
const password = process.env.mongodb_password;

if (!username || !password) {
  console.error(
    "MongoDB username or password not set in environment variables"
  );
  process.exit(1);
}

mongoose
  .connect(
    `mongodb+srv://${username}:${password}@cluster0.z7iin2n.mongodb.net/registrationForm`
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Failed to connect to MongoDB", err);
    process.exit(1);
  });

const userschema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String, required: true },
  age: { type: Number, required: true },
  bio: { type: String, required: false },
  profilePicture: { type: String, required: false },
  referrer: { type: String, required: false },
  termsAccepted: { type: Boolean, required: true },
});

const User = mongoose.model("User", userschema);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "pages")));

//* Setting up multer for file uploads:

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "index.html"));
});

app.post("/register", upload.single("file"), async (req, res) => {
  try {
    const { name, email, password, gender, age, bio, referrer } = req.body;
    const profilePicture = req.file ? req.file.path : null;
    const termsAccepted = req.body["terms-and-conditions"] === "on";

    if (!name || !email || !password || !gender || !age || !termsAccepted) {
      console.log("A field is left empty");
      return res.status(400).redirect("/error");
    }

    const userExist = await User.findOne({ email: email });

    if (!userExist) {
      //* Hashing the password before saving:
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        gender,
        age,
        bio,
        profilePicture,
        referrer,
        termsAccepted,
      });
      await newUser.save();
      res.redirect("/success");
    } else {
      console.log("User already exist");
      res.status(409).redirect("/error?message=userexists");
    }
  } catch (err) {
    console.log(err);
    res.status(500).redirect("/error?message=servererror");
  }
});

app.get("/success", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "success.html"));
});

app.get("/error", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "error.html"));
});

app.listen(port, () => {
  console.log(`server is listening on port ${port}`);
});
