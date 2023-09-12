const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Loan = require('./loan');


const opt = { toJSON: { virtuals: true } };

const ImageSchema = new Schema(
    {
        url: String,
        filename: String
    }
)

ImageSchema.virtual('thumbnail').get(function () { // we name virtual as 'thumbnail'
    return this.url.replace('/upload', '/upload/w_210,h_200');  // modifies the url i.e. replace the '/upload' with 'upload/w_200'
})

const googleuserSchema = new Schema({
    name: String,
    email: String,
    googleId: String,
    profilePicUrl: String,
    max_amount: {
        type: Number,
        min: 1,
        max: 50000000
    },
    cibil: {
        type: Number,
        min: 300,
        max: 700
    },
    loans: [{
        type: Schema.Types.ObjectId,
        ref: 'Loan',
    }],
    aadharNumber: {
        type: String,
        default: ''
    },
    panNumber: {
        type: String,
        default: ''
    },
    aadharPic: [ImageSchema],

    panPic: [ImageSchema],

    userPic: [ImageSchema],

    salarySlips: [ImageSchema],

    ifscCode: {
        type: String,
        default: ''
    },
    accountNumber: {
        type: String,
        default: ''
    },
    ctc:{
        type: Number,
        default: 1000,
        min: 1000
    }

}, opt);

const GoogleUser = mongoose.model('GoogleUser', googleuserSchema);
module.exports = GoogleUser;
