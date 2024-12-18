const bodyParser = require("body-parser");
const express = require("express");
const morgan = require("morgan");
require("dotenv").config();
const app = express();
const db = require("./config/db");
const conn = db.connection;
const port = 3000;

app.use(morgan("combined"));
app.use(express.json());
app.use(bodyParser.json());

app.get("/petHospital/api/v1/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
