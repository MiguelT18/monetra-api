import express from "express"

const app = express()

app.use(express.json()) // middleware que transforma req.body en JSON

const PORT = 3000

app.get("/ping", (_, res) => {
	console.log("ping received")
	res.send("pong")
})

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})