import { useState } from 'react'
import { Banner, Button, Layout, Text, LegacyStack } from '@shopify/polaris'
import { useAuth } from '../contexts/Auth'

export const LoggedInCard: React.FC<any> = () => {
  const { authenticated, error, message, loading } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  const refreshToken = async () => {
    setRefreshing(true)
    await fetch('/refresh')
    location.reload()
    // setRefreshing(false)
  }

  // const refreshPage = () => {
  //   setRefreshing(true)
  //   location.reload()
  // }

  return (
    <Layout.Section fullWidth>
      <Banner status={authenticated ? 'success' : 'critical'}>
        {authenticated ? (
          <LegacyStack vertical>
            <Text variant="headingLg" as="h2">
              You are authenticated via OAuth!
            </Text>
          </LegacyStack>
        ) : (
          <LegacyStack vertical>
            <Text variant="headingLg" as="h2">
              {message || 'Your JWT Expired'}
            </Text>
            <Text variant="bodyMd" as="p">
              We're going to try and refresh your token. If it doesn't work,
              please try to refresh it yourself using the button below.
            </Text>
            <Text variant="bodyMd" as="p">
              {' '}
              If that doesn't work, restart your server, or try again later! 😅
            </Text>
            {!loading && (
              <Button loading={refreshing} onClick={refreshToken}>
                Refresh Token
              </Button>
            )}
          </LegacyStack>
        )}
      </Banner>
      {authenticated && error && (
        <Banner status="critical">
          <LegacyStack vertical>
            <Text variant="headingLg" as="h2">
              API Error: {message}
            </Text>
            <Text variant="bodyMd" as="p">
              View your network tab for more information, or try to refresh your
              token.
            </Text>
            {!loading && (
              <Button loading={refreshing} onClick={refreshToken}>
                Refresh Token
              </Button>
            )}
          </LegacyStack>
        </Banner>
      )}
    </Layout.Section>
  )
}
