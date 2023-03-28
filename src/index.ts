import { app } from './libs/server'

const PORT = process.env.PORT === undefined ? 4000 : process.env.PORT
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
