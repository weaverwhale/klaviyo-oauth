import { useRef, useState } from 'react'
import { Spinner, LegacyStack, Text, Card } from '@shopify/polaris'
import { useAuthDispatch } from '../contexts/Auth'
import { useToastDispatch } from '../contexts/Toast'

const DataCard: React.FC<any> = ({ data }) => {
  return (
    <Card key={data.id}>
      <Text variant="headingXl" as="h3">
        {' '}
        {data.id}
      </Text>
      <Text variant="bodyLg" as="p">
        {data.attributes.name}
      </Text>
      <Text variant="bodySm" as="p">
        {data.attributes.updated}
      </Text>
    </Card>
  )
}

export const Lists: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [listsData, setListsData] = useState([] as any)

  const authDispatch = useAuthDispatch()
  const toastDispatch = useToastDispatch()

  const fetchData = async (): Promise<void> => {
    setLoading(true)

    const lists = await fetch('/get-lists', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((res) => res.json())

    if (lists.errors?.length > 0 && lists.code !== 401) {
      authDispatch!({ type: 'error', message: lists.message })
      toastDispatch!({ type: 'error', message: lists.message })
    } else if (lists.errors?.length > 0 && lists.code !== 200) {
      authDispatch!({ type: 'expired', message: lists.message })
      toastDispatch!({ type: 'error', message: lists.message })
    } else {
      authDispatch!({ type: 'success' })
      setListsData(lists)
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
        <code>https://a.klaviyo.com/api/lists</code>
      </Text>

      {loading && <Spinner accessibilityLabel="Loading orders" size="large" />}

      {listsData.length > 0 && (
        <LegacyStack distribution="fillEvenly">
          {listsData.map((d: any) => (
            <DataCard data={d} />
          ))}
        </LegacyStack>
      )}
    </LegacyStack>
  )
}
