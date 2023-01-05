const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

app.use(express.static('public'))

// connect to the database
mongoose.connect('mongodb+srv://parmenide:jesus123@fccmongoose.srblnut.mongodb.net/?retryWrites=true&w=majority',
  err => {
    if (err) throw err;
    console.log('Connected to MongoDB')
  });
  
// Create default date
const defaultDate = () => new Date().toISOString().slice(0, 10)

// Create schema
const userSchema = mongoose.Schema(
  {
    username: { type: String, required: true, unique: false },
    exercises: [
      {
        description: { type: String },
        duration: { type: Number },
        date: { type: String, required: false }
      }
    ]
  }
)

// Create model
const User = mongoose.model('Users', userSchema)

// Create default route
app.get('/', (req, res) => res.sendFile(__dirname + '/views/index.html'))

// Add user
app.post("/api/users", (req, res) => {

  let username = req.body.username

  if (!username || username.length === 0) {

    res.json({ error: "Invalid username" })
  }
  const user = new User({ username })

  user.save(function (err, newUser) {

    if (err) {
      return console.log(err)
    }
    res.json({ username: newUser.username, _id: newUser._id })
  })
})

// Get all users
app.get("/api/users", (req, res) => {

  User.find()

    .select('username _id')

    .exec(function (err, userList) {

      if (err) {
        return console.log(err)
      }

      res.json(userList)
    })
})


// Add exercise
app.post("/api/users/:_id/exercises", (req, res) => {
  const userId = req.params._id || req.body.userId


  User.findByIdAndUpdate(
    userId,

    {
      $push: {

        exercises: {
          description: req.body.description,
          duration: +req.body.duration,
          date: req.body.date || defaultDate()
        }
      }
    },

    { new: true },

    function (err, updatedUser) {

      if (err) {
        return console.log('error:', err)
      }

      let userExer = {
        username: updatedUser.username,
        description: req.body.description,
        duration: +req.body.duration,
        _id: userId,
        date: new Date(req.body.date).toDateString()
      }
      res.json(userExer)
    }
  )
})

// Get user logs
app.get("/api/users/:_id/logs", (req, res) => {

  let userId = req.params._id
  let dateFrom = req.query.from || '0000-00-00'
  let dateTo = req.query.to || '9999-99-99'
  let limit = +req.query.limit || 10000

  User.findOne({ _id: userId }, function (err, user) {

    if (err) {
      return console.log(err)
    }

    try {
      let exer = user.exercises.filter(exc => exc.date >= dateFrom && exc.date <= dateTo)
        .map(exc =>
        ({
          description: exc.description,
          duration: exc.duration,
          date: exc.date
        }))
        .slice(0, limit)

      res.json({
        count: exer.length,
        _id: user._id,
        username: user.username,
        log: exer
      })

    } catch (err) {
      console.log(err)

      res.json("User not found")
    }

  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
