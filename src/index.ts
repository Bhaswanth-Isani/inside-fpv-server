import { app } from './libs/server'
import { createServer } from 'http'
import { Server } from 'socket.io'

const server = createServer(app)

export const io = new Server(server)

const PORT = process.env.PORT === undefined ? 4000 : process.env.PORT
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
