import express, { type Express } from 'express'
import cors from 'cors'
import { io } from '..'

const createPatrioServer = (): Express => {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.get('/hello', (_req: Express.Request, res: any) => {
    io.emit('hello')

    res.status(200).send('hello')
  })

  return app
}

/// Returns the express app for easy integration testing
export const app = createPatrioServer()
