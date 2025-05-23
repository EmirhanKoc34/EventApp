var mysql = require('mysql');
var express = require("express");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
var app = express();
var path = require('path');
var cookieParser = require('cookie-parser');
const i18n = require('i18n');
const multer = require('multer');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(expressLayouts);
app.set('layout', './layouts/main'); // layout dosyanın yolu




app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap')));
app.use((req, res, next) => {
    res.locals.layout = 'layouts/main'; // <<< BU satırı ekle!
    next();
});

// Set up Multer storage engine (optional, for custom file naming and storage locations)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const eventFolder = path.join(__dirname, 'public', 'uploads');
        // Ensure the uploads folder exists
        cb(null, eventFolder);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const newFileName = Date.now() + ext;
        cb(null, newFileName); // Set custom file name to avoid overwriting files
    }
});

// Multer instance for handling file uploads
const upload = multer({
    storage: storage,   // Custom storage settings
    limits: {
        fileSize: 10 * 1024 * 1024, // Limit file size to 10MB (optional)
    },
    fileFilter: (req, file, cb) => {
        // Allow only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

const profilePictureStorage = multer.memoryStorage();
const profilePictureUpload = multer({ 
    storage: profilePictureStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limit file size to 10MB (optional)
    },
});

// Middleware for handling multiple file uploads
const uploadMultiple = upload.array('images', 5); // Up to 5 images

const JWT_SECRET = '7324f7115b13969bb06d94dfb332ef216383aa29700b460a72b3baef689ff6bfdb6aaf1fda8a0adfe0d2111663b49bce5d71ffb43bbbcd115c52a029313bafa6a9188f666b5809b86326529d4d1a0790923d4d613f54913fbfa6b6a3c4d4db5fa37037ccd9ace700fd238b92facf4bc54ec8cf93d8d7fc9fcd6e339656159f4ee5f692bcc6e8e48915e4c0f26fd45b6f6f6df3be0460ca7c0e2ee2cd0029d934b662409a4c57073437e7b7635ce7f6c54ae5298bee463ac6005651238d96e90b821277b9252258b511fb496b8f52fc7081c968b6887e5117d3b96dc40c5348e7b6d525724e89769c0022bb44ae8b642713ffc65fa0fd0db34660d1ffddf72060'; // Change this to a strong secret key
const JWT_SECRET_FOR_TICKET = '32ef2163aa29700b460a72b3baef383aa297089ff6bfdb6aaf1fda8a0adfe0d115c52a029313bafa6a9188f666b5809b86326529d4d1a0790923d4d613f5491210324f7bbbcd115c115bf692bcc6e8e48915ecc6e8e48915e4c0f26fd45b6f6f6df3be4d8d7fc9fcd6e339656159f4ec143bbbcd115c52a029313bafa6a9188f666b5809b86326529d4d1a0790923d4d613f54913fbfa6b6a3c4d4db5fa37037ccd9ace700fd238b92f2fc7081c968b6887e5117d3b96dc40c5348e7b51238d96e90b821277b9252258b511fb496b8f52fc7086acf4bc54ef1fda8a0adfe0d2111663b49bce5d71ffb43bbbcd115c52a029313bafa6a9188f666b5809b86326529d4d1a0790923d4d613f54913fbfa6b6a3c4d4db5fa37037ccd9ace700fd238b92facf4bc54ec8cf93d8d7fc9fcd6e339656159f4ee5f692bcc6e8e48915e4c0f26fd45b6f6f6df3be0460ca7c0e2ee2cd0029d934b662409a4c5';



app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, "/public")));
app.use(cookieParser());



var con = mysql.createConnection({//mysql connections
    host: "localhost",
    user: "root",
    password: "Mysql123!",
    database: "eventapp",
    port: 3306
});

