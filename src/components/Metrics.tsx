import { useRef, useState } from 'react'
import { Spinner, LegacyStack, Text, Card } from '@shopify/polaris'
import { useAuthDispatch } from '../contexts/Auth'
import { useToastDispatch } from '../contexts/Toast'

export const Metrics: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [listsData, setListsData] = useState([] as any)

  const authDispatch = useAuthDispatch()
  const toastDispatch = useToastDispatch()

  const fetchData = async (): Promise<void> => {
    setLoading(true)

    const metrics = await fetch('/get-metrics', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((res) => res.json())

    if (metrics.errors?.length > 0 && metrics.code !== 401) {
      authDispatch!({ type: 'error', message: metrics.message })
      toastDispatch!({ type: 'error', message: metrics.message })
    } else if (metrics.errors?.length > 0 && metrics.code !== 200) {
      authDispatch!({ type: 'expired', message: metrics.message })
      toastDispatch!({ type: 'error', message: metrics.message })
    } else {
      authDispatch!({ type: 'success' })
      setListsData(metrics)
    }

    setLoading(false)
  }

  const initialized = useRef(false)
  if (!initialized.current) {
    fetchData()
    initialized.current = true
  }

  return (
    <LegacyStack vertical>
      <Text variant="bodyMd" as="p">
        Below will make a <code>GET</code> request to the API endpoint{' '}
        <code>https://a.klaviyo.com/api/metrics</code>
      </Text>

      {loading ?? <Spinner accessibilityLabel="Loading orders" size="large" />}

      {listsData.length > 0 && (
        <LegacyStack distribution="fillEvenly">
          {listsData.map((list: any) => (
            <Card key={list.id}>
              <Text variant="headingXl" as="h3">
                {list.attributes.integration.id} - {list.id}
              </Text>
              <Text variant="bodyLg" as="p">
                {list.attributes.integration.category},{' '}
                {list.attributes.integration.name}
              </Text>
              <Text variant="bodyMd" as="p">
                {list.attributes.name}
              </Text>
              <Text variant="bodySm" as="p">
                {list.attributes.updated}
              </Text>
            </Card>
          ))}
        </LegacyStack>
      )}
    </LegacyStack>
  )
}
