const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const loanSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'GoogleUser',
        required: true
    },
    amount: {
        type: Number,
        min: 0,
        max: 100000000,
        required: true
    },
    interest: {
        type: Number,
        max: 30,
        min: 0,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    timePeriod: {
        type: Number,
        required: true,
        min: 0.1,
        max: 50
    },
    counters: [{
        type: Schema.Types.ObjectId,
        ref: 'Counter'
    }],
    isPending: {
        type: Boolean,
        default: true
    },
    acceptedBy: {
        type: Schema.Types.ObjectId,
        ref: 'GoogleUser'
    }
})

module.exports = mongoose.model('Loan', loanSchema);