con.connect(function (err) {
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


app.use((req, res, next) => {
    const userLocale = req.cookies.locale || i18n.getLocale();
    res.setLocale(userLocale);
    res.locals.__ = res.__; // EJS içinde __ kullanımı için
    next();
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
    return function (req, res, next) {
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


app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/anasayfa');
});

app.get('/', (req, res) => {
    res.redirect('/anasayfa');
});




app.post('/getRoomsForCreate', isAuthenticated, isHavePriv(2), (req, res) => {
    let query = "select * from rooms;";
    con.query(query, (err, result) => {
        if (err) {
            return res.status(500).send("Odalar Çekilemedi " + err.message);
        }
        else {
            res.json(result);
        }
    });
});

app.post('/createEvent', isAuthenticated, isHavePriv(2), uploadMultiple, (req, res) => {
    const userid = req.user.id;
    const { eventName, timestamp, roomid: eventRoom, description } = req.body;

    if (!eventName || !description || !timestamp) {
        return res.status(400).send("eventName, description ve timestamp zorunludur");
    }

    const ts = new Date(timestamp);
    if (isNaN(ts)) {
        return res.status(400).send("timestamp formatı hatalı. format: YYYY-MM-DD HH:MM:SS");
    }

    const insertEventQuery = `
        INSERT INTO eventapp.events (organizer_ID, events_Room_ID)
        VALUES (?, ?)
    `;

    con.query(insertEventQuery, [userid, eventRoom], (err, result) => {
        if (err) {
            return res.status(500).send("events tablosuna eklenemedi: " + err.message);
        }

        const eventID = result.insertId;

        const insertDetailsQuery = `
            INSERT INTO eventapp.events_details (events_ID, eventName, eventDescription, eventDate)
            VALUES (?, ?, ?, ?)
        `;

        con.query(insertDetailsQuery, [eventID, eventName, description, timestamp], (err2) => {
            if (err2) {
                return res.status(500).send("event_details tablosuna eklenemedi: " + err2.message);
            }

            if (req.files && req.files.length > 0) {
                const eventFolder = path.join(__dirname, 'public', 'uploads', String(eventID));

                // Create the event folder if it doesn't exist
                if (!fs.existsSync(eventFolder)) {
                    fs.mkdirSync(eventFolder, { recursive: true });
                }

                // Process and move all uploaded files to the event-specific folder
                let imagePaths = [];
                let promises = [];

                req.files.forEach((file, index) => {
                    promises.push(new Promise((resolve, reject) => {
                        const oldPath = file.path;
                        const ext = path.extname(file.originalname);
                        const newFileName = `${index}.png`; // Make unique file name using index
                        const newPath = path.join(eventFolder, newFileName);

                        // Move the file to the event folder
                        fs.rename(oldPath, newPath, (err3) => {
                            if (err3) {
                                return reject("Resim taşınamadı: " + err3.message);
                            }

                            // Collect image paths for response
                            imagePaths.push(`/uploads/${eventID}/${newFileName}`);
                            resolve();
                        });
                    }));
                });

                // Wait for all file processing to complete
                Promise.all(promises)
                    .then(() => {
                        res.send({
                            message: "Etkinlik ve görseller başarıyla oluşturuldu",
                            eventID,
                            imagePaths: imagePaths
                        });
                    })
                    .catch((err3) => {
                        res.status(500).send(err3);
                    });

            } else {
                res.send({
                    message: "Etkinlik başarıyla oluşturuldu (görsel yok)",
                    eventID
                });
            }
        });
    });
});


app.get('/getEventsForManager',isAuthenticated,isHavePriv(2),(req,res)=> // get list of events that user created
{
    let userid = req.user.id;
    let query = 'select eventName, events.events_ID, eventDate, rooms_Name,approved from events join events_details on events.events_ID = events_details.events_ID join rooms on events.events_Room_ID = rooms.rooms_ID where events.organizer_ID = ?;';
    con.query(query,[userid],(err,result)=>
    {
        if (err) {
            return res.status(500).send("Failed to get Events " + err.message);
        }
        if (result.length > 0) {
            res.json(result);
        }
        else {
            res.status(404).json({ error: "No Events Found" });
        }
    });
});



app.get('/getEventsDetailsForManager',isAuthenticated,isHavePriv(2),(req,res)=>
{
    let userid = req.user.id;
    let eventID = req.query.eventID;
    let images;
    let seats;
    let query = "select eventName, events.events_ID, eventDescription,eventDate, rooms_Name, approved from events join events_details on events.events_ID = events_details.events_ID join rooms on events.events_Room_ID = rooms.rooms_ID where events.organizer_ID = ? and events.events_ID = ?;";

    con.query(query,[userid,eventID],(err,result)=>
    {
        if (err) {
            return res.status(500).send("Failed to get Events " + err.message);
        }
        if (result.length > 0) {
            const eventFolder = path.join(__dirname, 'public', 'uploads', String(eventID));
            fs.readdir(eventFolder, (fsErr, files) => {
                if (fsErr) {
                    images = [];
                }
                else{
                    const imagePaths = files.map(file => `/uploads/${eventID}/${file}`);
                    images = imagePaths;
                }
            });

            if(result[0].approved == "1")
            {
                let query = `
                    SELECT seats_ID ,seats_Name
                    FROM rooms 
                    JOIN seats ON seats_Room_ID = rooms.rooms_ID 
                    JOIN events ON events.events_Room_ID = rooms.rooms_ID  
                    WHERE events_ID = ?;
                `;

                con.query(query, [eventID], (err, allSeats) => {
                    if (err) {
                        return res.status(500).send("Failed Get Seats Data");
                    }

                    if (allSeats.length > 0) {
                        let AlreadyTakenQuery = `
                            SELECT tickets_Seat_ID, tickets_User_ID 
                            FROM tickets 
                            WHERE tickets_Event_ID = ?;
                        `;

                        con.query(AlreadyTakenQuery, [eventID], (err, takenSeats) => {
                            if (err) {
                                return res.status(500).send("Failed Get Seats Data");
                            }

                            
                            const takenSeatMap = new Map();
                            takenSeats.forEach(row => {
                                takenSeatMap.set(row.tickets_Seat_ID, row.tickets_User_ID);
                            });

                            seats = allSeats.map(seat => ({
                                seat_ID: seat.seats_ID,
                                seat_Name: seat.seats_Name,
                                occupied: takenSeatMap.has(seat.seats_ID) ? 1 : 0,
                                user_ID: takenSeatMap.get(seat.seats_ID) || null
                            }));

                            return res.json({eventDetails: result, images: images, seats: seats});
                        });

                    } else {
                        return res.status(404).send("No seats found for this event");
                    }
                });
            }
            else{ // if not approved
                return res.json({eventDetails: result, images: images});
            }

        }
        else {
            return res.status(404).json({ error: "Given Event Not found" });
        }
    });

});


app.post('/updateEventDetails',isAuthenticated,isHavePriv(2),(req,res)=>
{
    const { eventID, eventName, eventDescription, eventDate } = req.body;
    let userid = req.user.id;
    let checkQuery = "select * from events where events_ID = ? and organizer_ID = ?";
    con.query(checkQuery,[eventID,userid],(err,checkResult)=>
    {
        if (err) {
            return res.status(500).send("Failed to get Events " + err.message);
        }
        if(checkResult.length > 0)
        {
            let query = "UPDATE events_details SET eventName = ?, eventDescription = ?, eventDate = ? WHERE (events_ID = ?);";
            con.query(query,[eventName,eventDescription,eventDate,eventID],(err,result)=>{
                if (err) {
                    return res.status(500).send("Failed to update Events " + err.message);
                }else{
                    res.status(200).json({success: true});
                }
            });

        }else{
            return res.status(403).json({ error: "You Dont Own This Event" }); 
        }

    });


});



app.get('/getEventsForAdmin', isAuthenticated, isHavePriv(3), (req, res) =>// get list of events for approving 
{
    let query = `select events.events_ID, eventName,eventDate,approved, rooms_Name from events join events_details on events.events_ID = events_details.events_ID join rooms on events.events_Room_ID = rooms.rooms_ID ORDER BY approved;`;
    con.query(query, (err, result) => {
        if (err) {
            return res.status(500).send("Failed to get Events " + err.message);
        }
        if (result.length > 0) {
            res.json(result);
        }
        else {
            res.status(404).json({ error: "No Events Found" });
        }
    })

});

app.get('/getEventDetailsForAdmin', isAuthenticated, isHavePriv(3), (req, res) => // To get the details for event for admin to approve or reject
{
    let events_ID = req.query.events_ID;

    let query = 'select events.events_ID, events.approved, users.user_Name,rooms.rooms_Name, events_details.eventName,events_details.eventDescription, events_details.eventDate from events join events_details on events.events_ID = events_details.events_ID join users on events.organizer_ID = users.user_ID join rooms on events.events_Room_ID= rooms.rooms_ID where events.events_ID = ?;';
    con.query(query, [events_ID], (err, result) => {
        if (err) {
            return res.status(500).send("Failed to Get Event Details: " + err.message);
        }
        if (result.length > 0) {
            const eventFolder = path.join(__dirname, 'public', 'uploads', String(events_ID));
            fs.readdir(eventFolder, (fsErr, files) => {
                if (fsErr) {
                    // Klasör yoksa resim yok kabul edilir
                    return res.json({ ...result[0], images: [] });
                }

                const imagePaths = files.map(file => `/uploads/${events_ID}/${file}`);
                return res.json({ ...result[0], images: imagePaths });
            });
        }
        else {
            res.status(404).json({ error: "Invalid event ID" })
        }

    });
});


app.post('/sendAnswerForAdmin', isAuthenticated, isHavePriv(3), (req, res) =>// Send answer for admin to reject approve
{
    let answer = req.body.answer; // send 1 or 0 
    let events_ID = req.body.events_ID;
    let query = "UPDATE `eventapp`.`events` SET `approved` = ? WHERE (`events_ID` = ?);";
    con.query(query, [answer, events_ID], (err, result) => {
        if (err) {
            return res.status(500).send("Failed to set answer: " + err.message);
        }
        res.status(200).json({ message: 'Event Updated Successfully' });
    });
});


app.get('/getEvents', isAuthenticated, isHavePriv(1), (req, res) => {
    let query = `select events.events_ID, eventName,eventDate,approved, rooms_Name from events join events_details on events.events_ID = events_details.events_ID join rooms on events.events_Room_ID = rooms.rooms_ID where approved = 1 order by events_details.eventDate;`;
    con.query(query, (err, result) => {
        if (err) {
            return res.status(500).send("Failed Get Events Data");
        }
        if (result.length > 0) {
            res.send(result);
        } else {
            return res.status(500).send("Cannot get data");
        }
    });
});


app.get('/getEventDetails', isAuthenticated, isHavePriv(1), (req, res) => {
    let event_ID = req.query.event_ID;

    let query = `
        SELECT 
            events.events_ID, 
            rooms.rooms_Name, 
            eventName, 
            eventDescription, 
            eventDate  
        FROM 
            events 
        JOIN events_details ON events.events_ID = events_details.events_ID 
        JOIN users ON events.organizer_ID = users.user_ID 
        JOIN rooms ON rooms.rooms_ID = events.events_Room_ID 
        WHERE 
            events.events_ID = ?;
    `;

    con.query(query, [event_ID], (err, result) => {
        if (err) {
            return res.status(500).send("Failed Get Events Data");
        }
        if (result.length > 0) {
            let event = result[0];
            let imageDir = path.join(__dirname, 'public/uploads', String(event_ID));
            let imagePaths = [];

            try {
                if (fs.existsSync(imageDir)) {
                    for (let i = 0; i <= 5; i++) {
                        let imgPath = path.join(imageDir, `${i}.png`);
                        if (fs.existsSync(imgPath)) {
                            imagePaths.push(`uploads/${event_ID}/${i}.png`);
                        }
                    }
                }
            } catch (e) {
                console.error("Error checking image files", e);
            }

            event.imagePaths = imagePaths;
            res.json(event);
        } else {
            res.json({ err: "No Data Found" });
        }
    });
});

app.post('/getSeats', isAuthenticated, isHavePriv(1), (req, res) => {// used in ticket buy page
    let event_ID = req.body.event_ID;
    let query = 'select seats_ID, seats_Name from rooms join seats on seats_Room_ID = rooms.rooms_ID join events on events.events_Room_ID = rooms.rooms_ID  where events_ID = ?;';
    con.query(query, [event_ID], (err, allSeats) => {
        if (err) {
            return res.status(500).send("Failed Get Seats Data");
        }
        if (allSeats.length > 0) {
            let AlreadyTakenQuery = "select tickets_Seat_ID from tickets where tickets_Event_ID = ?;";
            con.query(AlreadyTakenQuery, [event_ID], (err, takenSeats) => {
                if (err) {
                    return res.status(500).send("Failed Get Seats Data");
                }
                const takenSeatSet = new Set(takenSeats.map(row => row.tickets_Seat_ID));

                const seatsWithStatus = allSeats.map(seat => ({
                    seat_ID: seat.seats_ID,
                    seat_Name: seat.seats_Name,
                    occupied: takenSeatSet.has(seat.seats_ID) ? 1 : 0
                }));

                return res.json(seatsWithStatus);

            });

        }
        else {
            return res.status(404).send("No seats found for this event");
        }
    });

});

app.post('/sendTicket', isAuthenticated, isHavePriv(1), (req, res) => {
    let seatID = req.body.seatID;
    let eventID = req.body.eventID;
    let userId = req.user.id;
    let checkQuery = `select * from tickets where tickets_Event_ID = ? AND tickets_Seat_ID = ?`;
    con.query(checkQuery, [eventID, seatID], (err, checkResult) => {
        if (err) {
            return res.status(500).send("Failed to check tickets");
        }
        if (checkResult.length === 0) {
            let query = "INSERT INTO `eventapp`.`tickets` (`tickets_Event_ID`, `tickets_User_ID`, `tickets_Seat_ID`) VALUES (?, ?, ?);";
            con.query(query, [eventID, userId, seatID], (err, result) => {
                if (err) {
                    return res.status(500).send("Failed to insert into tickets");
                }
                res.status(200).json({ message: "Successful" });

            });
        }
        else {
            res.status(422).json({ message: "This seat is taken" });
        }

    });
});

// will send seat_name
app.get('/getTickets', isAuthenticated, isHavePriv(1), (req, res) =>// to get all tickets of user
{
    let userid = req.user.id;
    let query = 'select tickets_ID,seats.seats_Name, tickets_Seat_ID,events.events_ID, events_details.eventName,events_details.eventDate,rooms.rooms_Name  from tickets join events on events.events_ID = tickets.tickets_Event_ID join events_details on events.events_ID = events_details.events_ID join rooms on events.events_Room_ID = rooms.rooms_ID join seats on tickets_Seat_ID = seats.seats_ID where tickets_User_ID = ?;'
    con.query(query, [userid], (err, result) => {
        if (err) {
            return res.status(500).send("Failed to get tickets");
        }
        if (result.length > 0) {
            res.json(result);
        }
        else {
            res.json({ message: "No Tickets Found" });
        }

    });

});

app.get('/getQrTokenForTicket',isAuthenticated,isHavePriv(1),(req,res)=>
{
    let ticketID = req.query.ticketID;
    let userid = req.user.id;

    //We Have to Check if user is the owner of that ticket
    let checkQuery ='select * from tickets where tickets_ID = ? AND tickets_User_ID = ?;';

    con.query(checkQuery,[ticketID,userid],(err,checkResult)=>
    {
        if (err) {
            return res.status(500).send("Failed to get tickets");
        }
        if(checkResult.length > 0)
        {
            const token = jwt.sign({ id: ticketID }, JWT_SECRET_FOR_TICKET, { expiresIn: '30s' });
            res.status(200).json({token: token});
        }
        else{
            res.status(400).json({message: "You are not the owner of this ticket"});
        }

    });

});


app.post('/checkQrTokenForTicket',isAuthenticated,isHavePriv(2),(req,res)=>
{
    let token = req.body.token;
    let eventID = req.body.eventID; // event id that manager sends to check ticket
    let userID = req.user.id;
    let checkQuery = `select * from events where events.events_ID = ? AND events.organizer_ID = ?;`;
    con.query(checkQuery,[eventID,userID],(err,checkResult)=>
    {
        if (err) {
            return res.status(500).send("Failed to check priv");
        }
        if(checkResult.length > 0)
        {
            jwt.verify(token, JWT_SECRET_FOR_TICKET,async (err, decoded) => {
                if (err) {
                    return res.status(500).json({error: err});
                }
                else{
                    let query = 'select seats.seats_Name, users.user_Name from tickets join seats on tickets_Seat_ID = seats.seats_ID join users on tickets_User_ID = users.user_ID where tickets_ID = ? and tickets_Event_ID = ?;';
                    con.query(query,[decoded.id,eventID],(err,result)=>
                    {
                        if (err) {
                            return res.status(500).send("Failed to get user data");
                        }
                        if(result.length > 0)
                        {
                            res.json(result);
                        }
                        else{
                            return res.json({message: "This Ticket Does not Belongs to this event"});
                        }
                    });
                }
            });
        }
        else{
            return res.json({message: "You are not the owner of this event"});
        }
        
    });
    
});


app.post('/update-lang', (req, res) => {
    const lang = req.body.lang;
    if (lang && i18n.getLocales().includes(lang)) {
        res.cookie('locale', lang, { maxAge: 25920000000, httpOnly: true }); // Save language in cookies
        res.setLocale(lang); // Set the locale for the response
        res.status(200).send('Lang cookie updated');
    }
    else {
        res.status(400).send("Error updating lang");
    }

});

app.post('/isAdmin', isAuthenticated, isHavePriv(3), (req, res) => {
    res.status(200).json({ message: "Successful" });
});

app.post('/isManager', isAuthenticated, isHavePriv(2), (req, res) => {
    res.status(200).json({ message: "Successful" });
});


app.get('/profil', isAuthenticated, (req, res) => {
    res.render('profil', {
        title: 'Profil',
        lang: req.cookies.locale,
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null,
    });
});

app.get('/getProfileData',isAuthenticated,(req,res)=>{
    let userID = req.user.id;
    let query = "SELECT * from user_details where user_ID = ?";
    con.query(query,[userID],(err,result)=>{
        if (err) {
            return res.status(500).send("Failed to get Data");
        }
        if(result.length > 0){
            res.send(result);
        }else{
            res.status(404).json({message: "User Data Not Found"});
        }
    });
});

app.post('/updateProfile', isAuthenticated, profilePictureUpload.single('profile_Picture'), (req, res) => {
    let { full_name, std_Number, email, phone_Number } = req.body;

    const userId = req.user.id;
    const profile_Picture = req.file ? req.file.buffer : null;

    const updateQuery = `
        UPDATE user_details 
        SET 
            full_name = ?, 
            std_Number = ?, 
            profile_Picture = ?, 
            email = ?, 
            phone_Number = ? 
        WHERE user_id = ?;
    `;

    con.query(updateQuery, [full_name, std_Number, profile_Picture, email, phone_Number, userId], (err, result) => {
        if (err) {
            console.error("Profile update failed:", err);
            return res.status(500).send("Profile update failed.");
        }
        if (result.affectedRows > 0) {
            res.send("Profile successfully updated.");
        } else {
            res.status(404).send("Profile not found.");
        }
    });
});


app.get('/etkinlikOnayPaneli', isAuthenticated, isHavePriv(3), (req, res) => {
    res.render("EtkinlikOnayPaneli", {
        title: 'Etkinlik Onay Paneli',
        lang: req.cookies.locale,
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null
    });
});

app.get('/etkinlikOnayPaneli/details', isAuthenticated, isHavePriv(3), (req, res) => {
    res.render("etkinlikOnayPaneliDetay",
        {
            title: 'Etkinlik Onay Paneli',
            lang: req.cookies.locale,
            loggedin: !!req.cookies.token,
            username: req.user ? req.user.username : null
        });

});

app.get('/etkinlikDetay', isAuthenticated, isHavePriv(1), (req, res) => {
    res.render("etkinlik-detay", {
        title: 'Etkinlik Detay',
        loggedin: !!req.cookies.token,
        lang: req.cookies.locale,
        username: req.user ? req.user.username : null
    });
});

app.get('/etkinlik-olustur', isAuthenticated, isHavePriv(2), (req, res) => {
    res.render("etkinlik-olustur", {
        title: 'Etkinlik Oluştur',
        loggedin: !!req.cookies.token,
        lang: req.cookies.locale,
        username: req.user ? req.user.username : null
    });
});

app.get('/kulup-paneli', isAuthenticated, isHavePriv(2), (req, res) => {
    res.render("kulup-paneli", {
        title: 'Kulüp Paneli',
        loggedin: !!req.cookies.token,
        lang: req.cookies.locale,
        username: req.user ? req.user.username : null
    });
});

app.get('/kulup-paneli-detay', isAuthenticated, isHavePriv(2), (req, res) => {
    res.render('kulup-paneli-detay', {
        title: 'Etkinlik Detay',
        lang: req.cookies.locale,
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null
    });
});




app.get('/etkinlikKoltukSec', isAuthenticated, isHavePriv(1), (req, res) => {
    res.render("koltuk-sec", {
        title: 'Koltuk Seç',
        loggedin: !!req.cookies.token,
        lang: req.cookies.locale,
        username: req.user ? req.user.username : null
    });
});



app.get('/galeri', (req, res) => {
    const galleryDir = path.join(__dirname, 'public/images/galeri');

    fs.readdir(galleryDir, (err, files) => {
        if (err) {
            console.error("Galeri dosyaları okunamadı:", err);
            return res.render('galeri', { images: [] });
        }

        const images = files.filter(file =>
            /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
        );

        res.render('galeri', {
            title: 'Galeri',
            loggedin: !!req.cookies.token,
            lang: req.cookies.locale,
            username: req.user ? req.user.username : null,
            images: images
        });
    });
});

app.get('/hakkimizda', (req, res) => {
    res.render("hakkimizda", {
        title: 'Hakkımızda',
        loggedin: !!req.cookies.token,
        lang: req.cookies.locale,
        username: req.user ? req.user.username : null
    });
});


app.get('/anasayfa', (req, res) => {
    res.render("index", {
        title: 'Anasayfa',
        loggedin: !!req.cookies.token,
        lang: req.cookies.locale,
        username: req.user ? req.user.username : null
    });
});


app.get('/panel', isAuthenticated, isHavePriv(1), (req, res) => {
    res.render("panel", {
        title: 'Etkinlikler',
        loggedin: !!req.cookies.token,
        lang: req.cookies.locale,
        username: req.user ? req.user.username : null
    });
});

app.get("/login", (req, res) => {
    res.render("login", {
        title: 'Giriş',
        loggedin: !!req.cookies.token,
        lang: req.cookies.locale,
        username: req.user ? req.user.username : null
    });
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
            if (sqlStoredHashedPassword === hashedPassword) {
                const token = jwt.sign({ username: person.username, id: results[0].user_ID }, JWT_SECRET, { expiresIn: '30d' });// creates token
                res.cookie('token', token, { httpOnly: true }); //stores that token in cookie
                res.status(200).json({message: 'success'});
            } else {//Wrong password
                res.status(403).json({message: 'Wrong password or username'});
            }
        } else {//Wrong username
            res.status(403).json({message: 'Wrong password or username'});
        }
    });
});



