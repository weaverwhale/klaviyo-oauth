import { useEffect, useState } from 'react'
import { Banner, Layout } from '@shopify/polaris'
import { TabbedRequests } from './TabbedRequests'
import { LoginCard } from './LoginCard'
import { LoggedInCard } from './LoggedInCard'
import { useAuth } from '../contexts/Auth'

export const MainSection: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const { authenticated } = useAuth()

  useEffect(() => {
    if (loading)
      fetch('/logged-in')
        .then((res) => res.json())
        .then((data) => {
          setLoggedIn(!!data?.token)
        })
        .finally(() => setLoading(false))
  }, [])

  return loading ? (
    <Layout.Section fullWidth>
      <Banner>loading...</Banner>
    </Layout.Section>
  ) : loggedIn && authenticated ? (
    <>
      <LoggedInCard />
      <TabbedRequests />
    </>
  ) : (
    <>
      {loggedIn && <LoggedInCard />}
      <LoginCard />
    </>
  )
}
