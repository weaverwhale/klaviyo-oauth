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
      <SkeletonDisplayText />
      <br />
      <SkeletonBodyText lines={1} />
    </Card>
  ) : (
    <Card key={data.id}>
      <Text variant="headingXl" as="h3">
        {data.attributes.firstname} - {data.attributes.lastname}
      </Text>
      <Text variant="bodyLg" as="p">
        {data.attributes.email}
      </Text>
      <Text variant="bodyMd" as="p">
        {data.attributes.city}, {data.attributes.state}
      </Text>
      <Text variant="bodySm" as="p">
        {data.attributes.updated}
      </Text>
    </Card>
  )
}

export const Profiles: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([] as any)

  const authDispatch = useAuthDispatch()
  const toastDispatch = useToastDispatch()

  const fetchData = async (): Promise<void> => {
    setLoading(true)

    const d = await fetch('/get-profiles', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((res) => res.json())

    if (d.errors?.length > 0 && d.code !== 401) {
      authDispatch!({ type: 'error', message: d.message })
      toastDispatch!({ type: 'error', message: d.message })
    } else if (d.errors?.length > 0 && d.code !== 200) {
      authDispatch!({ type: 'expired', message: d.message })
      toastDispatch!({ type: 'error', message: d.message })
    } else {
      authDispatch!({ type: 'success' })
      setData(d)
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
        <code>https://a.klaviyo.com/api/profiles</code>
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
