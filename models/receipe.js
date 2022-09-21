const mongoose = require("mongoose");

const receipetSchema = new mongoose.Schema({

    name: String,
    image: String,
    user: String
});



module.exports = mongoose.model("Receipe",receipetSchema);