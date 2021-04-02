const express = require('express')
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
require('dotenv').config()

const port = 5000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j3ujg.mongodb.net/${process.env.DB_Name}?retryWrites=true&w=majority`;

app.use(cors());
app.use(bodyParser.json());

const serviceAccount = require("./configs/book-shop-fadca-firebase-adminsdk-tgw70-a1717572b2.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.get('/', (req, res) => {
    res.send('Hello World!')
})


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const bookCollection = client.db("bookShop").collection("addBook");
    const bookingCollection = client.db("bookShop").collection("bookings");

    app.get('/books', (req, res) => {
        bookCollection.find()
            .toArray((err, items) => {
                res.send(items)
            })
    })

    app.delete('/delete/:id', (req, res) => {
        bookCollection.deleteOne({ _id: ObjectId(req.params.id) })
            .then(result => {
                res.send(result.deletedCount > 0);
            })
    })

    app.post('/addBook', (req, res) => {
        const newBook = req.body;
        console.log("added new book", newBook);
        bookCollection.insertOne(newBook)
            .then(result => {
                console.log('inserted count', result.insertedCount);
                res.send(result.insertedCount > 0);
            })
    })

    app.post('/addBooking', (req, res) => {
        const newBooking = req.body;
        bookingCollection.insertOne(newBooking)
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    })


    app.get('/bookings', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            console.log({ idToken });

            admin
                .auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    if (tokenEmail == queryEmail) {
                        bookingCollection.find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.status(200).send(documents);
                            })
                    }
                    else {
                        res.status(401).send("unauthorized access");
                    }
                })
                .catch((error) => {
                    res.status(401).send("unauthorized access");
                });
        }
        else {
            res.status(401).send("unauthorized access");
        }
    })
});




app.listen(process.env.PORT || port)