const mongoose = require('mongoose');
const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser');
require("dotenv").config();
const PORT = 5000;
const authRoutes = require('./routes/users');

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log("Database connected successfully😀");
}).catch((err) => {
    console.error("Mongo Connection Error😬", err);
})

const app = express();

app.use(express());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get("/ping", (req, res) => {
    return res.status(200).json({
        error: false,
        message: "server is healthy😉"
    });
});
app.use("/users", authRoutes);
app.listen(PORT, () => {
    console.log("Server started listening on PORT : " + PORT);
});