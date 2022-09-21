const express = require("express");
const app = express();
const dotenv = require('dotenv').config();

const bodyPaser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");


const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const randToken = require("rand-token");
const nodeMailer = require("nodemailer");

//models
const User = require("./models/user");
const Reset = require("./models/reset");
const Receipe = require("./models/receipe");
const Favourite = require("./models/favourite");
const Ingredient = require("./models/ingredient");
const Schedule = require("./models/schedule");

//session
app.use(session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: false
}));

//passport
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://ImedTestWeb:1324354657@cluster0.0ebhkkm.mongodb.net/cooking?retryWrites=true&w=majority",{
    useNewUrlParser: true,
    useUnifiedTopology: true
});
//passport local mongoose
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//ejs
app.set("view engine","ejs");

//PUBLIC FOLDER
app.use(express.static("public"));

//BODY PARSER
app.use(bodyPaser.urlencoded({extended:false}));


//
const methodOverride = require('method-override');
const flash = require("connect-flash");
app.use(flash());
app.use(methodOverride('_method'));


app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});


app.get("/",function(req,res){
    console.log(req.user);
    res.render("index");
})

app.get("/signup",function(req,res){
    res.render("signup");
});


app.post("/signup",function(req,res){
    const newUser = new User({
        username: req.body.username
    });
    User.register(newUser,req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.render("signup");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("signup");
            });
        }
    });

});

app.get("/login",function(req,res){
    res.render("login");
});

app.post("/login",function(req,res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){

                res.redirect("/dashboard");
            })
        }
    });

});

app.get("/dashboard",isLoggedIn,function(req,res){
    console.log(req.user);
    res.render("dashboard");
});

app.get("/logout",function(req,res){


    req.logout(function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Thank you you are logged out !!");
            res.redirect("/login");
        }

    });

});

app.get("/forgot", function(req,res){
    res.render("forgot");
});

app.post("/forgot", function(req,res){
    User.findOne({username: req.body.username}, function(err,userFound){
        if(err){
            console.log(err);
            res.render("/login");
        }else{
            const token = randToken.generate(16);
            Reset.create({
                username: userFound.username,
                resetPasswordToken: token,
                resetPasswordExpires: Date.now() + 3600000
            });
            const transporter = nodeMailer.createTransport({
                service:'gmail',
                auth: {
                    user: 'chemestry.ing@gmail.com',
                    pass: process.env.PWD
                }
            });
            const mailOptions = {
                from: 'chemestry.ing@gmail.com',
                to: req.body.username,
                subject: 'link to reset your password',
                text: 'Click on this link to reset your password: http://localhost:3000/reset/' + token
            }
            console.log("The Mail is ready to be sent");

            transporter.sendMail(mailOptions, function(err, response){
                if(err){
                    console.log(err);
                }else{
                    req.flash("success","Thank you to chack your Mailbox!!");
                    res.redirect("/login");
                }
            });
        }
    });
});


//reset route
app.get("/reset/:token", function(req,res){
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {$gt: Date.now()}
    }, function(err,obj){
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            res.render('reset', {
                token: req.params.token
            })
        }
    });
});

app.post("/reset/:token", function(req,res){
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {
            $gt: Date.now()
        }
    }, function(err,obj){
        if(err){
            console.log("token expired");
            req.flash("error","Token expired!!");
            res.redirect("/login");
        }else{
            if(req.body.password==req.body.password2){
                User.findOne({username: obj.username}, function(err,user){
                    if(err){
                        console.log(err);
                    }else{
                        user.setPassword(req.body.password, function(err){

                            user.save();
                            const updatedReset = {
                                resetPasswordToken: null,
                                resetPasswordExpires: null
                            }
                            Reset.findOneAndUpdate({resetPasswordToken:req.params.token},updatedReset,function(err,obj1){
                                if(err){
                                    console.log(err);
                                }else{
                                    res.redirect("/login");
                                }
                            });
                        });
                    }
                });
            }
        }

    });
});



//RECEIPE ROUTE

app.get("/dashboard/myreceipes",isLoggedIn,function(req,res){
    Receipe.find({
        user: req.user.id
    }, function(err,receipe){
        if(err){
            console.log(err);
        }else{
            res.render("receipe", {receipe: receipe});
        }
    });

});

app.get("/dashboard/newreceipe",isLoggedIn,function(req,res){
    res.render("newreceipe");
});

app.post("/dashboard/newreceipe",isLoggedIn,function(req,res){
    const newRreceipe = {
        name: req.body.receipe,
        image: req.body.logo,
        user: req.user.id
    }
    Receipe.create(newRreceipe, function(err,newRreceipe){
        if(err){
            console.log(err);
        }else{
            req.flash("success"," New receipe added seccessfully !!");
            res.redirect("/dashboard/myreceipes");
        }
    })
});

