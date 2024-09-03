const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = 8080

app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`)
})