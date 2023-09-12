const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const GoogleUser = require('../models/googleuser');


passport.serializeUser((user, done) => {
    done(null, user.id);
})

passport.deserializeUser((id, done) => {
    GoogleUser.findById(id).then(user => {
        done(null, user); // // this 'user' object is passed to redirect url in routes.
    })
})


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/redirect"
},
    async (accessToken, refreshToken, profile, email, done) => { // no need of using profile here.
        
        // console.log(email); most of the needed things will be in this email object   

        const a = await GoogleUser.findOne({ googleId: email.id });
        if (a) {
            done(null, a);
        } else {
            const myArr = email.displayName.split(" ");
            const name_changed = myArr.join('');
            var ci = 301;
            const newUser = new GoogleUser({
                name: name_changed,
                email: email.emails[0].value,
                googleId: email.id,
                profilePicUrl: email._json.picture,
                max_amount: 109,
                cibil: ci,

            });
            newUser.save();
            done(null, newUser);
        }


    }

));
