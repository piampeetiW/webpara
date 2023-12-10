const express = require("express");
const multer = require('multer');
const path = require("path");

const session = require('express-session');
const MemoryStore = require('memorystore')(session);


// database connection
const con = require("./config/db");
// bcrypt
const bcrypt = require("bcrypt");



const crypto = require('crypto');
const nodemailer = require('nodemailer');


const app = express();
//set "public" folder to be static folder, user can access it directly
app.use(express.static(path.join(__dirname, '/')));



// for json exchange
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// for session
app.use(session({
    cookie: { maxAge: 24 * 60 * 60 * 1000 },  //1 day in millisec
    secret: 'mysecretcode',
    resave: false,
    saveUninitialized: true,
    store: new MemoryStore({
        checkPeriod: 24 * 60 * 60 * 1000 // prune expired entries every 24h
    })
}));



// ============= Create hashed password ==============
app.get("/password/:pass", function (req, res) {
    const password = req.params.pass;
    const saltRounds = 10;    //the cost of encrypting see https://github.com/kelektiv/node.bcrypt.js#a-note-on-rounds
    bcrypt.hash(password, saltRounds, function (err, hash) {
        if (err) {
            return res.status(500).send("Hashing error");
        }
        //return hashed password, 60 characters
        // console.log(hash.length);
        res.send(hash);
    });
});

// ============= Login ==============



app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    const sql = "SELECT id, password FROM member WHERE username = ?";
    con.query(sql, [username], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.length !== 1) {
            return res.status(400).send("Wrong username");
        }

        const hashedPassword = results[0].password;

        bcrypt.compare(password, hashedPassword, function (err, same) {
            if (err) {
                res.status(503).send("Authentication server error");
            } else if (same) {
                // รหัสผ่านถูกต้อง
                // ตรวจสอบค่า username ว่าเป็น "admin" หรือไม่
                if (username === "admin") {
                    res.send("/useradmin"); // ส่ง URL ของหน้า "/useradmin"
                } else {
                    res.send("/homepage"); // ส่ง URL ของหน้า "/homepage"
                }
            } else {
                // รหัสผ่านไม่ถูกต้อง
                res.status(400).send("Wrong password");
            }
        });
    });
});





// สร้างเส้นทาง GET เพื่อดึงข้อมูล username จากตาราง user
app.get('/user', function (req, res) {
    const sql = 'SELECT username FROM user';

    con.query(sql, function (err, results) {
        if (err) throw err;

        if (results.length > 0) {
            const username = results[0].username;
            res.send(username);
        } else {
            res.send('No username found');
        }
    });
});





// สร้างเส้นทาง GET เพื่อดึงข้อมูล username จากตาราง user
app.get('/member', function (req, res) {
    const sql = 'SELECT username FROM member';

    con.query(sql, function (err, results) {
        if (err) throw err;

        if (results.length > 0) {
            const username = results[0].username;
            res.send(username);
        } else {
            res.send('No username found');
        }
    });
});












