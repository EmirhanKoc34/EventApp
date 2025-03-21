const db = require('./db');

db.query(`
    CREATE TABLE IF NOT EXISTS groups (
        group_ID INT AUTO_INCREMENT PRIMARY KEY,
        group_Name VARCHAR(100) NOT NULL,
        privID INT UNIQUE KEY
    )
`, (err, results) => {
  if (err) {
    console.error('Tablo oluşturulurken hata oluştu:', err);
    return;
  }
  console.log('Tablo başarıyla oluşturuldu veya zaten var!');
})

db.query(`
    CREATE TABLE IF NOT EXISTS users(
    user_ID INT AUTO_INCREMENT PRIMARY KEY,
    user_Name VARCHAR(100) NOT NULL UNIQUE,
    user_Password VARCHAR(100) NOT NULL,
    user_Group_ID INT,
        FOREIGN KEY (user_Group_ID) REFERENCES groups(group_ID)
    )
    `,  (err, results) => {
        if (err) {
          console.error('Tablo oluşturulurken hata oluştu:', err);
          return;
        }
        console.log('Tablo başarıyla oluşturuldu veya zaten var!');
      });

db.query(`
        CREATE TABLE IF NOT EXISTS group_Privilages(
        group_Priv_ID INT AUTO_INCREMENT PRIMARY KEY,
        ogrenci_Priv BOOLEAN,
        ogretmen_Priv BOOLEAN,
        admin_Priv BOOLEAN,
            FOREIGN KEY (group_Priv_ID) REFERENCES groups(privID)
        )
        `,  (err, results) => {
            if (err) {
              console.error('Tablo oluşturulurken hata oluştu:', err);
              return;
            }
            console.log('Tablo başarıyla oluşturuldu veya zaten var!');
          });

db.query(`
        CREATE TABLE IF NOT EXISTS events(
        events_ID INT AUTO_INCREMENT PRIMARY KEY,
        events_Name VARCHAR(100) NOT NULL,
        approved BOOLEAN,
        events_Date DATE NOT NULL,
        events_Time TIME NOT NULL,
        organizer_ID INT,
        events_Room_ID INT,
            FOREIGN KEY (organizer_ID) REFERENCES users(user_ID),
            FOREIGN KEY (events_Room_ID) REFERENCES rooms(room_ID)
        
        )
        `,  (err, results) => {
            if (err) {
                console.error('Tablo oluşturulurken hata oluştu:', err);
                     return;
                }
                console.log('Tablo başarıyla oluşturuldu veya zaten var!');
            });

 db.query(`
        CREATE TABLE IF NOT EXISTS tickets(
       tickets_ID INT AUTO_INCREMENT PRIMARY KEY,
       tickets_Event_ID INT,
       tickets_User_ID INT,
       tickets_Seat_ID INT,
            FOREIGN KEY (tickets_Event_ID) REFERENCES events(events_ID),
            FOREIGN KEY (tickets_User_ID) REFERENCES users(user_ID),
            FOREIGN KEY (tickets_Seat_ID) REFERENCES seats(seats_ID)
        )
        `,  (err, results) => {
            if (err) {
                console.error('Tablo oluşturulurken hata oluştu:', err);
                  return;
                }
                console.log('Tablo başarıyla oluşturuldu veya zaten var!');
        });

db.query(`
        CREATE TABLE IF NOT EXISTS rooms(
        rooms_ID INT AUTO_INCREMENT PRIMARY KEY,
        rooms_Name VARCHAR(100) NOT NULL

            )
            `,  (err, results) => {
                if (err) {
                    console.error('Tablo oluşturulurken hata oluştu:', err);
                      return;
                    }
                    console.log('Tablo başarıyla oluşturuldu veya zaten var!');
            });

db.query(`
    CREATE TABLE IF NOT EXISTS seats(
    seats_ID INT AUTO_INCREMENT PRIMARY KEY,
    seats_Room_ID INT,
    occupied BOOLEAN,
        FOREIGN KEY (seats_Room_ID) REFERENCES rooms(rooms_ID)
    )
    `,  (err, results) => {
        if (err) {
            console.error('Tablo oluşturulurken hata oluştu:', err);
              return;
            }
            console.log('Tablo başarıyla oluşturuldu veya zaten var!');
    });
    

