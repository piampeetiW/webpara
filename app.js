const express = require("express");
const multer = require('multer');
const path = require("path");

const session = require('express-session');
const MemoryStore = require('memorystore')(session);


// database connection
// const con = require("./config/db");
const mariadb = require("mariadb");
require("dotenv").config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "webparan_paradb",
    password: process.env.DB_PASSWORD || "y8AjbEva4cJsWtVSDAtnn",
    database: process.env.DB_NAME || "webparan_paradb",
    connectionLimit: 5,
});

pool.getConnection()

    .then(conn => {

        console.log('Database connected');

    }).catch(err => {

        //not connected

        console.log('Cannot connect to database', err);

    });

// bcrypt
const bcrypt = require("bcrypt");



const crypto = require('crypto');
const nodemailer = require('nodemailer');


const app = express();
//set "public" folder to be static folder, user can access it directly
// app.use(express.static(path.join(__dirname, '/')));

const public = path.join(__dirname, 'public');

app.use('/HelloNodejs', express.static(public));



// for json exchange
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// middleware

var bodyParser = require('body-parser');
const { connect } = require("http2");

app.use(bodyParser.json());       // to support JSON-encoded bodies

app.use(bodyParser.urlencoded({   // to support URL-encoded bodies

    extended: true

}));



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
app.get("/HelloNodejs/api/password/:pass", function (req, res) {
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



app.post("/HelloNodejs/api/login", async function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    let conn;
    try {
        conn = await pool.getConnection();
        const sql = "SELECT id, password FROM member WHERE username = ?";
        const results = await conn.query(sql, [username]);

        if (results.length !== 1) {
            return res.status(400).send("Wrong username");
        }

        const hashedPassword = results[0].password;

        bcrypt.compare(password, hashedPassword, function (err, same) {
            if (err) {
                res.status(503).send("Authentication server error");
            } else if (same) {
                if (username === "admin") {
                    res.send("/HelloNodejs/useradmin");
                } else {
                    res.send("/HelloNodejs/homepage");
                }
            } else {
                res.status(400).send("Wrong password");
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Database server error");
    } finally {
        if (conn) conn.release(); // คืน connection ไปที่ pool
    }
});




app.get('/HelloNodejs/api/user', async (req, res) => {
    try {
        // ใช้ await เพื่อรอให้ pool สามารถทำการ getConnection ได้
        const conn = await pool.getConnection();

        const sql = 'SELECT username FROM user';
        const results = await conn.query(sql);

        if (results.length > 0) {
            const username = results[0].username;
            res.send(username);
        } else {
            res.send('No username found');
        }

        // ส่งคืน connection กลับไปที่ pool เมื่อเสร็จสิ้นการใช้งาน
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).send('Database server error');
    }
});





app.get('/HelloNodejs/api/member', async (req, res) => {
    try {
        // ใช้ await เพื่อรอให้ pool สามารถทำการ getConnection ได้
        const conn = await pool.getConnection();

        const sql = 'SELECT username FROM member';
        const results = await conn.query(sql);

        if (results.length > 0) {
            const username = results[0].username;
            res.send(username);
        } else {
            res.send('No username found');
        }

        // ส่งคืน connection กลับไปที่ pool เมื่อเสร็จสิ้นการใช้งาน
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).send('Database server error');
    }
});












app.post('/HelloNodejs/api/register', async (req, res) => {
    const { username, password, name, company, address, email, phonenumber } = req.body;

    try {
        const conn = await pool.getConnection();
        const saltRounds = 10;

        bcrypt.hash(password, saltRounds, async function (err, hashedPassword) {
            if (err) {
                console.error('Error hashing password: ' + err);
                res.status(500).json({ message: 'Error hashing password' });
                return;
            }

            const sql = `INSERT INTO member (username, password, truename, bussiness, address, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const values = [username, hashedPassword, name, company, address, email, phonenumber];

            const result = await conn.query(sql, values);
            conn.release(); // คืน connection ไปที่ pool

            console.log('Data saved successfully');
            res.status(200).json({ message: 'บันทึกข้อมูลสำเร็จ' });
        });
    } catch (error) {
        console.error('Error saving data: ' + error);
        res.status(500).json({ message: 'Error saving data' });
    }
});



app.get('/HelloNodejs/api/check-username/:username', async (req, res) => {
    const requestedUsername = req.params.username;

    try {
        const conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM member WHERE username = ?', [requestedUsername]);
        conn.release(); // คืน connection ไปที่ pool

        // ตรวจสอบว่า username มีอยู่หรือไม่
        if (rows.length > 0) {
            // ถ้า username มีอยู่แล้ว
            res.json({ exists: true });
        } else {
            // ถ้า username ยังไม่มีอยู่
            res.json({ exists: false });
        }
    } catch (error) {
        console.error('Error checking username: ' + error);
        res.status(500).json({ error: 'An error occurred while checking username' });
    }
});








//----------------- reset pass ---------------------------------------------------//






// ------------- Logout --------------
app.get("/HelloNodejs/api/logout", async function (req, res) {
    try {
        // clear session variable
        await destroySessionAsync();

        // Release the MariaDB connection back to the pool
        const connection = await pool.getConnection();
        // Perform any cleanup or additional actions here if needed
        connection.release();

        res.send("/HelloNodejs/");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error during logout");
    }
});









app.get('/HelloNodejs/api/data', async (req, res) => {
    try {
        // ใช้ await เพื่อรอให้ pool สามารถทำการ getConnection ได้
        const conn = await pool.getConnection();

        const sql = 'SELECT username, truename, bussiness, status, email, phone, address FROM member';
        const results = await conn.query(sql);

        // แปลงค่า status
        const processedResults = results.map(result => {
            const processedResult = { ...result };
            processedResult.status = result.status === 1 ? 'Yes' : 'No';
            return processedResult;
        });

        res.json(processedResults);

        // ส่งคืน connection กลับไปที่ pool เมื่อเสร็จสิ้นการใช้งาน
        conn.release();
    } catch (err) {
        console.error(err);
        res.status(500).send('Database server error');
    }
});





// สร้างเส้นทาง GET เพื่อดึงข้อมูลจากตาราง market
app.get('/HelloNodejs/api/markets', async function (req, res) {
    let conn;

    try {
        conn = await pool.getConnection();
        const sql = 'SELECT id, market_name, active FROM bigmarket';
        const results = await conn.query(sql);

        // แปลงค่า status
        const processedResults = results.map(result => {
            const processedResult = { ...result };
            processedResult.active = result.active === 1 ? 'Yes' : 'No';
            return processedResult;
        });

        res.json(processedResults);
    } catch (err) {
        console.error(err);
        res.status(500).send('Database server error');
    } finally {
        if (conn) {
            conn.release(); // Release the connection back to the pool
        }
    }
});



app.get('/HelloNodejs/api/summaryauc', async (req, res) => {
    try {
        // ใช้ await เพื่อรอให้ pool สามารถทำการ getConnection ได้
        const conn = await pool.getConnection();

        const sql = 'SELECT id, Auctionranking, nameBidder, time, price FROM summary';
        const result = await conn.query(sql);

        console.log('News auction data fetched:', result);
        res.status(200).json(result);

        // ส่งคืน connection กลับไปที่ pool เมื่อเสร็จสิ้นการใช้งาน
        conn.release();
    } catch (err) {
        console.error('Error fetching news auction data:', err);
        res.status(500).json({ message: 'Failed to fetch news auction data' });
    }
});






app.get('/HelloNodejs/api/get_news', async (req, res) => {
    let conn;
    try {
        // Get a connection from the pool
        conn = await pool.getConnection();

        const sql = 'SELECT id, date_news, detail_news FROM news';

        // Execute the query
        const result = await conn.query(sql);

        console.log('News data fetched:', result);
        res.status(200).json(result);
    } catch (err) {
        console.error('Error fetching news data:', err);
        res.status(500).json({ message: 'Failed to fetch news data' });
    } finally {
        // Release the connection back to the pool
        if (conn) conn.release();
    }
});



app.get('/HelloNodejs/api/news_auction', async (req, res) => {
    let conn;
    try {
        // ขอการเชื่อมต่อจาก pool
        conn = await pool.getConnection();

        const sql = 'SELECT id, date_news_auction, detail_news_auction FROM news_auction';

        // ทำคำสั่ง query
        const result = await conn.query(sql);

        console.log('news auction data fetched:', result);
        res.status(200).json(result);
    } catch (err) {
        console.error('Error fetching news auction data:', err);
        res.status(500).json({ message: 'Failed to fetch news auction data' });
    } finally {
        // คืนการเชื่อมต่อกลับไปยัง pool
        if (conn) conn.release();
    }
});



app.get('/HelloNodejs/api/auctionData', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const sql = 'SELECT id, name, market_sub_name, type, total_rubber, amount_middle, amount_start, date, date_end, Start_Auction, End_Auction, active_room FROM auction_room';
        const results = await conn.query(sql);

        // แปลงค่า Active
        const processedResults = results.map(result => {
            const processedResult = { ...result };
            processedResult.active_room = result.active_room === 1 ? 'Yes' : 'No';
            return processedResult;
        });

        res.json(processedResults);
    } catch (err) {
        console.error(err);
        res.status(500).send('Database server error');
    } finally {
        if (conn) {
            conn.release(); // Release the connection back to the pool
        }
    }
});








app.get('/HelloNodejs/api/type_rub', async (req, res) => {
    try {
        // ใช้ await เพื่อรอให้ pool สามารถทำการ getConnection ได้
        const conn = await pool.getConnection();

        // ส่งคำสั่ง SQL เพื่อดึงข้อมูลจากตาราง type_rubber
        const sql = 'SELECT id, type_name FROM rubber_type';
        const results = await conn.query(sql);

        console.log('Type rubber data fetched:', results);

        // ทำการสร้าง HTML ในรูปแบบ option
        const optionsHtml = results.map(result => {
            return `<option value="${result.id}">${result.type_name}</option>`;
        });

        // ส่ง HTML กลับไปยังหน้า HTML โดยใช้ res.send
        res.send(optionsHtml.join(''));

        // ส่งคืน connection กลับไปที่ pool เมื่อเสร็จสิ้นการใช้งาน
        conn.release();
    } catch (err) {
        console.error('Error fetching type rubber data:', err);
        res.status(500).json({ message: 'Failed to fetch type rubber data' });
    }
});




app.post('/HelloNodejs/api/add_market', async (req, res) => {
    const marketData = req.body;

    try {
        // ใช้ await เพื่อรอให้ pool สามารถทำการ getConnection ได้
        const conn = await pool.getConnection();

        // ทำการเพิ่มข้อมูลตลาดในตาราง "bigmarket" ในฐานข้อมูล
        const query = 'INSERT INTO bigmarket (market_name, active) VALUES (?, ?)';
        const result = await conn.query(query, [marketData.market_name, marketData.active]);

        console.log('Market data added to database:', result);
        res.status(200).json({ message: 'Market data added successfully' });

        // ส่งคืน connection กลับไปที่ pool เมื่อเสร็จสิ้นการใช้งาน
        conn.release();
    } catch (err) {
        console.error('Error adding market data to database:', err);
        res.status(500).json({ message: 'Failed to add market data to the database' });
    }
});



app.post('/HelloNodejs/api/add_auction', async (req, res) => {
    try {
        // ใช้ await เพื่อรอให้ pool สามารถทำการ getConnection ได้
        const conn = await pool.getConnection();

        const auctionData = req.body;

        // ทำการเพิ่มข้อมูลประมูลในตาราง "auction_room" ในฐานข้อมูล
        const query = 'INSERT INTO auction_room (name, market_sub_name, Type ,total_rubber, amount_middle, amount_start, date, date_end , Start_Auction, End_Auction, active_room) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const result = await conn.query(query, [
            auctionData.auction_name,
            auctionData.market_sub_name,
            auctionData.type_rubber_value,
            auctionData.total_rubber,
            auctionData.price,
            auctionData.amount_start,
            auctionData.auction_date,
            auctionData.auction_date_end,
            auctionData.start_auction,
            auctionData.end_auction,
            auctionData.active_room
        ]);

        console.log('Auction data added to database:', result);
        res.status(200).json({ message: 'Auction data added successfully' });

        // ส่งคืน connection กลับไปที่ pool เมื่อเสร็จสิ้นการใช้งาน
        conn.release();
    } catch (err) {
        console.error('Error adding auction data to database:', err);
        res.status(500).json({ message: 'Failed to add auction data to the database' });
    }
});


app.post('/HelloNodejs/api/add_news', async (req, res) => {
    try {
        // ใช้ await เพื่อรอให้ pool สามารถทำการ getConnection ได้
        const conn = await pool.getConnection();

        const newsData = req.body;

        // ทำการเพิ่มข้อมูลข่าวสารลงในฐานข้อมูล
        const query = 'INSERT INTO news (date_news, detail_news) VALUES (?, ?)';
        const result = await conn.query(query, [newsData.date_news, newsData.details_News]);

        console.log('News data added to database:', result);
        res.status(200).json({ message: 'News data added successfully' });

        // ส่งคืน connection กลับไปที่ pool เมื่อเสร็จสิ้นการใช้งาน
        conn.release();
    } catch (err) {
        console.error('Error adding news data to database:', err);
        res.status(500).json({ message: 'Failed to add news data to the database' });
    }
});


app.post('/HelloNodejs/api/add_news_auc', async (req, res) => {
    try {
        // ใช้ await เพื่อรอให้ pool สามารถทำการ getConnection ได้
        const conn = await pool.getConnection();

        const newsData = req.body;

        // ทำการเพิ่มข้อมูลข่าวสารลงในฐานข้อมูล
        const query = 'INSERT INTO news_auction (date_news_auction, detail_news_auction) VALUES (?, ?)';
        const result = await conn.query(query, [newsData.date_news, newsData.details_News]);

        console.log('News Auction data added to database:', result);
        res.status(200).json({ message: 'News Auction data added successfully' });

        // ส่งคืน connection กลับไปที่ pool เมื่อเสร็จสิ้นการใช้งาน
        conn.release();
    } catch (err) {
        console.error('Error adding news auction data to database:', err);
        res.status(500).json({ message: 'Failed to add news data to the database' });
    }
});




app.post('/HelloNodejs/api/saveAuction', async (req, res) => {
    const auctionPrice = req.body.price;
    const auctionId = req.body.auctionId;
    const username = req.body.username;
    const currentClock = req.body.currentClock;

    let conn;

    try {
        conn = await pool.getConnection();

        // นำค่าไปบันทึกในฐานข้อมูล
        const sql = 'INSERT INTO summary (price, auctionroom_id, nameBidder, time_auction) VALUES (?, ?, ?, ?)';
        await conn.query(sql, [auctionPrice, auctionId, username, currentClock]);

        console.log('Data saved to the database');
        res.status(200).send('Data saved to the database');
    } catch (err) {
        console.error('Error executing query: ' + err.stack);
        res.status(500).send('Error saving data to the database');
    } finally {
        if (conn) {
            // Release the connection back to the pool when done
            conn.release();
        }
    }
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
app.post('/HelloNodejs/api/edit_market', async (req, res) => {
    const editedMarketData = req.body;

    // ตรวจสอบข้อมูลที่ส่งมา
    if (!editedMarketData.id || !editedMarketData.market_name || !editedMarketData.active) {
        res.status(400).json({ message: 'Invalid data' });
        return;
    }

    let conn;

    try {
        conn = await pool.getConnection();

        // ทำคำสั่ง SQL และการเชื่อมต่อกับฐานข้อมูล
        const query = 'UPDATE bigmarket SET market_name = ?, active = ? WHERE id = ?';
        await conn.query(query, [editedMarketData.market_name, editedMarketData.active, editedMarketData.id]);

        console.log('Market data edited in database');
        res.status(200).json({ message: 'Market data edited successfully' });
    } catch (err) {
        console.error('Error editing market data in database:', err);
        res.status(500).json({ message: 'Failed to edit market data in the database' });
    } finally {
        if (conn) {
            // Release the connection back to the pool when done
            conn.release();
        }
    }
});





app.post('/HelloNodejs/api/edit_auction', async (req, res) => {
    const editedAuctionData = req.body;

    try {
        // Validation - Check if required data is present
        if (!editedAuctionData.id || !editedAuctionData.auction_name || !editedAuctionData.active) {
            res.status(400).json({ message: 'Invalid data' });
            return;
        }

        // ใช้ await เพื่อรอให้ pool สามารถทำการ getConnection ได้
        const conn = await pool.getConnection();

        // SQL query to update auction data
        const query = 'UPDATE auction_room SET name = ?, active_room = ? WHERE id = ?';
        const result = await conn.query(query, [editedAuctionData.auction_name, editedAuctionData.active, editedAuctionData.id]);

        console.log('Auction data edited in database:', result);
        res.status(200).json({ message: 'Auction data edited successfully' });

        // ส่งคืน connection กลับไปที่ pool เมื่อเสร็จสิ้นการใช้งาน
        conn.release();
    } catch (err) {
        console.error('Error editing auction data in database:', err);
        res.status(500).json({ message: 'Failed to edit auction data in the database' });
    }
});







app.post('/HelloNodejs/api/delete_market', async (req, res) => {
    // ดึง ID ของตลาดที่ต้องการลบจากข้อมูลที่ส่งมากับคำขอ
    const marketIdToDelete = req.body.id;

    let conn;

    try {
        conn = await pool.getConnection();

        // ทำคำสั่ง SQL หรือการให้ฟังก์ชันทำการลบข้อมูลตลาดจากฐานข้อมูล
        // ในที่นี้จะให้เป็นตัวอย่างการใช้ MariaDB
        const deleteMarketQuery = 'DELETE FROM bigmarket WHERE id = ?';

        // ทำการเรียกคำสั่ง SQL เพื่อลบข้อมูลตลาด
        await conn.query(deleteMarketQuery, [marketIdToDelete]);

        console.log('Market data deleted from database');
        res.status(200).json({ message: 'Market data deleted successfully' });
    } catch (err) {
        console.error('Error deleting market data from database:', err);
        res.status(500).json({ message: 'Failed to delete market data from the database' });
    } finally {
        if (conn) {
            // Release the connection back to the pool when done
            conn.release();
        }
    }
});





// ============= Root ==============
app.get("/HelloNodejs/", function (req, res) {
    console.log(req.session.userID);
    res.sendFile(path.join(__dirname, "views/loginpara.html"));
});

app.get("/HelloNodejs/forgot", function (req, res) {
    console.log(req.session.userID);
    res.sendFile(path.join(__dirname, "views/resetpara.html"));
});

app.get("/HelloNodejs/regis", function (req, res) {
    console.log(req.session.userID);
    res.sendFile(path.join(__dirname, "views/registerpara.html"));
});

app.get("/HelloNodejs/homepage", function (req, res) {
    console.log(req.session.userID);
    res.sendFile(path.join(__dirname, "views/homepage.html"));
});

app.get("/HelloNodejs/profile", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/profile.html"));
});

app.get("/HelloNodejs/roombigmarket", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/big-market.html"));
});

app.get("/HelloNodejs/smallmarket", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/small-market.html"));
});

app.get("/HelloNodejs/auctoday", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/auction-today.html"));
});

app.get("/HelloNodejs/historyauc", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/AuctionHistory.html"));
});

app.get("/HelloNodejs/editprouse", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/Editprofile.html"));
});

app.get("/HelloNodejs/useradmin", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/User(admin).html"));
});

app.get("/HelloNodejs/marketAd", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/market(Admin).html"));
});

app.get("/HelloNodejs/auctionAd", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/auction-admin.html"));
});

app.get("/HelloNodejs/addauctionroom", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/add-auction.html"));
});

app.get("/HelloNodejs/addnews", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/news.html"));
});

app.get("/HelloNodejs/auctioning", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/auction-ing.html"));
});

app.get("/HelloNodejs/auctiontoday", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/auction-today.html"));
});

app.get("/HelloNodejs/auctionend", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/Auction-ed.html"));
});

app.get("/HelloNodejs/auctionpage", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/Auctionpage.html"));
});

app.get("/HelloNodejs/summary", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/summary.html"));
});

app.get("/HelloNodejs/subsummary", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/subsummary.html"));
});

app.get("/HelloNodejs/test", function (_req, res) {
    res.sendFile(path.join(__dirname, "views/test.html"));
});





// ============= Port ==============
// const port = 2121;
// app.listen(port, function () {
//     console.log("Server is ready at " + port);
// });
app.listen(process.env.PORT, () => {

    console.log(`server run on port: ${process.env.PORT}`);

});
