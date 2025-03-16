var mysql = require('mysql');
var express = require("express");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
var app = express();
var path = require('path');
var cookieParser = require('cookie-parser');


const JWT_SECRET = '7324f7115b13969bb06d94dfb332ef216383aa29700b460a72b3baef689ff6bfdb6aaf1fda8a0adfe0d2111663b49bce5d71ffb43bbbcd115c52a029313bafa6a9188f666b5809b86326529d4d1a0790923d4d613f54913fbfa6b6a3c4d4db5fa37037ccd9ace700fd238b92facf4bc54ec8cf93d8d7fc9fcd6e339656159f4ee5f692bcc6e8e48915e4c0f26fd45b6f6f6df3be0460ca7c0e2ee2cd0029d934b662409a4c57073437e7b7635ce7f6c54ae5298bee463ac6005651238d96e90b821277b9252258b511fb496b8f52fc7081c968b6887e5117d3b96dc40c5348e7b6d525724e89769c0022bb44ae8b642713ffc65fa0fd0db34660d1ffddf72060'; // Change this to a strong secret key

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname,"/public")));
app.use(cookieParser());



var con = mysql.createConnection({//mysql connections
    host: "localhost",
    user: "root",
    password: "Mysql123!",
    database: "login",
    port: 3306
    });

con.connect(function(err) {
        if (err) throw err;
        console.log("Connected to MySQL database!");
    });


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
        let userQuery = 'SELECT groupID FROM login.users WHERE BINARY username = ?';

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
                case 1: // For game page
                    priv = 'profile_priv';
                    break;
                case 2: // For table page 
                    priv = 'table_priv';
                    break;
                case 3: //for text detection page
                    priv = 'image_priv';
                    break;
                default:
                    return res.status(400).send('Invalid privilege type');
            }

            // Construct the SQL query
            let usernamequery = [`"${username}"`];
            
            let privQuery = `SELECT * FROM users JOIN login.groups ON users.groupID = login.groups.groupID JOIN group_privileges on groups.privID = group_privileges.group_privilege_id  WHERE BINARY users.username = ${usernamequery} AND group_privileges.${priv};`;

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
        username: req.user ? req.user.username : null
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
        username: req.user ? req.user.username : null
    });
});

app.post('/getProfileData', (req, res) => {
    const { username }  = req.body;
    
    const query = `SELECT * from login.users WHERE BINARY username = ?;`;
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


app.get("/login", (req,res)=>
{
    res.render("login", {
        title: 'Giriş',
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null
    } );
});

app.get("/login/check", (req, res) => {
    const person = {
        username: req.query.username,
        password: req.query.password
    };
    let hashedPassword = hashPassword(person.password);// hashes the inputed password
    console.log(person);
    let query = 'SELECT * FROM login.users WHERE BINARY username = ?;';
    let name = [person.username];
    
    con.query(query, name, function (err, results) {
        if (err) {
            return res.status(500).send('Database query failed.');
        }
       
        if (results.length === 1) {
            let sqlStoredHashedPassword = results[0].password; // we have already get the password with the first query so we are just checking it here
            
            if (sqlStoredHashedPassword === hashedPassword) {
                const token = jwt.sign({ username: person.username, id: results[0].userID }, JWT_SECRET, { expiresIn: '30d' });// creates token 
                res.cookie('token', token, { httpOnly: true }); //stores that token in cookie
                res.redirect("/profile");
            } else {//Wrong password
                res.redirect("/login");
            }
        } else {//Wrong username
            res.redirect("/login");
        }
    });
});



app.get("/signup", (req,res)=>
    {
        res.render("signup", {
            title: 'Kayıt Ol',
            loggedin: !!req.cookies.token,
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
    let usercheck = 'SELECT * FROM login.users WHERE BINARY username = ?;';
    let name = [person.username];
    let hashedPassword = hashPassword(person.password);

    con.query(usercheck, name, function (err, results) {
        if (err) {
            return res.status(500).send('Database query failed.');
        }
        
        if (results.length > 0) {
            return res.send(`betterAlert(3, "Bu Kullanıcı adı bulunuyor, giriş yapın yada başka bir kullanıcı adı seçin", "Hata!");`);
        } else {
            let createUserQuery = `INSERT INTO login.users VALUES("${person.username}","${hashedPassword}",2,0);`;// Creates user with person.username, person.password , groupID = 2 , and the automatic userID

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
