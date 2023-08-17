import express, { Request, Response } from 'express'
import ViteExpress from 'vite-express'
import * as dotenv from 'dotenv'
import crypto from 'crypto'
import querystring from 'node:querystring'
import chalk from 'chalk'
import fetch from 'cross-fetch'
import { LocalStorage } from 'node-localstorage'
// import moment from 'moment'

// -----------------------
// types
// -----------------------
import { ParsedQs } from 'qs'
import { GlobalHeaders } from './src/types/Types'

// -----------------------
// express app
// -----------------------
const app = express()
const port = 3000
const appName = chalk.hex('#1877f2')('[triple-whale] ')
app.use(express.json())

// -----------------------
// data
// -----------------------
dotenv.config()
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SHOP_URL, SCOPE, NODE_ENV } =
  process.env

let LOCAL_TIME = new Date().getTime() / 1000

const localStorage = new LocalStorage('./scratch')
let TOKEN = localStorage.getItem('TOKEN') || false
let REFRESH_TOKEN = localStorage.getItem('REFRESH_TOKEN') || false
let LOCAL_SECRET = localStorage.getItem('LOCAL_SECRET') || false
if (!LOCAL_SECRET) {
  LOCAL_SECRET = crypto.randomBytes(20).toString('hex')
  localStorage.setItem('LOCAL_SECRET', LOCAL_SECRET)
}
let EXPIRES = 0

// -----------------------
// Helpers
// -----------------------
const refresh = async (res?: Response) => {
  console.log(chalk.magenta(`[refresh] token re-requested`))

  // Exchange the refresh token for a fresh token
  const url = 'https://a.klaviyo.com/oauth/token'

  const options = {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${CLIENT_ID}:${CLIENT_SECRET}`,
    },
    body: querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN,
    }),
  }

  fetch(url, options)
    .then((response) => response.json())
    .then((response) => {
      const token = response.access_token
      const refresh = response.refresh_token
      const expires = response.expires_in

      if (token && refresh) {
        localStorage.setItem('TOKEN', token)
        localStorage.setItem('REFRESH_TOKEN', refresh)

        TOKEN = token
        REFRESH_TOKEN = refresh
        EXPIRES = expires
        console.log(chalk.magenta(`[refresh] new token acquired`))
      } else {
        console.log(
          chalk.magenta(`[refresh] error refreshing token`, response.error)
        )
      }

      if (res && response.error) {
        res.json(response)
      } else {
        res?.redirect('/')
      }
    })
    .catch((err) => {
      console.log(chalk.red('[refresh] error refreshing token', err))
      if (res) res.json(err)
    })
}

const globalHeaders = (): GlobalHeaders => ({
  accept: 'application/json',
  'content-type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
})

const responseChecker = async (response: any) => {
  const currentTime = new Date().getTime() / 1000

  // refresh token if we're exired
  if (currentTime - LOCAL_TIME >= EXPIRES) {
    await refresh()
    LOCAL_TIME = new Date().getTime() / 1000
  }

  if (response.code == 401) {
    await refresh()
    throw response
  }
}

// -----------------------
// Check refresh every 10 min
// -----------------------
setInterval(
  () => CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN && refresh(),
  600000
)

// -----------------------
// Login -- first step of oauth flow
// -----------------------
app.get('/login', (_req: Request, res: Response) => {
  // Authorization URL
  const authUrl = 'https://a.klaviyo.com/oauth/authorize'

  // Request parameters
  const params = {
    client_id: CLIENT_ID,
    scope: SCOPE,
    response_type: 'code',
    state: LOCAL_SECRET,
    redirect_uri: REDIRECT_URI,
  }

  const redirect = `${authUrl}?${querystring.stringify(params)}`
  console.log(chalk.magenta(`[redirect] url: ${redirect}`))

  res.send({
    // Encode the url with the params
    redirect,
  })
})

// -----------------------
// Callback - second step with oauth flow
// -----------------------
app.get('/callback', (req: Request, res: Response) => {
  // Get the authorization code from the query parameters
  const code: string | ParsedQs | string[] | ParsedQs[] | undefined =
    req.query.code?.toString()

  // Exchange the authorization code for an access token
  const url = 'https://a.klaviyo.com/oauth/token'

  const data = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
  }

  const options = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: querystring.stringify(data),
  }

  fetch(url, options)
    .then((response) => response.json())
    .then((response) => {
      if (response.access_token) {
        // This is your token
        const token = response.access_token

        // This is used to refresh this token when it expires
        const refresh = response.refresh_token

        // This is how long the token is good for
        const expires = response.expires_in

        // For local dev, cache token in localStorage
        localStorage.setItem('TOKEN', token)
        localStorage.setItem('REFRESH_TOKEN', refresh)

        TOKEN = token
        REFRESH_TOKEN = refresh
        EXPIRES = expires

        console.log(chalk.magenta(`[callback] token acquired`))

        res.redirect('/')
      } else {
        console.log(
          chalk.red(`[callback] error acquiring token, ${response.error}`)
        )

        res.json(response)
      }
    })
    .catch((err) => {
      res.json(err)
    })
})

// -----------------------
// Refresh token
// -----------------------
app.get('/refresh', async (_req: Request, res: Response) => {
  await refresh(res)
})

// -----------------------
// API endpoints
// -----------------------
app.get('/get-lists', (req: Request, res: Response) => {
  const url = 'https://a.klaviyo.com/api/lists'

  let data = {
    shop: SHOP_URL,
    state: LOCAL_SECRET,
    startDate: req.body?.startDate || '2022-12-01',
    endDate: req.body?.endDate || '2022-12-02',
    page: req.body?.page || 0,
  }

  let localData: any[] = []
  async function getData() {
    const options = {
      method: 'GET',
      headers: globalHeaders(),
      body: JSON.stringify(data),
    }

    try {
      await fetch(url, options)
        .then((response) => response.json())
        .then(async (response: any) => {
          await responseChecker(response)
          localData = localData.concat(response.body.data)

          if (response.body.links?.next) {
            data.page += response.body.links?.next
            return await getData()
          } else {
            res.json(localData)
          }
        })
    } catch (err) {
      console.error(err)
      res.json(err)
    }
  }

  getData()
})

// -----------------------
// are we logged in? -- for frontend
// -----------------------
app.get('/logged-in', (req: Request, res: Response) => {
  res.json({ token: TOKEN })
})

// -----------------------
// Logger
// -----------------------
const loggy = () => {
  console.log(
    appName +
      chalk.green(
        `🐳 listening http://localhost:${
          NODE_ENV === 'production' ? '80' : port
        }`
      )
  )

  console.log(
    !!appName && !!CLIENT_ID && !!REDIRECT_URI && !!SCOPE
      ? chalk.green(`🎉 all required data is present`)
      : chalk.red(`🛑 please provide required .env data`)
  )
}

// -----------------------
// Start server
// -----------------------
NODE_ENV === 'production' ? app.use(express.static('dist')) : null
NODE_ENV === 'production'
  ? app.listen('80', loggy)
  : ViteExpress.listen(app, port, loggy)
