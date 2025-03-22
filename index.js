var mysql = require('mysql');
var express = require("express");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
var app = express();
var path = require('path');
var cookieParser = require('cookie-parser');
const i18n = require('i18n');

const JWT_SECRET = '7324f7115b13969bb06d94dfb332ef216383aa29700b460a72b3baef689ff6bfdb6aaf1fda8a0adfe0d2111663b49bce5d71ffb43bbbcd115c52a029313bafa6a9188f666b5809b86326529d4d1a0790923d4d613f54913fbfa6b6a3c4d4db5fa37037ccd9ace700fd238b92facf4bc54ec8cf93d8d7fc9fcd6e339656159f4ee5f692bcc6e8e48915e4c0f26fd45b6f6f6df3be0460ca7c0e2ee2cd0029d934b662409a4c57073437e7b7635ce7f6c54ae5298bee463ac6005651238d96e90b821277b9252258b511fb496b8f52fc7081c968b6887e5117d3b96dc40c5348e7b6d525724e89769c0022bb44ae8b642713ffc65fa0fd0db34660d1ffddf72060'; // Change this to a strong secret key

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname,"/public")));
app.use(cookieParser());



var con = mysql.createConnection({//mysql connections
    host: "localhost",
    user: "root",
    password: "Mysql123!",
    database: "eventapp",
    port: 3306
    });

con.connect(function(err) {
        if (err) throw err;
        console.log("Connected to MySQL database!");
    });

i18n.configure({
    locales: ['en', 'tr'], // Supported languages
    directory: path.join(__dirname, 'locales'), // Path to locale files
    defaultLocale: 'tr', // Default language
    queryParameter: 'lang', // Language query parameter (?lang=)
    cookie: 'locale', // Name of the cookie to store the language preference
    autoReload: true, // Automatically reload locale files when changed
    updateFiles: false, // Disable creating missing locale files
});

app.use(i18n.init);


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function isAuthenticated(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            res.clearCookie('token');
            return res.redirect('/login');
        }
        req.user = decoded;
        next();
    });
}

function isHavePriv(privType) {
    return function(req, res, next) {
        let username = req.user.username;

        // SQL query to get the user's groupID based on username
        let userQuery = 'SELECT user_Group_ID FROM users WHERE BINARY user_Name = ?';

        con.query(userQuery, [username], (error, userResults) => {
            if (error) {
                console.error('Database query error getting groupID:', error);
                return res.status(500).send('Database query error');
            }

            if (userResults.length === 0) {
                return res.status(404).send('User not found');
            }


            // Variables for constructing the query
            let priv;

            // Determine the condition field based on privType
            switch (privType) {
                case 1: //For Student Privilege
                    priv = 'ogrenci_Priv';
                    break;
                case 2: //For Teacher Privilege
                    priv = 'ogretmen_Priv';
                    break;
                case 3: //For Admin Privilege
                    priv = 'admin_Priv';
                    break;
                default:
                    return res.status(400).send('Invalid privilege type');
            }

            // Construct the SQL query
            let usernamequery = [`"${username}"`];
            
            let privQuery = `SELECT * FROM users JOIN user_groups ON users.user_Group_ID = user_groups.group_ID JOIN group_privilages on user_groups.privID = group_privilages.group_Priv_ID  WHERE BINARY users.user_Name = ${usernamequery} AND group_privilages.${priv};`;

            // Execute the privilege check query
            con.query(privQuery, (error, privResults) => {
                if (error) {
                    console.error('Database query error checking privileges:', error);
                    return res.status(500).send('Database query error');
                }

                if (privResults.length > 0) {
                    return next();
                } else {
                    
                    return res.redirect('/anasayfa');
                }
            });
        });
    };
}

app.use((req, res, next) => {
    if (req.cookies.token) {
        try {
            const decoded = jwt.verify(req.cookies.token, JWT_SECRET);
            req.user = decoded; // Set the decoded token as req.user
        } catch (err) {
            
            res.clearCookie('token');
            return res.redirect("/anasayfa");
        }
    }
    next();
});

app.get("/anasayfa", (req,res) => {
    res.render("main", {
        title: 'Anasayfa',
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null,
        theme: req.cookies.theme,
    });
});

app.get("/settings", (req,res) => {
    res.render("settings", {
        title: 'Anasayfa',
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null,
        theme: req.cookies.theme,
        lang: req.cookies.locale
    });
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/anasayfa');
});

app.get('/', (req, res) => {
    res.redirect('/anasayfa');
});


app.get("/profile",isAuthenticated, isHavePriv(1), (req,res) => {
    res.render("profile",{
        title: 'Text Detection',
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null,
        theme: req.cookies.theme
    });
});