app.get("/signup", (req, res) => {
    res.render("signup", {
        title: 'Kayıt Ol',
        loggedin: !!req.cookies.token,
        lang: req.cookies.locale,
        username: req.user ? req.user.username : null
    });
});

app.get("/signup/check", (req, res) => {
    const person = {
        username: req.query.username,
        password: req.query.password
    };

    let usercheck = 'SELECT * FROM users WHERE BINARY user_Name = ?;';
    let name = [person.username];
    let hashedPassword = hashPassword(person.password);

    // Veritabanı bağlantısını başlat ve transaction başlat
    con.beginTransaction((err) => {
        if (err) {
            return res.status(500).send('Database connection failed.');
        }

        // Kullanıcı kontrolü
        con.query(usercheck, name, function (err, results) {
            if (err) {
                return con.rollback(() => {
                    res.status(500).send('Database query failed.');
                });
            }

            if (results.length > 0) {
                return res.send("Bu Kullanıcı adı bulunuyor, giriş yapın ya da başka bir kullanıcı adı seçin");
            } else {
                // Kullanıcıyı ekle
                let createUserQuery = `INSERT INTO users VALUES(0,"${person.username}","${hashedPassword}",1);`;
                con.query(createUserQuery, [person.username, hashedPassword], function (err, result) {
                    if (err) {
                        return con.rollback(() => {
                            console.error("Failed to create user:", err);
                            res.status(500).send("Failed to create user");
                        });
                    }

                    // Eklenen kullanıcının ID'sini al
                    const userId = result.insertId;

                    // user_details tablosuna ekleme işlemi
                    const createDetailsQuery = `INSERT INTO user_details (user_id) VALUES (?)`;
                    con.query(createDetailsQuery, [userId, 'active'], function (err, result) {
                        if (err) {
                            return con.rollback(() => {
                                console.error("Failed to create user details:", err);
                                res.status(500).send("Failed to create user details");
                            });
                        }

                        // Her iki ekleme başarılı olduysa commit işlemi
                        con.commit((err) => {
                            if (err) {
                                return con.rollback(() => {
                                    res.status(500).send('Transaction commit failed.');
                                });
                            }
                            res.redirect('/login');
                        });
                    });
                });
            }
        });
    });
});