app.get("/dashboard/myreceipes/:id", function(req,res){
    Receipe.findOne({user: req.user.id, _id: req.params.id}, function(err,receipeFound){
        if(err){
            console.log(err);
        }else{
            Ingredient.find({
                user: req.user.id,
                receipe: req.params.id
            }, function(err, ingredientFound){
                if(err){
                    console.log(err);
                }else{
                    res.render("ingredients", {
                        ingredient: ingredientFound,
                        receipe: receipeFound
                    });
                }
            });
        }

    });
});


app.delete("/dashboard/myreceipes/:id", isLoggedIn, function(req,res){
    Receipe.deleteOne({_id: req.params.id},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your receipe has been delated successfully!! ");
            res.redirect("/dashboard/myreceipes")
        }
    });
});


//ingredient route

app.get("/dashboard/myreceipes/:id/newingredient", function(req,res){
    Receipe.findById({_id: req.params.id}, function(err,found){
        if(err){
            console.log(err);
        }else{
            res.render("newingredient", {receipe:found});
        }
    });
});

app.post("/dashboard/myreceipes/:id", function(req,res){
    const newIngredient={
        name: req.body.name,
        bestDish: req.body.dish,
        user: req.user.id,
        quantity: req.body.quantity,
        receipe: req.params.id
    }
    Ingredient.create(newIngredient, function(err,newIngredient){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your ingredient has been added !");
            res.redirect("/dashboard/myreceipes/"+req.params.id);
        }
    })
});

app.delete("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn,function(req,res){
    Ingredient.deleteOne({_id: req.params.ingredientid},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your ingredient has been deleted successfully!! ");
            res.redirect("/dashboard/myreceipes/"+req.params.id);
        }
    });
});


app.post("/dashboard/myreceipes/:id/:ingredientid/edit",isLoggedIn,function(req,res){
    Receipe.findOne({user:req.user.id,_id:req.params.id},function(err,receipeFound){
        if(err){
            console.log(err);
        }else{
            Ingredient.findOne({
                _id: req.params.ingredientid, 
                receipe: req.params.id
            },function(err,ingredientFound){
                if(err){
                    console.log(err);
                }else{
                    res.render("edit", {
                        ingredient: ingredientFound,
                        receipe: receipeFound
                    });
                }
            });
        }
    });
});

app.put("/dashboard/myreceipes/:id/:ingredientid", isLoggedIn, function(req,res){
    const ingedient_updated = {
        name: req.body.name,
        bestDish: req.body.dish,
        user: req.user.id,
        quantity: req.body.quantity,
        receipe: req.params.id
    }
    Ingredient.findByIdAndUpdate({_id:req.params.ingredientid},ingedient_updated,function(err,updatedIngredient){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your ingredient has been updated successfully!! ");
            res.redirect("/dashboard/myreceipes/"+req.params.id)
        }
    });
});

// FAVOURITE ROUTE
app.get("/dashboard/favourites",isLoggedIn,function(req,res){
    Favourite.find({user: req.user.id},function(err,favourite){
        if(err){
            console.log(err);
        }else{
            res.render("favourites",{favourite: favourite}); 
        }
    });

});


app.get("/dashboard/favourites/newfavourite",isLoggedIn,function(req,res){
    res.render("newfavourite");
});

app.post("/dashboard/favourites", isLoggedIn, function(req,res){
    const newFavourite ={
        image: req.body.image,
        title: req.body.title,
        description: req.body.description,
        user: req.user.id
    }
    Favourite.create(newFavourite, function(err, newFavourite){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your fav has been added successfully !");
            res.redirect("/dashboard/favourites");
        }
    });
});

app.delete("/dashboard/favourites/:id",isLoggedIn,function(req,res){
    Favourite.deleteOne({_id: req.params.id},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your favourite has been deleted successfully!! ");
            res.redirect("/dashboard/favourites");
        }
    });
});


// SCHEDULE

app.get("/dashboard/schedule",isLoggedIn,function(req,res){
    Schedule.find({user:req.user.id},function(err,schedule){
        if(err){
            console.log(err);
        }else{
            res.render("schedule",{schedule: schedule});
        }
    });
});

app.get("/dashboard/schedule/newschedule",isLoggedIn,function(req,res){
    res.render("newSchedule");
});


app.post("/dashboard/schedule", isLoggedIn, function(req,res){
    const scheduleProg ={
        ReceipeName: req.body.receipename,
        ScheduleDate: req.body.scheduleDate,
        time:req.body.time,
        user: req.user.id
    }
    Schedule.create(scheduleProg, function(err, scheduleProg){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your schedule has been added successfully !");
            res.redirect("/dashboard/schedule");
        }
    });
});

app.delete("/dashboard/schedule/:id",isLoggedIn,function(req,res){
    Schedule.deleteOne({_id: req.params.id},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your New Schedule has been deleted successfully!! ");
            res.redirect("/dashboard/schedule");
        }
    });
});








function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }else{
        req.flash("error","You need to login first !!");
        res.redirect("/login");
    }
}



app.listen(3000,function(req,res){
    console.log("Tout marche bien")
});