app.post('/getProfileData', (req, res) => {
    const { username }  = req.body;
    
    const query = `SELECT * from users WHERE BINARY user_Name = ?;`;
    const values = [username];
    
    con.query(query, values, (err, result) => {
        if (err) {
            return res.status(500).send("Failed Get User Data");
        } 
        if (result.length > 0) {
            res.send(result);
        } else {
            return res.status(500).send("Cannot get data");
        }
        
    });
});

app.post('/update-theme', (req, res) => {

    // "theme" cookie is only used in header.ejs and declared variable in there we can use the same variable in the 
    // other parts because they all have header in it. If we want to use it without header we should declare new variable

    const theme = req.body.theme; // Get the theme from the request body

    if (theme === 'dark' || theme === 'light'  || theme === 'system') {
        // Set a cookie with the theme preference
        res.cookie('theme', theme, { maxAge: 25920000000, httpOnly: true }); // 300 days expiration
        res.status(200).send('Theme cookie updated');
    } else {
        res.status(400).send('Invalid theme');
    }
});

app.post('/update-lang', (req, res) => {
    const lang = req.body.lang;
    if (lang && i18n.getLocales().includes(lang)) {
        res.cookie('locale', lang,{ maxAge: 25920000000, httpOnly: true }); // Save language in cookies
        res.setLocale(lang); // Set the locale for the response
        res.status(200).send('Lang cookie updated');
    }
    else{
        res.status(400).send("Error updating lang");
    }

});


app.get("/login", (req,res)=>
{
    res.render("login", {
        title: 'Giriş',
        loggedin: !!req.cookies.token,
        theme: req.cookies.theme,
        username: req.user ? req.user.username : null
    } );
});

app.get("/login/check", (req, res) => {
    const person = {
        username: req.query.username,
        password: req.query.password
    };
    let hashedPassword = hashPassword(person.password);// hashes the inputed password
    let query = 'SELECT * FROM users WHERE BINARY user_Name = ?;';
    let name = [person.username];
    
    con.query(query, name, function (err, results) {
        if (err) {
            return res.status(500).send('Database query failed.');
        }
       
        if (results.length === 1) {
            let sqlStoredHashedPassword = results[0].user_Password; // we have already get the password with the first query so we are just checking it here
            console.log(sqlStoredHashedPassword, hashedPassword);
            if (sqlStoredHashedPassword === hashedPassword) {
                const token = jwt.sign({ username: person.username, id: results[0].userID }, JWT_SECRET, { expiresIn: '30d' });// creates token 
                res.cookie('token', token, { httpOnly: true }); //stores that token in cookie
                res.redirect("/profile");
            } else {//Wrong password
                console.log('Wrong PAss')
                res.redirect("/login");
            }
        } else {//Wrong username
            console.log('wronusername');
            res.redirect("/login");
        }
    });
});



app.get("/signup", (req,res)=>
    {
        res.render("signup", {
            title: 'Kayıt Ol',
            loggedin: !!req.cookies.token,
            theme: req.cookies.theme,
            username: req.user ? req.user.username : null
        });
    });

app.get("/signup/check", (req,res)=>
{
    const person =
    {
        username: req.query.username,
        password: req.query.password
    }
    let usercheck = 'SELECT * FROM users WHERE BINARY user_Name = ?;';
    let name = [person.username];
    let hashedPassword = hashPassword(person.password);

    con.query(usercheck, name, function (err, results) {
        if (err) {
            return res.status(500).send('Database query failed.');
        }
        
        if (results.length > 0) {
            return res.send(`betterAlert(3, "Bu Kullanıcı adı bulunuyor, giriş yapın yada başka bir kullanıcı adı seçin", "Hata!");`);
        } else {
            let createUserQuery = `INSERT INTO users VALUES(0,"${person.username}","${hashedPassword}",1);`;// Creates user with person.username, person.password , groupID = 2 , and the automatic userID

            con.query(createUserQuery, function (err, result) {
                if (err) {
                    console.error("Failed to create user:", err);
                    return res.status(500).send("Failed to create user");
                }
                return res.send(`window.location.replace("/login")`);
            });
        }
    });
});



function hashPassword(password) {
    // Hash the password with SHA-1 in binary format
    const firstHashBinary = crypto.createHash('sha1').update(password, 'utf8').digest('binary');

    // Hash the binary hash with SHA-1 again and output in hexadecimal format
    const secondHashHex = crypto.createHash('sha1').update(firstHashBinary, 'binary').digest('hex');

    // Format the result: uppercase and prepend an asterisk
    return '*' + secondHashHex.toUpperCase();
}

let port = 8001;
let ip = "0.0.0.0";

let server = app.listen(port,ip, (error) => {
if(error) throw error;
    console.log("Server is running on:",ip, port);
});
