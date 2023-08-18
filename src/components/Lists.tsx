import { useRef, useState } from 'react'
import {
  SkeletonDisplayText,
  SkeletonBodyText,
  LegacyStack,
  Text,
  Card,
} from '@shopify/polaris'
import { useAuthDispatch } from '../contexts/Auth'
import { useToastDispatch } from '../contexts/Toast'

const DataCard: React.FC<any> = ({ data, placeholder }) => {
  return placeholder ? (
    <Card>
      <Text variant="headingXl" as="h3">
        <SkeletonDisplayText />
      </Text>
      <br />
      <Text variant="bodySm" as="p">
        <SkeletonBodyText lines={1} />
      </Text>
    </Card>
  ) : (
    <Card key={data.id}>
      <Text variant="headingXl" as="h3">
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
  const [data, setData] = useState([] as any)

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
      setData(lists)
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

      <LegacyStack distribution="fillEvenly">
        {loading
          ? [...Array(3).keys()].map((i) => (
              <DataCard key={i} placeholder={true} />
            ))
          : data.map((d: any, i) => <DataCard key={i} data={d} />)}
      </LegacyStack>
    </LegacyStack>
  )
}
