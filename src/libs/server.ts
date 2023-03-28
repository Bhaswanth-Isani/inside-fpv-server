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

  app.post('/create-raw', expressAsyncHandler(async (req: TypedRequestBody<{ name: string, shelf: string, count: number }>, res: any) => {
    const name = req.body.name
    const shelf = req.body.shelf
    const count = req.body.count

    try {
      const material = await prisma.rawMaterial.create({ data: { name, shelf, count } })

      res.status(200).json({
        id: material.id,
        name: material.name,
        shelf: material.shelf,
        count: material.count
      })
    } catch (error) {
      res.send(500)
    }
  }))

  app.get('/raw', expressAsyncHandler(async (_, res: any) => {
    try {
      const materials = await prisma.rawMaterial.findMany()

      res.status(200).json({ materials })
    } catch (error) {
      res.send(500)
    }
  }))

  app.post('/drone', expressAsyncHandler(async (req: TypedRequestBody<{ rfid: string, type: 'TYPE1' | 'TYPE2' }>, res: any) => {
    const raw = await prisma.rawMaterial.findFirst()

    try {
      const drone = await prisma.drone.create({ data: { rfid: req.body.rfid, type: req.body.type, stage: 'PRODUCTION', rawMaterials: { connect: { id: raw?.id } } } })

      res.status(200).json({ drone })
    } catch (error) {
      res.status(500)
    }
  }))

  app.post('/stock', expressAsyncHandler(async (req: TypedRequestBody<{ stock: string }>, res: any) => {
    const stock = req.body.stock
    const values = stock.split(',')
    const nof = parseInt(values[0])
    let nom = parseInt(values[3])

    if (nom < 0) {
      nom = 0
    }

    const motor = await prisma.rawMaterial.findFirst({ where: { name: 'Motor' } })
    const frame = await prisma.rawMaterial.findFirst({ where: { name: 'Frame' } })

    try {
      if (motor?.count !== nom) {
        await prisma.rawMaterial.updateMany({ where: { name: 'Motor' }, data: { count: nom } })
      }

      if (frame?.count !== nof) {
        await prisma.rawMaterial.updateMany({ where: { name: 'Frame' }, data: { count: nof } })
      }

      if (frame?.count !== nof || motor?.count !== nom) {
        io.emit('stock')
      }

      res.status(200).send('Successfully Posted')
    } catch (e) {
      console.log(e)
      res.status(200).send('Not Posted')
    }
  }))

  app.get('/stock', expressAsyncHandler(async (_: any, res: any) => {
    const inventory = await prisma.rawMaterial.findMany()
    res.send(inventory)
  }))

  app.post('/stage1', expressAsyncHandler(async (req: TypedRequestBody<{ rfid: string }>, res: any) => {
    const rfid = req.body.rfid

    const raw = await prisma.rawMaterial.findFirst()

    try {
      await prisma.drone.create({ data: { rfid, type: 'TYPE1', stage: 'PRODUCTION', rawMaterials: { connect: { id: raw?.id } } } })
      io.emit('stage1')
      res.send('Successfully posted')
    } catch (e) {
      console.log(e)
    }
  }))

  app.post('/stage2', expressAsyncHandler(async (req: TypedRequestBody<{ rfid: string }>, res: any) => {
    const rfid = req.body.rfid

    try {
      await prisma.drone.update({ where: { rfid }, data: { stage: 'TESTING' } })
      io.emit('stage2')
      res.send('Successfully posted')
    } catch (e) {
      console.log(e)
    }
  }))

  app.post('/stage3', expressAsyncHandler(async (req: TypedRequestBody<{ rfid: string }>, res: any) => {
    const rfid = req.body.rfid

    try {
      await prisma.drone.update({ where: { rfid }, data: { stage: 'READY' } })
      io.emit('stage3')
      res.send('Successfully posted')
    } catch (e) {
      console.log(e)
    }
  }))

  app.post('/orders', expressAsyncHandler(async (req: any, res: any) => {
    const d = req.body.drones
    console.log(req.body)
    const order = await prisma.drone.findMany({ where: { stage: 'READY' } })

    if (order.length < d) {
      res.send({ message: 'out of stock' })
    } else {
      for (let i = 0; i < d; i++) {
        await prisma.drone.update({
          where: { id: order[i].id },
          data: { stage: 'ORDERED' }
        })
        // io.emit('stage4')
      }
      res.send({ message: 'order successful' })
    }
  }))

  app.get('/number', expressAsyncHandler(async (_: any, res: any) => {
    try {
      const array1 = await prisma.drone.findMany({ where: { stage: 'PRODUCTION' } })
      const array2 = await prisma.drone.findMany({ where: { stage: 'TESTING' } })
      const array3 = await prisma.drone.findMany({ where: { stage: 'READY' } })
      const array4 = await prisma.drone.findMany({ where: { stage: 'ORDERED' } })

      res.json({
        stage_1: array1.length,
        stage_2: array2.length,
        stage_3: array3.length,
        stage_4: array4.length
      })
    } catch (e) {
      console.log(e)
    }
  }))

  return app
}

/// Returns the express app for easy integration testing
export const app = createPatrioServer()
