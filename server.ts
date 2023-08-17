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
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SCOPE, NODE_ENV } = process.env

let LOCAL_TIME = new Date().getTime() / 1000

function generateRandomString(length) {
  let text = ''
  let possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

async function generateCodeChallenge(codeVerifier) {
  function base64encode(string) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(string)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return base64encode(digest)
}

const localStorage = new LocalStorage('./scratch')
let TOKEN = localStorage.getItem('TOKEN') || false
let REFRESH_TOKEN = localStorage.getItem('REFRESH_TOKEN') || false
let LOCAL_SECRET = localStorage.getItem('LOCAL_SECRET') || false

let localVerifier = generateRandomString(128)
if (!LOCAL_SECRET) {
  LOCAL_SECRET = await generateCodeChallenge(localVerifier)
  localStorage.setItem('LOCAL_SECRET', LOCAL_SECRET)
}
let EXPIRES = 0

// -----------------------
// Helpers
// -----------------------
const oAuthFlowHeaders = (): GlobalHeaders => ({
  'content-type': 'application/x-www-form-urlencoded',
  Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
})

const globalHeaders = (): GlobalHeaders => ({
  accept: 'application/json',
  'content-type': 'application/json',
  revision: '2023-08-15',
  Authorization: `Bearer ${TOKEN}`,
})

const refresh = async (res?: Response) => {
  console.log(chalk.magenta(`[refresh] token re-requested`))

  // Exchange the refresh token for a fresh token
  const url = 'https://a.klaviyo.com/oauth/token'

  const options = {
    method: 'POST',
    headers: oAuthFlowHeaders(),
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
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    state: 42,
    code_challenge_method: 'S256',
    code_challenge: LOCAL_SECRET,
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
    grant_type: 'authorization_code',
    code: code,
    code_verifier: localVerifier,
    redirect_uri: REDIRECT_URI,
  }

  const options = {
    method: 'POST',
    headers: oAuthFlowHeaders(),
    body: querystring.stringify(data),
  }

  console.log(options)

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

  let localData: any[] = []
  async function getData() {
    const options = {
      method: 'GET',
      headers: globalHeaders(),
    }

    try {
      await fetch(url, options)
        .then((response) => response.json())
        .then(async (response: any) => {
          await responseChecker(response)
          localData = localData.concat(response.data)
          res.json(localData)
        })
    } catch (err) {
      console.error(err)
      res.json(err)
    }
  }

  getData()
})

app.get('/get-metrics', (req: Request, res: Response) => {
  const url = 'https://a.klaviyo.com/api/metrics'

  let localData: any[] = []
  async function getData() {
    const options = {
      method: 'GET',
      headers: globalHeaders(),
    }

    try {
      await fetch(url, options)
        .then((response) => response.json())
        .then(async (response: any) => {
          console.log(response)

          await responseChecker(response)
          localData = localData.concat(response.data)
          res.json(localData)
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
