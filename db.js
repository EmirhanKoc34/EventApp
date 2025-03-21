const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // XAMPP varsayılan kullanıcı adı
    password: '', // Varsayılan şifre genellikle boştur
    database: 'Event_App'
});

connection.connect((err) => {
    if (err) {
        console.error("MySQL bağlantı hatası: ", err);
        return;
    }
    console.log("MySQL bağlantısı başarılı!");
});

module.exports = connection;