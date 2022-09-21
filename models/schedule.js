const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({

    ReceipeName: String,
    ScheduleDate: {type: Date},
    user: String,
    time:String,
    date: {
        type: Date,
        default: Date.now()
    }
});



module.exports = mongoose.model("Schedule",scheduleSchema);