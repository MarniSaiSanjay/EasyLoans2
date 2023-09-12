const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const counterSchema = new Schema({
    owner:{
        type: Schema.Types.ObjectId,
        ref: 'GoogleUser',
        required: true
    },
    interest: {
        type: Number,
        max: 30,
        min: 0,
        required: true
    },
    timePeriod: {
        type: Number,
        required: true
    },
})

module.exports = mongoose.model('Counter', counterSchema);