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
mongoose.connect('mongodb+srv://parmenide:jesus123@fccmongoose.srblnut.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })

// create a user schema with username
const userSchema = new mongoose.Schema({
  username: String,
  exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }]
})

// create a model
const User = mongoose.model('User', userSchema)

// Create Exercise Schema with user relation
const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date
})

// create a model
const Exercise = mongoose.model('Exercise', exerciseSchema)

// Default route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Get all users
app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    if (err) {
      return res.json({ error: err })
    }
    // return username and _id for users
    // res.json(users.map(user => ({ username: user.username, _id: user._id })))
    res.json(users)
  })
  
  // select only the username and _id fields
  .select({ username: 1, _id: 1 })
})

// Create a new user
app.post('/api/users', (req, res) => {

  const username = req.body.username

  User.findOne({ username }, (err, user) => {
    if (err) {
      return res.json({ error: err })
    }

    if (user) {
      return res.json({ error: 'Username already taken' })
    }

    const newUser = new User({ username })

    newUser.save((err, user) => {
      if (err) {
        return res.json({ error: err })
      }
      res.json({
        username: user.username,
        _id: user._id
      })
    })
  })
})

// Create a new exercise
app.post('/api/users/:_id/exercises', (req, res) => {

  const userId = req.params._id

  const { description, duration, date } = req.body

  // check if the date is valid
  if (date && !Date.parse(date)) {
    return res.json({ error: 'Invalid date' })
  }

  // find the user
  User.findOne({ userId }, (err, user) => {
    if (err) {
      return res.json({ error: err })
    }

    // create a new exercise
    const newExercise = new Exercise({
      description: description,
      duration: duration,
      date: date ? new Date(date) : new Date()
    })

    newExercise.save((err, data) => {
      if (err) {
        return res.json({ error: err })
      }

      // push the exercise to the user's exercises array
      user.exercises.push(data._id)

      // save the user
      user.save()

      // return the exercise
      res.json({
        username: user.username,
        description: data.description,
        duration: data.duration,
        date: data.date.toDateString(),
        _id: data.userId
      })
    })

  })
})

// Get user exercises between date range and limit the number to return
app.get('/api/users/:id/logs', (req, res) => {
  const userId = req.params.id

  // remove [ and ] from the request query object's keys and values
  const query = Object.keys(req.query).reduce((acc, key) => {

    // remove [ and ] from the key and value
    const newKey = key.replace('[', '').replace(']', '')
    acc[newKey] = req.query[key].replace('[', '').replace(']', '')

    return acc

  }, {})

  // extract the objects from the request query
  const { from, to, limit } = query

  // check if the dates from and to are valid
  if (from && !Date.parse(from)) {
    return res.json({ error: 'Invalid date' })
  }
  if (to && !Date.parse(to)) {
    return res.json({ error: 'Invalid date' })
  }

  // find the user and populate the exercises
  User.findOne({ userId }, (err, user) => {
    if (err) {
      return res.json({ error: err })
    }

    else if (!user) {
      return res.json({ error: 'User not found' })
    }

      res.json({
      username: user.username,
      count: user.exercises.length,
        _id: user._id,
      log: 
      user.exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      }))
    })
  })
  .populate({ path: 'exercises', match: { date: { $gte: from, $lte: to } }, options: { limit: limit } })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
