const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/auth');


router.route('/login')
    .get(authController.login_get)

// GOOGLE AUTH:
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'] // here 'profile' is not must, but needed if we want 'displayName' and some others.
}));

// REDIRECT URL:
router.get('/google/redirect', passport.authenticate('google'), (req, res) => {
    const  user = req.user;
    if(user.aadharNumber=='' || user.panNumber=='' || user.aadharPic.length==0 || user.panPic.length==0 || 
    user.userPic.length==0 || user.salarySlips.length==0 || user.ifscCode=='' || user.accountNumber==''){
        req.flash('primary', `Welcome ${req.user.name}, To utilise EasyLoans, please finish creating your profile.`);
        return res.redirect('/profile/update');
    }
    req.flash('primary', `Welcome ${req.user.name}`);
    return res.redirect('/home');
});

router.get('/logout', authController.logout);
module.exports = router;
