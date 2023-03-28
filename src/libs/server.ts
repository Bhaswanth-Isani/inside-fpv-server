import express, { type Express } from 'express'
import cors from 'cors'
import { io } from '..'
import { type TypedRequestBody } from '../typedRequest'
import prisma from './prisma'
import expressAsyncHandler from 'express-async-handler'

const createPatrioServer = (): Express => {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.post('/stock', expressAsyncHandler(async (req: TypedRequestBody<{ stock: string, buffer: string }>, res: any) => {
    const stock = req.body.stock
    const values = stock.split(',')
    const nod = parseInt(values[0])
    const nof = parseInt(values[1])
    const nom = parseInt(values[2])
    let buffer = parseInt(req.body.buffer)

    if (Number.isNaN(buffer)) {
      buffer = 0
    }

    const document = await prisma.inventory.findFirst()

    try {
      if (
        (document != null) &&
        (document.nod !== nod || document.nof !== nof || document.nom !== nom)
      ) {
        await prisma.inventory.update(
          {
            where: { id: document.id },
            data: { nod, nof, nom, buffer }
          }
        )
        io.emit('stock', nod, nof, nom)
      } else {
        await prisma.inventory.create({ data: { nod, nof, nom, buffer } })
        io.emit('stock', nod, nof, nom)
      }
      res.status(200).send('Successfully Posted')
    } catch (e) {
      console.log(e)
      res.status(200).send('Not Posted')
    }
  }))

  app.get('/stock', expressAsyncHandler(async (_: any, res: any) => {
    const inventory = await prisma.inventory.findFirst()
    res.send(inventory)
  }))

  app.post('/stage1', expressAsyncHandler(async (req: TypedRequestBody<{ rfid: string }>, res: any) => {
    const id = req.body.rfid

    try {
      await prisma.product.create({ data: { id, stage_1: 1, stage_2: 0, stage_3: 0, stage_4: 0 } })
      io.emit('stage1')
      res.send('Successfully posted')
    } catch (e) {
      console.log(e)
    }
  }))

  app.post('/stage2', expressAsyncHandler(async (req: TypedRequestBody<{ rfid: string }>, res: any) => {
    const id = req.body.rfid

    try {
      await prisma.product.update({ where: { id }, data: { stage_1: 0, stage_2: 1, stage_3: 0, stage_4: 0 } })
      io.emit('stage2')
      res.send('Successfully posted')
    } catch (e) {
      console.log(e)
    }
  }))

  app.post('/stage3', expressAsyncHandler(async (req: TypedRequestBody<{ rfid: string }>, res: any) => {
    const id = req.body.rfid

    try {
      await prisma.product.update({ where: { id }, data: { stage_1: 0, stage_2: 0, stage_3: 1, stage_4: 0 } })
      io.emit('stage3')
      res.send('Successfully posted')
    } catch (e) {
      console.log(e)
    }
  }))

  app.post('/orders', expressAsyncHandler(async (req: any, res: any) => {
    const d = req.body.drones
    console.log(req.body)
    const order = await prisma.product.findMany({ where: { stage_3: 1 } })

    if (order.length < d) {
      res.send({ message: 'out of stock' })
    } else {
      for (let i = 0; i < d; i++) {
        await prisma.product.update({
          where: { id: order[i].id },
          data: { stage_4: 1, stage_3: 0 }
        })
        io.emit('stage4')
      }
      res.send({ message: 'order successful' })
    }
  }))

  app.get('/number', expressAsyncHandler(async (_: any, res: any) => {
    try {
      const array1 = await prisma.product.findMany({ where: { stage_1: 1 } })
      const array2 = await prisma.product.findMany({ where: { stage_1: 2 } })
      const array3 = await prisma.product.findMany({ where: { stage_1: 3 } })

      res.json({
        stage_1: array1.length,
        stage_2: array2.length,
        stage_3: array3.length
      })
    } catch (e) {
      console.log(e)
    }
  }))

  return app
}

/// Returns the express app for easy integration testing
export const app = createPatrioServer()
