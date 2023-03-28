import { app } from './libs/server'
import { Server } from 'socket.io'
import http from 'http'

const server = http.createServer(app)

export const io = new Server(server, {
  cors: {
    origin: '*'
  }
})

// Some change

io.on('connection', socket => {
  socket.on('message', (msg: string) => {
    console.log(msg)
  })
})

const PORT = process.env.PORT === undefined ? 4000 : process.env.PORT
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
