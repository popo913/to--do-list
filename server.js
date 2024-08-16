require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
// const {createUser,findUser} = require('./db/users')

const app = express()

const PORT = process.env.PORT || 4444

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use('/',express.static(__dirname + '/public'))
app.set('view engine','hbs')

app.use(session({
    secret:"Our secret string",
    resave:false,
    saveUninitialized:false
}))

app.use(passport.initialize())
app.use(passport.session())

mongoose.connect(process.env.DATABASE_URL);

const userSchema = new mongoose.Schema({
    username:String,
    password: String,
    googleId: String,
    tasks:Array
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

const User = new mongoose.model("User",userSchema)

passport.use(User.createStrategy())

// passport.serializeUser(User.serializeUser())
// passport.deserializeUser(User.deserializeUser())

passport.serializeUser(function(user,done){
    done(null,user.id)
})

passport.deserializeUser(function(id,done){
    User.findById(id,function(err,user){
        done(err,user)
    })
})

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://to-do-list-710.herokuapp.com/auth/google/to-do-list"
    // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    })
  }
))

app.get('/',(req,res)=>{
    res.render('home')
})

app.get('/auth/google',
    passport.authenticate('google',{scope:['profile']}))

app.get('/auth/google/to-do-list', 
passport.authenticate('google', { failureRedirect: '/login' }),
function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/to-do-list');
});

app.get('/login',(req,res)=>{
    res.render('login')
})

app.get('/register',(req,res)=>{
    res.render('register')
})

app.get('/to-do-list',(req,res)=>{
    if(req.isAuthenticated()){
        User.findById(req.user.id,function(err,foundUser){
            if(err){
                console.log(err)
            }
            else{
                if(foundUser){
                    res.render('to-do-list',{tasks:foundUser.tasks})
                }
            }
        })
    }
    else{
        res.redirect('/login')
    }
})

app.get('/logout',(req,res)=>{
    req.logout(function(err) {
        if (err) 
        { 
            console.error(err) 
        }
        else
        {
            res.redirect('/');
        }
    })
})

app.post('/register',async (req,res)=>{
    // const newUser = await createUser(req.body.username,req.body.password)
    // if(newUser){
    //     newUser.save()
    //        .then(()=>{
    //         res.render("to-do-list")
    //        })
    //        .catch((err)=>{
    //         console.error(err)
    //        })
    // }
    // else{
    //     console.error(new Error('Error in creating user'))
    // }
    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.error(err)
            res.redirect('/register')
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect('/to-do-list')
            })
        }
    })
})

app.post('/login',(req,res)=>{
    // const username = req.body.username
    // const password = req.body.password
    // const found = await findUser(username,password)
    // if(found){
    //     res.render('to-do-list')
    // }
    const user = new User({
        username:req.body.username,
        password:req.body.password
    })
    req.login(user,function(err){
        if(err){
            console.error(err)
        }
        else{
            passport.authenticate('local')(req,res,function(){
                res.redirect('/to-do-list')
            })
        }
    })
})

app.post('/to-do-list',(req,res)=>{
    const task = req.body.task
    User.findById(req.user.id,function(err,foundUser){
        if(err){
            console.log(err)
        }
        else{
            if(foundUser){
                foundUser.tasks.push(task)
                foundUser.save(function(){
                    res.redirect('/to-do-list')
                })
            }
        }
    })
})

app.post('/to-do-list/remove',(req,res)=>{
    const task = req.body.task
    User.findById(req.user.id,function(err,foundUser){
        if(err){
            console.log(err)
        }
        else{
            if(foundUser){
                foundUser.tasks.splice(foundUser.tasks.indexOf(task),1)
                foundUser.save(function(){
                    res.send(foundUser.tasks)
                })
            }
        }
    })
})

app.listen(PORT,()=>{
    console.log(`Server started on http://localhost:${PORT}`)
})