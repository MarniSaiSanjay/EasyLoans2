const Loan = require('./models/loan');
const GoogleUser = require('./models/googleuser');
const isLoggedIn = (req, res, next) => {
    if (req.user) next();
    else { // not logged in
        // console.log("Login first");
        req.flash('primary', 'You need to be logged in!!');
        res.redirect('/auth/login');
    }
}
module.exports.isLoggedIn = isLoggedIn;


module.exports.isOwner = async (req, res, next) => {
    const { id } = req.params;
    const loan = await Loan.findById(id);
    if (loan !== null && loan.owner.equals(req.user._id)) {
        next();
    } else {
        req.flash('error', 'Action Prohibited as it belongs to someone else!');
        // console.log("NOT ALLOWEDD");
        return res.redirect('/home');
    }
}

module.exports.isNotOwner = async (req, res, next) => {
    const { id } = req.params;
    const loan = await Loan.findById(id);
    if (loan === null || loan.owner.equals(req.user._id)) {
        req.flash('error', 'Action Prohibited as it belongs to someone else!');
        // console.log("NOT ALLOWEDD");
        return res.redirect('/home');
    } else {
        next();
    }
}


module.exports.catchAsyncError = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(e => next(e));
    }
}



module.exports.isPendingLoan = async (req, res, next) => {
    const { id } = req.params;
    const loan = await Loan.findById(id);
    if (loan !== null && loan.isPending === true) {
        next();
    }
    else {
        req.flash('error', 'The deal is not active it might be closed or deleted. So action is prohibited.');
        // console.log("NOT ALLOWEDD");
        return res.redirect('/home');
    }
}


module.exports.checkEligibility = async (req, res, next) => {
    const user = await GoogleUser.findById(req.user.id);
    if (user.aadharNumber !== '' && user.panNumber !== '' && user.aadharPic.length !== 0 && user.panPic.length !== 0 && user.userPic.length !== 0
        && user.ifscCode !== '' && user.accountNumber !== '' && user.ctc !== 0) {
        // now we have all documents 

        const loan = await Loan.findById(req.params.id);

        const { amount } = req.body;

        if (loan != null && loan.amount <= user.max_amount) {

            if (amount != null && amount != undefined) {
                if (amount <= user.max_amount) {
                    next();
                }
                else {
                    req.flash('error', 'As the amount is more than allowed, action is prohibited.');
                    // console.log('not');
                    return res.redirect('/home');
                }
            }
            else next();
        }
        else if (loan == null && amount != null && amount != undefined) {
            if (amount <= user.max_amount) {
                next();
            }
            else {
                req.flash('error', 'As the amount is more than allowed, action is prohibited.');

                // console.log('not');
                return res.redirect('/home');
            }
        }
        else {
            if (loan != null && loan.amount > user.max_amount) {
                req.flash('error', 'As the amount is more than allowed, action is prohibited.');
                return res.redirect('/home');
            }
            else {
                next();
            }
        }
    } else {
        req.flash('error', 'Complete the profile!!');
        return res.redirect('/profile/update');
    }
}

class ExpressError extends Error {
    constructor(message, status) {
        super();
        this.message = message;
        this.status = status || 404;
    }
}
module.exports.ExpressError = ExpressError;


/* ------------------------------JOI VALIDATION SCHEMA---------------------------------- */

const BaseJoi = require('joi');
const sanitizeHtml = require('sanitize-html');

//defining an extension on Joi.string() to escape html in inputs.
const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML!'
    },
    rules: {
        escapeHTML: {
            validate(value, helpers) {
                const clean = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                });
                if (clean !== value) return helpers.error('string.escapeHTML', { value }) // if cleaned and original value are not equal we return an error we defined above.
                return clean;
            }
        }
    }
});

const JOI = BaseJoi.extend(extension);


const loanSchema = JOI.object({
    amount: JOI.number().integer().min(1).max(100000000).required(),
    interest: JOI.number().min(0).max(30).precision(2).required(),
    category: JOI.string().required().escapeHTML().required(),
    timePeriod: JOI.number().min(0.1).max(50).precision(1).required(),
    isPending: JOI.boolean(),
    counters: JOI.array(),
});


module.exports.validateLoan = (req, res, next) => {
    const { error } = loanSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
}


const counterSchema = JOI.object({
    interest: JOI.number().min(0).max(30).precision(2).required(),
    timePeriod: JOI.number().min(0.1).max(50).precision(1).required(),
});


module.exports.validateCounter = (req, res, next) => {
    const { error } = counterSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
}
