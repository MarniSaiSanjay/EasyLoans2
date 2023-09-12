if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');

const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');


const mongoSanitize = require('express-mongo-sanitize');

// AUTHENTICATION
const passport = require('passport');
const passportSetup = require('./config/passportSetup'); // This is to set up passport i.e. to run code in passport-setup.js so that
// it will know what google authentication strategy is. 


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true })); // TO PARSE DATA 
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.engine('ejs', ejsMate);

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const dburl =  process.env.DB_URL ||  'mongodb://localhost:27017/loan';

// Connect MongoDB at default port 27017.
mongoose.connect(dburl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}, (err) => {
    if (!err) {
        console.log('MongoDB Connection Succeeded.')
    } else {
        console.log('Error in DB connection: ' + err)
    }
});

// Sanitization 
app.use(mongoSanitize()); // To remove prohibited characters 

const secret = process.env.SECRET || 'thisisasecret';
const store = new MongoStore({
    mongoUrl: dburl,
    secret: secret,
    touchAfter: 24 * 3600
});

store.on('error', function (e) {
    console.log('Session store error', e);
})

// FOR COOKIE
app.use(session({
    store: store,  // now mongo will be used to store sessions.
    store: MongoStore.create({
        mongoUrl: dburl,
        secret: secret,
        touchAfter: 24 * 3600
    }),
    name: 'EasyLoan',
    secret,
    saveUninitialized: false, // don't create session until something stored
    resave: false, //don't save session if unmodified
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
})
);


// initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use(flash()); // should be done after session 

// GLOBAL VARIABLES
app.use(async (req, res, next) => {
    res.locals.currentUser = req.user; // 'req.user' will be a true if user is loggedIn
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.primary = req.flash('primary');
    next();
})


const { isLoggedIn, isAuthor, catchAsyncError, isReviewOwner, ExpressError } = require('./middleware');
const Loan = require('./models/loan');
const GoogleUser = require('./models/googleuser');

app.get('/home', isLoggedIn, catchAsyncError(async (req, res) => {
    const { isPending } = req.query;
    if (isPending === 'true') {
        // PENDING SECTION
        const user = await GoogleUser.findById(req.user.id).populate({
            path: 'loans',
            populate: {
                path: 'owner'
            }
        });
        const allLoans = user.loans.filter((x) => { return x.isPending === true });
        res.render('home', { allLoans, isPend: 1 });
    }
    else if (isPending === 'false') {
        // CLOSED SECTION
        const user = await GoogleUser.findById(req.user.id).populate({
            path: 'loans',
            populate: {
                path: 'owner',
            }
        }).populate({
            path: 'loans',
            populate:{
                path: 'acceptedBy'
            }
        }) ;
        const allLoans = user.loans.filter((x) => { return x.isPending === false });

        // console.log(allLoans);

        res.render('home', { allLoans, isPend: -1 });
    }
    else {
        const x = await Loan.find().populate('owner');
        // console.log(x);
        const allLoans = x.filter((x) => { return (x.isPending === true  && x.amount <= req.user.max_amount && x.owner.id !== req.user.id)});
        res.render('home', { allLoans, isPend: 0 });
    }

}));

app.get('/about', (req, res) => {
    res.render('about');
})


app.get('/profile', isLoggedIn, catchAsyncError(async (req, res) => {
    res.render('profile');
}))

app.get('/profile/update', isLoggedIn, catchAsyncError(async(req, res) => {
    const user = await GoogleUser.findById(req.user.id);
    res.render('updateProfile', {user});
}))


const multer = require('multer');
const { storage } = require('./cloudinary/index');
const upload = multer({ storage }); // now instead of storing locally we store in cloudinary storage
const cloudinary = require('cloudinary');


// FUNCTION TO CALCULATE CIBIL SCORE
function calCIBIL(amount){
    if(amount<=200000) return 350;
    else if(amount<=1000000) return 500;
    else if(amount<=2500000 ) return 600;
    return 700;
}

// MAX LOAN AMOUNT THAT HE/SHE CAN CLAIM
function calMax(cibilScore){
    if(cibilScore == 350) return 1000000;
    if(cibilScore == 500) return 5000000;
    if(cibilScore == 600) return 10000000;
    return 25000000;
}

app.post('/profile/update', isLoggedIn, catchAsyncError((async(req, res) => {
    const user = await GoogleUser.findById(req.user.id);
    const {name, aadharNumber, panNumber, accountNumber, ifscCode, ctc} = req.body;
    user.name = name;
    user.aadharNumber = aadharNumber;
    user.panNumber = panNumber;
    user.accountNumber = accountNumber;
    user.ifscCode = ifscCode;
    user.ctc = ctc;
     // calculate CIBIL like score using CTC
    user.cibil = calCIBIL(ctc);
    user.max_amount = calMax(user.cibil);

    await user.save();
    res.redirect('/profile');

})))

app.post('/profile/update/aadharpic', isLoggedIn,  upload.single('image'), catchAsyncError(async (req, res) => {
    const user = await GoogleUser.findById(req.user.id);
    const img = {url: req.file.path, filename: req.file.filename};

    if(user.aadharPic.length === 1){
        await cloudinary.uploader.destroy(user.aadharPic[0].filename);
    }

    user.aadharPic = [];
    user.aadharPic.push(img);

    await user.save();

    res.redirect('/profile');
}))


app.post('/profile/update/panpic', isLoggedIn,  upload.single('image'), catchAsyncError(async (req, res) => {
    const user = await GoogleUser.findById(req.user.id);
    const img = {url: req.file.path, filename: req.file.filename};

    if(user.panPic.length === 1){
        await cloudinary.uploader.destroy(user.panPic[0].filename);
    }

    user.panPic = [];
    user.panPic.push(img);

    await user.save();

    res.redirect('/profile');
}))


app.post('/profile/update/userpic', isLoggedIn,  upload.single('image'), catchAsyncError(async (req, res) => {
    const user = await GoogleUser.findById(req.user.id);
    const img = {url: req.file.path, filename: req.file.filename};

    if(user.userPic.length === 1){
        await cloudinary.uploader.destroy(user.userPic[0].filename);
    }

    user.userPic = [];
    user.userPic.push(img);

    await user.save();

    res.redirect('/profile');
}))


app.post('/profile/update/bankslips', isLoggedIn,  upload.array('image'), catchAsyncError(async (req, res) => {
    const user = await GoogleUser.findById(req.user.id);

    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));

    user.salarySlips.push(...imgs);

    await user.save();

    res.redirect('/profile');
}))

app.get('/', (req, res) => {
    res.redirect('/auth/login');
})


app.use('/loan', require('./routes/loan'));
app.use('/auth', require('./routes/auth'));


//404 ROUTE:
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found!', 404));
})


//  ERROR HANDLER:
app.use((err, req, res, next) => {
    if (!err.status) err.status = 500;
    if (!err.message) err.message = 'Something went wrong!';
    res.render('error', {err});
})


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`LISTENING ON PORT ${port}!`);
})


// FLIPR Hackathon