app.post('/register', (req, res) => {
    const { username, password, name, company, address, email, phonenumber } = req.body;

    const saltRounds = 10; // ความยากข้องของการเข้ารหัส 10 rounds คือค่าที่ดีในการใช้งานทั่วไป

    bcrypt.hash(password, saltRounds, function (err, hashedPassword) {
        if (err) {
            console.error('ผิดพลาดในการแฮชรหัสผ่าน: ' + err);
            res.status(500).json({ message: 'ผิดพลาดในการแฮชรหัสผ่าน' });
            return;
        }

        const sql = `INSERT INTO member (username, password, truename, bussiness, address, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const values = [username, hashedPassword, name, company, address, email, phonenumber];

        con.query(sql, values, (err, result) => {
            if (err) {
                console.error('ผิดพลาดในการบันทึกข้อมูล: ' + err);
                res.status(500).json({ message: 'ผิดพลาดในการบันทึกข้อมูล' });
                return;
            }
            console.log('บันทึกข้อมูลสำเร็จ');
            res.status(200).json({ message: 'บันทึกข้อมูลสำเร็จ' });
        });
    });
});



app.get('/check-username/:username', (req, res) => {
    const requestedUsername = req.params.username;

    // ตรวจสอบ username ในฐานข้อมูล
    con.query('SELECT * FROM member WHERE username = ?', [requestedUsername], (err, rows) => {
        if (err) {
            console.error('ผิดพลาดในการค้นหา username: ' + err);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหา username' });
            return;
        }

        // ตรวจสอบว่า username มีอยู่หรือไม่
        if (rows.length > 0) {
            // ถ้า username มีอยู่แล้ว
            res.json({ exists: true });
        } else {
            // ถ้า username ยังไม่มีอยู่
            res.json({ exists: false });
        }
    });
});







//----------------- reset pass ---------------------------------------------------//






// ------------- Logout --------------
app.get("/logout", function (req, res) {
    //clear session variable
    req.session.destroy(function (err) {
        if (err) {
            console.error(err.message);
            res.status(500).send("Cannot clear session");
        }
        else {
            res.send("/");
        }
    });
});









// สร้างเส้นทาง GET เพื่อดึงข้อมูลจากตาราง member
app.get('/data', function (req, res) {
    const sql = 'SELECT username, truename, bussiness, status, email, phone, address FROM member';

    con.query(sql, function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send('Database server error');
        }
        // แปลงค่า status
        const processedResults = results.map(result => {
            const processedResult = { ...result };
            processedResult.status = result.status === 1 ? 'Yes' : 'No';
            return processedResult;
        });

        res.json(processedResults);
    });
});





// สร้างเส้นทาง GET เพื่อดึงข้อมูลจากตาราง market
app.get('/markets', function (req, res) {
    const sql = 'SELECT id, market_name, active FROM bigmarket';

    con.query(sql, function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send('Database server error');
        }
        // แปลงค่า status
        const processedResults = results.map(result => {
            const processedResult = { ...result };
            processedResult.active = result.active === 1 ? 'Yes' : 'No';
            return processedResult;
        });

        res.json(processedResults);
    });
});



app.get('/summaryauc', (req, res) => {
    const sql = 'SELECT id, Auctionranking, nameBidder, time, price FROM summary';

    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching news auction data:', err);
            res.status(500).json({ message: 'Failed to fetch news auction data' });
            return;
        }

        console.log('news auction auction data fetched:', result);
        res.status(200).json(result);
    });
});






// สร้าง API endpoint สำหรับดึงข้อมูลข่าวสารทั้งหมด
app.get('/get_news', (req, res) => {
    const sql = 'SELECT id, date_news, detail_news FROM news';

    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching news data:', err);
            res.status(500).json({ message: 'Failed to fetch news data' });
            return;
        }

        console.log('News data fetched:', result);
        res.status(200).json(result);
    });
});



// สร้าง API endpoint สำหรับดึงข้อมูลข่าวสารทั้งหมด
app.get('/news_auction', (req, res) => {
    const sql = 'SELECT id, date_news_auction, detail_news_auction FROM news_auction';

    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching news auction data:', err);
            res.status(500).json({ message: 'Failed to fetch news auction data' });
            return;
        }

        console.log('news auction auction data fetched:', result);
        res.status(200).json(result);
    });
});



app.get('/auctionData', (req, res) => {
    // ส่งคำสั่ง SQL เพื่อดึงข้อมูลจากตาราง type_rubber
    const sql = 'SELECT id, name, market_sub_name, type ,total_rubber, amount_middle, amount_start, date, date_end, Start_Auction, End_Auction, active_room FROM auction_room';

    con.query(sql, function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send('Database server error');
        }

        // แปลงค่า Active
        const processedResults = results.map(result => {
            const processedResult = { ...result };
            processedResult.active_room = result.active_room === 1 ? 'Yes' : 'No';
            return processedResult;
        });


        res.json(processedResults);
    });
});








app.get('/type_rub', (req, res) => {
    // ส่งคำสั่ง SQL เพื่อดึงข้อมูลจากตาราง type_rubber
    const sql = 'SELECT id, type_name FROM rubber_type';

    con.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching type rubber data:', err);
            res.status(500).json({ message: 'Failed to fetch type rubber data' });
            return;
        }

        console.log('Type rubber data fetched:', results);

        // ทำการสร้าง HTML ในรูปแบบ option
        const optionsHtml = results.map(result => {
            return `<option value="${result.id}">${result.type_name}</option>`;
        });


        // ส่ง HTML กลับไปยังหน้า HTML โดยใช้ res.send
        res.send(optionsHtml.join(''));
    });
});




app.post('/add_market', (req, res) => {
    const marketData = req.body;

    // ทำการเพิ่มข้อมูลตลาดในตาราง "bigmarket" ในฐานข้อมูล
    const query = 'INSERT INTO bigmarket (market_name, active) VALUES (?, ?)';
    con.query(query, [marketData.market_name, marketData.active], (err, result) => {
        if (err) {
            console.error('Error adding market data to database:', err);
            res.status(500).json({ message: 'Failed to add market data to the database' });
            return;
        }

        console.log('Market data added to database:', result);
        res.status(200).json({ message: 'Market data added successfully' });
    });
});



app.post('/add_auction', (req, res) => {
    const auctionData = req.body;

    // ทำการเพิ่มข้อมูลประมูลในตาราง "auction_room" ในฐานข้อมูล
    const query = 'INSERT INTO auction_room (name, market_sub_name, Type ,total_rubber, amount_middle, amount_start, date, date_end , Start_Auction, End_Auction, active_room) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    con.query(query, [auctionData.auction_name, auctionData.market_sub_name, auctionData.type_rubber_value, auctionData.total_rubber, auctionData.price, auctionData.amount_start, auctionData.auction_date, auctionData.auction_date_end, auctionData.start_auction, auctionData.end_auction, auctionData.active_room], (err, result) => {
        if (err) {
            console.error('Error adding auction data to database:', err);
            res.status(500).json({ message: 'Failed to add auction data to the database' });
            return;
        }

        console.log('Auction data added to database:', result);
        res.status(200).json({ message: 'Auction data added successfully' });
    });
});


app.post('/add_news', (req, res) => {
    const newsData = req.body;

    // ทำการเพิ่มข้อมูลข่าวสารลงในฐานข้อมูล
    const query = 'INSERT INTO news (date_news, detail_news) VALUES (?, ?)';
    con.query(query, [newsData.date_news, newsData.details_News], (err, result) => {
        if (err) {
            console.error('Error adding news data to database:', err);
            res.status(500).json({ message: 'Failed to add news data to the database' });
            return;
        }

        console.log('News data added to database:', result);
        res.status(200).json({ message: 'News data added successfully' });
    });
});


app.post('/add_news_auc', (req, res) => {
    const newsData = req.body;

    // ทำการเพิ่มข้อมูลข่าวสารลงในฐานข้อมูล
    const query = 'INSERT INTO news_auction (id, date_news_auction, detail_news_auction) VALUES (?, ?)';
    con.query(query, [newsData.date_news, newsData.details_News], (err, result) => {
        if (err) {
            console.error('Error adding news auction data to database:', err);
            res.status(500).json({ message: 'Failed to add news  data to the database' });
            return;
        }

        console.log('News Auction data added to database:', result);
        res.status(200).json({ message: 'News Auction data added successfully' });
    });
});




app.post('/saveAuction', (req, res) => {
    const auctionPrice = req.body.price;
    const auctionId = req.body.auctionId;
    const username = req.body.username;
    const currentClock = req.body.currentClock;

    // นำค่าไปบันทึกในฐานข้อมูล
    const sql = `INSERT INTO summary (price, auctionroom_id, nameBidder, time_auction) VALUES (?, ?, ?, ?)`;

    con.query(sql, [auctionPrice, auctionId, username,  currentClock], (err, result) => {
        if (err) {
            console.error('Error executing query: ' + err.stack);
            return res.status(500).send('Error saving data to the database');
        }

        console.log('Data saved to the database');
        return res.status(200).send('Data saved to the database');
    });
});



// // สร้างเส้นทาง POST เพื่อแก้ไขข้อมูลตลาด
// app.post('/edit_market', (req, res) => {
//     const editedMarketData = req.body;

//     // ทำการอัปเดตข้อมูลตลาดในตาราง "bigmarket" ในฐานข้อมูล
//     const query = 'UPDATE bigmarket SET id = ? ,market_name = ?, active = ? WHERE id = ?';
//     con.query(query, [editedMarketData.market_name, editedMarketData.active, editedMarketData.id], (err, result) => {
//         if (err) {
//             console.error('Error editing market data in database:', err);
//             res.status(500).json({ message: 'Failed to edit market data in the database' });
//             return;
//         }

//         console.log('Market data edited in database:', result);
//         res.status(200).json({ message: 'Market data edited successfully' });
//     });
// });




// ส่วนของการแก้ไขข้อมูลตลาด
app.post('/edit_market', (req, res) => {
    const editedMarketData = req.body;

    // ตรวจสอบข้อมูลที่ส่งมา
    if (!editedMarketData.id || !editedMarketData.market_name || !editedMarketData.active) {
        res.status(400).json({ message: 'Invalid data' });
        return;
    }

    // ทำคำสั่ง SQL และการเชื่อมต่อกับฐานข้อมูล
    const query = 'UPDATE bigmarket SET market_name = ?, active = ? WHERE id = ?';
    con.query(query, [editedMarketData.market_name, editedMarketData.active, editedMarketData.id], (err, result) => {
        if (err) {
            console.error('Error editing market data in database:', err);
            res.status(500).json({ message: 'Failed to edit market data in the database' });
            return;
        }

        console.log('Market data edited in database:', result);
        res.status(200).json({ message: 'Market data edited successfully' });
    });
});





app.post('/edit_auction', (req, res) => {
    const editedAuctionData = req.body;

    // Validation - Check if required data is present
    if (!editedAuctionData.id || !editedAuctionData.auction_name || !editedAuctionData.active) {
        res.status(400).json({ message: 'Invalid data' });
        return;
    }

    // SQL query to update auction data
    const query = 'UPDATE auction_room SET name = ?, active_room = ? WHERE id = ?';
    con.query(query, [editedAuctionData.auction_name, editedAuctionData.active, editedAuctionData.id], (err, result) => {
        if (err) {
            console.error('Error editing auction data in database:', err);
            res.status(500).json({ message: 'Failed to edit auction data in the database' });
            return;
        }

        console.log('Auction data edited in database:', result);
        res.status(200).json({ message: 'Auction data edited successfully' });
    });
});







app.post('/delete_market', (req, res) => {
    // ดึง ID ของตลาดที่ต้องการลบจากข้อมูลที่ส่งมากับคำขอ
    const marketIdToDelete = req.body.id;

    // ทำคำสั่ง SQL หรือการให้ฟังก์ชันที่ทำการลบข้อมูลตลาดจากฐานข้อมูล
    // ในที่นี้จะให้เป็นตัวอย่างการใช้ MySQL
    const deleteMarketQuery = 'DELETE FROM bigmarket WHERE id = ?';

    // ทำการเรียกคำสั่ง SQL เพื่อลบข้อมูลตลาด
    con.query(deleteMarketQuery, [marketIdToDelete], (err, result) => {
        if (err) {
            console.error('Error deleting market data from database:', err);
            res.status(500).json({ message: 'Failed to delete market data from the database' });
            return;
        }

        console.log('Market data deleted from database:', result);
        res.status(200).json({ message: 'Market data deleted successfully' });
    });
});





// ============= Root ==============
app.get("/", function (req, res) {
    console.log(req.session.userID);
    res.sendFile(path.join(__dirname, "views/loginpara.html"));
});

app.get("/forgot", function (req, res) {
    console.log(req.session.userID);
    res.sendFile(path.join(__dirname, "views/resetpara.html"));
});

app.get("/regis", function (req, res) {
    console.log(req.session.userID);
    res.sendFile(path.join(__dirname, "views/registerpara.html"));
});

app.get("/homepage", function (req, res) {
    console.log(req.session.userID);
    res.sendFile(path.join(__dirname, "views/homepage.html"));
});

app.get("/profile", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/profile.html"));
});

app.get("/roombigmarket", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/big-market.html"));
});

app.get("/smallmarket", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/small-market.html"));
});

app.get("/auctoday", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/auction-today.html"));
});

app.get("/historyauc", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/AuctionHistory.html"));
});

app.get("/editprouse", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/Editprofile.html"));
});

app.get("/useradmin", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/User(admin).html"));
});

app.get("/marketAd", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/market(Admin).html"));
});

app.get("/auctionAd", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/auction-admin.html"));
});

app.get("/addauctionroom", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/add-auction.html"));
});

app.get("/addnews", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/news.html"));
});

app.get("/auctioning", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/auction-ing.html"));
});

app.get("/auctiontoday", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/auction-today.html"));
});

app.get("/auctionend", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/Auction-ed.html"));
});

app.get("/auctionpage", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/Auctionpage.html"));
});

app.get("/summary", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/summary.html"));
});

app.get("/subsummary", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/subsummary.html"));
});

app.get("/test", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/test.html"));
});





// ============= Port ==============
const port = 3000;
app.listen(port, function () {
    console.log("Server is ready at " + port);
});