app.post('/change-password',isAuthenticated,(req,res) =>
{
        let oldpass = req.body.oldpassword;
        let newpass = req.body.newpassword;
        let userID = req.user.id;
    
        let query = `SELECT user_Password FROM users WHERE user_ID = ?`;
        con.query(query,[userID], (err,result)=>
        {
            if (err) {
                return res.status(500).json({error: 'Database query failed.'});
            }
            let oldpasshash = hashPassword(oldpass);
            if(oldpasshash == result[0].password)
            {
                let newpasshash = hashPassword(newpass);
                let query = `UPDATE users SET user_Password = ? WHERE user_ID = ?;`;
                con.query(query,[newpasshash,userID], (err,result)=>
                {
                    if (err) {
                        return res.status(500).json({error: 'Database query failed.'});
                    }
                    return res.status(200).json({ success: true, message: "Password Changed Successfully"});
                    
    
                });
            }
            else
            {
                return res.status(401).json({ success: false, message: "Wrong Password"});
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

app.use((req, res) => {// this should always be on the end of the code because if we dont have any route that user entered it will always run this code
    res.redirect('/anasayfa');
});


let port = 8001;
let ip = "0.0.0.0";

let server = app.listen(port, ip, (error) => {
    if (error) throw error;
    console.log("Server is running on:", ip, port);
});
